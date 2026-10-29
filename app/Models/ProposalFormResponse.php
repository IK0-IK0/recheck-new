<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $proposal_id
 * @property int $document_id
 * @property int $action_id
 * @property int $round
 * @property int $user_id
 * @property string $user_type
 * @property array<string, mixed> $answers
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ProposalFormResponse extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'proposal_id',
        'document_id',
        'action_id',
        'round',
        'user_id',
        'user_type',
        'answers',
    ];

    protected function casts(): array
    {
        return [
            'round' => 'integer',
            'answers' => 'array',
        ];
    }

    /**
     * The proposal this response belongs to.
     *
     * @return BelongsTo<Proposal, $this>
     */
    public function proposal(): BelongsTo
    {
        return $this->belongsTo(Proposal::class);
    }

    /**
     * The form this response answers.
     *
     * @return BelongsTo<Document, $this>
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * The workflow action this response answers.
     *
     * @return BelongsTo<Action, $this>
     */
    public function action(): BelongsTo
    {
        return $this->belongsTo(Action::class);
    }
}
