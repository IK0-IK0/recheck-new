<?php

use App\Http\Controllers\ProposalController;
use App\Models\Action;
use App\Models\Document;
use App\Models\Permission;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Proposal;
use App\Models\ProposalActionReviewer;
use App\Models\Role;
use App\Models\SuperadminTenantUser;
use App\Models\User;
use App\Services\ReviewAssignmentService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

function proposalRequestAsOwner(Request $request, int $ownerId = 1): Request
{
    $owner = new User;
    $owner->setAttribute($owner->getKeyName(), $ownerId);
    $request->setUserResolver(fn (): User => $owner);

    return $request;
}

test('proposal visibility defaults to proposals the user owns or is assigned to', function () {
    Proposal::create([
        'title' => 'My proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
    ]);
    Proposal::create([
        'title' => 'Another users proposal',
        'user_id' => 2,
        'user_type' => User::class,
        'institution_id' => 1,
    ]);
    Proposal::create([
        'title' => 'Tenant user with same numeric id',
        'user_id' => 1,
        'user_type' => SuperadminTenantUser::class,
        'institution_id' => 1,
    ]);
    Proposal::create([
        'title' => 'Another institution proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 2,
    ]);

    $controller = app(ProposalController::class);
    $indexRequest = proposalRequestAsOwner(Request::create('/tenant/proposals?proposal=1', 'GET'));
    $trackingRequest = proposalRequestAsOwner(Request::create('/tenant/proposals?view=tracking', 'GET'));
    $indexProps = $controller->index($indexRequest)
        ->toResponse($indexRequest)
        ->getData(true)['props'];
    $trackingProps = $controller->index($trackingRequest)
        ->toResponse($trackingRequest)
        ->getData(true)['props'];

    expect(collect($indexProps['proposals'])->pluck('title')->all())
        ->toBe(['My proposal'])
        ->and($indexProps['selectedProposalId'])->toBe(1)
        ->and(collect($trackingProps['proposals'])->pluck('title')->sort()->values()->all())
        ->toBe(['My proposal']);
});

test('proposal visibility permissions limit or expand owned and assigned proposals', function () {
    $limitedPermission = Permission::create(['name' => 'proposal.view.own_or_assigned']);
    $allPermission = Permission::create(['name' => 'proposal.view.all']);
    $role = Role::create(['name' => 'Review team']);
    $role->permissions()->attach($limitedPermission);

    DB::connection('tenant')->table('role_tenant_user')->insert([
        'role_id' => $role->id,
        'tenant_user_id' => 7,
    ]);

    $assignedAction = Action::factory()->create(['action_type' => 'review']);
    $unassignedAction = Action::factory()->create(['action_type' => 'review']);
    $assignedAction->roles()->attach($role->id);

    foreach ([
        ['Owned proposal', 7, null],
        ['Assigned proposal', 8, $assignedAction->id],
        ['Unassigned proposal', 9, $unassignedAction->id],
    ] as [$title, $ownerId, $actionId]) {
        Proposal::create([
            'title' => $title,
            'user_id' => $ownerId,
            'user_type' => SuperadminTenantUser::class,
            'institution_id' => 3,
            'current_action_id' => $actionId,
        ]);
    }

    $user = new SuperadminTenantUser;
    $user->setAttribute($user->getKeyName(), 7);
    $user->setAttribute('institution_id', 3);
    $request = Request::create('/tenant/proposals', 'GET');
    $request->setUserResolver(fn (): SuperadminTenantUser => $user);
    $controller = app(ProposalController::class);

    $limitedProps = $controller->index($request)->toResponse($request)->getData(true)['props'];

    expect(collect($limitedProps['proposals'])->pluck('title')->sort()->values()->all())
        ->toBe(['Assigned proposal', 'Owned proposal'])
        ->and(collect($limitedProps['proposals'])->firstWhere('title', 'Assigned proposal')['can_review'])
        ->toBeTrue();

    $role->permissions()->sync([$allPermission->id]);
    $allProps = $controller->index($request)->toResponse($request)->getData(true)['props'];

    expect(collect($allProps['proposals'])->pluck('title')->sort()->values()->all())
        ->toBe(['Assigned proposal', 'Owned proposal', 'Unassigned proposal']);
});

