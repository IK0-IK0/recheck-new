<?php

namespace App\Models;

use Database\Factories\DocumentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $file_path
 * @property string $file_type
 * @property string $label
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Document extends Model
{
    /** @use HasFactory<DocumentFactory> */
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
        'name',
        'file_path',
        'file_type',
        'label',
        'storage_driver',
    ];

    /**
     * The actions that require this document.
     *
     * @return BelongsToMany<Action, $this>
     */
    public function actions(): BelongsToMany
    {
        return $this->belongsToMany(Action::class, 'action_document', 'document_id', 'action_id');
    }
}
