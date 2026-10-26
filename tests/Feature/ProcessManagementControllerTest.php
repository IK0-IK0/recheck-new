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
use App\Models\Document;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

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
    $request = Request::create('/actions', 'POST', [
        'name' => 'Action A',
        'action_type' => 'check',
    ]);
    $controller->storeAction($request, $phase);

    $firstAction = $phase->actions()->orderBy('id')->first();
    expect($firstAction->order)->toBe(1);

    // Second action should get order = 2
    $request2 = Request::create('/actions', 'POST', [
        'name' => 'Action B',
        'action_type' => 'check',
    ]);
    $controller->storeAction($request2, $phase);

    $secondAction = $phase->actions()->orderByDesc('order')->first();
    expect($secondAction->order)->toBe(2);
});

test('storeAction and updateAction persist selected role access assignments, document requirements, and action type', function (): void {
    $controller = new ProcessManagementController;
    $phase = Phase::factory()->create();
    $roleA = Role::factory()->create();
    $roleB = Role::factory()->create();
    $documentA = Document::factory()->create();
    $documentB = Document::factory()->create();

    $storeRequest = Request::create('/actions', 'POST', [
        'name' => 'Action A',
        'action_type' => 'submission',
        'role_ids' => [$roleA->id, $roleB->id],
        'document_ids' => [$documentA->id, $documentB->id],
    ]);

    $controller->storeAction($storeRequest, $phase);

    $action = $phase->actions()->first();
    expect($action->action_type)->toBe('submission');
    expect($action->roles()->pluck('roles.id')->all())->toBe([$roleA->id, $roleB->id]);
    expect($action->documents()->pluck('documents.id')->all())->toBe([$documentA->id, $documentB->id]);

    $newRole = Role::factory()->create();
    $newDocument = Document::factory()->create();

    $updateRequest = Request::create('/actions', 'PUT', [
        'name' => 'Action A Updated',
        'action_type' => 'check',
        'role_ids' => [$newRole->id],
        'document_ids' => [$newDocument->id],
    ]);

    $controller->updateAction($updateRequest, $action);

    expect($action->fresh()->action_type)->toBe('check');
    expect($action->fresh()->roles()->pluck('roles.id')->all())->toBe([$newRole->id]);
    expect($action->fresh()->documents()->pluck('documents.id')->all())->toBe([$newDocument->id]);
});

test('review actions persist separate approve and deny destinations', function (): void {
    $phase = Phase::factory()->create();
    $approveAction = Action::factory()->for($phase)->create();
    $denyAction = Action::factory()->for($phase)->create();
    $controller = new ProcessManagementController;
    $request = Request::create('/actions', 'POST', [
        'name' => 'Decision review',
        'action_type' => 'review',
        'approve_action_id' => $approveAction->id,
        'deny_action_id' => $denyAction->id,
    ]);

    $controller->storeAction($request, $phase);

    $reviewAction = $phase->actions()->where('name', 'Decision review')->firstOrFail();

    expect($reviewAction->approve_action_id)->toBe($approveAction->id)
        ->and($reviewAction->deny_action_id)->toBe($denyAction->id);
});

test('review decisions cannot route to the same action', function (): void {
    $phase = Phase::factory()->create();
    $target = Action::factory()->for($phase)->create();
    $reviewAction = Action::factory()->for($phase)->create(['action_type' => 'review']);
    $controller = new ProcessManagementController;
    $request = Request::create('/actions', 'PUT', [
        'name' => $reviewAction->name,
        'action_type' => 'review',
        'approve_action_id' => $target->id,
        'deny_action_id' => $target->id,
    ]);

    expect(fn () => $controller->updateAction($request, $reviewAction))
        ->toThrow(ValidationException::class);
});

test('review decision routes must target another action in the same phase', function (): void {
    $phase = Phase::factory()->create();
    $otherPhase = Phase::factory()->create();
    $crossPhaseAction = Action::factory()->for($otherPhase)->create();
    $reviewAction = Action::factory()->for($phase)->create(['action_type' => 'review']);
    $controller = new ProcessManagementController;
    $request = Request::create('/actions', 'PUT', [
        'name' => $reviewAction->name,
        'action_type' => 'review',
        'approve_action_id' => $crossPhaseAction->id,
    ]);

    expect(fn () => $controller->updateAction($request, $reviewAction))
        ->toThrow(ValidationException::class);
});

