<?php

namespace App\Http\Controllers;

use App\Models\Action;
use App\Models\Document;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Proposal;
use App\Models\StorageConfig;
use App\Models\SuperadminTenantUser;
use App\Models\User;
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

    public function index(Request $request): Response
    {
        $isTracking = $request->query('view') === 'tracking';
        $institutionId = $request->user()->getInstitutionId();
        $proposalsQuery = Proposal::query();

        if ($institutionId === null) {
            $proposalsQuery->whereRaw('1 = 0');
        } else {
            $proposalsQuery->where('institution_id', $institutionId);
        }

        if (! $this->userHasPermission($request, 'proposal.view.all')) {
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
        ]);
        $proposals = $proposalsQuery->latest()->get();
        $proposals->each(function (Proposal $proposal) use ($request): void {
            $currentAction = $proposal->currentAction;
            $canReview = $currentAction?->action_type === 'review'
                && $this->userCanReviewAction($request, $currentAction);
            $proposal->setAttribute(
                'can_review',
                $canReview,
            );

            $reviewDocumentIds = $canReview && $currentAction
                ? $this->reviewerAssignedDocumentIds($request, $currentAction)
                : [];
            $proposal->setAttribute(
                'review_documents',
                $reviewDocumentIds === []
                    ? []
                    : Document::query()
                        ->whereIn('id', $reviewDocumentIds)
                        ->orderBy('name')
                        ->get(['id', 'name', 'file_type', 'label']),
            );
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
            ->get(['id', 'reviewer_groups'])
            ->filter(fn (Action $action): bool => collect($action->reviewer_groups ?? [])
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
        ]);

        abort_unless(
            $proposal->currentAction?->action_type === 'review'
                && $this->userCanReviewAction($request, $proposal->currentAction),
            403,
        );

        return Inertia::render('Tenant/Proposals/Show', [
            'proposal' => $proposal,
            'phases' => $proposal->process?->phases ?? collect(),
            'canReview' => true,
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

            if (str_contains($requiredDocument->file_type, '/')
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
                        'file_type' => $uploadedFile->getMimeType(),
                        'label' => $label,
                        'storage_driver' => $storageDriver,
                    ]);

                    $pivotData = $phase ? [
                        'phase_id' => $phase->id,
                        'required_document_id' => $requiredDocumentId,
                        'action_id' => $actionId,
                    ] : [];
                    $proposal->documents()->attach($document->id, $pivotData);
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
            'path' => ['required', 'string', 'max:1024'],
            'reference' => ['required', 'uuid'],
            'phase_id' => ['required', 'integer'],
            'required_document_id' => ['required', 'integer'],
            'action_id' => ['nullable', 'integer'],
            'replace_document_id' => ['nullable', 'integer'],
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
                    'name' => $requiredDocument->name,
                    'file_path' => $validated['path'],
                    'file_type' => $validated['content_type'],
                    'label' => $requiredDocument->label,
                    'storage_driver' => $storageDriver,
                ]);
                $proposal->documents()->attach($document->id, [
                    'phase_id' => $validated['phase_id'],
                    'required_document_id' => $requiredDocument->id,
                    'action_id' => $validated['action_id'] ?? null,
                ]);
            }

            return response()->json(['message' => 'Proposal file uploaded.']);
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
            $hasOutcomeSpecificRequirements = collect($currentAction?->reviewer_groups ?? [])
                ->contains(fn (array $group): bool => ! empty($group['decision_document_sets']));

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
        $reviewerGroups = collect($action->reviewer_groups ?? []);
        $decisionDocumentSets = $reviewerGroups
            ->flatMap(fn (array $group): array => $group['decision_document_sets'] ?? []);

        if ($decisionDocumentSets->isEmpty()) {
            return $action->documents
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->all();
        }

        $documentIds = $reviewerGroups
            ->flatMap(fn (array $group): array => $group['document_ids'] ?? [])
            ->map(fn ($id): int => (int) $id)
            ->all();
        $mostRecentDecision = $proposal->actionTransitions()
            ->whereNotNull('decision')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first(['action_id', 'decision']);

        foreach ($decisionDocumentSets as $set) {
            $sourceActionId = (int) ($set['action_id'] ?? 0);

            if (
                $mostRecentDecision
                && $sourceActionId !== 0
                && (int) $mostRecentDecision->action_id === $sourceActionId
                && (string) $mostRecentDecision->decision === (string) ($set['decision_id'] ?? '')
            ) {
                $documentIds = [
                    ...$documentIds,
                    ...array_map('intval', $set['document_ids'] ?? []),
                ];
            }
        }

        return array_values(array_unique($documentIds));
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

    public function review(Request $request, Proposal $proposal): RedirectResponse
    {
        abort_unless(
            $request->user()->getInstitutionId() !== null
                && (int) $request->user()->getInstitutionId() === (int) $proposal->institution_id,
            403,
        );
        $validated = $request->validate([
            'decision' => ['required', 'string', 'max:255'],
            'rejected_documents' => ['sometimes', 'array'],
            'rejected_documents.*.document_id' => ['required', 'integer', 'distinct'],
            'rejected_documents.*.comment' => ['nullable', 'string', 'max:2000'],
        ]);
        $action = Action::query()->find($proposal->current_action_id);

        abort_unless($action && $action->action_type === 'review', 409);
        abort_unless($this->userCanReviewAction($request, $action), 403);

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

            if ($action->action_type === 'review' && ! $this->userCanReviewAction($request, $action)) {
                return ['error' => 'You are not assigned to review this action.'];
            }

            if ($action->action_type !== 'review' && $decision !== null) {
                return ['error' => 'This action does not accept a review decision.'];
            }

            if ($action->action_type !== 'review') {
                $uploadedRequiredDocumentIds = $lockedProposal->documents()
                    ->wherePivot('phase_id', $action->phase_id)
                    ->wherePivot('action_id', $action->id)
                    ->whereNotNull('required_document_id')
                    ->pluck('required_document_id')
                    ->map(fn ($id): int => (int) $id)
                    ->all();
                $requiredDocumentIds = $this->requiredDocumentIdsForAction(
                    $lockedProposal,
                    $action,
                );
                $missingDocument = $action->documents->first(
                    fn (Document $document): bool => in_array((int) $document->id, $requiredDocumentIds, true)
                        && ! in_array((int) $document->id, $uploadedRequiredDocumentIds, true),
                );

                if ($missingDocument) {
                    return ['error' => "Upload the required document \"{$missingDocument->name}\" before submitting."];
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

    private function userCanReviewAction(Request $request, Action $action): bool
    {
        $user = $request->user();

        if (
            $user instanceof User
            && ! ($user instanceof SuperadminTenantUser)
            && $user->role === 'institution'
        ) {
            return true;
        }

        $roleIds = array_values(array_unique([
            ...$action->roles()->pluck('roles.id')->map(fn ($id): int => (int) $id)->all(),
            ...collect($action->reviewer_groups ?? [])
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
    private function reviewerAssignedDocumentIds(Request $request, Action $action): array
    {
        $reviewerGroups = collect($action->reviewer_groups ?? []);

        if ($reviewerGroups->isEmpty()) {
            return $action->documents()
                ->pluck('documents.id')
                ->map(fn ($id): int => (int) $id)
                ->all();
        }

        $allGroupDocumentIds = $reviewerGroups
            ->flatMap(fn (array $group): array => $group['document_ids'] ?? [])
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values();

        $user = $request->user();
        $isInstitutionReviewer = $user instanceof User
            && ! ($user instanceof SuperadminTenantUser)
            && $user->role === 'institution';

        if ($isInstitutionReviewer) {
            return $reviewerGroups
                ->flatMap(fn (array $group): array => $group['document_ids'] ?? [])
                ->map(fn ($id): int => (int) $id)
                ->unique()
                ->values()
                ->all();
        }

        $userRoleIds = DB::connection('tenant')->table('role_user')
            ->where('user_id', $user->getKey())
            ->pluck('role_id')
            ->map(fn ($id): int => (int) $id)
            ->all();
        $assignedDocumentIds = $reviewerGroups
            ->filter(fn (array $group): bool => ($group['role_ids'] ?? []) === []
                || array_intersect(
                    $userRoleIds,
                    array_map('intval', $group['role_ids'] ?? []),
                ) !== [])
            ->flatMap(fn (array $group): array => $group['document_ids'] ?? [])
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
                && $this->userCanReviewAction($request, $action)
                && in_array(
                    $requiredDocumentId,
                    $this->reviewerAssignedDocumentIds($request, $action),
                    true,
                ),
            403,
        );
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