test('proposal details redirect into the proposals page with that proposal selected', function () {
    $proposal = Proposal::create([
        'title' => 'My proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
    ]);
    $request = proposalRequestAsOwner(
        Request::create('/tenant/proposals/'.$proposal->id, 'GET'),
    );

    $response = app(ProposalController::class)->show($request, $proposal);

    expect($response->getTargetUrl())
        ->toContain('/tenant/proposals?proposal='.$proposal->id);
});

test('users can create at most three active proposals', function () {
    foreach (range(1, 3) as $number) {
        Proposal::create([
            'title' => 'Proposal '.$number,
            'user_id' => 1,
            'user_type' => User::class,
            'institution_id' => 1,
        ]);
    }

    $request = proposalRequestAsOwner(
        Request::create('/tenant/proposals', 'POST', ['title' => 'Fourth proposal']),
    );

    expect(fn () => app(ProposalController::class)->store($request))
        ->toThrow(ValidationException::class);
    expect(Proposal::query()->where('user_id', 1)->where('user_type', User::class)->count())
        ->toBe(3);
});

test('archived proposals do not count toward the active proposal limit', function () {
    Proposal::create([
        'title' => 'Archived proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'completed_at' => now(),
    ]);

    foreach (range(1, 2) as $number) {
        Proposal::create([
            'title' => 'Active proposal '.$number,
            'user_id' => 1,
            'user_type' => User::class,
            'institution_id' => 1,
        ]);
    }

    $request = proposalRequestAsOwner(
        Request::create('/tenant/proposals', 'POST', ['title' => 'New active proposal']),
    );

    app(ProposalController::class)->store($request);

    expect(Proposal::query()
        ->where('user_id', 1)
        ->where('user_type', User::class)
        ->whereNull('completed_at')
        ->count())
        ->toBe(3);
});

test('submitting completes one configured action at a time before moving phases', function () {
    $process = Process::factory()->create();
    $firstPhase = Phase::factory()->for($process)->create(['order' => 2]);
    $secondPhase = Phase::factory()->for($process)->create(['order' => 5]);
    $firstAction = Action::factory()->for($firstPhase)->create(['action_type' => 'submit', 'order' => 1]);
    $secondAction = Action::factory()->for($firstPhase)->create(['action_type' => 'submit', 'order' => 2]);
    $finalAction = Action::factory()->for($secondPhase)->create(['action_type' => 'submit', 'order' => 1]);
    $otherProcess = Process::factory()->create();
    Phase::factory()->for($otherProcess)->create(['order' => 1]);
    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $firstPhase->id,
        'current_action_id' => $firstAction->id,
    ]);
    $controller = app(ProposalController::class);
    $request = proposalRequestAsOwner(
        Request::create('/tenant/proposals/'.$proposal->id.'/submit', 'POST'),
    );

    $controller->submit($request, $proposal);

    expect($proposal->fresh()->current_phase_id)->toBe($firstPhase->id)
        ->and($proposal->fresh()->current_action_id)->toBe($secondAction->id)
        ->and($proposal->actionTransitions()->orderBy('id')->pluck('action_id')->all())
        ->toBe([$firstAction->id])
        ->and($proposal->phaseTransitions()->orderBy('id')->pluck('phase_id')->all())
        ->toBe([]);

    $controller->submit($request, $proposal->fresh());

    expect($proposal->fresh()->current_phase_id)->toBe($secondPhase->id)
        ->and($proposal->fresh()->current_action_id)->toBe($finalAction->id)
        ->and($proposal->phaseTransitions()->orderBy('id')->pluck('phase_id')->all())
        ->toBe([$secondPhase->id]);

    $controller->submit($request, $proposal->fresh());

    expect($proposal->fresh()->current_phase_id)->toBe($secondPhase->id)
        ->and($proposal->fresh()->current_action_id)->toBeNull()
        ->and($proposal->fresh()->completed_at)->not->toBeNull()
        ->and($proposal->actionTransitions()->count())->toBe(3)
        ->and($proposal->phaseTransitions()->count())->toBe(1);
});

