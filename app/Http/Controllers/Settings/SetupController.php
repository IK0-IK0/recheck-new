<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\DatabaseConfig;
use App\Models\TenantDatabaseConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SetupController extends Controller
{
    /**
     * Display the setup settings page.
     */
    public function edit(Request $request): Response
    {
        if ($request->user()->role === 'admin' && $request->route()->getName() === 'database.edit') {
            $activeConfig = DatabaseConfig::where('is_active', true)->first();

            return Inertia::render('settings/database', [
                'currentConfig' => $activeConfig,
                'migrationStatus' => $this->getSuperadminMigrationStatus(),
            ]);
        }

        $activeConfig = TenantDatabaseConfig::activeForCurrentUser();

        // Determine which view to render based on the route
        $view = 'settings/institution';
        if ($request->route()->getName() === 'database.edit') {
            $view = 'settings/database';
        }

        return Inertia::render($view, [
            'institutionName' => $request->user()->name,
            'institutionEmail' => $request->user()->email,
            'themeColor' => $request->user()->theme_color ?? 'zinc',
            'currentConfig' => $activeConfig,
            'migrationStatus' => $this->getMigrationStatus(),
        ]);
    }

    /**
     * Update the institution name and theme color.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'institution_name' => ['required', 'string', 'max:255'],
            'institution_email' => ['nullable', 'string', 'email', 'max:255'],
            'theme_color' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $request->user();

        $user->fill([
            'name' => $validated['institution_name'],
            'theme_color' => $validated['theme_color'],
        ])->save();

        return back();
    }

    /**
     * Store or update the database configuration.
     */
    public function storeDatabase(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'driver' => ['required', 'string', Rule::in(['sqlite', 'pgsql'])],
            'host' => ['nullable', 'string', 'required_if:driver,pgsql'],
            'port' => ['nullable', 'string'],
            'database' => ['required', 'string'],
            'username' => ['nullable', 'string', 'required_if:driver,pgsql'],
            'password' => ['nullable', 'string'],
            'skip_test' => ['nullable', 'boolean'],
        ]);

        $isAdmin = $request->user()->role === 'admin';
        $configModel = $isAdmin ? DatabaseConfig::class : TenantDatabaseConfig::class;

        $configQuery = $configModel::query();
        if (! $isAdmin) {
            $configQuery->where('tenant_id', $request->user()->getKey());
        }
        $configQuery->update(['is_active' => false]);

        // Create new active config
        $config = $configModel::create([
            'tenant_id' => $isAdmin ? null : $request->user()->getKey(),
            'driver' => $validated['driver'],
            'host' => $validated['host'] ?? null,
            'port' => $validated['port'] ?? null,
            'database' => $validated['database'],
            'username' => $validated['username'] ?? null,
            'password' => $validated['password'] ?? null,
            'is_active' => true,
        ]);

        // Test the connection unless skipped
        if (! ($validated['skip_test'] ?? false)) {
            try {
                $this->testConnection($config);
            } catch (\Exception $e) {
                $config->delete();
                $configQuery->update(['is_active' => false]);

                return redirect()->back()->withErrors([
                    'connection' => 'Failed to connect to database: '.$e->getMessage(),
                ]);
            }
        }

        return redirect()->back();
    }

    /**
     * Run migrations on the tenant database.
     */
    public function migrate(Request $request): RedirectResponse
    {
        $config = $request->user()->role === 'admin'
            ? DatabaseConfig::where('is_active', true)->first()
            : TenantDatabaseConfig::activeForCurrentUser();

        if (! $config) {
            return redirect()->back()->withErrors([
                'migration' => 'No active database configuration found.',
            ]);
        }

        try {
            $isAdmin = $request->user()->role === 'admin';
            $connection = $isAdmin ? 'admin_setup' : 'tenant';
            $migrationPath = $isAdmin ? 'database/migrations/superadmin' : 'database/migrations/tenant';

            Config::set("database.connections.{$connection}", $config->toConnectionConfig());
            DB::purge($connection);

            // Test connection first
            DB::connection($connection)->getPdo();

            \Artisan::call('migrate', [
                '--database' => $connection,
                '--path' => $migrationPath,
                '--force' => true,
            ]);

            return redirect()->back();
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'migration' => 'Migration failed: '.$e->getMessage(),
            ]);
        }
    }

    /**
     * Get the current migration status.
     */
    private function getMigrationStatus(): array
    {
        try {
            $config = TenantDatabaseConfig::activeForCurrentUser();

            if (! $config) {
                return ['status' => 'no_config'];
            }

            // Try to connect and check migrations table
            Config::set('database.connections.tenant', $config->toConnectionConfig());
            DB::purge('tenant');

            if (! DB::connection('tenant')->getSchemaBuilder()->hasTable('migrations')) {
                return ['status' => 'not_migrated'];
            }

            $migrationsRun = DB::connection('tenant')->table('migrations')->count();

            return [
                'status' => 'migrated',
                'count' => $migrationsRun,
            ];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    private function getSuperadminMigrationStatus(): array
    {
        try {
            $config = DatabaseConfig::where('is_active', true)->first();

            if (! $config) {
                return ['status' => 'no_config'];
            }

            Config::set('database.connections.admin_setup', $config->toConnectionConfig());
            DB::purge('admin_setup');
            $connection = DB::connection('admin_setup');

            if (! $connection->getSchemaBuilder()->hasTable('migrations')) {
                return ['status' => 'not_migrated'];
            }

            return [
                'status' => 'migrated',
                'count' => $connection->table('migrations')->count(),
            ];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Test the database connection.
     */
    private function testConnection(TenantDatabaseConfig $config): void
    {
        $connectionConfig = $config->toConnectionConfig();

        Config::set('database.connections.test_connection', $connectionConfig);

        DB::connection('test_connection')->getPdo();

        DB::purge('test_connection');
    }
}
