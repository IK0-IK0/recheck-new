<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * The database connections that should be wrapped in a transaction during tests.
     *
     * @var array<int, string>
     */
    protected $connectionsToTransact = ['sqlite', 'tenant'];

    /**
     * Run migrations for both the superadmin and tenant connections.
     */
    protected function migrateDatabases()
    {
        $this->artisan('migrate:fresh', [
            '--database' => 'sqlite',
            '--path' => 'database/migrations/superadmin',
            '--drop-views' => false,
            '--drop-types' => false,
        ]);

        $this->artisan('migrate:fresh', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--drop-views' => false,
            '--drop-types' => false,
        ]);
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
