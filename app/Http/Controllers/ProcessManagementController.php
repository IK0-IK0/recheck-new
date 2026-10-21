<?php

namespace App\Http\Controllers;

use App\Models\Action;
use App\Models\Document;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProcessManagementController extends Controller
{
    /**
     * Display all processes with their nested phases and actions.
     */
    public function index(): Response
    {
        $processes = Process::with([
            'phases' => fn ($query) => $query->orderBy('order')->orderBy('id'),
            'phases.actions' => fn ($query) => $query->orderBy('order')->orderBy('id'),
            'phases.actions.roles' => fn ($query) => $query->orderBy('name'),
            'phases.actions.documents' => fn ($query) => $query->orderBy('name'),
        ])->orderBy('id')->get();
        $roles = Role::orderBy('name')->get();
        $documents = Document::orderBy('name')->get();

        return Inertia::render('Tenant/ProcessManagement', [
            'processes' => $processes,
            'roles' => $roles,
            'documents' => $documents,
        ]);
    }

    /**
     * Store a newly created process.
     */
    public function storeProcess(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        Process::create($request->only('name', 'description'));

        return redirect()->back();
    }

    /**
     * Update the specified process.
     */
    public function updateProcess(Request $request, Process $process): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $process->update($request->only('name', 'description'));

        return redirect()->back();
    }

    /**
     * Delete the specified process and cascade-delete its phases and actions.
     */
    public function destroyProcess(Process $process): RedirectResponse
    {
        foreach ($process->phases as $phase) {
            $phase->actions()->delete();
        }

        $process->phases()->delete();
        $process->delete();

        return redirect()->back();
    }

    /**
     * Store a newly created phase for the given process.
     */
    public function storePhase(Request $request, Process $process): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $nextOrder = ($process->phases()->max('order') ?? 0) + 1;

        $process->phases()->create([
            'name' => $request->input('name'),
            'order' => $nextOrder,
        ]);

        return redirect()->back();
    }

    /**
     * Update the specified phase.
     */
    public function updatePhase(Request $request, Phase $phase): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $phase->update($request->only('name'));

        return redirect()->back();
    }

    /**
     * Delete the specified phase and cascade-delete its actions.
     */
    public function destroyPhase(Phase $phase): RedirectResponse
    {
        $phase->actions()->delete();
        $phase->delete();

        return redirect()->back();
    }

    /**
     * Reorder the phases within a process.
     *
     * The submitted `order` array contains Phase IDs in the desired sequence;
     * each phase's `order` is set to its 1-indexed position in that array.
     */
    public function reorderPhases(Request $request, Process $process): RedirectResponse
    {
        $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer'],
        ]);

        foreach ($request->input('order') as $index => $phaseId) {
            Phase::where('id', $phaseId)
                ->where('process_id', $process->id)
                ->update(['order' => $index + 1]);
        }

        return redirect()->back();
    }

    /**
     * Store a newly created action for the given phase.
     */
    public function storeAction(Request $request, Phase $phase): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'action_type' => ['required', 'in:review,submit'],
            'decision_mode' => ['sometimes', 'in:approve_deny,custom'],
            'approve_action_id' => $this->decisionRouteRules($request, $phase, null, 'approve_action_id'),
            'deny_action_id' => $this->decisionRouteRules($request, $phase, null, 'deny_action_id'),
            'custom_decision_branches' => $request->input('action_type') === 'review'
                && $request->input('decision_mode') === 'custom'
                ? ['required', 'array', 'min:1', 'max:20']
                : ['sometimes', 'array'],
            'custom_decision_branches.*.id' => ['required', 'string', 'max:255', 'distinct'],
            'custom_decision_branches.*.label' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'custom_decision_branches.*.destination' => $this->customDecisionDestinationRules($phase, null),
            'reviewer_groups' => ['sometimes', 'array', 'max:20'],
            'reviewer_groups.*.id' => ['required_with:reviewer_groups', 'string', 'max:255', 'distinct'],
            'reviewer_groups.*.name' => ['required_with:reviewer_groups', 'string', 'max:100'],
            'reviewer_groups.*.role_ids' => ['sometimes', 'array', 'max:1'],
            'reviewer_groups.*.role_ids.*' => ['integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! Role::on('tenant')->whereKey($value)->exists()) {
                    $fail('The selected role is invalid.');
                }
            }],
            'reviewer_groups.*.document_ids' => ['sometimes', 'array'],
            'reviewer_groups.*.document_ids.*' => ['integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! Document::on('tenant')->whereKey($value)->exists()) {
                    $fail('The selected document is invalid.');
                }
            }],
            'requires_file' => ['sometimes', 'boolean'],
            'document_ids' => ['sometimes', 'array'],
            'document_ids.*' => ['integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! Document::on('tenant')->whereKey($value)->exists()) {
                    $fail('The selected document is invalid.');
                }
            }],
            'role_ids' => ['sometimes', 'array'],
            'role_ids.*' => ['integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! Role::on('tenant')->whereKey($value)->exists()) {
                    $fail('The selected role is invalid.');
                }
            }],
        ]);

        $nextOrder = ($phase->actions()->max('order') ?? 0) + 1;
        $actionType = $request->input('action_type', 'review');
        $decisionMode = $request->input('decision_mode', 'approve_deny');
        $requiresFile = $actionType === 'submit' || (bool) $request->input('requires_file', false);

        $action = $phase->actions()->create([
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'action_type' => $actionType,
            'requires_file' => $requiresFile,
            'approve_action_id' => $actionType === 'review' && $decisionMode === 'approve_deny' ? $request->input('approve_action_id') : null,
            'deny_action_id' => $actionType === 'review' && $decisionMode === 'approve_deny' ? $request->input('deny_action_id') : null,
            'decision_mode' => $actionType === 'review' ? $decisionMode : 'approve_deny',
            'custom_decision_branches' => $actionType === 'review' && $decisionMode === 'custom'
                ? $request->input('custom_decision_branches', [])
                : [],
            'reviewer_groups' => $request->input('reviewer_groups', []),
            'order' => $nextOrder,
        ]);

        $action->roles()->sync($this->assignmentIds($request, 'role_ids'));
        $action->documents()->sync($this->assignmentIds($request, 'document_ids'));

        return redirect()->back();
    }

    /**
     * Update the specified action.
     */
    public function updateAction(Request $request, Action $action): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'action_type' => ['required', 'in:review,submit'],
            'decision_mode' => ['sometimes', 'in:approve_deny,custom'],
            'approve_action_id' => $this->decisionRouteRules($request, $action->phase, $action, 'approve_action_id'),
            'deny_action_id' => $this->decisionRouteRules($request, $action->phase, $action, 'deny_action_id'),
            'custom_decision_branches' => $request->input('action_type') === 'review'
                && $request->input('decision_mode') === 'custom'
                ? ['required', 'array', 'min:1', 'max:20']
                : ['sometimes', 'array'],
            'custom_decision_branches.*.id' => ['required', 'string', 'max:255', 'distinct'],
            'custom_decision_branches.*.label' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'custom_decision_branches.*.destination' => $this->customDecisionDestinationRules($action->phase, $action),
            'reviewer_groups' => ['sometimes', 'array', 'max:20'],
            'reviewer_groups.*.id' => ['required_with:reviewer_groups', 'string', 'max:255', 'distinct'],
            'reviewer_groups.*.name' => ['required_with:reviewer_groups', 'string', 'max:100'],
            'reviewer_groups.*.role_ids' => ['sometimes', 'array', 'max:1'],
            'reviewer_groups.*.role_ids.*' => ['integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! Role::on('tenant')->whereKey($value)->exists()) {
                    $fail('The selected role is invalid.');
                }
            }],
            'reviewer_groups.*.document_ids' => ['sometimes', 'array'],
            'reviewer_groups.*.document_ids.*' => ['integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! Document::on('tenant')->whereKey($value)->exists()) {
                    $fail('The selected document is invalid.');
                }
            }],
            'requires_file' => ['sometimes', 'boolean'],
            'document_ids' => ['sometimes', 'array'],
            'document_ids.*' => ['integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! Document::on('tenant')->whereKey($value)->exists()) {
                    $fail('The selected document is invalid.');
                }
            }],
            'role_ids' => ['sometimes', 'array'],
            'role_ids.*' => ['integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! Role::on('tenant')->whereKey($value)->exists()) {
                    $fail('The selected role is invalid.');
                }
            }],
        ]);

        $actionType = $request->input('action_type', 'review');
        $decisionMode = $request->input('decision_mode', 'approve_deny');
        $requiresFile = $actionType === 'submit' || (bool) $request->input('requires_file', false);

        $action->update([
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'action_type' => $actionType,
            'requires_file' => $requiresFile,
            'approve_action_id' => $actionType === 'review' && $decisionMode === 'approve_deny' ? $request->input('approve_action_id') : null,
            'deny_action_id' => $actionType === 'review' && $decisionMode === 'approve_deny' ? $request->input('deny_action_id') : null,
            'decision_mode' => $actionType === 'review' ? $decisionMode : 'approve_deny',
            'custom_decision_branches' => $actionType === 'review' && $decisionMode === 'custom'
                ? $request->input('custom_decision_branches', [])
                : [],
            'reviewer_groups' => $request->input('reviewer_groups', $action->reviewer_groups ?? []),
        ]);
        $action->roles()->sync($this->assignmentIds($request, 'role_ids'));
        $action->documents()->sync($this->assignmentIds($request, 'document_ids'));

        return redirect()->back();
    }

    /**
     * Delete the specified action.
     */
    public function destroyAction(Action $action): RedirectResponse
    {
        // Detach relationships before deleting
        $action->roles()->detach();
        $action->documents()->detach();

        $action->delete();

        return redirect()->back();
    }

    /**
     * Validate that a review decision routes to a different action in the same phase.
     *
     * @return array<int, string|\Closure>
     */
    private function decisionRouteRules(Request $request, Phase $phase, ?Action $action, string $field): array
    {
        return [
            'sometimes',
            'nullable',
            'integer',
            function (string $attribute, mixed $value, \Closure $fail) use ($request, $phase, $action, $field): void {
                if (
                    ! Action::on('tenant')
                        ->whereKey($value)
                        ->where('phase_id', $phase->id)
                        ->when($action, fn ($query) => $query->where('id', '!=', $action->id))
                        ->exists()
                ) {
                    $fail('The selected decision route must be another action in the same phase.');

                    return;
                }

                if (
                    $field === 'deny_action_id'
                    && $request->filled('approve_action_id')
                    && (int) $request->input('approve_action_id') === (int) $value
                ) {
                    $fail('Approve and deny decisions must route to different actions.');
                }
            },
        ];
    }

    /**
     * Validate custom outcome destinations against the action's phase.
     *
     * @return array<int, string|\Closure>
     */
    private function customDecisionDestinationRules(Phase $phase, ?Action $action): array
    {
        return [
            'required',
            'string',
            'max:255',
            function (string $attribute, mixed $value, \Closure $fail) use ($phase, $action): void {
                if (in_array($value, ['next', 'end'], true)) {
                    return;
                }

                if (! is_string($value) || ! preg_match('/^action:(\d+)$/', $value, $matches)) {
                    $fail('Choose a valid destination for this custom outcome.');

                    return;
                }

                $targetExists = Action::on('tenant')
                    ->whereKey((int) $matches[1])
                    ->where('phase_id', $phase->id)
                    ->when($action, fn ($query) => $query->where('id', '!=', $action->id))
                    ->exists();

                if (! $targetExists) {
                    $fail('The selected destination must be another action in the same phase.');
                }
            },
        ];
    }

    /**
     * Merge action-level assignments with assignments selected in each group.
     *
     * @return list<int>
     */
    private function assignmentIds(Request $request, string $key): array
    {
        $groupIds = array_merge(
            ...array_map(
                fn (array $group): array => $group[$key] ?? [],
                $request->input('reviewer_groups', []),
            ),
        );

        return array_values(array_unique([
            ...$request->input($key, []),
            ...$groupIds,
        ]));
    }

    /**
     * Reorder the actions within a phase.
     *
     * The submitted `order` array contains Action IDs in the desired sequence;
     * each action's `order` is set to its 1-indexed position in that array.
     */
    public function reorderActions(Request $request, Phase $phase): RedirectResponse
    {
        $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer'],
        ]);

        foreach ($request->input('order') as $index => $actionId) {
            Action::where('id', $actionId)
                ->where('phase_id', $phase->id)
                ->update(['order' => $index + 1]);
        }

        return redirect()->back();
    }
}
