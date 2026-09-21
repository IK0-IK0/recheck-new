<?php

namespace App\Http\Middleware;

use App\Models\StorageConfig;
use App\Models\TenantDatabaseConfig;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantSetup
{
    /**
     * Require both tenant database and storage setup before tenant features.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $databaseReady = false;
        $databaseConfig = TenantDatabaseConfig::activeForCurrentUser();

        if ($databaseConfig) {
            try {
                Config::set('database.connections.tenant', $databaseConfig->toConnectionConfig());
                DB::purge('tenant');
                $databaseReady = DB::connection('tenant')->getSchemaBuilder()->hasTable('migrations');
            } catch (\Throwable) {
                $databaseReady = false;
            }
        }

        if (! $databaseReady || ! StorageConfig::queryForCurrentUser()->where('is_active', true)->exists()) {
            return redirect()->route('database.edit', ['setup_required' => 1]);
        }

        return $next($request);
    }
}