<?php

namespace App\Models;

use Database\Factories\TenantUserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * @property int $id
 *
 * @deprecated Use User for centrally authenticated institution accounts.
 */
class TenantUser extends User
{
    /** @use HasFactory<TenantUserFactory> */
    use HasFactory;

    protected $table = 'tenant_users';
}
