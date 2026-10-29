<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property int $user_id
 * @property string $user_type
 * @property int|null $institution_id
 * @property int|null $process_id
 * @property int|null $current_phase_id
 * @property int|null $current_action_id
 * @property Carbon|null $completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Proposal extends Model
{
    use HasFactory;

    /**
     * The database connection that should be used by the model.
     *
     * @var string
     */
    protected $connection = 'tenant';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'user_id',
        'user_type',
        'institution_id',
        'process_id',
        'current_phase_id',
        'current_action_id',
        'completed_at',
    ];

    /**
     * Get the model's attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }

    /**
     * The user who submitted the proposal.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        // User model is likely on the central connection, so we specify it
        return $this->belongsTo(User::class);
    }

    /**
     * The process this proposal follows.
     *
     * @return BelongsTo<Process, $this>
     */
    public function process(): BelongsTo
    {
        return $this->belongsTo(Process::class);
    }

    /**
     * The current phase of the proposal in the process.
     *
     * @return BelongsTo<Phase, $this>
     */
    public function currentPhase(): BelongsTo
    {
        return $this->belongsTo(Phase::class, 'current_phase_id');
    }

    /**
     * The documents attached to the proposal.
     *
     * @return BelongsToMany<Document, $this>
     */
    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(Document::class, 'proposal_documents', 'proposal_id', 'document_id')
            ->withPivot([
                'phase_id',
                'required_document_id',
                'action_id',
                'form_field_id',
            ]);
    }

    /**
     * The saved form responses for the proposal.
     *
     * @return HasMany<ProposalFormResponse, $this>
     */
    public function formResponses(): HasMany
    {
        return $this->hasMany(ProposalFormResponse::class);
    }

    /**
     * The workflow phase transitions recorded for the proposal.
     *
     * @return HasMany<ProposalPhaseTransition, $this>
     */
    public function phaseTransitions(): HasMany
    {
        return $this->hasMany(ProposalPhaseTransition::class);
    }

    /**
     * The action currently awaiting completion.
     *
     * @return BelongsTo<Action, $this>
     */
    public function currentAction(): BelongsTo
    {
        return $this->belongsTo(Action::class, 'current_action_id');
    }

    /**
     * The workflow actions already completed for this proposal.
     *
     * @return HasMany<ProposalActionTransition, $this>
     */
    public function actionTransitions(): HasMany
    {
        return $this->hasMany(ProposalActionTransition::class);
    }

    /**
     * The named reviewers assigned to review actions on this proposal.
     *
     * @return HasMany<ProposalActionReviewer, $this>
     */
    public function actionReviewers(): HasMany
    {
        return $this->hasMany(ProposalActionReviewer::class);
    }
}
