<?php

/**
 * Unit tests and property-based tests for ProcessManagementController.
 *
 * Feature: port-sample-to-reccheck
 * Properties 2 & 3: Phase/Action Reorder Consistency
 *
 * Validates: Requirements 4.3, 4.4, 4.8, 4.9, 4.11, 4.12
 */

use App\Http\Controllers\ProcessManagementController;
use App\Models\Action;
use App\Models\Phase;
use App\Models\Process;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ---------------------------------------------------------------------------
// Helper — register controller routes inline for HTTP-based tests
// ---------------------------------------------------------------------------
function registerProcessRoutes(): void
{
    Route::controller(ProcessManagementController::class)->group(function () {
        Route::delete('/__test/processes/{process}', 'destroyProcess');
        Route::delete('/__test/phases/{phase}', 'destroyPhase');
        Route::post('/__test/processes/{process}/phases', 'storePhase');
        Route::post('/__test/phases/{phase}/actions', 'storeAction');
        Route::post('/__test/processes/{process}/phases/reorder', 'reorderPhases');
        Route::post('/__test/phases/{phase}/actions/reorder', 'reorderActions');
    });
}

// ---------------------------------------------------------------------------
// Unit: cascade delete of Process removes all phases and actions
// Validates: Requirement 4.8
// ---------------------------------------------------------------------------
test('destroyProcess deletes the process and all its phases and actions', function (): void {
    $controller = new ProcessManagementController;

    $process = Process::factory()->create();
    $phase1 = Phase::factory()->for($process)->create();
    $phase2 = Phase::factory()->for($process)->create();
    $action1 = Action::factory()->for($phase1)->create();
    $action2 = Action::factory()->for($phase1)->create();
    $action3 = Action::factory()->for($phase2)->create();

    // Eager-load phases so destroyProcess can iterate them
    $process->load('phases');

    $controller->destroyProcess($process);

    expect(Process::find($process->id))->toBeNull();
    expect(Phase::find($phase1->id))->toBeNull();
    expect(Phase::find($phase2->id))->toBeNull();
    expect(Action::find($action1->id))->toBeNull();
    expect(Action::find($action2->id))->toBeNull();
    expect(Action::find($action3->id))->toBeNull();
});

// ---------------------------------------------------------------------------
// Unit: cascade delete of Phase removes all its actions
// Validates: Requirement 4.9
// ---------------------------------------------------------------------------
test('destroyPhase deletes the phase and all its actions', function (): void {
    $controller = new ProcessManagementController;

    $phase = Phase::factory()->create();
    $action1 = Action::factory()->for($phase)->create();
    $action2 = Action::factory()->for($phase)->create();

    $controller->destroyPhase($phase);

    expect(Phase::find($phase->id))->toBeNull();
    expect(Action::find($action1->id))->toBeNull();
    expect(Action::find($action2->id))->toBeNull();
});

// ---------------------------------------------------------------------------
// Unit: storePhase assigns the correct order value
// Validates: Requirement 4.3
// ---------------------------------------------------------------------------
test('storePhase assigns order = max(existing order) + 1', function (): void {
    $controller = new ProcessManagementController;
    $process = Process::factory()->create();

    // No phases yet — first phase should get order = 1
    $request = Request::create('/phases', 'POST', ['name' => 'Phase A']);
    $controller->storePhase($request, $process);

    $firstPhase = $process->phases()->orderBy('id')->first();
    expect($firstPhase->order)->toBe(1);

    // Second phase — should get order = 2
    $request2 = Request::create('/phases', 'POST', ['name' => 'Phase B']);
    $controller->storePhase($request2, $process);

    $secondPhase = $process->phases()->orderByDesc('order')->first();
    expect($secondPhase->order)->toBe(2);
});

// ---------------------------------------------------------------------------
// Unit: storeAction assigns the correct order value
// Validates: Requirement 4.4
// ---------------------------------------------------------------------------
test('storeAction assigns order = max(existing order) + 1', function (): void {
    $controller = new ProcessManagementController;
    $phase = Phase::factory()->create();

    // No actions yet — first should get order = 1
    $request = Request::create('/actions', 'POST', ['name' => 'Action A']);
    $controller->storeAction($request, $phase);

    $firstAction = $phase->actions()->orderBy('id')->first();
    expect($firstAction->order)->toBe(1);

    // Second action should get order = 2
    $request2 = Request::create('/actions', 'POST', ['name' => 'Action B']);
    $controller->storeAction($request2, $phase);

    $secondAction = $phase->actions()->orderByDesc('order')->first();
    expect($secondAction->order)->toBe(2);
});

// ---------------------------------------------------------------------------
// Property 2: Phase Reorder Consistency
//
// Feature: port-sample-to-reccheck
// Property 2: Phase Reorder Consistency
//
// For any Process with N (2–10) Phases and any permutation of those Phase IDs,
// after submitting a reorder request, each Phase's stored `order` value
// SHALL equal its position (1-indexed) in the submitted sequence.
//
// Validates: Requirement 4.11
// ---------------------------------------------------------------------------
it('reorderPhases stores 1-indexed order matching the submitted sequence (100 shuffles)', function (): void {
    $controller = new ProcessManagementController;

    $phaseCount = rand(2, 10);
    $process = Process::factory()->create();
    Phase::factory()->count($phaseCount)->for($process)->create();

    $phaseIds = $process->phases()->pluck('id')->toArray();

    for ($i = 0; $i < 100; $i++) {
        shuffle($phaseIds);

        $request = Request::create('/reorder', 'POST', ['order' => $phaseIds]);
        $controller->reorderPhases($request, $process);

        foreach ($phaseIds as $position => $phaseId) {
            $storedOrder = Phase::find($phaseId)->order;
            expect($storedOrder)->toBe(
                $position + 1,
                "Iteration {$i}: Phase {$phaseId} should have order ".($position + 1)." but has {$storedOrder}"
            );
        }
    }
})->group('property-2-phase-reorder');

// ---------------------------------------------------------------------------
// Property 3: Action Reorder Consistency
//
// Feature: port-sample-to-reccheck
// Property 3: Action Reorder Consistency
//
// For any Phase with N (2–10) Actions and any permutation of those Action IDs,
// after submitting a reorder request, each Action's stored `order` value
// SHALL equal its position (1-indexed) in the submitted sequence.
//
// Validates: Requirement 4.12
// ---------------------------------------------------------------------------
it('reorderActions stores 1-indexed order matching the submitted sequence (100 shuffles)', function (): void {
    $controller = new ProcessManagementController;

    $actionCount = rand(2, 10);
    $phase = Phase::factory()->create();
    Action::factory()->count($actionCount)->for($phase)->create();

    $actionIds = $phase->actions()->pluck('id')->toArray();

    for ($i = 0; $i < 100; $i++) {
        shuffle($actionIds);

        $request = Request::create('/reorder', 'POST', ['order' => $actionIds]);
        $controller->reorderActions($request, $phase);

        foreach ($actionIds as $position => $actionId) {
            $storedOrder = Action::find($actionId)->order;
            expect($storedOrder)->toBe(
                $position + 1,
                "Iteration {$i}: Action {$actionId} should have order ".($position + 1)." but has {$storedOrder}"
            );
        }
    }
})->group('property-3-action-reorder');
