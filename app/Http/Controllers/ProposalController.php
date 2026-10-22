<?php

namespace App\Http\Controllers;

use App\Models\Action;
use App\Models\Document;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Proposal;
use App\Models\StorageConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ProposalController extends Controller
{
    /**
     * Get the currently active storage disk.
     */
    private function getStorageDisk(): string
    {
        $activeConfig = StorageConfig::activeForCurrentUser();

        if (! $activeConfig) {
            return 'local'; // Fallback to local if no config
        }

        $diskConfig = $activeConfig->toFilesystemConfig();

        return $diskConfig['driver']; // Returns 'local', 's3', or 'supabase'
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

        $proposalsQuery
            ->when(! $isTracking, fn ($query) => $query
                ->where('user_id', $request->user()->getKey())
                ->where('user_type', $request->user()::class))
            ->with([
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
            $proposal->setAttribute(
                'can_review',
                $proposal->currentAction?->action_type === 'review'
                    && $this->userCanReviewAction($request, $proposal->currentAction),
            );
        });
        $requestedProposalId = filter_var($request->query('proposal'), FILTER_VALIDATE_INT);

        return Inertia::render('Tenant/Proposals/Index', [
            'proposals' => $proposals,
            'isTracking' => $isTracking,
            'viewerId' => $request->user()->getKey(),
            'viewerType' => $request->user()::class,
            'selectedProposalId' => is_int($requestedProposalId) && $proposals->contains('id', $requestedProposalId)
                ? $requestedProposalId
                : null,
        ]);
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
        $this->authorizeProposalOwner($request, $proposal);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB max
            'name' => ['required', 'string', 'max:255'],
            'label' => ['nullable', 'in:form,doc'],
            'phase_id' => ['nullable', 'integer'],
            'required_document_id' => ['nullable', 'integer'],
            'action_id' => ['nullable', 'integer'],
        ]);

        $uploadedFile = $request->file('file');
        $label = $validated['label'] ?? 'doc';
        $phaseId = $validated['phase_id'] ?? null;
        $requiredDocumentId = $validated['required_document_id'] ?? null;
        $actionId = $validated['action_id'] ?? null;
        $phase = null;

        if (($phaseId === null) !== ($requiredDocumentId === null)) {
            return redirect()->back()->withErrors([
                'phase_id' => 'A phase and its required document must be submitted together.',
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

        $storageDriver = 'unknown';

        try {
            $storageDriver = $this->getStorageDisk();

            if ($uploadedFile) {
                $filePath = $uploadedFile->store('proposals/'.$proposal->id.'/documents', $storageDriver);

                if (! is_string($filePath)) {
                    throw new \RuntimeException('The storage disk did not return a file path after upload.');
                }

                $document = Document::create([
                    'name' => $validated['name'],
                    'file_path' => $filePath,
                    'file_type' => $uploadedFile->getMimeType(),
                    'label' => $label,
                    'storage_driver' => $storageDriver,
                ]);

                // Attach to proposal
                $pivotData = $phase ? [
                    'phase_id' => $phase->id,
                    'required_document_id' => $requiredDocumentId,
                    'action_id' => $actionId,
                ] : [];
                $proposal->documents()->attach($document->id, $pivotData);

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
                $disk = Storage::disk($document->storage_driver ?? 'local');
                $disk->delete($document->file_path);
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
        ]);
        $action = Action::query()->find($proposal->current_action_id);

        abort_unless($action && $action->action_type === 'review', 409);
        abort_unless($this->userCanReviewAction($request, $action), 403);

        return $this->completeCurrentAction($request, $proposal, $validated['decision'], true);
    }

    private function completeCurrentAction(
        Request $request,
        Proposal $proposal,
        ?string $decision,
        bool $returnToTracking = false,
    ): RedirectResponse {
        $result = DB::connection('tenant')->transaction(function () use ($request, $proposal, $decision): array {
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
                $missingDocument = $action->documents->first(
                    fn (Document $document): bool => ! in_array((int) $document->id, $uploadedRequiredDocumentIds, true),
                );

                if ($missingDocument) {
                    return ['error' => "Upload the required document \"{$missingDocument->name}\" before submitting."];
                }
            }

            if ($action->action_type === 'review' && ! $this->isValidReviewDecision($action, $decision)) {
                return ['error' => 'Choose a valid outcome for this review action.'];
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

            $lockedProposal->actionTransitions()->create([
                'action_id' => $action->id,
                'decision' => $decision,
                'user_id' => $request->user()->getKey(),
                'user_type' => $request->user()::class,
            ]);

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

    private function userCanReviewAction(Request $request, Action $action): bool
    {
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

        return DB::connection('tenant')->table('role_user')
            ->where('user_id', $request->user()->getKey())
            ->whereIn('role_id', $roleIds)
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
