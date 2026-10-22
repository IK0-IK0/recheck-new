<?php

use App\Http\Controllers\ProposalController;
use App\Models\Action;
use App\Models\Document;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Proposal;
use App\Models\Role;
use App\Models\SuperadminTenantUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
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

test('proposals are private to their owner while tracking is shared', function () {
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
        ->toBe([
            'Another users proposal',
            'My proposal',
            'Tenant user with same numeric id',
        ]);
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

test('users can create at most three proposals including completed proposals', function () {
    foreach (range(1, 3) as $number) {
        Proposal::create([
            'title' => 'Proposal '.$number,
            'user_id' => 1,
            'user_type' => User::class,
            'institution_id' => 1,
            'completed_at' => $number === 1 ? now() : null,
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

test('uploaded proposal documents persist their required phase and document', function () {
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
                'name' => 'Completed application form',
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

    expect($uploadedDocument->name)->toBe('Completed application form')
        ->and($uploadedDocument->label)->toBe('form')
        ->and((int) $uploadedDocument->pivot->phase_id)->toBe($phase->id)
        ->and((int) $uploadedDocument->pivot->required_document_id)->toBe($requiredDocument->id)
        ->and((int) $uploadedDocument->pivot->action_id)->toBe($action->id)
        ->and(Storage::disk('local')->allFiles('proposals/'.$proposal->id.'/documents'))->toHaveCount(1);
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
