<?php

namespace App\Console\Commands;

use App\Models\TenantDatabaseConfig;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

use function Laravel\Prompts\confirm;

#[Signature('tenant:setup {--force : Skip confirmation prompts} {--fresh : Drop all tables and migrate fresh}')]
#[Description('Setup tenant database using the active configuration')]
class TenantSetupCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->components->info('🔧 Tenant Database Setup');
        $this->newLine();

        // Load active configuration
        $config = TenantDatabaseConfig::where('is_active', true)->first();

        if (! $config) {
            $this->components->error('No active tenant database configuration found.');
            $this->components->warn('Please configure the database in the admin panel first.');

            return self::FAILURE;
        }

        // Display current configuration
        $this->displayConfiguration($config);
        $this->newLine();

        // Confirm before proceeding
        if (! $this->option('force')) {
            if (! confirm('Do you want to proceed with the setup?', true)) {
                $this->components->warn('Setup cancelled.');

                return self::SUCCESS;
            }
        }

        // Test connection
        $this->components->info('Testing database connection...');

        if (! $this->testConnection($config)) {
            $this->components->error('Failed to connect to the database.');
            $this->components->warn('Please verify your database credentials in the admin panel.');

            return self::FAILURE;
        }

        $this->components->success('Connection successful!');
        $this->newLine();

        // Run migrations
        return $this->runMigrations();
    }

    /**
     * Display the active configuration.
     */
    private function displayConfiguration(TenantDatabaseConfig $config): void
    {
        $this->components->twoColumnDetail('Driver', $config->driver === 'sqlite' ? 'SQLite' : 'PostgreSQL');
        $this->components->twoColumnDetail('Database', $config->database);

        if ($config->driver === 'pgsql') {
            $this->components->twoColumnDetail('Host', $config->host);
            $this->components->twoColumnDetail('Port', $config->port ?? '5432');
            $this->components->twoColumnDetail('Username', $config->username);
        }
    }

    /**
     * Test the database connection.
     */
    private function testConnection(TenantDatabaseConfig $config): bool
    {
        try {
            Config::set('database.connections.tenant', $config->toConnectionConfig());
            DB::purge('tenant');
            DB::connection('tenant')->getPdo();

            return true;
        } catch (\Exception $e) {
            $this->components->error($e->getMessage());

            return false;
        }
    }

    /**
     * Run database migrations.
     */
    private function runMigrations(): int
    {
        $this->components->info('Running migrations...');
        $this->newLine();

        try {
            if ($this->option('fresh')) {
                $exitCode = Artisan::call('migrate:fresh', [
                    '--database' => 'tenant',
                    '--path' => 'database/migrations/tenant',
                    '--force' => true,
                ], $this->output);
            } else {
                $exitCode = Artisan::call('migrate', [
                    '--database' => 'tenant',
                    '--path' => 'database/migrations/tenant',
                    '--force' => true,
                ], $this->output);
            }

            if ($exitCode === 0) {
                $this->newLine();
                $this->components->success('Tenant database setup completed successfully!');

                return self::SUCCESS;
            }

            $this->components->error('Migration failed.');

            return self::FAILURE;
        } catch (\Exception $e) {
            $this->components->error('Migration error: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
