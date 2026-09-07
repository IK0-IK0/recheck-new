<?php

use App\Models\User;

test('database setup page can be rendered', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/tenant/database-setup');

    $response->assertOk();
});

test('database configuration can be saved with sqlite', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/tenant/database-setup', [
        'driver' => 'sqlite',
        'database' => 'database/test.sqlite',
        'skip_test' => true, // Skip connection test in unit tests
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('tenant_database_configs', [
        'driver' => 'sqlite',
        'database' => 'database/test.sqlite',
        'is_active' => true,
    ]);
});

test('database configuration requires valid driver', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/tenant/database-setup', [
        'driver' => 'invalid',
        'database' => 'database/test.sqlite',
    ]);

    $response->assertInvalid(['driver']);
});

test('postgresql configuration requires host and credentials', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/tenant/database-setup', [
        'driver' => 'pgsql',
        'database' => 'testdb',
    ]);

    $response->assertInvalid(['host', 'username']);
});
