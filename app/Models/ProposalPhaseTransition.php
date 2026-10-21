<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $proposal_id
 * @property int $phase_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ProposalPhaseTransition extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'phase_id',
    ];

    /**
     * The proposal this transition belongs to.
     *
     * @return BelongsTo<Proposal, $this>
     */
    public function proposal(): BelongsTo
    {
        return $this->belongsTo(Proposal::class);
    }

    /**
     * The phase reached by this transition.
     *
     * @return BelongsTo<Phase, $this>
     */
    public function phase(): BelongsTo
    {
        return $this->belongsTo(Phase::class);
    }
}
