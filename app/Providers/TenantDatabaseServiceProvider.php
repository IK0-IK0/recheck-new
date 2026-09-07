<?php

namespace App\Providers;

use App\Models\TenantDatabaseConfig;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class TenantDatabaseServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     *
     * Loads the active tenant database configuration and updates the connection.
     */
    public function boot(): void
    {
        try {
            // Only load if the tenant_database_configs table exists
            if (! $this->tableExists('tenant_database_configs')) {
                return;
            }

            $activeConfig = TenantDatabaseConfig::where('is_active', true)->first();

            if ($activeConfig) {
                $this->configureTenantConnection($activeConfig);
            }
        } catch (\Exception $e) {
            // Log error but don't break the application
            Log::warning('Failed to load tenant database configuration: '.$e->getMessage());
        }
    }

    /**
     * Configure the tenant database connection with the active configuration.
     */
    private function configureTenantConnection(TenantDatabaseConfig $config): void
    {
        Config::set('database.connections.tenant', $config->toConnectionConfig());

        // Purge and reconnect to apply new configuration
        DB::purge('tenant');
    }

    /**
     * Check if a table exists in the default database.
     */
    private function tableExists(string $table): bool
    {
        try {
            return DB::getSchemaBuilder()->hasTable($table);
        } catch (\Exception $e) {
            return false;
        }
    }
}
