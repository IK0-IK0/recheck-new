<?php

namespace App\Http\Controllers;

use App\Models\Action;
use App\Models\Phase;
use App\Models\Process;
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
        $processes = Process::with(['phases.actions'])->orderBy('id')->get();

        return Inertia::render('ProcessManagement', [
            'processes' => $processes,
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
        ]);

        $nextOrder = ($phase->actions()->max('order') ?? 0) + 1;

        $phase->actions()->create([
            'name' => $request->input('name'),
            'order' => $nextOrder,
        ]);

        return redirect()->back();
    }

    /**
     * Update the specified action.
     */
    public function updateAction(Request $request, Action $action): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $action->update($request->only('name', 'description'));

        return redirect()->back();
    }

    /**
     * Delete the specified action.
     */
    public function destroyAction(Action $action): RedirectResponse
    {
        $action->delete();

        return redirect()->back();
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
