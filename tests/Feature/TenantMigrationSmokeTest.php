<?php

use Illuminate\Support\Facades\Schema;

test('proposal workflow persistence tables exist after tenant migrations', function () {
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
        'proposals',
        'proposal_documents',
        'proposal_phase_transitions',
    ];

    foreach ($expectedTables as $table) {
        expect(Schema::connection('tenant')->hasTable($table))
            ->toBeTrue("Expected tenant table [{$table}] to exist");
    }
});

test('proposal documents record their phase and required document', function () {
    $columns = Schema::connection('tenant')->getColumnListing('proposal_documents');

    expect($columns)->toContain('phase_id', 'required_document_id');
});

test('users table has theme_color column with default zinc', function () {
    $columns = Schema::connection('tenant')->getColumns('users');
    $themeColorColumn = collect($columns)->firstWhere('name', 'theme_color');

    expect($themeColorColumn)->not->toBeNull('Expected theme_color column to exist in users table');

    // SQLite stores string defaults with surrounding single quotes, e.g. "'zinc'"
    $default = trim((string) $themeColorColumn['default'], "'\"");
    expect($default)->toBe('zinc');
});