test('submission actions require all documents and only the outcome-specific documents that apply', function () {
    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $sourceAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'custom',
        'custom_decision_branches' => [
            ['id' => 'accepted', 'label' => 'Accepted', 'destination' => 'next'],
            ['id' => 'revised', 'label' => 'Needs revision', 'destination' => 'next'],
        ],
        'order' => 1,
    ]);
    $olderReviewAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'custom',
        'custom_decision_branches' => [
            ['id' => 'follow-up', 'label' => 'Needs follow-up', 'destination' => 'next'],
        ],
        'order' => 0,
    ]);
    $submissionAction = Action::factory()->for($phase)->create([
        'action_type' => 'submit',
        'order' => 2,
    ]);
    $allDocument = Document::factory()->create();
    $acceptedDocument = Document::factory()->create();
    $revisedDocument = Document::factory()->create();
    $olderDecisionDocument = Document::factory()->create();
    $submissionAction->update([
        'reviewer_groups' => [[
            'id' => 'submission',
            'name' => 'Submission',
            'role_ids' => [],
            'document_ids' => [$allDocument->id],
            'decision_document_sets' => [
                [
                    'action_id' => $olderReviewAction->id,
                    'decision_id' => 'follow-up',
                    'document_ids' => [$olderDecisionDocument->id],
                ],
                [
                    'action_id' => $sourceAction->id,
                    'decision_id' => 'accepted',
                    'document_ids' => [$acceptedDocument->id],
                ],
                [
                    'action_id' => $sourceAction->id,
                    'decision_id' => 'revised',
                    'document_ids' => [$revisedDocument->id],
                ],
            ],
        ]],
    ]);
    $submissionAction->documents()->sync([
        $allDocument->id,
        $acceptedDocument->id,
        $revisedDocument->id,
        $olderDecisionDocument->id,
    ]);
    $proposal = Proposal::create([
        'title' => 'Outcome-specific submission',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $submissionAction->id,
    ]);
    $proposal->actionTransitions()->create([
        'action_id' => $olderReviewAction->id,
        'decision' => 'follow-up',
    ]);
    $proposal->actionTransitions()->create([
        'action_id' => $sourceAction->id,
        'decision' => 'accepted',
    ]);

    foreach ([$allDocument, $acceptedDocument] as $document) {
        $proposal->documents()->attach($document->id, [
            'phase_id' => $phase->id,
            'required_document_id' => $document->id,
            'action_id' => $submissionAction->id,
        ]);
    }

    $request = proposalRequestAsOwner(
        Request::create('/tenant/proposals/'.$proposal->id.'/submit', 'POST'),
    );
    app(ProposalController::class)->submit($request, $proposal);

    expect($proposal->fresh()->current_action_id)->toBeNull()
        ->and($proposal->fresh()->completed_at)->not->toBeNull();
});

test('proposal uploads cannot include documents for an unmatched submission outcome', function () {
    Storage::fake('local');

    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $sourceAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'custom',
        'custom_decision_branches' => [
            ['id' => 'accepted', 'label' => 'Accepted', 'destination' => 'next'],
            ['id' => 'revised', 'label' => 'Needs revision', 'destination' => 'next'],
        ],
        'order' => 1,
    ]);
    $submissionAction = Action::factory()->for($phase)->create([
        'action_type' => 'submit',
        'order' => 2,
    ]);
    $inactiveDocument = Document::factory()->create([
        'name' => 'Revision notes',
        'file_type' => 'application/pdf',
    ]);
    $submissionAction->update([
        'reviewer_groups' => [[
            'id' => 'submission',
            'name' => 'Submission',
            'role_ids' => [],
            'document_ids' => [],
            'decision_document_sets' => [
                [
                    'action_id' => $sourceAction->id,
                    'decision_id' => 'accepted',
                    'document_ids' => [],
                ],
                [
                    'action_id' => $sourceAction->id,
                    'decision_id' => 'revised',
                    'document_ids' => [$inactiveDocument->id],
                ],
            ],
        ]],
    ]);
    $submissionAction->documents()->attach($inactiveDocument);
    $proposal = Proposal::create([
        'title' => 'Outcome-specific submission',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $submissionAction->id,
    ]);
    $proposal->actionTransitions()->create([
        'action_id' => $sourceAction->id,
        'decision' => 'accepted',
    ]);
    $request = proposalRequestAsOwner(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/documents',
            'POST',
            [
                'phase_id' => $phase->id,
                'required_document_id' => $inactiveDocument->id,
            ],
            [],
            ['file' => UploadedFile::fake()->create('revision.pdf', 20, 'application/pdf')],
        ),
    );

    expect(fn () => app(ProposalController::class)->storeDocument($request, $proposal))
        ->toThrow(ValidationException::class);
});