test('changing a review action to submit clears its decision destinations', function (): void {
    $phase = Phase::factory()->create();
    $approveAction = Action::factory()->for($phase)->create();
    $denyAction = Action::factory()->for($phase)->create();
    $reviewAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'approve_action_id' => $approveAction->id,
        'deny_action_id' => $denyAction->id,
    ]);
    $controller = new ProcessManagementController;
    $request = Request::create('/actions', 'PUT', [
        'name' => $reviewAction->name,
        'action_type' => 'submit',
    ]);

    $controller->updateAction($request, $reviewAction);

    expect($reviewAction->fresh()->approve_action_id)->toBeNull()
        ->and($reviewAction->fresh()->deny_action_id)->toBeNull();
});

test('submit and approve deny actions accept empty custom decision branches', function (): void {
    $phase = Phase::factory()->create();
    $controller = new ProcessManagementController;

    foreach ([
        ['name' => 'Submit action', 'action_type' => 'submit'],
        ['name' => 'Review action', 'action_type' => 'review'],
    ] as $values) {
        $request = Request::create('/actions', 'POST', [
            ...$values,
            'decision_mode' => 'approve_deny',
            'custom_decision_branches' => [],
        ]);

        $controller->storeAction($request, $phase);
    }

    $actions = $phase->actions()->orderBy('id')->get();

    foreach ($actions as $action) {
        $request = Request::create('/actions', 'PUT', [
            'name' => $action->name,
            'action_type' => $action->action_type,
            'decision_mode' => 'approve_deny',
            'custom_decision_branches' => [],
        ]);

        $controller->updateAction($request, $action);
    }

    expect($phase->actions()->count())->toBe(2);
});

test('action assignment groups persist roles and required documents', function (): void {
    $phase = Phase::factory()->create();
    $role = Role::factory()->create();
    $document = Document::factory()->create();
    $controller = new ProcessManagementController;
    $reviewerGroups = [[
        'id' => 'assignment-one',
        'name' => 'Assignment 1',
        'role_ids' => [$role->id],
        'document_ids' => [$document->id],
    ]];
    $request = Request::create('/actions', 'POST', [
        'name' => 'Submit files',
        'action_type' => 'submit',
        'reviewer_groups' => $reviewerGroups,
    ]);

    $controller->storeAction($request, $phase);

    $action = $phase->actions()->firstOrFail();
    expect($action->reviewer_groups)->toBe($reviewerGroups)
        ->and($action->roles()->pluck('roles.id')->all())->toBe([$role->id])
        ->and($action->documents()->pluck('documents.id')->all())->toBe([$document->id]);

    $updatedRole = Role::factory()->create();
    $updatedDocument = Document::factory()->create();
    $updatedGroups = [[
        'id' => 'assignment-two',
        'name' => 'Assignment 2',
        'role_ids' => [$updatedRole->id],
        'document_ids' => [$updatedDocument->id],
    ]];
    $updateRequest = Request::create('/actions', 'PUT', [
        'name' => 'Submit files',
        'action_type' => 'submit',
        'reviewer_groups' => $updatedGroups,
    ]);

    $controller->updateAction($updateRequest, $action);

    expect($action->fresh()->reviewer_groups)->toBe($updatedGroups)
        ->and($action->fresh()->roles()->pluck('roles.id')->all())->toBe([$updatedRole->id])
        ->and($action->fresh()->documents()->pluck('documents.id')->all())->toBe([$updatedDocument->id]);
});

test('submission outcome document sets persist and join the action document requirements', function (): void {
    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $sourceAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'custom',
        'custom_decision_branches' => [
            ['id' => 'accepted', 'label' => 'Accepted', 'destination' => 'next'],
        ],
        'order' => 1,
    ]);
    $outcomeRole = Role::factory()->create();
    $allDocument = Document::factory()->create();
    $outcomeDocument = Document::factory()->create();
    $reviewerGroups = [[
        'id' => 'submission',
        'name' => 'Submission',
        'role_ids' => [],
        'document_ids' => [$allDocument->id],
        'decision_document_sets' => [[
            'action_id' => $sourceAction->id,
            'decision_id' => 'accepted',
            'role_ids' => [$outcomeRole->id],
            'document_ids' => [$outcomeDocument->id],
        ]],
    ]];

    (new ProcessManagementController)->storeAction(
        Request::create('/actions', 'POST', [
            'name' => 'Submit documents',
            'action_type' => 'submit',
            'reviewer_groups' => $reviewerGroups,
        ]),
        $phase,
    );

    $submissionAction = $phase->actions()
        ->where('name', 'Submit documents')
        ->firstOrFail();

    expect($submissionAction->reviewer_groups)->toBe($reviewerGroups)
        ->and($submissionAction->roles()->pluck('roles.id')->all())
        ->toBe([$outcomeRole->id])
        ->and($submissionAction->documents()->pluck('documents.id')->sort()->values()->all())
        ->toBe(collect([$allDocument->id, $outcomeDocument->id])->sort()->values()->all());
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
