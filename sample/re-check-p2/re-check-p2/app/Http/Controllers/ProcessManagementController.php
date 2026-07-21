<?php

namespace App\Http\Controllers;

use App\Models\Process;
use App\Models\Phase;
use App\Models\Action;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProcessManagementController extends Controller
{
    /**
     * Show the workflow management page with all processes.
     */
    public function index()
    {
        $processes = Process::with(['phases' => function ($query) {
            $query->orderBy('order')->with(['actions' => function ($q) {
                $q->orderBy('order');
            }]);
        }])->get();

        return Inertia::render('ProcessManagement', [
            'initialProcesses' => $processes->map(fn($process) => [
                'id' => $process->id,
                'name' => $process->name,
                'description' => $process->description,
                'status' => $process->status,
                'createdAt' => $process->created_at->format('Y-m-d'),
                'phases' => $process->phases->map(fn($phase) => [
                    'id' => $phase->id,
                    'name' => $phase->name,
                    'actions' => $phase->actions->map(fn($action) => [
                        'id' => $action->id,
                        'type' => $action->type,
                        'name' => $action->name,
                        'description' => $action->description,
                        'assignedRole' => $action->assigned_role,
                        'documents' => $action->config['documents'] ?? [],
                        'formFields' => $action->config['formFields'] ?? [],
                        'checkOptions' => $action->config['checkOptions'] ?? [],
                        'options' => $action->config['options'] ?? [],
                    ])->toArray(),
                ])->toArray(),
            ])->toArray(),
        ]);
    }

    /**
     * Store a new process.
     */
    public function storeProcess(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
            ]);

            $process = Process::create($validated);

            return response()->json([
                'id' => $process->id,
                'name' => $process->name,
                'description' => $process->description,
                'status' => $process->status,
                'createdAt' => $process->created_at->format('Y-m-d'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error creating process: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a process.
     */
    public function updateProcess(Request $request, Process $process)
    {
        $process->update($request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]));

        return response()->json([
            'id' => $process->id,
            'name' => $process->name,
            'description' => $process->description,
            'status' => $process->status,
            'createdAt' => $process->created_at->format('Y-m-d'),
        ]);
    }

    /**
     * Delete a process.
     */
    public function deleteProcess(Process $process)
    {
        $process->delete();
        return response()->json(['success' => true]);
    }

    /**
     * Store a new phase.
     */
    public function storePhase(Request $request)
    {
        try {
            $validated = $request->validate([
                'process_id' => 'required|exists:processes,id',
                'name' => 'required|string|max:255',
            ]);

            $maxOrder = Phase::where('process_id', $validated['process_id'])->max('order') ?? -1;
            $phase = Phase::create([
                ...$validated,
                'order' => $maxOrder + 1,
            ]);

            return response()->json([
                'id' => $phase->id,
                'name' => $phase->name,
                'actions' => [],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error creating phase: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a phase.
     */
    public function updatePhase(Request $request, Phase $phase)
    {
        $phase->update($request->validate([
            'name' => 'required|string|max:255',
        ]));

        return response()->json([
            'id' => $phase->id,
            'name' => $phase->name,
        ]);
    }

    /**
     * Reorder phases.
     */
    public function reorderPhases(Request $request)
    {
        $phaseIds = $request->validate([
            'phase_ids' => 'required|array',
            'phase_ids.*' => 'integer|exists:phases,id',
        ])['phase_ids'];

        foreach ($phaseIds as $index => $phaseId) {
            Phase::where('id', $phaseId)->update(['order' => $index]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Delete a phase.
     */
    public function deletePhase(Phase $phase)
    {
        $phase->delete();
        return response()->json(['success' => true]);
    }

    /**
     * Reorder actions.
     */
    public function reorderActions(Request $request)
    {
        $actionIds = $request->validate([
            'action_ids' => 'required|array',
            'action_ids.*' => 'integer|exists:actions,id',
        ])['action_ids'];

        foreach ($actionIds as $index => $actionId) {
            Action::where('id', $actionId)->update(['order' => $index]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Store a new action.
     */
    public function storeAction(Request $request)
    {
        try {
            $validated = $request->validate([
                'phase_id' => 'required|exists:phases,id',
                'type' => 'required|string',
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'assigned_role' => 'required|string|max:255',
                'config' => 'nullable|array',
            ]);

            $maxOrder = Action::where('phase_id', $validated['phase_id'])->max('order') ?? -1;
            $action = Action::create([
                ...$validated,
                'order' => $maxOrder + 1,
            ]);

            return response()->json([
                'id' => $action->id,
                'type' => $action->type,
                'name' => $action->name,
                'description' => $action->description,
                'assignedRole' => $action->assigned_role,
                'documents' => $action->config['documents'] ?? [],
                'formFields' => $action->config['formFields'] ?? [],
                'checkOptions' => $action->config['checkOptions'] ?? [],
                'options' => $action->config['options'] ?? [],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error creating action: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update an action.
     */
    public function updateAction(Request $request, Action $action)
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_role' => 'required|string|max:255',
            'config' => 'nullable|array',
        ]);

        $action->update($validated);

        return response()->json([
            'id' => $action->id,
            'type' => $action->type,
            'name' => $action->name,
            'description' => $action->description,
            'assignedRole' => $action->assigned_role,
            'documents' => $action->config['documents'] ?? [],
            'formFields' => $action->config['formFields'] ?? [],
            'checkOptions' => $action->config['checkOptions'] ?? [],
            'options' => $action->config['options'] ?? [],
        ]);
    }

    /**
     * Delete an action.
     */
    public function deleteAction(Action $action)
    {
        $action->delete();
        return response()->json(['success' => true]);
    }
}