test('review decisions follow the configured action route and are recorded', function () {
    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $reviewAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'approve_deny',
        'order' => 1,
    ]);
    $reviewerRole = Role::factory()->create();
    $reviewAction->update([
        'reviewer_groups' => [[
            'id' => 'reviewer',
            'name' => 'Reviewer',
            'role_ids' => [$reviewerRole->id],
            'document_ids' => [],
        ]],
    ]);
    DB::connection('tenant')->table('users')->insertOrIgnore([
        'id' => 1,
        'name' => 'Reviewer',
        'email' => 'reviewer@example.test',
        'password' => 'test-password',
    ]);
    DB::connection('tenant')->table('role_user')->insert([
        'role_id' => $reviewerRole->id,
        'user_id' => 1,
    ]);
    $approvedAction = Action::factory()->for($phase)->create([
        'action_type' => 'submit',
        'order' => 2,
    ]);
    $reviewAction->update(['approve_action_id' => $approvedAction->id]);
    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $reviewAction->id,
    ]);
    $request = proposalRequestAsOwner(
        Request::create('/tenant/proposals/'.$proposal->id.'/review', 'POST', ['decision' => 'approve']),
    );

    app(ProposalController::class)->review($request, $proposal);

    expect($proposal->fresh()->current_action_id)->toBe($approvedAction->id)
        ->and($proposal->actionTransitions()->firstOrFail()->decision)->toBe('approve')
        ->and((int) $proposal->actionTransitions()->firstOrFail()->action_id)->toBe($reviewAction->id);
});

test('institution accounts can review proposals without assigned reviewer roles', function () {
    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $reviewerRole = Role::factory()->create();
    $reviewAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'approve_deny',
        'reviewer_groups' => [[
            'id' => 'reviewer',
            'name' => 'Reviewer',
            'role_ids' => [$reviewerRole->id],
            'document_ids' => [],
        ]],
    ]);
    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 2,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $reviewAction->id,
    ]);
    $request = proposalRequestAsOwner(
        Request::create('/tenant/proposals/'.$proposal->id.'/review', 'POST', ['decision' => 'approve']),
    );
    $request->user()->setAttribute('role', 'institution');

    app(ProposalController::class)->review($request, $proposal);

    expect($proposal->fresh()->completed_at)->not->toBeNull()
        ->and($proposal->actionTransitions()->firstOrFail()->decision)->toBe('approve')
        ->and($proposal->actionTransitions()->firstOrFail()->user_id)->toBe(1);
});

test('tracking provides documents assigned to the current reviewer group', function () {
    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $reviewerRole = Role::factory()->create();
    $assignedDocument = Document::factory()->create([
        'label' => 'doc',
        'name' => 'Reviewer notes',
    ]);
    $reviewAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'approve_deny',
        'reviewer_groups' => [[
            'id' => 'reviewer',
            'name' => 'Reviewer',
            'role_ids' => [$reviewerRole->id],
            'document_ids' => [$assignedDocument->id],
        ]],
    ]);
    DB::connection('tenant')->table('users')->insertOrIgnore([
        'id' => 1,
        'name' => 'Reviewer',
        'email' => 'reviewer@example.test',
        'password' => 'test-password',
    ]);
    DB::connection('tenant')->table('role_user')->insert([
        'role_id' => $reviewerRole->id,
        'user_id' => 1,
    ]);
    Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 2,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $reviewAction->id,
    ]);
    $request = proposalRequestAsOwner(Request::create('/tenant/proposals?view=tracking', 'GET'));
    $request->user()->setAttribute('role', 'reviewer');

    $props = app(ProposalController::class)
        ->index($request)
        ->toResponse($request)
        ->getData(true)['props'];

    expect($props['proposals'][0]['can_review'])->toBeTrue()
        ->and(collect($props['proposals'][0]['review_documents'])->pluck('id')->all())
        ->toBe([$assignedDocument->id]);
});

