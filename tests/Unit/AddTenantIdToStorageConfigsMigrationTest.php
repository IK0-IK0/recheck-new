<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

test('storage configs can store institution ownership for superadmins', function (): void {
    $application = require dirname(__DIR__, 2).'/bootstrap/app.php';
    $application->make(Kernel::class)->bootstrap();

    Config::set('database.connections.sqlite.database', ':memory:');
    DB::purge('sqlite');

    Schema::connection('sqlite')->create('users', function (Blueprint $table): void {
        $table->id();
    });

    Schema::connection('sqlite')->create('storage_configs', function (Blueprint $table): void {
        $table->id();
        $table->boolean('is_active')->default(false);
    });

    $migrationFiles = glob(database_path('migrations/superadmin/*_add_tenant_id_to_storage_configs_table.php'));
    expect($migrationFiles)->toHaveCount(1);

    $migration = require $migrationFiles[0];
    $migration->up();

    expect(Schema::connection('sqlite')->hasColumn('storage_configs', 'tenant_id'))->toBeTrue()
        ->and(collect(DB::connection('sqlite')->select('PRAGMA foreign_key_list(storage_configs)'))
            ->contains(fn (object $foreignKey): bool => $foreignKey->table === 'users' && $foreignKey->from === 'tenant_id'))
        ->toBeTrue();

    DB::connection('sqlite')->table('storage_configs')->insert([
        'tenant_id' => null,
        'is_active' => true,
    ]);

    expect(DB::connection('sqlite')->table('storage_configs')->value('tenant_id'))->toBeNull();
});
