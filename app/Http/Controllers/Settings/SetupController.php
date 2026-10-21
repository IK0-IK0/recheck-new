<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\DatabaseConfig;
use App\Models\SuperadminTenantUser;
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

        $user = $request->user();
        $institution = $user instanceof SuperadminTenantUser ? $user->institution : $user;
        abort_unless($institution && $institution->role === 'institution', 403);

        $activeConfig = TenantDatabaseConfig::activeForCurrentUser();

        // Determine which view to render based on the route
        $view = 'settings/institution';
        if ($request->route()->getName() === 'database.edit') {
            $view = 'settings/database';
        }

        return Inertia::render($view, [
            'institutionName' => $institution->name,
            'institutionEmail' => $institution->email,
            'themeColor' => $institution->theme_color ?? 'zinc',
            'canEditTheme' => ! ($user instanceof SuperadminTenantUser),
            'currentConfig' => $activeConfig,
            'migrationStatus' => $this->getMigrationStatus(),
        ]);
    }

    /**
     * Update institution details without changing the institution theme.
     */
    public function update(Request $request): RedirectResponse
    {
        $rules = [
            'institution_name' => ['required', 'string', 'max:255'],
            'institution_email' => ['nullable', 'string', 'email', 'max:255'],
        ];

        $user = $request->user();
        $canEditTheme = ! ($user instanceof SuperadminTenantUser);
        if ($canEditTheme) {
            $rules['theme_color'] = ['required', 'string', Rule::in(ProfileUpdateRequest::THEME_COLORS)];
        }

        $validated = $request->validate($rules);
        $institution = $user instanceof SuperadminTenantUser ? $user->institution : $user;
        abort_unless($institution && $institution->role === 'institution', 403);

        $institutionData = [
            'name' => $validated['institution_name'],
            'email' => $validated['institution_email'] ?? null,
        ];
        if ($canEditTheme) {
            $institutionData['theme_color'] = $validated['theme_color'];
        }

        $institution->fill($institutionData)->save();

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
        $institutionId = $isAdmin ? null : $request->user()->getInstitutionId();
        abort_unless($isAdmin || $institutionId !== null, 403);

        $configQuery = $configModel::query();
        if (! $isAdmin) {
            $configQuery->where('tenant_id', $institutionId);
        }
        $configQuery->update(['is_active' => false]);

        // Create new active config
        $config = $configModel::create([
            'tenant_id' => $institutionId,
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