test('rejection reviews persist comments for flagged proposal files', function () {
    if (! Schema::connection('tenant')->hasColumn('proposal_action_transitions', 'rejected_documents')) {
        Schema::connection('tenant')->table('proposal_action_transitions', function (Blueprint $table): void {
            $table->json('rejected_documents')->nullable();
        });
    }

    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $reviewAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'approve_deny',
    ]);
    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 2,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $reviewAction->id,
    ]);
    $file = Document::factory()->create();
    $proposal->documents()->attach($file->id);
    $request = proposalRequestAsOwner(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/review',
            'POST',
            [
                'decision' => 'deny',
                'rejected_documents' => [[
                    'document_id' => $file->id,
                    'comment' => 'The submitted file is incomplete.',
                ]],
            ],
        ),
    );
    $request->user()->setAttribute('role', 'institution');

    app(ProposalController::class)->review($request, $proposal);

    expect($proposal->actionTransitions()->firstOrFail()->rejected_documents)
        ->toBe([[
            'document_id' => $file->id,
            'comment' => 'The submitted file is incomplete.',
        ]]);

    $indexRequest = proposalRequestAsOwner(
        Request::create('/tenant/proposals', 'GET'),
        2,
    );
    $indexProps = app(ProposalController::class)
        ->index($indexRequest)
        ->toResponse($indexRequest)
        ->getData(true)['props'];

    expect($indexProps['proposals'][0]['action_transitions'][0]['rejected_documents'])
        ->toBe([[
            'document_id' => $file->id,
            'comment' => 'The submitted file is incomplete.',
        ]]);
});

test('main-role members can assign reviewers and final decisions wait for recommendations', function () {
    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $mainReviewerRole = Role::create(['name' => 'Main reviewer']);
    DB::connection('tenant')->table('role_tenant_user')->insert([
        ['role_id' => $mainReviewerRole->id, 'tenant_user_id' => 1],
        ['role_id' => $mainReviewerRole->id, 'tenant_user_id' => 2],
    ]);
    $reviewAction = Action::factory()->for($phase)->create([
        'action_type' => 'review',
        'decision_mode' => 'approve_deny',
        'reviewer_groups' => [[
            'id' => 'assignment-1',
            'name' => 'Main reviewer role',
            'role_ids' => [$mainReviewerRole->id],
            'document_ids' => [],
        ]],
    ]);
    $proposal = Proposal::create([
        'title' => 'Review coordination',
        'user_id' => 3,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $reviewAction->id,
    ]);
    $controller = app(ProposalController::class);
    $mainReviewer = new SuperadminTenantUser;
    $mainReviewer->setAttribute($mainReviewer->getKeyName(), 1);
    $mainReviewer->setAttribute('institution_id', 1);
    $assignmentRequest = Request::create(
        '/tenant/proposals/'.$proposal->id.'/reviewers',
        'PUT',
        ['reviewers' => [SuperadminTenantUser::class.':2']],
    );
    $assignmentRequest->setUserResolver(fn (): SuperadminTenantUser => $mainReviewer);
    $controller->assignReviewers($assignmentRequest, $proposal, app(ReviewAssignmentService::class));
    $reviewer = ProposalActionReviewer::query()->firstOrFail();

    $otherRoleMember = new SuperadminTenantUser;
    $otherRoleMember->setAttribute($otherRoleMember->getKeyName(), 3);
    $otherRoleMember->setAttribute('institution_id', 1);
    DB::connection('tenant')->table('role_tenant_user')->insert([
        'role_id' => $mainReviewerRole->id,
        'tenant_user_id' => 3,
    ]);
    $takeoverRequest = Request::create(
        '/tenant/proposals/'.$proposal->id.'/reviewers',
        'PUT',
        ['reviewers' => [SuperadminTenantUser::class.':2']],
    );
    $takeoverRequest->setUserResolver(fn (): SuperadminTenantUser => $otherRoleMember);
    $controller->assignReviewers(
        $takeoverRequest,
        $proposal,
        app(ReviewAssignmentService::class),
    );

    expect($reviewer->fresh()->assigned_by_user_id)->toBe(3);

    $mainRequest = Request::create(
        '/tenant/proposals/'.$proposal->id.'/review',
        'POST',
        ['decision' => 'approve'],
    );
    $mainRequest->setUserResolver(fn (): SuperadminTenantUser => $mainReviewer);

    expect(fn () => $controller->review($mainRequest, $proposal))
        ->toThrow(ValidationException::class)
        ->and($proposal->fresh()->current_action_id)->toBe($reviewAction->id)
        ->and($proposal->actionTransitions()->count())->toBe(0);

    $additionalReviewer = new SuperadminTenantUser;
    $additionalReviewer->setAttribute($additionalReviewer->getKeyName(), 2);
    $additionalReviewer->setAttribute('institution_id', 1);
    $memberRequest = Request::create(
        '/tenant/proposals/'.$proposal->id.'/reviewer-response',
        'POST',
        ['decision' => 'deny', 'comment' => 'Needs more detail.'],
    );
    $memberRequest->setUserResolver(fn (): SuperadminTenantUser => $additionalReviewer);
    $controller->submitReviewerResponse($memberRequest, $proposal);

    expect($reviewer->fresh()->decision)->toBe('deny')
        ->and($reviewer->fresh()->comment)->toBe('Needs more detail.')
        ->and($proposal->fresh()->current_action_id)->toBe($reviewAction->id)
        ->and($proposal->actionTransitions()->count())->toBe(0);

    $controller->review($mainRequest, $proposal->fresh());

    expect($proposal->fresh()->current_action_id)->toBeNull()
        ->and($proposal->fresh()->completed_at)->not->toBeNull()
        ->and($proposal->actionTransitions()->count())->toBe(1);
});

