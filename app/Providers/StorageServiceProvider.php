<?php

namespace App\Providers;

use App\Models\StorageConfig;
use App\Storage\SupabaseStorageAdapter;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\Filesystem;

class StorageServiceProvider extends ServiceProvider
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
     */
    public function boot(): void
    {
        // Register Supabase driver
        \Storage::extend('supabase', function ($app, $config) {
            $adapter = new SupabaseStorageAdapter(
                $config['project_url'],
                $config['service_role_key'],
                $config['bucket']
            );

            return new FilesystemAdapter(
                new Filesystem($adapter),
                $adapter,
                $config
            );
        });

        try {
            $activeConfig = StorageConfig::where('is_active', true)->first();

            if ($activeConfig) {
                $diskConfig = $activeConfig->toFilesystemConfig();

                // Determine the actual disk name (might be 'supabase' for Supabase endpoints)
                $diskName = $diskConfig['driver'];

                // Configure the disk
                Config::set('filesystems.disks.'.$diskName, $diskConfig);

                // Set as default disk
                Config::set('filesystems.default', $diskName);
            }
        } catch (\Exception $e) {
            // Silently fail during migrations or when table doesn't exist yet
        }
    }
}
