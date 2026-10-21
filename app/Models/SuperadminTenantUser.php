<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tenant users stored in the superadmin database (tenant_users table).
 * These users authenticate through the main login and access tenant features.
 */
class SuperadminTenantUser extends User
{
    protected $table = 'tenant_users';

    protected $connection = 'sqlite';

    protected $appends = ['theme_color'];

    public function getInstitutionId(): ?int
    {
        return $this->institution_id === null ? null : (int) $this->institution_id;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(User::class, 'institution_id')->where('role', 'institution');
    }

    protected function themeColor(): Attribute
    {
        return Attribute::get(fn (): string => $this->institution?->theme_color ?? 'zinc');
    }

    public function getAuthIdentifier(): mixed
    {
        return 'tenant_user:'.$this->getKey();
    }
}
