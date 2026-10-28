<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProposalActionReviewer extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'proposal_id',
        'action_id',
        'round',
        'user_id',
        'user_type',
        'assigned_by_user_id',
        'assigned_by_user_type',
        'decision',
        'comment',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'round' => 'integer',
            'responded_at' => 'datetime',
        ];
    }

    /**
     * The proposal being reviewed.
     *
     * @return BelongsTo<Proposal, $this>
     */
    public function proposal(): BelongsTo
    {
        return $this->belongsTo(Proposal::class);
    }

    /**
     * The review action for this reviewer assignment.
     *
     * @return BelongsTo<Action, $this>
     */
    public function action(): BelongsTo
    {
        return $this->belongsTo(Action::class);
    }
}
