<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Process extends Model
{
    protected $fillable = [
        'name',
        'description',
        'status',
    ];

    /**
     * Get the phases for the process.
     */
    public function phases(): HasMany
    {
        return $this->hasMany(Phase::class)->orderBy('order');
    }
}
