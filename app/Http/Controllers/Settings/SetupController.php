<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
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
        $activeConfig = TenantDatabaseConfig::where('is_active', true)->first();

        // Determine which view to render based on the route
        $view = 'settings/institution';
        if ($request->route()->getName() === 'database.edit') {
            $view = 'settings/database';
        }

        return Inertia::render($view, [
            'institutionName' => $request->user()->institution_name,
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

        // Update both institution_name and name (for superadmin user)
        $user->fill([
            'institution_name' => $validated['institution_name'],
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

        // Deactivate all existing configs
        TenantDatabaseConfig::query()->update(['is_active' => false]);

        // Create new active config
        $config = TenantDatabaseConfig::create([
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
                TenantDatabaseConfig::query()->update(['is_active' => false]);

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
    public function migrate(): RedirectResponse
    {
        $config = TenantDatabaseConfig::where('is_active', true)->first();

        if (! $config) {
            return redirect()->back()->withErrors([
                'migration' => 'No active database configuration found.',
            ]);
        }

        try {
            // Update tenant connection configuration
            Config::set('database.connections.tenant', $config->toConnectionConfig());
            DB::purge('tenant');

            // Test connection first
            DB::connection('tenant')->getPdo();

            // Run migrations
            \Artisan::call('migrate', [
                '--database' => 'tenant',
                '--path' => 'database/migrations/tenant',
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
            $config = TenantDatabaseConfig::where('is_active', true)->first();

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
