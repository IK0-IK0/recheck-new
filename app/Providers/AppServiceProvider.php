<?php

namespace App\Providers;

use App\Auth\DualTableUserProvider;
use App\Storage\SupabaseStorageAdapter;
use Carbon\CarbonImmutable;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use League\Flysystem\Filesystem;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerSupabaseStorageDriver();
        $this->registerDualTableAuthProvider();
    }

    /**
     * Register custom authentication provider that checks both users and tenant_users tables.
     */
    protected function registerDualTableAuthProvider(): void
    {
        Auth::provider('dual-table', function ($app, array $config) {
            return new DualTableUserProvider($app['hash'], $config['model']);
        });
    }

    /**
     * Register custom Supabase storage driver.
     */
    protected function registerSupabaseStorageDriver(): void
    {
        \Storage::extend('supabase', function ($app, $config) {
            $adapter = new SupabaseStorageAdapter(
                $config['project_url'],
                $config['service_role_key'],
                $config['bucket']
            );

            return new FilesystemAdapter(
                new Filesystem($adapter, $config),
                $adapter,
                $config
            );
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
