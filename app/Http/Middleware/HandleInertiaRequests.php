<?php

namespace App\Http\Middleware;

use App\Models\StorageConfig;
use App\Models\TenantDatabaseConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $roles = [];
        $permissions = [];
        $databaseReady = false;
        $storageReady = false;

        try {
            $databaseConfig = $user?->role === 'admin'
                ? null
                : TenantDatabaseConfig::activeForCurrentUser();

            if ($databaseConfig) {
                Config::set('database.connections.tenant', $databaseConfig->toConnectionConfig());
                DB::purge('tenant');
                $databaseReady = DB::connection('tenant')->getSchemaBuilder()->hasTable('migrations');
            }

            $storageReady = StorageConfig::queryForCurrentUser()->where('is_active', true)->exists();
        } catch (\Throwable) {
            // Setup status is unavailable until the central database is ready.
        }

        if ($user !== null && method_exists($user, 'roles')) {
            try {
                if (Schema::connection('tenant')->hasTable('roles')) {
                    $roles = $user->roles()->pluck('name')->all();

                    $permissions = $user->roles()
                        ->with('permissions')
                        ->get()
                        ->pluck('permissions.*.name')
                        ->flatten()
                        ->unique()
                        ->values()
                        ->all();
                }
            } catch (\Throwable) {
                // Institution roles are unavailable until its database is configured.
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'roles' => $roles,
                'permissions' => $permissions,
            ],
            'setupStatus' => [
                'database' => $databaseReady,
                'storage' => $storageReady,
                'complete' => $databaseReady && $storageReady,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
