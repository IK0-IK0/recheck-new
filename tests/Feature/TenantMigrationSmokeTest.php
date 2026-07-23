<?php

use Illuminate\Support\Facades\Schema;

test('all 9 tenant tables exist after running tenant migrations', function () {
    $expectedTables = [
        'users',
        'roles',
        'permissions',
        'role_user',
        'permission_role',
        'processes',
        'phases',
        'actions',
        'documents',
    ];

    foreach ($expectedTables as $table) {
        expect(Schema::connection('tenant')->hasTable($table))
            ->toBeTrue("Expected tenant table [{$table}] to exist");
    }
});

test('users table has theme_color column with default zinc', function () {
    $columns = Schema::connection('tenant')->getColumns('users');
    $themeColorColumn = collect($columns)->firstWhere('name', 'theme_color');

    expect($themeColorColumn)->not->toBeNull('Expected theme_color column to exist in users table');

    // SQLite stores string defaults with surrounding single quotes, e.g. "'zinc'"
    $default = trim((string) $themeColorColumn['default'], "'\"");
    expect($default)->toBe('zinc');
});
