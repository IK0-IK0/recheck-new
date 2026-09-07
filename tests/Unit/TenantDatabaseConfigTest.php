<?php

use App\Models\TenantDatabaseConfig;

test('postgres tenant connections emulate prepared statements', function (): void {
    $config = new TenantDatabaseConfig([
        'driver' => 'pgsql',
        'host' => 'pooler.supabase.com',
        'database' => 'postgres',
        'username' => 'postgres',
    ]);

    $connection = $config->toConnectionConfig();

    expect($connection['options'][PDO::ATTR_EMULATE_PREPARES])->toBeTrue();
});
