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
use Inertia\Testing\AssertableInertia as Assert;

// ---------------------------------------------------------------------------
// Requirement 11.1–11.4: Expected routes are registered
// ---------------------------------------------------------------------------
test('processes index route is registered', function (): void {
    expect(Route::has('processes.index'))->toBeTrue();
});

test('documents index route is registered', function (): void {
    expect(Route::has('documents.index'))->toBeTrue();
});

test('admin users index route is registered', function (): void {
    expect(Route::has('users.index'))->toBeTrue();
});

test('admin roles index route is registered', function (): void {
    expect(Route::has('roles.index'))->toBeTrue();
});

// ---------------------------------------------------------------------------
// Requirement 11.1: Unauthenticated requests to /admin/users are redirected
// ---------------------------------------------------------------------------
test('unauthenticated request to admin users is redirected to login', function (): void {
    $response = $this->get('/admin/users');

    $response->assertRedirect(route('login'));
});

// ---------------------------------------------------------------------------
// Requirement 11.3: Authenticated users without admin permission get 403
// ---------------------------------------------------------------------------
test('authenticated user without admin permission gets 403 on admin users', function (): void {
    // TenantUser with no roles/permissions — CheckPermission will abort 403
    $tenantUser = TenantUser::factory()->create();

    $response = $this->actingAs($tenantUser, 'web')->get('/admin/users');

    $response->assertForbidden();
});

// ---------------------------------------------------------------------------
// Requirement 11.3: Authenticated user with admin permission can access /admin/users
// ---------------------------------------------------------------------------
test('authenticated user with admin permission can access admin users', function (): void {
    $tenantUser = TenantUser::factory()->create();

    $adminPermission = Permission::factory()->create(['name' => 'admin']);
    $adminRole = Role::factory()->create(['name' => 'admin-role']);
    $adminRole->permissions()->attach($adminPermission->id);
    $tenantUser->roles()->attach($adminRole->id);

    // Use assertInertia which sends an X-Inertia request and checks the JSON
    // response — this avoids Vite manifest resolution for unbuilt frontend pages.
    $this->actingAs($tenantUser, 'web')
        ->get('/admin/users')
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Users'));
});