test('uploaded proposal documents persist their required phase and document', function () {
    Storage::fake('local');

    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $action = Action::factory()->for($phase)->create();
    $requiredDocument = Document::factory()->create([
        'name' => 'Application form',
        'label' => 'form',
        'file_type' => 'application/pdf',
    ]);
    $action->documents()->attach($requiredDocument);
    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $action->id,
    ]);
    $request = proposalRequestAsOwner(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/documents',
            'POST',
            [
                'phase_id' => $phase->id,
                'required_document_id' => $requiredDocument->id,
                'action_id' => $action->id,
            ],
            [],
            ['file' => UploadedFile::fake()->create('application.pdf', 20, 'application/pdf')],
        ),
    );

    app(ProposalController::class)->storeDocument($request, $proposal);

    $uploadedDocument = $proposal->documents()->firstOrFail();

    expect($uploadedDocument->name)->toBe('Application form')
        ->and($uploadedDocument->label)->toBe('form')
        ->and((int) $uploadedDocument->pivot->phase_id)->toBe($phase->id)
        ->and((int) $uploadedDocument->pivot->required_document_id)->toBe($requiredDocument->id)
        ->and((int) $uploadedDocument->pivot->action_id)->toBe($action->id)
        ->and(Storage::disk('local')->allFiles('proposals/'.$proposal->id.'/documents'))->toHaveCount(1);
});

test('proposal owners can replace an uploaded required document without creating a duplicate', function () {
    Storage::fake('local');

    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $action = Action::factory()->for($phase)->create();
    $requiredDocument = Document::factory()->create([
        'name' => 'Application form',
        'label' => 'form',
        'file_type' => 'application/pdf',
    ]);
    $action->documents()->attach($requiredDocument);
    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $action->id,
    ]);
    $oldFilePath = 'proposals/'.$proposal->id.'/documents/old.pdf';
    Storage::disk('local')->put($oldFilePath, 'old file contents');
    $uploadedDocument = Document::factory()->create([
        'name' => $requiredDocument->name,
        'file_path' => $oldFilePath,
        'file_type' => 'application/pdf',
        'storage_driver' => 'local',
    ]);
    $proposal->documents()->attach($uploadedDocument->id, [
        'phase_id' => $phase->id,
        'required_document_id' => $requiredDocument->id,
        'action_id' => $action->id,
    ]);
    $request = proposalRequestAsOwner(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/documents',
            'POST',
            [
                'phase_id' => $phase->id,
                'required_document_id' => $requiredDocument->id,
                'action_id' => $action->id,
                'replace_document_id' => $uploadedDocument->id,
            ],
            [],
            ['file' => UploadedFile::fake()->create('replacement.pdf', 20, 'application/pdf')],
        ),
    );

    app(ProposalController::class)->storeDocument($request, $proposal);

    $replacement = $proposal->documents()->firstOrFail();

    expect($proposal->documents()->count())->toBe(1)
        ->and($replacement->id)->toBe($uploadedDocument->id)
        ->and($replacement->file_path)->not->toBe($oldFilePath)
        ->and(Storage::disk('local')->exists($oldFilePath))->toBeFalse()
        ->and(Storage::disk('local')->exists($replacement->file_path))->toBeTrue();
});

