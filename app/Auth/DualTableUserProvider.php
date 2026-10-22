<?php

namespace App\Auth;

use App\Models\SuperadminTenantUser;
use App\Models\User;
use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

class DualTableUserProvider extends EloquentUserProvider
{
    /**
     * Retrieve a user by their unique identifier.
     *
     * @param  mixed  $identifier
     * @return Authenticatable|null
     */
    public function retrieveById($identifier)
    {
        if (is_string($identifier) && str_starts_with($identifier, 'tenant_user:')) {
            return SuperadminTenantUser::find(substr($identifier, strlen('tenant_user:')));
        }

        // First check the users table
        $user = User::find($identifier);

        if ($user) {
            return $user;
        }

        // Then check tenant_users table in superadmin DB
        return SuperadminTenantUser::find($identifier);
    }

    /**
     * Retrieve a user by their unique identifier and "remember me" token.
     *
     * @param  mixed  $identifier
     * @param  string  $token
     * @return Authenticatable|null
     */
    public function retrieveByToken($identifier, $token)
    {
        if (is_string($identifier) && str_starts_with($identifier, 'tenant_user:')) {
            return SuperadminTenantUser::where('id', substr($identifier, strlen('tenant_user:')))
                ->where('remember_token', $token)
                ->first();
        }

        // Check users table
        $user = User::where('id', $identifier)
            ->where('remember_token', $token)
            ->first();

        if ($user) {
            return $user;
        }

        // Check tenant_users table in superadmin DB
        return SuperadminTenantUser::where('id', $identifier)
            ->where('remember_token', $token)
            ->first();
    }

    /**
     * Retrieve a user by the given credentials.
     *
     * @return Authenticatable|null
     */
    public function retrieveByCredentials(array $credentials)
    {
        if (empty($credentials) ||
            (count($credentials) === 1 && array_key_exists('password', $credentials))) {
            return null;
        }

        // Build query for non-password credentials
        $query = [];
        foreach ($credentials as $key => $value) {
            if (! str_contains($key, 'password')) {
                $query[$key] = $value;
            }
        }

        // First check the users table
        $user = User::where($query)->first();

        if ($user) {
            return $user;
        }

        // Then check tenant_users table in superadmin DB
        return SuperadminTenantUser::where($query)->first();
    }

    /**
     * Validate a user against the given credentials.
     *
     * @return bool
     */
    public function validateCredentials(Authenticatable $user, array $credentials)
    {
        $plain = $credentials['password'];

        return $this->hasher->check($plain, $user->getAuthPassword());
    }

    /**
     * Update the "remember me" token for the given user in storage.
     *
     * @param  string  $token
     * @return void
     */
    public function updateRememberToken(Authenticatable $user, $token)
    {
        $user->setRememberToken($token);
        $user->save();
    }
}
