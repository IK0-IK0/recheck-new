<?php

/**
 * Smoke tests for route registration.
 *
 * Feature: port-sample-to-reccheck
 * Task: 9.1 Write smoke tests for route registration
 * Validates: Requirements 11.1–11.6
 */

use App\Models\Permission;
use App\Models\Role;
use App\Models\TenantUser;
use Illuminate\Support\Facades\Route;
use Inertia\Middleware;

// ---------------------------------------------------------------------------
// Requirement 11.1–11.4: Expected routes are registered
// ---------------------------------------------------------------------------
test('tenant processes index route is registered', function (): void {
    expect(Route::has('tenant.processes.index'))->toBeTrue();
});

test('tenant documents index route is registered', function (): void {
    expect(Route::has('tenant.documents.index'))->toBeTrue();
});

test('tenant users index route is registered', function (): void {
    expect(Route::has('users.index'))->toBeTrue();
});

test('tenant roles index route is registered', function (): void {
    expect(Route::has('roles.index'))->toBeTrue();
});

// ---------------------------------------------------------------------------
// Requirement 11.1: Unauthenticated requests to /tenant/users are redirected
// ---------------------------------------------------------------------------
test('unauthenticated request to tenant users is redirected to login', function (): void {
    $response = $this->get('/tenant/users');

    $response->assertRedirect(route('login'));
});

// ---------------------------------------------------------------------------
// Requirement 11.3: Any authenticated user can access tenant users
// ---------------------------------------------------------------------------
test('authenticated user without tenant roles can still access tenant users', function (): void {
    $tenantUser = TenantUser::factory()->create();

    $response = $this->actingAs($tenantUser, 'web')->get('/tenant/users');

    $response->assertOk();
});

// ---------------------------------------------------------------------------
// Requirement 11.3: Authenticated user with a role can access /tenant/users
// ---------------------------------------------------------------------------
test('authenticated tenant user can access tenant users', function (): void {
    $tenantUser = TenantUser::factory()->create();

    $adminPermission = Permission::factory()->create(['name' => 'admin']);
    $adminRole = Role::factory()->create(['name' => 'admin-role']);
    $adminRole->permissions()->attach($adminPermission->id);
    $tenantUser->roles()->attach($adminRole->id);

    $this->actingAs($tenantUser, 'web')
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => app(Middleware::class)->version(request()),
        ])
        ->get('/tenant/users')
        ->assertOk()
        ->assertJson(['component' => 'Tenant/Users']);
});