test('proposal upload derives document type and rejects files that do not match the required type', function () {
    Storage::fake('local');

    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $action = Action::factory()->for($phase)->create();
    $requiredDocument = Document::factory()->create([
        'label' => 'form',
        'file_type' => 'application/pdf',
    ]);
    $action->documents()->attach($requiredDocument);
    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $action->id,
    ]);
    $request = proposalRequestAsOwner(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/documents',
            'POST',
            [
                'name' => 'Wrong file type',
                'label' => 'doc',
                'phase_id' => $phase->id,
                'required_document_id' => $requiredDocument->id,
                'action_id' => $action->id,
            ],
            [],
            ['file' => UploadedFile::fake()->create('application.txt', 20, 'text/plain')],
        ),
    );

    app(ProposalController::class)->storeDocument($request, $proposal);

    expect($proposal->documents()->exists())->toBeFalse()
        ->and(Document::query()->where('name', 'Wrong file type')->exists())->toBeFalse()
        ->and(Storage::disk('local')->allFiles('proposals/'.$proposal->id.'/documents'))->toBe([]);
});

test('proposal details can still upload a document without a phase requirement', function () {
    Storage::fake('local');

    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
    ]);
    $request = proposalRequestAsOwner(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/documents',
            'POST',
            [
                'name' => 'Supporting material',
                'label' => 'doc',
            ],
            [],
            ['file' => UploadedFile::fake()->create('supporting.pdf', 20, 'application/pdf')],
        ),
    );

    app(ProposalController::class)->storeDocument($request, $proposal);

    $uploadedDocument = $proposal->documents()->firstOrFail();

    expect($uploadedDocument->name)->toBe('Supporting material')
        ->and($uploadedDocument->pivot->phase_id)->toBeNull()
        ->and($uploadedDocument->pivot->required_document_id)->toBeNull();
});

test('proposal document upload rejects requirements from a different phase', function () {
    Storage::fake('local');

    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $unrelatedPhase = Phase::factory()->create();
    $action = Action::factory()->for($unrelatedPhase)->create();
    $requiredDocument = Document::factory()->create();
    $action->documents()->attach($requiredDocument);
    $proposal = Proposal::create([
        'title' => 'Research proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
    ]);
    $request = proposalRequestAsOwner(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/documents',
            'POST',
            [
                'name' => 'Invalid application',
                'label' => 'form',
                'phase_id' => $phase->id,
                'required_document_id' => $requiredDocument->id,
            ],
            [],
            ['file' => UploadedFile::fake()->create('application.pdf', 20, 'application/pdf')],
        ),
    );

    app(ProposalController::class)->storeDocument($request, $proposal);

    expect(Document::query()->where('name', 'Invalid application')->exists())->toBeFalse()
        ->and($proposal->documents()->exists())->toBeFalse();
});

test('proposal owners are required for proposal details and workflow actions', function () {
    $proposal = Proposal::create([
        'title' => 'Private proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
    ]);
    $otherUserRequest = proposalRequestAsOwner(
        Request::create('/tenant/proposals/'.$proposal->id.'/submit', 'POST'),
        2,
    );
    $controller = app(ProposalController::class);

    expect(fn () => $controller->show($otherUserRequest, $proposal))
        ->toThrow(HttpException::class);
    expect(fn () => $controller->submit($otherUserRequest, $proposal))
        ->toThrow(HttpException::class);

});
