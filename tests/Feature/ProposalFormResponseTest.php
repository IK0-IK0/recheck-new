<?php

use App\Http\Controllers\ProposalController;
use App\Models\Action;
use App\Models\Document;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Proposal;
use App\Models\ProposalFormResponse;
use App\Models\SuperadminTenantUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

function proposalFormResponseRequest(Request $request, User $user): Request
{
    $request->setUserResolver(fn (): User => $user);

    return $request;
}

function proposalWithReviewForm(): array
{
    $process = Process::factory()->create();
    $phase = Phase::factory()->for($process)->create();
    $action = Action::factory()->for($phase)->create(['action_type' => 'review']);
    $form = Document::factory()->create([
        'name' => 'Review form',
        'label' => 'form',
        'form_fields' => [
            [
                'id' => 'summary',
                'type' => 'short_text',
                'label' => 'Summary',
                'validation' => ['required' => true],
            ],
            [
                'id' => 'recommendation',
                'type' => 'multiple_choice',
                'label' => 'Recommendation',
                'options' => [
                    ['id' => 'yes', 'label' => 'Yes', 'value' => 'yes'],
                    ['id' => 'no', 'label' => 'No', 'value' => 'no'],
                ],
            ],
        ],
    ]);
    $action->documents()->attach($form);
    $proposal = Proposal::create([
        'title' => 'Form response proposal',
        'user_id' => 1,
        'user_type' => User::class,
        'institution_id' => 1,
        'process_id' => $process->id,
        'current_phase_id' => $phase->id,
        'current_action_id' => $action->id,
    ]);

    return [$proposal, $action, $form];
}

test('reviewers save their own form responses for the current action', function () {
    [$proposal, $action, $form] = proposalWithReviewForm();
    $controller = app(ProposalController::class);
    $owner = new User;
    $owner->setAttribute($owner->getKeyName(), 1);
    $reviewer = new SuperadminTenantUser;
    $reviewer->setAttribute($reviewer->getKeyName(), 7);
    $reviewer->setAttribute('institution_id', 1);

    $ownerRequest = proposalFormResponseRequest(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/forms/'.$form->id.'/responses',
            'POST',
            [
                'action_id' => $action->id,
                'answers' => ['summary' => 'Owner response', 'recommendation' => 'yes'],
            ],
        ),
        $owner,
    );
    $reviewerRequest = proposalFormResponseRequest(
        Request::create(
            '/tenant/proposals/'.$proposal->id.'/forms/'.$form->id.'/responses',
            'POST',
            [
                'action_id' => $action->id,
                'answers' => ['summary' => 'Reviewer response', 'recommendation' => 'no'],
            ],
        ),
        $reviewer,
    );

    $controller->storeFormResponse($ownerRequest, $proposal, $form);
    $controller->storeFormResponse($reviewerRequest, $proposal, $form);

    $responses = ProposalFormResponse::query()
        ->where('proposal_id', $proposal->id)
        ->where('document_id', $form->id)
        ->where('action_id', $action->id)
        ->get();

    expect($responses)->toHaveCount(2)
        ->and($responses->firstWhere('user_type', User::class)?->answers)
        ->toBe(['summary' => 'Owner response', 'recommendation' => 'yes'])
        ->and($responses->firstWhere('user_type', SuperadminTenantUser::class)?->answers)
        ->toBe(['summary' => 'Reviewer response', 'recommendation' => 'no']);
});

test('form responses reject unknown fields and invalid option values', function () {
    [$proposal, , $form] = proposalWithReviewForm();
    $user = new User;
    $user->setAttribute($user->getKeyName(), 1);
    $controller = app(ProposalController::class);

    foreach ([
        ['summary' => 'A valid response', 'unknown' => 'extra'],
        ['summary' => 'A valid response', 'recommendation' => 'not-an-option'],
    ] as $answers) {
        $request = proposalFormResponseRequest(
            Request::create(
                '/tenant/proposals/'.$proposal->id.'/forms/'.$form->id.'/responses',
                'POST',
                ['action_id' => $proposal->current_action_id, 'answers' => $answers],
            ),
            $user,
        );

        expect(fn () => $controller->storeFormResponse($request, $proposal, $form))
            ->toThrow(ValidationException::class);
    }

    expect(ProposalFormResponse::query()->where('proposal_id', $proposal->id)->exists())
        ->toBeFalse();
});
