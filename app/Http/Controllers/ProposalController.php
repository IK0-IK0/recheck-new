<?php

namespace App\Http\Controllers;

use App\Models\Action;
use App\Models\Document;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Proposal;
use App\Models\ProposalActionReviewer;
use App\Models\ProposalFormResponse;
use App\Models\ProposalActionTransition;
use App\Models\StorageConfig;
use App\Models\SuperadminTenantUser;
use App\Models\User;
use App\Services\ReviewAssignmentService;
use Aws\S3\S3Client;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ProposalController extends Controller
{
    /**
     * @return array{driver: string, disk: FilesystemAdapter}
     */
    private function getStorageDisk(?string $driver = null): array
    {
        $activeConfig = StorageConfig::activeForCurrentUser();

        if ($activeConfig && ($driver === null || $activeConfig->driver === $driver)) {
            return [
                'driver' => $activeConfig->driver,
                'disk' => Storage::build($activeConfig->toFilesystemConfig()),
            ];
        }

        $driver ??= 'local';

        return [
            'driver' => $driver,
            'disk' => Storage::disk($driver),
        ];
    }

    public function index(Request $request, ?ReviewAssignmentService $reviewAssignments = null): Response
    {
        $reviewAssignments ??= app(ReviewAssignmentService::class);
        $isTracking = $request->query('view') === 'tracking';
        $institutionId = $request->user()->getInstitutionId();
        $proposalsQuery = Proposal::query();

        if ($institutionId === null) {
            $proposalsQuery->whereRaw('1 = 0');
        } else {
            $proposalsQuery->where('institution_id', $institutionId);
        }

        if (
            ! $this->userHasPermission($request, 'proposal.view.all')
            && ! $this->isInstitutionAccount($request)
        ) {
            $roleIds = $this->userRoleIds($request);
            $assignedActionIds = $this->assignedReviewActionIds($roleIds);

            $proposalsQuery->where(function ($query) use ($request, $assignedActionIds): void {
                $query
                    ->where('user_id', $request->user()->getKey())
                    ->where('user_type', $request->user()::class);

                if ($assignedActionIds !== []) {
                    $query->orWhereIn('current_action_id', $assignedActionIds);
                }
            });
        }

        $proposalsQuery->with([
            'process.phases' => fn ($query) => $query->orderBy('order')->orderBy('id'),
            'process.phases.actions' => fn ($query) => $query->orderBy('order')->orderBy('id'),
            'process.phases.actions.documents',
            'currentPhase',
            'currentAction.roles',
            'currentAction.documents',
            'phaseTransitions.phase',
            'actionTransitions.action',
            'documents',
            'formResponses',
        ]);
        $proposals = $proposalsQuery->latest()->get();
        $proposals->each(function (Proposal $proposal) use ($request, $reviewAssignments): void {
            $currentAction = $proposal->currentAction;
            $identity = [
                'user_id' => (int) $request->user()->getKey(),
                'user_type' => $request->user()::class,
            ];
            $proposal->process?->phases
                ->flatMap(fn (Phase $phase) => $phase->actions ?? collect())
                ->each(function (Action $action) use ($proposal, $identity): void {
                    $currentRound = (int) $proposal->current_action_id === (int) $action->id
                        ? $this->formResponseRound($proposal, $action)
                        : null;
                    $action->documents?->each(function (Document $document) use (
                        $proposal,
                        $identity,
                        $action,
                        $currentRound,
                    ): void {
                        $responses = $proposal->formResponses
                            ->where('document_id', $document->id)
                            ->where('action_id', $action->id)
                            ->where('user_id', $identity['user_id'])
                            ->where('user_type', $identity['user_type']);
                        $response = $currentRound === null
                            ? $responses->sortByDesc('round')->first()
                            : $responses->firstWhere('round', $currentRound);

                        $document->setAttribute('form_response', $response?->answers);
                    });
                });
            $reviewerGroupSet = $currentAction?->action_type === 'review'
                ? $this->effectiveReviewerGroupSet($proposal, $currentAction)
                : ['key' => 'all', 'reviewer_groups' => []];
            $reviewerGroupSetKey = $reviewerGroupSet['key'];
            $isMainReviewer = $currentAction?->action_type === 'review'
                && $this->isMainReviewer($request, $currentAction, $proposal);
            $reviewRound = $currentAction?->action_type === 'review'
                ? $this->currentReviewRound($proposal, $currentAction)
                : null;
            $reviewerAssignments = $reviewRound === null
                ? collect()
                : ProposalActionReviewer::query()
                    ->where('proposal_id', $proposal->id)
                    ->where('action_id', $currentAction->id)
                    ->where('round', $reviewRound)
                    ->where('reviewer_group_set_key', $reviewerGroupSetKey)
                    ->orderBy('id')
                    ->get();
            $currentIdentity = $reviewAssignments->identity($request);
            $currentAssignment = $reviewerAssignments->first(
                fn (ProposalActionReviewer $reviewer): bool => (int) $reviewer->user_id === $currentIdentity['user_id']
                    && $reviewer->user_type === $currentIdentity['user_type'],
            );
            $reviewGroups = collect($reviewerGroupSet['reviewer_groups']);
            $subReviewerGroups = $reviewGroups->skip(1)->values();
            $hasMainReviewerRole = $currentAction !== null
                && $this->mainReviewerRoleId($currentAction, $proposal) !== null;
            $canReview = $currentAction?->action_type === 'review'
                && ($hasMainReviewerRole
                    ? $isMainReviewer || $currentAssignment !== null
                    : $this->userCanReviewAction($request, $currentAction, $proposal));
            $reviewerGroups = $subReviewerGroups->map(function (array $group) use (
                $isMainReviewer,
                $reviewAssignments,
                $request,
                $reviewerAssignments,
                $reviewerGroupSetKey,
            ): array {
                $roleId = isset($group['role_ids'][0]) ? (int) $group['role_ids'][0] : null;
                $groupId = (string) ($group['id'] ?? '');
                $assignment = $reviewerAssignments->first(
                    fn (ProposalActionReviewer $reviewer): bool => $reviewer->reviewer_group_id === $groupId
                        && $reviewer->reviewer_group_set_key === $reviewerGroupSetKey,
                );
                $candidates = $isMainReviewer && $roleId !== null
                    ? $reviewAssignments->usersForRoles($request, [$roleId])
                    : [];

                return [
                    'id' => $groupId,
                    'name' => (string) ($group['name'] ?? 'Reviewer group'),
                    'role_id' => $roleId,
                    'candidates' => array_values(array_filter(
                        $candidates,
                        fn (array $candidate): bool => $candidate['id'] !== (int) $request->user()->getKey()
                            || $candidate['user_type'] !== $request->user()::class,
                    )),
                    'assigned_reviewer_id' => $assignment === null
                        ? null
                        : $assignment->user_type.':'.$assignment->user_id,
                ];
            });
            $requiredGroupIds = $reviewerGroups->pluck('id')->all();
            $areAllSubGroupsAssigned = $reviewerGroups->every(
                fn (array $group): bool => $group['assigned_reviewer_id'] !== null,
            );
            $canSubmitDecision = $isMainReviewer
                && $areAllSubGroupsAssigned
                && $reviewerAssignments
                    ->filter(fn (ProposalActionReviewer $reviewer): bool => in_array(
                        $reviewer->reviewer_group_id,
                        $requiredGroupIds,
                        true,
                    ))
                    ->every(fn (ProposalActionReviewer $reviewer): bool => $reviewer->responded_at !== null);
            $reviewerCandidates = $reviewerGroups->flatMap(
                fn (array $group): array => $group['candidates'],
            );
            $reviewerNames = $reviewerCandidates->keyBy(
                fn (array $candidate): string => $candidate['user_type'].':'.$candidate['id'],
            );
            $reviewGroupNames = $reviewGroups->keyBy('id')->map(
                fn (array $group): string => (string) ($group['name'] ?? 'Reviewer group'),
            );
            $proposal->setAttribute(
                'is_main_reviewer',
                $isMainReviewer,
            );
            $proposal->setAttribute('review_reviewer_group_set_key', $reviewerGroupSetKey);
            $proposal->setAttribute('requires_additional_reviewers', $reviewGroups->count() > 1);
            $proposal->setAttribute(
                'is_additional_reviewer',
                $currentAssignment !== null,
            );
            $proposal->setAttribute('can_submit_decision', $canSubmitDecision);
            $proposal->setAttribute(
                'review_members',
                $isMainReviewer
                    ? $reviewerAssignments->map(function (ProposalActionReviewer $reviewer) use ($reviewerNames, $reviewGroupNames): array {
                        $candidate = $reviewerNames->get($reviewer->user_type.':'.$reviewer->user_id);

                        return [
                            'id' => $reviewer->id,
                            'user_id' => (int) $reviewer->user_id,
                            'user_type' => $reviewer->user_type,
                            'reviewer_group_id' => $reviewer->reviewer_group_id,
                            'reviewer_group_name' => $reviewGroupNames->get(
                                $reviewer->reviewer_group_id,
                                'Reviewer group',
                            ),
                            'name' => $candidate['name'] ?? 'Assigned reviewer',
                            'decision' => $reviewer->decision,
                            'comment' => $reviewer->comment,
                            'responded_at' => $reviewer->responded_at?->toISOString(),
                        ];
                    })->values()
                    : [],
            );
            $proposal->setAttribute(
                'review_reviewer_groups',
                $isMainReviewer ? $reviewerGroups->values()->all() : [],
            );
            $proposal->setAttribute(
                'member_decision',
                $currentAssignment?->decision,
            );
            $proposal->setAttribute(
                'can_review',
                $canReview,
            );

            $reviewDocumentIds = $canReview && $currentAction
                ? $this->reviewerAssignedDocumentIds($request, $proposal, $currentAction)
                : [];
            $proposal->setAttribute(
                'review_documents',
                $reviewDocumentIds === []
                    ? []
                    : Document::query()
                        ->whereIn('id', $reviewDocumentIds)
                        ->orderBy('name')
                        ->get(['id', 'name', 'file_type', 'label', 'form_fields'])
                        ->each(function (Document $document) use ($proposal, $currentAction, $identity): void {
                            if ($currentAction === null) {
                                return;
                            }

                            $response = $proposal->formResponses
                                ->where('document_id', $document->id)
                                ->where('action_id', $currentAction->id)
                                ->where('round', $this->formResponseRound($proposal, $currentAction))
                                ->where('user_id', $identity['user_id'])
                                ->where('user_type', $identity['user_type'])
                                ->first();

                            $document->setAttribute('form_response', $response?->answers);
                        }),
            );
            $proposal->unsetRelation('formResponses');
        });
        $requestedProposalId = filter_var($request->query('proposal'), FILTER_VALIDATE_INT);

        return Inertia::render('Tenant/Proposals/Index', [
            'proposals' => $proposals,
            'isTracking' => $isTracking,
            'currentStorageDriver' => StorageConfig::activeForCurrentUser()?->driver ?? 'local',
            'viewerId' => $request->user()->getKey(),
            'viewerType' => $request->user()::class,
            'selectedProposalId' => is_int($requestedProposalId) && $proposals->contains('id', $requestedProposalId)
                ? $requestedProposalId
                : null,
        ]);
    }

    /**
     * @return list<int>
     */
    private function userRoleIds(Request $request): array
    {
        $user = $request->user();
        $pivotTable = $user instanceof SuperadminTenantUser ? 'role_tenant_user' : 'role_user';
        $userIdColumn = $user instanceof SuperadminTenantUser ? 'tenant_user_id' : 'user_id';

        return DB::connection('tenant')->table($pivotTable)
            ->where($userIdColumn, $user->getKey())
            ->pluck('role_id')
            ->map(fn ($roleId): int => (int) $roleId)
            ->all();
    }

    private function userHasPermission(Request $request, string $permissionName): bool
    {
        $user = $request->user();
        $pivotTable = $user instanceof SuperadminTenantUser ? 'role_tenant_user' : 'role_user';
        $userIdColumn = $user instanceof SuperadminTenantUser ? 'tenant_user_id' : 'user_id';

        return DB::connection('tenant')->table($pivotTable)
            ->join('permission_role', 'permission_role.role_id', '=', $pivotTable.'.role_id')
            ->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')
            ->where($pivotTable.'.'.$userIdColumn, $user->getKey())
            ->where('permissions.name', $permissionName)
            ->exists();
    }

    /**
     * @param  list<int>  $roleIds
     * @return list<int>
     */
    private function assignedReviewActionIds(array $roleIds): array
    {
        if ($roleIds === []) {
            return [];
        }

        $actionIds = DB::connection('tenant')->table('action_role')
            ->whereIn('role_id', $roleIds)
            ->pluck('action_id')
            ->map(fn ($actionId): int => (int) $actionId)
            ->all();
        $reviewerGroupActionIds = Action::query()
            ->where('action_type', 'review')
            ->get(['id', 'reviewer_groups', 'reviewer_group_sets'])
            ->filter(fn (Action $action): bool => collect([
                ...($action->reviewer_groups ?? []),
                ...collect($action->reviewer_group_sets ?? [])
                    ->flatMap(fn (array $set): array => $set['reviewer_groups'] ?? [])
                    ->all(),
            ])
                ->contains(fn (array $group): bool => array_intersect(
                    array_map('intval', $group['role_ids'] ?? []),
                    $roleIds,
                ) !== []))
            ->pluck('id')
            ->map(fn ($actionId): int => (int) $actionId)
            ->all();

        return array_values(array_unique([...$actionIds, ...$reviewerGroupActionIds]));
    }

    /**
     * Store a new proposal.
     */
    public function store(Request $request): RedirectResponse
    {
        $institutionId = $request->user()->getInstitutionId();
        abort_if($institutionId === null, 403);

        $validated = $request->validate([
            'title' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail) use ($request, $institutionId): void {
                    $proposalCount = Proposal::query()
                        ->where('institution_id', $institutionId)
                        ->where('user_id', $request->user()->getKey())
                        ->where('user_type', $request->user()::class)
                        ->whereNull('completed_at')
                        ->count();

                    if ($proposalCount >= 3) {
                        $fail('You can create up to 3 proposals.');
                    }
                },
            ],
        ]);

        $proposal = Proposal::create([
            'title' => $validated['title'],
            'user_id' => $request->user()->id,
            'user_type' => $request->user()::class,
            'institution_id' => $institutionId,
        ]);

        $firstProcess = Process::first();
        if ($firstProcess) {
            $firstPhase = Phase::query()
                ->where('process_id', $firstProcess->id)
                ->orderBy('order')
                ->orderBy('id')
                ->first();
            $firstAction = $firstPhase
                ? $this->firstActionInFollowingPhases($firstPhase, $firstProcess->id)
                : null;

            $proposal->update([
                'process_id' => $firstProcess->id,
                'current_phase_id' => $firstAction?->phase_id ?? $firstPhase?->id,
                'current_action_id' => $firstAction?->id,
            ]);
        }

        return redirect()->route('tenant.proposals.index', ['proposal' => $proposal->id]);
    }

    /**
     * Display the proposal and its document management page.
     */
    public function show(Request $request, Proposal $proposal): Response|RedirectResponse
    {
        abort_unless(
            $request->user()->getInstitutionId() !== null
                && (int) $request->user()->getInstitutionId() === (int) $proposal->institution_id,
            403,
        );

        if ((int) $request->user()->getKey() === (int) $proposal->user_id
            && $request->user()::class === $proposal->user_type) {
            return redirect()->route('tenant.proposals.index', ['proposal' => $proposal->id]);
        }

        $proposal->load([
            'process.phases' => fn ($query) => $query->orderBy('order')->orderBy('id'),
            'currentPhase',
            'currentAction.roles',
            'currentAction.documents',
            'documents',
            'formResponses',
        ]);

        abort_unless(
            $proposal->currentAction?->action_type === 'review'
                && $this->userCanReviewAction($request, $proposal->currentAction, $proposal),
            403,
        );

        $identity = [
            'user_id' => (int) $request->user()->getKey(),
            'user_type' => $request->user()::class,
        ];
        $reviewDocumentIds = $this->reviewerAssignedDocumentIds($request, $proposal, $proposal->currentAction);
        $reviewDocuments = $proposal->currentAction->documents
            ->whereIn('id', $reviewDocumentIds)
            ->values()
            ->each(function (Document $document) use ($proposal, $identity): void {
                $response = $proposal->formResponses
                    ->where('document_id', $document->id)
                    ->where('action_id', $proposal->currentAction->id)
                    ->where('round', $this->formResponseRound($proposal, $proposal->currentAction))
                    ->where('user_id', $identity['user_id'])
                    ->where('user_type', $identity['user_type'])
                    ->first();

                $document->setAttribute('form_response', $response?->answers);
            });
        $proposal->unsetRelation('formResponses');

        return Inertia::render('Tenant/Proposals/Show', [
            'proposal' => $proposal,
            'phases' => $proposal->process?->phases ?? collect(),
            'canReview' => true,
            'reviewDocuments' => $reviewDocuments,
            'currentStorageDriver' => StorageConfig::activeForCurrentUser()?->driver ?? 'local',
        ]);
    }

    /**
     * Store a newly uploaded document and attach it to the proposal.
     */
    public function storeDocument(Request $request, Proposal $proposal): RedirectResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB max
            'name' => ['required_without:required_document_id', 'string', 'max:255'],
            'label' => ['nullable', 'in:form,doc'],
            'phase_id' => ['nullable', 'integer'],
            'required_document_id' => ['nullable', 'integer'],
            'action_id' => ['nullable', 'integer'],
            'replace_document_id' => ['nullable', 'integer'],
            'form_field_id' => ['nullable', 'string', 'max:255'],
        ]);

        $this->authorizeProposalDocumentUpload(
            $request,
            $proposal,
            isset($validated['action_id']) ? (int) $validated['action_id'] : null,
            isset($validated['required_document_id']) ? (int) $validated['required_document_id'] : null,
        );

        $uploadedFile = $request->file('file');
        $name = $validated['name'] ?? null;
        $label = $validated['label'] ?? 'doc';
        $phaseId = $validated['phase_id'] ?? null;
        $requiredDocumentId = $validated['required_document_id'] ?? null;
        $actionId = $validated['action_id'] ?? null;
        $replaceDocumentId = $validated['replace_document_id'] ?? null;
        $formFieldId = $validated['form_field_id'] ?? null;
        $phase = null;

        if (($phaseId === null) !== ($requiredDocumentId === null)) {
            return redirect()->back()->withErrors([
                'phase_id' => 'A phase and its required document must be submitted together.',
            ]);
        }

        if ($replaceDocumentId !== null && ($phaseId === null || $requiredDocumentId === null)) {
            return redirect()->back()->withErrors([
                'replace_document_id' => 'Only a workflow-required proposal file can be replaced.',
            ]);
        }

        if ($phaseId !== null && $requiredDocumentId !== null) {
            $phase = Phase::query()
                ->whereKey($phaseId)
                ->where('process_id', $proposal->process_id)
                ->first();

            if (! $phase) {
                return redirect()->back()->withErrors(['phase_id' => 'The selected phase is not part of this proposal workflow.']);
            }

            $workflowPhases = Phase::query()
                ->where('process_id', $proposal->process_id)
                ->orderBy('order')
                ->orderBy('id')
                ->get();
            $targetPhaseIndex = $workflowPhases->search(
                fn (Phase $workflowPhase): bool => (int) $workflowPhase->id === (int) $phase->id
            );
            $currentPhaseIndex = $proposal->current_phase_id
                ? $workflowPhases->search(
                    fn (Phase $workflowPhase): bool => (int) $workflowPhase->id === (int) $proposal->current_phase_id
                )
                : false;
            $isPhaseAvailable = $currentPhaseIndex === false
                ? $proposal->current_phase_id === null && $targetPhaseIndex === 0
                : $targetPhaseIndex !== false && $targetPhaseIndex <= $currentPhaseIndex;

            if (! $isPhaseAvailable) {
                return redirect()->back()->withErrors(['phase_id' => 'Files can only be uploaded for the current or a completed phase.']);
            }

            $documentIsRequiredForPhase = Action::query()
                ->where('phase_id', $phase->id)
                ->whereHas('documents', fn ($query) => $query->whereKey($requiredDocumentId))
                ->exists();

            if (! $documentIsRequiredForPhase) {
                return redirect()->back()->withErrors(['required_document_id' => 'The selected document is not required for this phase.']);
            }

            $requiredDocument = Document::query()->findOrFail($requiredDocumentId);
            $name = $requiredDocument->name;
            $label = $requiredDocument->label;

            if ($formFieldId !== null) {
                if ($phaseId === null || $actionId === null || $requiredDocument->label !== 'form') {
                    return redirect()->back()->withErrors([
                        'form_field_id' => 'A form field upload must belong to a current workflow form.',
                    ]);
                }

                $this->validateFormFileField(
                    $requiredDocument,
                    $formFieldId,
                    $uploadedFile->getClientOriginalName(),
                    $uploadedFile->getClientOriginalExtension(),
                    $uploadedFile->getSize(),
                );
                $name = Str::limit(basename($uploadedFile->getClientOriginalName()), 255, '');
                $label = 'doc';
            }

            if (str_contains($requiredDocument->file_type, '/')
                && $formFieldId === null
                && strtolower($requiredDocument->file_type) !== strtolower($uploadedFile->getMimeType() ?? '')) {
                return redirect()->back()->withErrors([
                    'file' => "Upload a {$requiredDocument->file_type} file to match the required document.",
                ]);
            }

            if ($actionId !== null) {
                $actionIsCurrentRequirement = Action::query()
                    ->whereKey($actionId)
                    ->where('phase_id', $phase->id)
                    ->whereHas('documents', fn ($query) => $query->whereKey($requiredDocumentId))
                    ->whereKey($proposal->current_action_id)
                    ->exists();

                if (! $actionIsCurrentRequirement) {
                    return redirect()->back()->withErrors([
                        'action_id' => 'The selected document is not required by the current workflow action.',
                    ]);
                }
            }
        }

        $documentToReplace = $replaceDocumentId !== null
            ? $this->findProposalDocumentForReplacement(
                $proposal,
                (int) $replaceDocumentId,
                (int) $phaseId,
                (int) $requiredDocumentId,
            )
            : null;

        $storageDriver = 'unknown';
        $createdDocument = null;

        try {
            $storage = $this->getStorageDisk();
            $storageDriver = $storage['driver'];

            if ($uploadedFile) {
                $filePath = $storage['disk']->putFile('proposals/'.$proposal->id.'/documents', $uploadedFile);

                if (! is_string($filePath)) {
                    throw new \RuntimeException('The storage disk did not return a file path after upload.');
                }

                if ($documentToReplace) {
                    $this->replaceProposalDocumentFile(
                        $documentToReplace,
                        $filePath,
                        $uploadedFile->getMimeType() ?? 'application/octet-stream',
                        $storageDriver,
                    );
                } else {
                    $document = Document::create([
                        'name' => $name,
                        'file_path' => $filePath,
                        'file_type' => $uploadedFile->getMimeType() ?? 'application/octet-stream',
                        'label' => $label,
                        'storage_driver' => $storageDriver,
                    ]);
                    $createdDocument = $document;

                    $pivotData = $phase ? [
                        'phase_id' => $phase->id,
                        'required_document_id' => $requiredDocumentId,
                        'action_id' => $actionId,
                    ] : [];
                    if ($formFieldId !== null) {
                        $pivotData = [
                            ...$pivotData,
                            'form_field_id' => $formFieldId,
                            'form_uploader_id' => $request->user()->getKey(),
                            'form_uploader_type' => $request->user()::class,
                        ];
                    }
                    $proposal->documents()->attach($document->id, $pivotData);
                }

                if ($request->expectsJson() && $createdDocument !== null) {
                    return response()->json([
                        'document' => [
                            'id' => $createdDocument->id,
                            'name' => $createdDocument->name,
                        ],
                    ]);
                }

                return redirect()->back();
            }

            return redirect()->back()->withErrors(['file' => 'File upload failed.']);
        } catch (Throwable $exception) {
            report($exception);

            $reference = (string) Str::uuid();
            Log::error('proposal_document_upload_failed', [
                'proposal_id' => $proposal->id,
                'reference' => $reference,
                'storage_driver' => $storageDriver,
                'file_name' => $uploadedFile?->getClientOriginalName(),
                'exception' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);

            return redirect()->back()->withErrors([
                'storage' => "Storage service could not save the file. (Reference: {$reference})",
            ]);
        }
    }

    public function storeFormResponse(Request $request, Proposal $proposal, Document $document): RedirectResponse
    {
        $validated = $request->validate([
            'action_id' => ['required', 'integer'],
            'answers' => ['required', 'array'],
        ]);
        $action = Action::query()->with('documents')->findOrFail($validated['action_id']);
        $context = $this->authorizeProposalForm($request, $proposal, $action, $document);
        $answers = $this->validateProposalFormAnswers(
            $proposal,
            $document,
            $action,
            $request->user()->getKey(),
            $request->user()::class,
            $validated['answers'],
        );

        ProposalFormResponse::query()->updateOrCreate(
            [
                'proposal_id' => $proposal->id,
                'document_id' => $document->id,
                'action_id' => $action->id,
                'round' => $context['round'],
                'user_id' => $request->user()->getKey(),
                'user_type' => $request->user()::class,
            ],
            ['answers' => $answers],
        );

        return redirect()->back()->with('success', 'Form response saved.');
    }

    /**
     * @return array{round: int}
     */
    private function authorizeProposalForm(
        Request $request,
        Proposal $proposal,
        Action $action,
        Document $document,
    ): array {
        $this->authorizeProposalInstitution($request, $proposal);

        abort_unless(
            $document->label === 'form'
                && $action->documents->contains('id', $document->id)
                && (int) $proposal->current_action_id === (int) $action->id,
            403,
        );

        $isOwner = (int) $request->user()->getKey() === (int) $proposal->user_id
            && $request->user()::class === $proposal->user_type;

        if ($action->action_type === 'submit') {
            abort_unless($isOwner, 403);
        } else {
            abort_unless(
                $action->action_type === 'review'
                    && $this->userCanAccessReviewProposal($request, $proposal, $action)
                    && in_array(
                        (int) $document->id,
                        $this->reviewerAssignedDocumentIds($request, $proposal, $action),
                        true,
                    ),
                403,
            );
        }

        return ['round' => $this->formResponseRound($proposal, $action)];
    }

    /**
     * @param  array<string, mixed>  $answers
     * @return array<string, mixed>
     */
    private function validateProposalFormAnswers(
        Proposal $proposal,
        Document $document,
        Action $action,
        int|string $userId,
        string $userType,
        array $answers,
    ): array {
        $fields = collect($document->form_fields ?? [])->keyBy('id');
        $unknownFieldIds = array_diff(array_keys($answers), $fields->keys()->all());

        if ($unknownFieldIds !== []) {
            throw ValidationException::withMessages([
                'answers' => 'The submitted form contains an unknown field.',
            ]);
        }

        $validatedAnswers = [];

        foreach ($fields as $fieldId => $field) {
            $value = $answers[$fieldId] ?? null;

            if (($field['validation']['required'] ?? false) && (
                $value === null || $value === '' || $value === []
            )) {
                throw ValidationException::withMessages([
                    'answers.'.$fieldId => 'This field is required.',
                ]);
            }

            if ($value === null || $value === '') {
                $validatedAnswers[$fieldId] = null;

                continue;
            }

            $options = collect($field['options'] ?? [])->pluck('value')->all();
            $uploadedFormFile = null;

            if (($field['type'] ?? null) === 'file_upload' && is_array($value)
                && isset($value['document_id']) && is_numeric($value['document_id'])) {
                $uploadedFormFile = $proposal->documents()
                    ->whereKey((int) $value['document_id'])
                    ->wherePivot('required_document_id', $document->id)
                    ->wherePivot('action_id', $action->id)
                    ->wherePivot('form_field_id', (string) $fieldId)
                    ->wherePivot('form_uploader_id', $userId)
                    ->wherePivot('form_uploader_type', $userType)
                    ->first();

                if ($uploadedFormFile !== null) {
                    $value = [
                        'document_id' => $uploadedFormFile->id,
                        'name' => $uploadedFormFile->name,
                    ];
                }
            }

            $isValid = match ($field['type'] ?? null) {
                'short_text', 'long_text' => is_string($value),
                'multiple_choice', 'dropdown' => is_string($value) && in_array($value, $options, true),
                'checkboxes' => is_array($value)
                    && collect($value)->every(fn ($option): bool => is_string($option))
                    && count($value) === count(array_unique($value))
                    && collect($value)->every(fn ($option): bool => is_string($option) && in_array($option, $options, true)),
                'linear_scale' => is_numeric($value)
                    && (float) $value === (float) (int) $value
                    && (int) $value >= (int) ($field['scaleMin'] ?? 1)
                    && (int) $value <= (int) ($field['scaleMax'] ?? 5),
                'date' => is_string($value)
                    && ($date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value)) !== false
                    && $date->format('Y-m-d') === $value,
                'time' => is_string($value)
                    && preg_match('/\A(?:[01]\d|2[0-3]):[0-5]\d\z/', $value) === 1,
                'signature' => is_string($value)
                    && strlen($value) <= 1_000_000
                    && preg_match('/\Adata:image\/png;base64,[A-Za-z0-9+\/=]+\z/', $value) === 1
                    && str_starts_with(
                        base64_decode(substr($value, strlen('data:image/png;base64,')), true) ?: '',
                        "\x89PNG\r\n\x1a\n",
                    ),
                'file_upload' => is_array($value) && $uploadedFormFile !== null,
                default => false,
            };

            if (! $isValid) {
                throw ValidationException::withMessages([
                    'answers.'.$fieldId => 'The submitted answer is invalid.',
                ]);
            }

            if (is_string($value) && isset($field['validation']['maxLength'])
                && mb_strlen($value) > (int) $field['validation']['maxLength']) {
                throw ValidationException::withMessages([
                    'answers.'.$fieldId => 'This answer is too long.',
                ]);
            }

            if (is_string($value) && isset($field['validation']['minLength'])
                && mb_strlen($value) < (int) $field['validation']['minLength']) {
                throw ValidationException::withMessages([
                    'answers.'.$fieldId => 'This answer is too short.',
                ]);
            }

            $validatedAnswers[$fieldId] = $value;
        }

        return $validatedAnswers;
    }

    /**
     * @return array<string, mixed>
     */
    private function validateFormFileField(
        Document $form,
        string $fieldId,
        string $originalFileName,
        string $fileExtension,
        int $fileSize,
    ): array {
        abort_unless($form->label === 'form', 422, 'The selected document is not a form.');

        $field = collect($form->form_fields ?? [])
            ->first(fn (array $candidate): bool => (string) ($candidate['id'] ?? '') === $fieldId);

        abort_unless(
            $field !== null && ($field['type'] ?? null) === 'file_upload',
            422,
            'The selected form field does not accept file uploads.',
        );

        $validation = $field['validation'] ?? [];
        $maxFileSize = min((int) ($validation['maxFileSize'] ?? 10 * 1024 * 1024), 10 * 1024 * 1024);
        $acceptedExtensions = collect($validation['fileTypes'] ?? [])
            ->map(fn (string $type): string => strtolower(ltrim(trim($type), '*.')))
            ->filter()
            ->all();

        if ($fileSize < 1 || $fileSize > $maxFileSize) {
            throw ValidationException::withMessages([
                'file' => 'The selected file exceeds the maximum size for this form field.',
            ]);
        }

        if ($acceptedExtensions !== [] && ! in_array(strtolower($fileExtension), $acceptedExtensions, true)) {
            throw ValidationException::withMessages([
                'file' => "The selected file type is not allowed for the form field \"{$field['label']}\".",
            ]);
        }

        if (basename($originalFileName) !== $originalFileName) {
            throw ValidationException::withMessages([
                'file' => 'The selected file name is invalid.',
            ]);
        }

        return $field;
    }

    private function formResponseRound(Proposal $proposal, Action $action): int
    {
        if ($action->action_type === 'review') {
            return $this->currentReviewRound($proposal, $action);
        }

        return $proposal->actionTransitions()
            ->where('action_id', $action->id)
            ->count() + 1;
    }

    private function ensureAssignedFormsCompleted(
        Request $request,
        Proposal $proposal,
        Action $action,
    ): void {
        $assignedDocumentIds = $this->reviewerAssignedDocumentIds($request, $proposal, $action);
        $identity = [
            'user_id' => (int) $request->user()->getKey(),
            'user_type' => $request->user()::class,
        ];
        $missingForm = $action->documents()
            ->where('documents.label', 'form')
            ->whereIn('documents.id', $assignedDocumentIds)
            ->get()
            ->first(fn (Document $document): bool => ! ProposalFormResponse::query()
                ->where('proposal_id', $proposal->id)
                ->where('document_id', $document->id)
                ->where('action_id', $action->id)
                ->where('round', $this->formResponseRound($proposal, $action))
                ->where('user_id', $identity['user_id'])
                ->where('user_type', $identity['user_type'])
                ->exists());

        if ($missingForm) {
            throw ValidationException::withMessages([
                'decision' => "Complete the assigned form \"{$missingForm->name}\" before submitting your review.",
            ]);
        }
    }

    public function directUploadUrl(Request $request, Proposal $proposal): JsonResponse
    {
        $validated = $request->validate([
            'file_name' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', 'max:255'],
            'file_size' => ['required', 'integer', 'min:1', 'max:10485760'],
            'phase_id' => ['required', 'integer'],
            'required_document_id' => ['required', 'integer'],
            'action_id' => ['nullable', 'integer'],
            'replace_document_id' => ['nullable', 'integer'],
            'form_field_id' => ['nullable', 'string', 'max:255'],
        ]);

        $this->authorizeProposalDocumentUpload(
            $request,
            $proposal,
            isset($validated['action_id']) ? (int) $validated['action_id'] : null,
            (int) $validated['required_document_id'],
        );

        $this->validateRequiredDocumentUpload(
            $proposal,
            (int) $validated['phase_id'],
            (int) $validated['required_document_id'],
            isset($validated['action_id']) ? (int) $validated['action_id'] : null,
            $validated['content_type'],
        );
        if (isset($validated['form_field_id'])) {
            $requiredDocument = Document::query()->findOrFail($validated['required_document_id']);
            $this->validateFormFileField(
                $requiredDocument,
                $validated['form_field_id'],
                $validated['file_name'],
                pathinfo($validated['file_name'], PATHINFO_EXTENSION),
                (int) $validated['file_size'],
            );
        }

        $documentToReplace = isset($validated['replace_document_id'])
            ? $this->findProposalDocumentForReplacement(
                $proposal,
                (int) $validated['replace_document_id'],
                (int) $validated['phase_id'],
                (int) $validated['required_document_id'],
            )
            : null;

        $reference = (string) Str::uuid();
        $storageDriver = 's3';

        try {
            $config = StorageConfig::activeForCurrentUser();

            if (! $config) {
                return response()->json(['error' => 'No active storage configuration was found.'], 422);
            }

            if ($config->driver !== 's3') {
                return response()->json(['error' => 'Direct uploads require S3-compatible storage.'], 422);
            }

            $extension = preg_replace('/[^A-Za-z0-9]/', '', pathinfo($validated['file_name'], PATHINFO_EXTENSION));
            $path = 'proposals/'.$proposal->id.'/documents/'.$reference.($extension ? '.'.$extension : '');
            $client = new S3Client([
                'version' => 'latest',
                'region' => $config->region ?? 'us-east-1',
                'endpoint' => $config->endpoint,
                'credentials' => ['key' => $config->access_key, 'secret' => $config->secret_key],
                'use_path_style_endpoint' => true,
            ]);
            $command = $client->getCommand('PutObject', [
                'Bucket' => $config->bucket,
                'Key' => $path,
                'ContentType' => $validated['content_type'],
            ]);

            return response()->json([
                'url' => (string) $client->createPresignedRequest($command, '+10 minutes')->getUri(),
                'path' => $path,
                'reference' => $reference,
            ]);
        } catch (Throwable $exception) {
            report($exception);
            Log::error('proposal_direct_upload_url_failed', [
                'proposal_id' => $proposal->id,
                'reference' => $reference,
                'storage_driver' => $storageDriver,
                'exception' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'error' => "Storage service could not prepare the upload. (Reference: {$reference})",
            ], 500);
        }
    }

    public function completeDirectUpload(Request $request, Proposal $proposal): JsonResponse
    {
        $validated = $request->validate([
            'content_type' => ['required', 'string', 'max:255'],
            'file_size' => ['required', 'integer', 'min:1', 'max:10485760'],
            'file_name' => ['required', 'string', 'max:255'],
            'path' => ['required', 'string', 'max:1024'],
            'reference' => ['required', 'uuid'],
            'phase_id' => ['required', 'integer'],
            'required_document_id' => ['required', 'integer'],
            'action_id' => ['nullable', 'integer'],
            'replace_document_id' => ['nullable', 'integer'],
            'form_field_id' => ['nullable', 'string', 'max:255'],
        ]);

        $this->authorizeProposalDocumentUpload(
            $request,
            $proposal,
            isset($validated['action_id']) ? (int) $validated['action_id'] : null,
            (int) $validated['required_document_id'],
        );

        $this->validateRequiredDocumentUpload(
            $proposal,
            (int) $validated['phase_id'],
            (int) $validated['required_document_id'],
            isset($validated['action_id']) ? (int) $validated['action_id'] : null,
            $validated['content_type'],
        );
        if (isset($validated['form_field_id'])) {
            $requiredDocument = Document::query()->findOrFail($validated['required_document_id']);
            $this->validateFormFileField(
                $requiredDocument,
                $validated['form_field_id'],
                $validated['file_name'],
                pathinfo($validated['file_name'], PATHINFO_EXTENSION),
                (int) $validated['file_size'],
            );
        }

        $documentToReplace = isset($validated['replace_document_id'])
            ? $this->findProposalDocumentForReplacement(
                $proposal,
                (int) $validated['replace_document_id'],
                (int) $validated['phase_id'],
                (int) $validated['required_document_id'],
            )
            : null;

        $reference = $validated['reference'];
        $pathPrefix = 'proposals/'.$proposal->id.'/documents/'.$reference;
        $pathSuffix = substr($validated['path'], strlen($pathPrefix));

        if (! str_starts_with($validated['path'], $pathPrefix)
            || ($pathSuffix !== '' && ! preg_match('/\A\.[A-Za-z0-9]{1,12}\z/', $pathSuffix))) {
            return response()->json(['error' => 'The uploaded file path is invalid.'], 422);
        }

        $storageDriver = 's3';
        $disk = null;

        try {
            $config = StorageConfig::activeForCurrentUser();

            if (! $config) {
                return response()->json(['error' => 'No active storage configuration was found.'], 422);
            }

            if ($config->driver !== 's3') {
                return response()->json(['error' => 'Direct uploads require S3-compatible storage.'], 422);
            }

            $storageDriver = $config->driver;
            $disk = Storage::build($config->toFilesystemConfig());

            if (! $disk->exists($validated['path'])) {
                return response()->json(['error' => 'The direct upload was not found in storage.'], 404);
            }

            if ($disk->size($validated['path']) !== (int) $validated['file_size']) {
                $disk->delete($validated['path']);

                return response()->json(['error' => 'The uploaded file size does not match the requested size.'], 422);
            }

            $requiredDocument = Document::query()->findOrFail($validated['required_document_id']);

            if ($documentToReplace) {
                $this->replaceProposalDocumentFile(
                    $documentToReplace,
                    $validated['path'],
                    $validated['content_type'],
                    $storageDriver,
                );
            } else {
                $document = Document::create([
                    'name' => isset($validated['form_field_id'])
                        ? Str::limit(basename($validated['file_name']), 255, '')
                        : $requiredDocument->name,
                    'file_path' => $validated['path'],
                    'file_type' => $validated['content_type'],
                    'label' => isset($validated['form_field_id']) ? 'doc' : $requiredDocument->label,
                    'storage_driver' => $storageDriver,
                ]);
                $pivotData = [
                    'phase_id' => $validated['phase_id'],
                    'required_document_id' => $requiredDocument->id,
                    'action_id' => $validated['action_id'] ?? null,
                ];
                if (isset($validated['form_field_id'])) {
                    $pivotData = [
                        ...$pivotData,
                        'form_field_id' => $validated['form_field_id'],
                        'form_uploader_id' => $request->user()->getKey(),
                        'form_uploader_type' => $request->user()::class,
                    ];
                }
                $proposal->documents()->attach($document->id, $pivotData);
            }

            return response()->json([
                'message' => 'Proposal file uploaded.',
                'document' => isset($document) ? ['id' => $document->id, 'name' => $document->name] : null,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            Log::error('proposal_direct_upload_completion_failed', [
                'proposal_id' => $proposal->id,
                'reference' => $reference,
                'path' => $validated['path'],
                'storage_driver' => $storageDriver,
                'exception' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'error' => "Storage service could not complete the upload. (Reference: {$reference})",
            ], 500);
        }
    }

    /**
     * @return array{phase: Phase, document: Document}
     */
    private function validateRequiredDocumentUpload(
        Proposal $proposal,
        int $phaseId,
        int $requiredDocumentId,
        ?int $actionId,
        string $contentType,
    ): array {
        $phase = Phase::query()
            ->whereKey($phaseId)
            ->where('process_id', $proposal->process_id)
            ->first();

        if (! $phase) {
            throw ValidationException::withMessages([
                'phase_id' => 'The selected phase is not part of this proposal workflow.',
            ]);
        }

        $workflowPhases = Phase::query()
            ->where('process_id', $proposal->process_id)
            ->orderBy('order')
            ->orderBy('id')
            ->get();
        $targetPhaseIndex = $workflowPhases->search(
            fn (Phase $workflowPhase): bool => (int) $workflowPhase->id === (int) $phase->id
        );
        $currentPhaseIndex = $proposal->current_phase_id
            ? $workflowPhases->search(
                fn (Phase $workflowPhase): bool => (int) $workflowPhase->id === (int) $proposal->current_phase_id
            )
            : false;
        $isPhaseAvailable = $currentPhaseIndex === false
            ? $proposal->current_phase_id === null && $targetPhaseIndex === 0
            : $targetPhaseIndex !== false && $targetPhaseIndex <= $currentPhaseIndex;

        if (! $isPhaseAvailable) {
            throw ValidationException::withMessages([
                'phase_id' => 'Files can only be uploaded for the current or a completed phase.',
            ]);
        }

        $requiredDocument = Document::query()->findOrFail($requiredDocumentId);
        $documentIsRequiredForPhase = Action::query()
            ->where('phase_id', $phase->id)
            ->whereHas('documents', fn ($query) => $query->whereKey($requiredDocumentId))
            ->exists();

        if (! $documentIsRequiredForPhase) {
            throw ValidationException::withMessages([
                'required_document_id' => 'The selected document is not required for this phase.',
            ]);
        }

        if (str_contains($requiredDocument->file_type, '/')
            && strtolower($requiredDocument->file_type) !== strtolower($contentType)) {
            throw ValidationException::withMessages([
                'file' => "Upload a {$requiredDocument->file_type} file to match the required document.",
            ]);
        }

        if ($actionId !== null) {
            $actionIsCurrentRequirement = Action::query()
                ->whereKey($actionId)
                ->where('phase_id', $phase->id)
                ->whereHas('documents', fn ($query) => $query->whereKey($requiredDocumentId))
                ->whereKey($proposal->current_action_id)
                ->exists();

            if (! $actionIsCurrentRequirement) {
                throw ValidationException::withMessages([
                    'action_id' => 'The selected document is not required by the current workflow action.',
                ]);
            }

            $currentAction = Action::query()
                ->with('documents')
                ->findOrFail($actionId);

            if (! in_array(
                $requiredDocumentId,
                $this->requiredDocumentIdsForAction($proposal, $currentAction),
                true,
            )) {
                throw ValidationException::withMessages([
                    'required_document_id' => "The selected document is not required for the proposal's recorded outcomes.",
                ]);
            }
        }

        if (
            $actionId === null
            && (int) $proposal->current_phase_id === (int) $phase->id
            && $proposal->current_action_id !== null
        ) {
            $currentAction = Action::query()
                ->with('documents')
                ->find($proposal->current_action_id);
            $hasOutcomeSpecificRequirements = ! empty($currentAction?->review_decision_document_sets)
                || collect($currentAction?->reviewer_groups ?? [])
                    ->contains(fn (array $group): bool => ! empty($group['decision_document_sets']))
                || ! empty($currentAction?->reviewer_group_sets);

            if (
                $currentAction
                && $hasOutcomeSpecificRequirements
                && ! in_array(
                    $requiredDocumentId,
                    $this->requiredDocumentIdsForAction($proposal, $currentAction),
                    true,
                )
            ) {
                throw ValidationException::withMessages([
                    'required_document_id' => "The selected document is not required for the proposal's recorded outcomes.",
                ]);
            }
        }

        return ['phase' => $phase, 'document' => $requiredDocument];
    }

    /**
     * @return list<int>
     */
    private function requiredDocumentIdsForAction(Proposal $proposal, Action $action): array
    {
        $effectiveGroups = collect($this->effectiveReviewerGroupSet($proposal, $action)['reviewer_groups']);
        $allConfiguredGroups = collect($action->reviewer_groups ?? [])
            ->concat(collect($action->reviewer_group_sets ?? [])
                ->flatMap(fn (array $set): array => $set['reviewer_groups'] ?? []));
        $legacyDecisionSets = collect($action->review_decision_document_sets ?? [])
            ->whenEmpty(fn ($sets) => collect($action->reviewer_groups ?? [])
                ->flatMap(fn (array $group): array => $group['decision_document_sets'] ?? []));
        $configuredGroupDocumentIds = $allConfiguredGroups
            ->flatMap(fn (array $group): array => $group['document_ids'] ?? [])
            ->map(fn ($id): int => (int) $id)
            ->all();
        $legacyDocumentIds = $legacyDecisionSets
            ->flatMap(fn (array $set): array => $set['document_ids'] ?? [])
            ->map(fn ($id): int => (int) $id)
            ->all();
        $directDocumentIds = $action->documents()
            ->pluck('documents.id')
            ->map(fn ($id): int => (int) $id)
            ->diff([...$configuredGroupDocumentIds, ...$legacyDocumentIds])
            ->all();
        $activeGroupDocumentIds = $effectiveGroups
            ->flatMap(fn (array $group): array => $group['document_ids'] ?? [])
            ->map(fn ($id): int => (int) $id)
            ->all();

        return array_values(array_unique([
            ...$directDocumentIds,
            ...$activeGroupDocumentIds,
            ...$this->matchingLegacyOutcomeDocumentIds($proposal, $action),
        ]));
    }

    /**
     * @return list<int>
     */
    private function matchingLegacyOutcomeDocumentIds(Proposal $proposal, Action $action): array
    {
        $mostRecentDecision = $proposal->actionTransitions()
            ->whereNotNull('decision')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first(['action_id', 'decision']);

        if ($mostRecentDecision === null) {
            return [];
        }

        $reviewerGroups = collect($action->reviewer_groups ?? []);
        $decisionDocumentSets = collect($action->review_decision_document_sets ?? [])
            ->whenEmpty(fn ($sets) => $reviewerGroups
                ->flatMap(fn (array $group): array => $group['decision_document_sets'] ?? []));

        return $decisionDocumentSets
            ->filter(fn (array $set): bool => (int) ($set['action_id'] ?? 0) === (int) $mostRecentDecision->action_id
                && (string) ($set['decision_id'] ?? '') === (string) $mostRecentDecision->decision)
            ->flatMap(fn (array $set): array => $set['document_ids'] ?? [])
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function findProposalDocumentForReplacement(
        Proposal $proposal,
        int $documentId,
        int $phaseId,
        int $requiredDocumentId,
    ): Document {
        $document = $proposal->documents()
            ->whereKey($documentId)
            ->wherePivot('phase_id', $phaseId)
            ->wherePivot('required_document_id', $requiredDocumentId)
            ->first();

        if (! $document) {
            throw ValidationException::withMessages([
                'replace_document_id' => 'The selected file is not attached to this proposal requirement.',
            ]);
        }

        return $document;
    }

    private function replaceProposalDocumentFile(
        Document $document,
        string $filePath,
        string $fileType,
        string $storageDriver,
    ): void {
        $previousPath = $document->file_path;
        $previousStorageDriver = $document->storage_driver ?? 'local';

        $document->update([
            'file_path' => $filePath,
            'file_type' => $fileType,
            'storage_driver' => $storageDriver,
        ]);

        if ($previousPath === $filePath && $previousStorageDriver === $storageDriver) {
            return;
        }

        try {
            $previousStorage = $this->getStorageDisk($previousStorageDriver);

            if (! $previousStorage['disk']->delete($previousPath)) {
                Log::warning('proposal_replaced_file_cleanup_failed', [
                    'document_id' => $document->id,
                    'storage_driver' => $previousStorageDriver,
                    'file_path' => $previousPath,
                ]);
            }
        } catch (Throwable $exception) {
            report($exception);
            Log::warning('proposal_replaced_file_cleanup_failed', [
                'document_id' => $document->id,
                'storage_driver' => $previousStorageDriver,
                'file_path' => $previousPath,
                'exception' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * Delete a document from a proposal.
     */
    public function destroyDocument(Request $request, Proposal $proposal, Document $document): RedirectResponse
    {
        $this->authorizeProposalOwner($request, $proposal);

        // Check if the document belongs to this proposal
        if ($proposal->documents()->where('document_id', $document->id)->exists()) {
            $proposal->documents()->detach($document->id);

            // Optionally, delete the actual file and document record if it's not used elsewhere
            if ($document->proposals()->count() === 0 && $document->actions()->count() === 0) {
                $storage = $this->getStorageDisk($document->storage_driver ?? 'local');
                $storage['disk']->delete($document->file_path);
                $document->delete();
            }
        }

        return redirect()->back();
    }

    /**
     * Submit the proposal and advance its workflow.
     */
    public function submit(Request $request, Proposal $proposal): RedirectResponse
    {
        $this->authorizeProposalOwner($request, $proposal);

        return $this->completeCurrentAction($request, $proposal, null);
    }

    public function assignReviewers(
        Request $request,
        Proposal $proposal,
        ReviewAssignmentService $reviewAssignments,
    ): RedirectResponse {
        $this->authorizeProposalInstitution($request, $proposal);

        $action = Action::query()->find($proposal->current_action_id);
        abort_unless($action?->action_type === 'review', 409);
        abort_unless($this->isMainReviewer($request, $action, $proposal), 403);

        $validated = $request->validate([
            'reviewer_group_set_key' => ['required', 'string', 'max:255'],
            'assignments' => ['required', 'array', 'min:1', 'max:20'],
            'assignments.*.reviewer_group_id' => ['required', 'string', 'distinct'],
            'assignments.*.reviewer' => ['required', 'string'],
        ]);
        $reviewerGroupSet = $this->effectiveReviewerGroupSet($proposal, $action);
        abort_unless($validated['reviewer_group_set_key'] === $reviewerGroupSet['key'], 409);
        $reviewerGroupSetKey = $reviewerGroupSet['key'];
        $subReviewerGroups = collect($reviewerGroupSet['reviewer_groups'])->skip(1)->values();
        abort_unless($subReviewerGroups->isNotEmpty(), 409);
        $assignments = collect($validated['assignments']);
        $submittedGroupIds = $assignments->pluck('reviewer_group_id')->sort()->values()->all();
        $expectedGroupIds = $subReviewerGroups->map(
            fn (array $group): string => (string) ($group['id'] ?? ''),
        );

        if ($submittedGroupIds !== $expectedGroupIds->sort()->values()->all()) {
            throw ValidationException::withMessages([
                'assignments' => 'Assign exactly one reviewer to every additional reviewer group.',
            ]);
        }

        $mainReviewer = $reviewAssignments->identity($request);
        $seenReviewerIds = [];
        $validatedAssignments = [];

        foreach ($subReviewerGroups as $group) {
            $groupId = (string) $group['id'];
            $roleId = (int) ($group['role_ids'][0] ?? 0);
            $assignment = $assignments->firstWhere('reviewer_group_id', $groupId);
            $reviewerId = $assignment['reviewer'];
            $eligibleReviewers = collect($reviewAssignments->usersForRoles($request, [$roleId]))
                ->keyBy(fn (array $candidate): string => $candidate['user_type'].':'.$candidate['id']);
            $candidate = $eligibleReviewers->get($reviewerId);

            if (
                $candidate === null
                || ($candidate['id'] === $mainReviewer['user_id'] && $candidate['user_type'] === $mainReviewer['user_type'])
                || in_array($reviewerId, $seenReviewerIds, true)
            ) {
                throw ValidationException::withMessages([
                    'assignments' => 'Choose one different user from the role configured for each reviewer group.',
                ]);
            }

            $seenReviewerIds[] = $reviewerId;
            $validatedAssignments[] = [
                'reviewer_group_id' => $groupId,
                'user_id' => $candidate['id'],
                'user_type' => $candidate['user_type'],
            ];
        }

        DB::connection('tenant')->transaction(function () use ($request, $proposal, $action, $reviewerGroupSetKey, $validatedAssignments, $mainReviewer): void {
            $lockedProposal = Proposal::query()
                ->whereKey($proposal->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedProposal->current_action_id !== (int) $action->id) {
                throw ValidationException::withMessages([
                    'reviewers' => 'The proposal has moved to another action.',
                ]);
            }

            abort_unless($this->isMainReviewer($request, $action, $lockedProposal), 403);
            abort_unless(
                $this->effectiveReviewerGroupSet($lockedProposal, $action)['key'] === $reviewerGroupSetKey,
                409,
            );

            $round = $this->currentReviewRound($lockedProposal, $action);
            $existingReviewers = ProposalActionReviewer::query()
                ->where('proposal_id', $lockedProposal->id)
                ->where('action_id', $action->id)
                ->where('round', $round)
                ->where('reviewer_group_set_key', $reviewerGroupSetKey)
                ->lockForUpdate()
                ->get();

            if ($existingReviewers->contains(fn (ProposalActionReviewer $reviewer): bool => $reviewer->responded_at !== null)) {
                throw ValidationException::withMessages([
                    'assignments' => 'Reviewers cannot be changed after a member has responded.',
                ]);
            }

            ProposalActionReviewer::query()
                ->where('proposal_id', $lockedProposal->id)
                ->where('action_id', $action->id)
                ->where('round', $round)
                ->where('reviewer_group_set_key', $reviewerGroupSetKey)
                ->delete();

            foreach ($validatedAssignments as $assignment) {
                ProposalActionReviewer::query()->create([
                    'proposal_id' => $lockedProposal->id,
                    'action_id' => $action->id,
                    'round' => $round,
                    'reviewer_group_set_key' => $reviewerGroupSetKey,
                    'reviewer_group_id' => $assignment['reviewer_group_id'],
                    'user_id' => $assignment['user_id'],
                    'user_type' => $assignment['user_type'],
                    'assigned_by_user_id' => $mainReviewer['user_id'],
                    'assigned_by_user_type' => $mainReviewer['user_type'],
                ]);
            }
        });

        return redirect()->back();
    }

    public function submitReviewerResponse(Request $request, Proposal $proposal): RedirectResponse
    {
        $this->authorizeProposalInstitution($request, $proposal);

        $validated = $request->validate([
            'decision' => ['required', 'string', 'max:255'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);
        $action = Action::query()->find($proposal->current_action_id);
        abort_unless($action?->action_type === 'review', 409);
        abort_unless($this->isValidReviewDecision($action, $validated['decision']), 422);

        $identity = [
            'user_id' => (int) $request->user()->getKey(),
            'user_type' => $request->user()::class,
        ];

        DB::connection('tenant')->transaction(function () use ($proposal, $action, $identity, $validated): void {
            $lockedProposal = Proposal::query()
                ->whereKey($proposal->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedProposal->current_action_id !== (int) $action->id) {
                throw ValidationException::withMessages([
                    'decision' => 'The proposal has moved to another action.',
                ]);
            }

            $round = $this->currentReviewRound($lockedProposal, $action);
            $reviewerGroupSetKey = $this->effectiveReviewerGroupSet($lockedProposal, $action)['key'];
            $reviewer = ProposalActionReviewer::query()
                ->where('proposal_id', $lockedProposal->id)
                ->where('action_id', $action->id)
                ->where('round', $round)
                ->where('reviewer_group_set_key', $reviewerGroupSetKey)
                ->where('user_id', $identity['user_id'])
                ->where('user_type', $identity['user_type'])
                ->lockForUpdate()
                ->first();

            if ($reviewer === null) {
                abort(403);
            }

            if ($reviewer->responded_at !== null) {
                throw ValidationException::withMessages([
                    'decision' => 'You have already submitted your recommendation.',
                ]);
            }

            $this->ensureAssignedFormsCompleted($request, $lockedProposal, $action);

            $reviewer->update([
                'decision' => $validated['decision'],
                'comment' => $validated['comment'] ?? null,
                'responded_at' => now(),
            ]);
        });

        return redirect()->back();
    }

    public function review(Request $request, Proposal $proposal): RedirectResponse
    {
        $this->authorizeProposalInstitution($request, $proposal);
        $validated = $request->validate([
            'decision' => ['required', 'string', 'max:255'],
            'rejected_documents' => ['sometimes', 'array'],
            'rejected_documents.*.document_id' => ['required', 'integer', 'distinct'],
            'rejected_documents.*.comment' => ['nullable', 'string', 'max:2000'],
        ]);
        $action = Action::query()->find($proposal->current_action_id);

        abort_unless($action && $action->action_type === 'review', 409);
        $reviewerGroupSet = $this->effectiveReviewerGroupSet($proposal, $action);
        $reviewerGroupSetKey = $reviewerGroupSet['key'];
        $hasMainReviewerRole = $this->mainReviewerRoleId($action, $proposal) !== null;
        abort_unless(
            $hasMainReviewerRole
                ? $this->isMainReviewer($request, $action, $proposal)
                : $this->userCanReviewAction($request, $action, $proposal),
            403,
        );
        $this->ensureAssignedFormsCompleted($request, $proposal, $action);

        $requiredReviewerGroupIds = $this->subReviewerGroupIds($action, $proposal);

        if ($requiredReviewerGroupIds !== []) {
            $reviewRound = $this->currentReviewRound($proposal, $action);
            $reviewers = ProposalActionReviewer::query()
                ->where('proposal_id', $proposal->id)
                ->where('action_id', $action->id)
                ->where('round', $reviewRound)
                ->where('reviewer_group_set_key', $reviewerGroupSetKey)
                ->whereIn('reviewer_group_id', $requiredReviewerGroupIds);
            $assignedGroupIds = (clone $reviewers)->distinct()->pluck('reviewer_group_id')->all();

            if (array_diff($requiredReviewerGroupIds, $assignedGroupIds) !== []) {
                throw ValidationException::withMessages([
                    'decision' => 'Assign one reviewer to every sub-review group before submitting your decision.',
                ]);
            }

            if ((clone $reviewers)->whereNull('responded_at')->exists()) {
                throw ValidationException::withMessages([
                    'decision' => 'Wait until every assigned reviewer has submitted a recommendation.',
                ]);
            }
        }

        $rejectedDocuments = $validated['rejected_documents'] ?? [];
        if ($rejectedDocuments !== [] && ! $this->isRejectionDecision($action, $validated['decision'])) {
            throw ValidationException::withMessages([
                'rejected_documents' => 'Files can only be flagged for a rejection decision.',
            ]);
        }

        return $this->completeCurrentAction(
            $request,
            $proposal,
            $validated['decision'],
            true,
            $rejectedDocuments,
        );
    }

    /**
     * @param  array<int, array{document_id: int, comment?: string|null}>  $rejectedDocuments
     */
    private function completeCurrentAction(
        Request $request,
        Proposal $proposal,
        ?string $decision,
        bool $returnToTracking = false,
        array $rejectedDocuments = [],
    ): RedirectResponse {
        $result = DB::connection('tenant')->transaction(function () use ($request, $proposal, $decision, $rejectedDocuments): array {
            $lockedProposal = Proposal::query()
                ->whereKey($proposal->id)
                ->lockForUpdate()
                ->firstOrFail();
            $action = Action::query()
                ->with('documents')
                ->find($lockedProposal->current_action_id);

            if (! $action || (int) $action->id !== (int) $proposal->current_action_id) {
                return ['error' => 'This proposal has no current workflow action to submit.'];
            }

            if ((int) $action->phase_id !== (int) $lockedProposal->current_phase_id) {
                return ['error' => 'The current workflow action does not belong to the active phase.'];
            }

            if ($action->action_type === 'review' && $decision === null) {
                return ['error' => 'This action is waiting for a reviewer decision.'];
            }

            if ($action->action_type === 'review') {
                $reviewerGroupSet = $this->effectiveReviewerGroupSet($lockedProposal, $action);
                $reviewerGroupSetKey = $reviewerGroupSet['key'];
                $requiredReviewerGroupIds = $this->subReviewerGroupIds($action, $lockedProposal);
                if ($requiredReviewerGroupIds !== []) {
                    if (! $this->isMainReviewer($request, $action, $lockedProposal)) {
                        return ['error' => 'Only the main reviewer can submit this decision.'];
                    }

                    $round = $this->currentReviewRound($lockedProposal, $action);
                    $reviewers = ProposalActionReviewer::query()
                        ->where('proposal_id', $lockedProposal->id)
                        ->where('action_id', $action->id)
                        ->where('round', $round)
                        ->where('reviewer_group_set_key', $reviewerGroupSetKey)
                        ->whereIn('reviewer_group_id', $requiredReviewerGroupIds);
                    $assignedGroupIds = (clone $reviewers)->distinct()->pluck('reviewer_group_id')->all();
                    if (array_diff($requiredReviewerGroupIds, $assignedGroupIds) !== []) {
                        return ['error' => 'Assign one reviewer to every sub-review group before submitting your decision.'];
                    }

                    if ((clone $reviewers)->whereNull('responded_at')->exists()) {
                        return ['error' => 'Wait until every assigned reviewer has submitted a recommendation.'];
                    }
                } elseif (! $this->userCanReviewAction($request, $action, $lockedProposal)) {
                    return ['error' => 'You are not assigned to review this action.'];
                }
            }

            if ($action->action_type !== 'review' && $decision !== null) {
                return ['error' => 'This action does not accept a review decision.'];
            }

            if ($action->action_type !== 'review') {
                $uploadedRequiredDocumentIds = $lockedProposal->documents()
                    ->wherePivot('phase_id', $action->phase_id)
                    ->wherePivot('action_id', $action->id)
                    ->wherePivotNull('form_field_id')
                    ->whereNotNull('required_document_id')
                    ->pluck('required_document_id')
                    ->map(fn ($id): int => (int) $id)
                    ->all();
                $requiredDocumentIds = $this->requiredDocumentIdsForAction(
                    $lockedProposal,
                    $action,
                );
                $missingDocument = $action->documents->first(
                    fn (Document $document): bool => $document->label !== 'form'
                        && in_array((int) $document->id, $requiredDocumentIds, true)
                        && ! in_array((int) $document->id, $uploadedRequiredDocumentIds, true),
                );

                if ($missingDocument) {
                    return ['error' => "Upload the required document \"{$missingDocument->name}\" before submitting."];
                }

                $identity = [
                    'user_id' => (int) $request->user()->getKey(),
                    'user_type' => $request->user()::class,
                ];
                $missingForm = $action->documents->first(
                    fn (Document $document): bool => $document->label === 'form'
                        && in_array((int) $document->id, $requiredDocumentIds, true)
                        && ! ProposalFormResponse::query()
                            ->where('proposal_id', $lockedProposal->id)
                            ->where('document_id', $document->id)
                            ->where('action_id', $action->id)
                            ->where('round', $this->formResponseRound($lockedProposal, $action))
                            ->where('user_id', $identity['user_id'])
                            ->where('user_type', $identity['user_type'])
                            ->exists(),
                );

                if ($missingForm) {
                    return ['error' => "Complete the required form \"{$missingForm->name}\" before submitting."];
                }
            }

            if ($action->action_type === 'review' && ! $this->isValidReviewDecision($action, $decision)) {
                return ['error' => 'Choose a valid outcome for this review action.'];
            }

            if ($rejectedDocuments !== []) {
                if ($action->action_type !== 'review' || ! $this->isRejectionDecision($action, $decision)) {
                    return ['error' => 'Files can only be flagged for a rejection decision.'];
                }

                $proposalDocumentIds = $lockedProposal->documents()
                    ->pluck('documents.id')
                    ->map(fn ($id): int => (int) $id)
                    ->all();

                foreach ($rejectedDocuments as $rejectedDocument) {
                    if (! in_array((int) $rejectedDocument['document_id'], $proposalDocumentIds, true)) {
                        return ['error' => 'A flagged file does not belong to this proposal.'];
                    }
                }
            }

            if (
                $action->action_type === 'review'
                && $action->decision_mode !== 'custom'
                && $decision === 'deny'
                && $action->deny_action_id === null
                && $this->nextPhase($action->phase_id, $lockedProposal->process_id) !== null
            ) {
                return ['error' => 'Configure a deny route before completing this review action.'];
            }

            if ($action->action_type === 'review' && $action->decision_mode === 'custom') {
                $branch = collect($action->custom_decision_branches ?? [])
                    ->first(fn (array $item): bool => (string) ($item['id'] ?? '') === $decision);

                if (str_starts_with((string) ($branch['destination'] ?? ''), 'action:')) {
                    $targetActionId = (int) substr($branch['destination'], 7);
                    if (! Action::query()
                        ->whereKey($targetActionId)
                        ->where('phase_id', $action->phase_id)
                        ->exists()) {
                        return ['error' => 'The selected review outcome has an invalid configured route.'];
                    }
                }
            }

            $transition = [
                'action_id' => $action->id,
                'decision' => $decision,
                'user_id' => $request->user()->getKey(),
                'user_type' => $request->user()::class,
            ];
            if ($rejectedDocuments !== []) {
                $transition['rejected_documents'] = $rejectedDocuments;
            }
            $lockedProposal->actionTransitions()->create($transition);

            $destination = $this->resolveActionDestination($action, $decision, $lockedProposal->process_id);

            if ($destination instanceof Action) {
                if ((int) $destination->phase_id !== (int) $lockedProposal->current_phase_id) {
                    $lockedProposal->phaseTransitions()->create(['phase_id' => $destination->phase_id]);
                }

                $lockedProposal->update([
                    'current_phase_id' => $destination->phase_id,
                    'current_action_id' => $destination->id,
                ]);

                return ['advanced' => true];
            }

            if ($destination instanceof Phase) {
                $firstAction = $this->firstActionInFollowingPhases($destination, $lockedProposal->process_id);

                if ($firstAction) {
                    $lockedProposal->phaseTransitions()->create(['phase_id' => $firstAction->phase_id]);
                    $lockedProposal->update([
                        'current_phase_id' => $firstAction->phase_id,
                        'current_action_id' => $firstAction->id,
                    ]);

                    return ['advanced' => true];
                }
            }

            $lockedProposal->update([
                'current_action_id' => null,
                'completed_at' => now(),
            ]);

            return ['completed' => true];
        });

        if (isset($result['error'])) {
            return redirect()->back()->withErrors(['workflow' => $result['error']]);
        }

        $redirect = $returnToTracking
            ? redirect()->route('tenant.proposals.index', ['view' => 'tracking'])
            : redirect()->back();

        return $redirect->with('success', ! empty($result['completed']) ? 'Workflow completed.' : 'Action submitted successfully.');
    }

    private function resolveActionDestination(Action $action, ?string $decision, ?int $processId): Action|Phase|null
    {
        $actions = Action::query()
            ->where('phase_id', $action->phase_id)
            ->orderBy('order')
            ->orderBy('id')
            ->get();
        $actionIndex = $actions->search(fn (Action $item): bool => (int) $item->id === (int) $action->id);
        $nextAction = $actionIndex === false ? null : $actions[$actionIndex + 1] ?? null;

        if ($action->action_type !== 'review') {
            return $nextAction ?? $this->nextPhase($action->phase_id, $processId);
        }

        if ($action->decision_mode === 'custom') {
            $branch = collect($action->custom_decision_branches ?? [])
                ->first(fn (array $item): bool => (string) ($item['id'] ?? '') === $decision);
            $destination = $branch['destination'] ?? 'end';

            if (str_starts_with($destination, 'action:')) {
                return Action::query()->find((int) substr($destination, 7));
            }

            return $destination === 'next'
                ? ($nextAction ?? $this->nextPhase($action->phase_id, $processId))
                : null;
        }

        if ($decision === 'approve') {
            $approveAction = $action->approve_action_id
                ? Action::query()->find($action->approve_action_id)
                : null;

            return $approveAction ?? $nextAction ?? $this->nextPhase($action->phase_id, $processId);
        }

        return $action->deny_action_id
            ? Action::query()->find($action->deny_action_id)
            : null;
    }

    private function nextPhase(int $currentPhaseId, ?int $processId): ?Phase
    {
        if ($processId === null) {
            return null;
        }

        $currentPhase = Phase::query()->find($currentPhaseId);
        if (! $currentPhase) {
            return null;
        }

        return Phase::query()
            ->where('process_id', $processId)
            ->where(function ($query) use ($currentPhase): void {
                $query->where('order', '>', $currentPhase->order)
                    ->orWhere(function ($query) use ($currentPhase): void {
                        $query->where('order', $currentPhase->order)
                            ->where('id', '>', $currentPhase->id);
                    });
            })
            ->orderBy('order')
            ->orderBy('id')
            ->first();
    }

    private function firstActionInFollowingPhases(Phase $phase, ?int $processId): ?Action
    {
        $candidatePhase = $phase;

        do {
            $action = $candidatePhase->actions()->orderBy('order')->orderBy('id')->first();
            if ($action) {
                return $action;
            }

            $candidatePhase = $this->nextPhase($candidatePhase->id, $processId);
        } while ($candidatePhase);

        return null;
    }

    private function isValidReviewDecision(Action $action, ?string $decision): bool
    {
        if ($decision === null) {
            return false;
        }

        if ($action->decision_mode === 'custom') {
            return collect($action->custom_decision_branches ?? [])
                ->contains(fn (array $branch): bool => (string) ($branch['id'] ?? '') === $decision);
        }

        return in_array($decision, ['approve', 'deny'], true);
    }

    /**
     * @return array{key: string, reviewer_groups: array<int, array<string, mixed>>}
     */
    private function effectiveReviewerGroupSet(Proposal $proposal, Action $action): array
    {
        $mostRecentDecision = $proposal->actionTransitions()
            ->whereNotNull('decision')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first(['action_id', 'decision']);

        if ($mostRecentDecision !== null) {
            $key = (int) $mostRecentDecision->action_id.':'.(string) $mostRecentDecision->decision;
            $matchingSet = collect($action->reviewer_group_sets ?? [])
                ->first(fn (array $set): bool => (int) ($set['action_id'] ?? 0) === (int) $mostRecentDecision->action_id
                    && (string) ($set['decision_id'] ?? '') === (string) $mostRecentDecision->decision);

            if ($matchingSet !== null) {
                return [
                    'key' => $key,
                    'reviewer_groups' => $matchingSet['reviewer_groups'] ?? [],
                ];
            }
        }

        return [
            'key' => 'all',
            'reviewer_groups' => $action->reviewer_groups ?? [],
        ];
    }

    private function mainReviewerRoleId(Action $action, ?Proposal $proposal = null): ?int
    {
        $reviewerGroups = $proposal === null
            ? $action->reviewer_groups ?? []
            : $this->effectiveReviewerGroupSet($proposal, $action)['reviewer_groups'];
        $roleId = collect($reviewerGroups)
            ->first()['role_ids'][0] ?? null;

        return is_numeric($roleId) ? (int) $roleId : null;
    }

    /**
     * @return list<string>
     */
    private function subReviewerGroupIds(Action $action, ?Proposal $proposal = null): array
    {
        $reviewerGroups = $proposal === null
            ? $action->reviewer_groups ?? []
            : $this->effectiveReviewerGroupSet($proposal, $action)['reviewer_groups'];

        return collect($reviewerGroups)
            ->skip(1)
            ->map(fn (array $group): string => (string) ($group['id'] ?? ''))
            ->filter(fn (string $groupId): bool => $groupId !== '')
            ->values()
            ->all();
    }

    private function isMainReviewer(Request $request, Action $action, ?Proposal $proposal = null): bool
    {
        $mainReviewerRoleId = $this->mainReviewerRoleId($action, $proposal);

        return $this->isInstitutionAccount($request)
            || ($mainReviewerRoleId !== null
                && in_array($mainReviewerRoleId, $this->userRoleIds($request), true));
    }

    private function isInstitutionAccount(Request $request): bool
    {
        $user = $request->user();

        return $user instanceof User
            && ! ($user instanceof SuperadminTenantUser)
            && $user->role === 'institution';
    }

    private function currentReviewRound(Proposal $proposal, Action $action): int
    {
        return ProposalActionTransition::query()
            ->where('proposal_id', $proposal->id)
            ->where('action_id', $action->id)
            ->count() + 1;
    }

    private function authorizeProposalInstitution(Request $request, Proposal $proposal): void
    {
        abort_unless(
            $request->user()->getInstitutionId() !== null
                && (int) $request->user()->getInstitutionId() === (int) $proposal->institution_id,
            403,
        );
    }

    private function isRejectionDecision(Action $action, string $decision): bool
    {
        if ($action->decision_mode !== 'custom') {
            return $decision === 'deny';
        }

        $branch = collect($action->custom_decision_branches ?? [])
            ->first(fn (array $item): bool => (string) ($item['id'] ?? '') === $decision);

        return isset($branch['label'])
            && preg_match('/\b(reject|deny|decline)\b/i', $branch['label']) === 1;
    }

    private function userCanReviewAction(Request $request, Action $action, ?Proposal $proposal = null): bool
    {
        if ($this->isInstitutionAccount($request)) {
            return true;
        }

        $reviewerGroups = $proposal === null
            ? $action->reviewer_groups ?? []
            : $this->effectiveReviewerGroupSet($proposal, $action)['reviewer_groups'];
        $roleIds = array_values(array_unique([
            ...$action->roles()->pluck('roles.id')->map(fn ($id): int => (int) $id)->all(),
            ...collect($reviewerGroups)
                ->flatMap(fn (array $group): array => $group['role_ids'] ?? [])
                ->map(fn ($id): int => (int) $id)
                ->all(),
        ]));

        if ($roleIds === []) {
            return true;
        }

        return array_intersect($this->userRoleIds($request), $roleIds) !== [];
    }

    /**
     * Get the documents assigned to the groups available to this reviewer.
     *
     * @return list<int>
     */
    private function reviewerAssignedDocumentIds(Request $request, Proposal $proposal, Action $action): array
    {
        $reviewerGroupSet = $this->effectiveReviewerGroupSet($proposal, $action);
        $reviewerGroupSetKey = $reviewerGroupSet['key'];
        $reviewerGroups = collect($reviewerGroupSet['reviewer_groups']);

        if ($reviewerGroups->isEmpty()) {
            return $action->documents()
                ->pluck('documents.id')
                ->map(fn ($id): int => (int) $id)
                ->all();
        }

        $matchingOutcomeDocumentIds = $this->matchingLegacyOutcomeDocumentIds($proposal, $action);
        $groupDocumentIds = fn (array $group): array => [
            ...array_map('intval', $group['document_ids'] ?? []),
            ...$matchingOutcomeDocumentIds,
        ];

        if ($this->mainReviewerRoleId($action, $proposal) !== null && $this->isMainReviewer($request, $action, $proposal)) {
            $mainReviewerGroup = $reviewerGroups->first();

            return $mainReviewerGroup === null
                ? []
                : array_values(array_unique($groupDocumentIds($mainReviewerGroup)));
        }

        $identity = [
            'user_id' => (int) $request->user()->getKey(),
            'user_type' => $request->user()::class,
        ];
        $assignedGroupId = ProposalActionReviewer::query()
            ->where('proposal_id', $proposal->id)
            ->where('action_id', $action->id)
            ->where('round', $this->currentReviewRound($proposal, $action))
            ->where('reviewer_group_set_key', $reviewerGroupSetKey)
            ->where('user_id', $identity['user_id'])
            ->where('user_type', $identity['user_type'])
            ->value('reviewer_group_id');
        if ($assignedGroupId !== null) {
            $assignedGroup = $reviewerGroups->first(
                fn (array $group): bool => (string) ($group['id'] ?? '') === $assignedGroupId,
            );

            return $assignedGroup === null
                ? []
                : array_values(array_unique($groupDocumentIds($assignedGroup)));
        }

        $allGroupDocumentIds = $reviewerGroups
            ->flatMap(fn (array $group): array => [
                ...array_map('intval', $group['document_ids'] ?? []),
            ])
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->merge($matchingOutcomeDocumentIds)
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values();
        $userRoleIds = $this->userRoleIds($request);
        $assignedDocumentIds = $reviewerGroups
            ->filter(fn (array $group): bool => ($group['role_ids'] ?? []) === []
                || array_intersect(
                    $userRoleIds,
                    array_map('intval', $group['role_ids'] ?? []),
                ) !== [])
            ->flatMap(fn (array $group): array => $groupDocumentIds($group))
            ->map(fn ($id): int => (int) $id)
            ->all();
        $actionRoleIds = $action->roles()
            ->pluck('roles.id')
            ->map(fn ($id): int => (int) $id)
            ->all();
        $hasActionRoleAccess = $actionRoleIds === []
            || array_intersect($userRoleIds, $actionRoleIds) !== [];

        if ($hasActionRoleAccess) {
            $directDocumentIds = $action->documents()
                ->pluck('documents.id')
                ->map(fn ($id): int => (int) $id)
                ->diff($allGroupDocumentIds)
                ->all();
            $assignedDocumentIds = [...$assignedDocumentIds, ...$directDocumentIds];
        }

        return array_values(array_unique($assignedDocumentIds));
    }

    private function authorizeProposalDocumentUpload(
        Request $request,
        Proposal $proposal,
        ?int $actionId,
        ?int $requiredDocumentId,
    ): void {
        if (
            (int) $request->user()->getKey() === (int) $proposal->user_id
            && $request->user()::class === $proposal->user_type
            && $request->user()->getInstitutionId() !== null
            && (int) $request->user()->getInstitutionId() === (int) $proposal->institution_id
        ) {
            return;
        }

        abort_unless(
            $request->user()->getInstitutionId() !== null
                && (int) $request->user()->getInstitutionId() === (int) $proposal->institution_id
                && $actionId !== null
                && $requiredDocumentId !== null
                && (int) $proposal->current_action_id === $actionId,
            403,
        );

        $action = Action::query()->findOrFail($actionId);

        abort_unless(
            $action->action_type === 'review'
                && $this->userCanAccessReviewProposal($request, $proposal, $action)
                && in_array(
                    $requiredDocumentId,
                    $this->reviewerAssignedDocumentIds($request, $proposal, $action),
                    true,
                ),
            403,
        );
    }

    private function userCanAccessReviewProposal(
        Request $request,
        Proposal $proposal,
        Action $action,
    ): bool {
        if ($this->mainReviewerRoleId($action, $proposal) === null) {
            return $this->userCanReviewAction($request, $action, $proposal);
        }

        if ($this->isMainReviewer($request, $action, $proposal)) {
            return true;
        }

        $identity = [
            'user_id' => (int) $request->user()->getKey(),
            'user_type' => $request->user()::class,
        ];
        $round = $this->currentReviewRound($proposal, $action);

        return ProposalActionReviewer::query()
            ->where('proposal_id', $proposal->id)
            ->where('action_id', $action->id)
            ->where('round', $round)
            ->where('reviewer_group_set_key', $this->effectiveReviewerGroupSet($proposal, $action)['key'])
            ->where('user_id', $identity['user_id'])
            ->where('user_type', $identity['user_type'])
            ->exists();
    }

    private function authorizeProposalOwner(Request $request, Proposal $proposal): void
    {
        abort_unless(
            (int) $request->user()->getKey() === (int) $proposal->user_id
                && $request->user()::class === $proposal->user_type
                && $request->user()->getInstitutionId() !== null
                && (int) $request->user()->getInstitutionId() === (int) $proposal->institution_id,
            403,
        );
    }
}
