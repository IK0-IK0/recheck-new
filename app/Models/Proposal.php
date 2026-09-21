<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $title
 * @property int $user_id
 * @property int|null $process_id
 * @property int|null $current_phase_id
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
        'process_id',
        'current_phase_id',
    ];

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
        return $this->belongsToMany(Document::class, 'proposal_documents', 'proposal_id', 'document_id');
    }
}
