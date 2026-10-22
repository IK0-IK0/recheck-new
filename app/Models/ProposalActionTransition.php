<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $proposal_id
 * @property int $action_id
 * @property string|null $decision
 * @property int|null $user_id
 * @property string|null $user_type
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ProposalActionTransition extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'action_id',
        'decision',
        'user_id',
        'user_type',
    ];

    /**
     * The proposal this action transition belongs to.
     *
     * @return BelongsTo<Proposal, $this>
     */
    public function proposal(): BelongsTo
    {
        return $this->belongsTo(Proposal::class);
    }

    /**
     * The action completed during this transition.
     *
     * @return BelongsTo<Action, $this>
     */
    public function action(): BelongsTo
    {
        return $this->belongsTo(Action::class);
    }
}
