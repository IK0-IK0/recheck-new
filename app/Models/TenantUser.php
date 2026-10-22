<?php

namespace App\Models;

use Database\Factories\TenantUserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Represents a user in the tenant database.
 * Used for managing institution users and their roles within a tenant context.
 */
class TenantUser extends User
{
    /** @use HasFactory<TenantUserFactory> */
    use HasFactory;

    protected $table = 'users';

    protected $connection = 'tenant';
}
