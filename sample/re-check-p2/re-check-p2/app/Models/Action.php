<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Action extends Model
{
    protected $fillable = [
        'phase_id',
        'type',
        'name',
        'description',
        'assigned_role',
        'config',
        'order',
    ];

    protected $casts = [
        'config' => 'json',
        'order' => 'integer',
    ];

    /**
     * Get the phase that owns the action.
     */
    public function phase(): BelongsTo
    {
        return $this->belongsTo(Phase::class);
    }
}
