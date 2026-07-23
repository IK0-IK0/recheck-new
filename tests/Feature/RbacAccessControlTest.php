<?php

/**
 * Property 1: RBAC Access Control Correctness
 *
 * Feature: port-sample-to-reccheck
 * Property 1: RBAC Access Control Correctness
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * For any tenant user with an arbitrary set of roles and permissions,
 * the CheckRole middleware SHALL grant access if and only if the user
 * has at least one of the required roles; the CheckPermission middleware
 * SHALL grant access if and only if the user has at least one of the
 * required permissions through their assigned roles.
 */

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckRole;
use App\Models\Permission;
use App\Models\Role;
use App\Models\TenantUser;
use Illuminate\Support\Facades\Route;

// ---------------------------------------------------------------------------
// Property 1a — CheckRole: access granted iff user has the required role
// ---------------------------------------------------------------------------
it('grants access via CheckRole iff user has the required role (100 iterations)', function (): void {
    // Run 100 random role-assignment scenarios
    for ($i = 0; $i < 100; $i++) {
        // Reset Faker unique state to avoid OverflowException across many iterations
        fake()->unique(true);

        $user = TenantUser::factory()->create();

        // Build a pool of 3 roles; randomly assign a subset to the user
        $pool = Role::factory()->count(3)->create();
        $assignedCount = rand(0, 3);
        $assigned = $assignedCount > 0 ? $pool->random($assignedCount) : collect();
        $user->roles()->sync($assigned->pluck('id'));

        // Pick one role from the pool as the "required" role for the route
        $requiredRole = $pool->random(1)->first();
        $userHasRole = $assigned->contains('id', $requiredRole->id);

        // Register a fresh route with this specific role requirement
        Route::middleware(['web', CheckRole::class.':'.$requiredRole->name])
            ->get('/__test/rbac/role/'.$i, fn () => response('ok', 200));

        $response = $this->actingAs($user, 'web')
            ->get('/__test/rbac/role/'.$i);

        if ($userHasRole) {
            expect($response->status())->toBe(200, "Iteration {$i}: user SHOULD have role '{$requiredRole->name}' but got 403");
        } else {
            expect($response->status())->toBe(403, "Iteration {$i}: user SHOULD NOT have role '{$requiredRole->name}' but got 200");
        }
    }
})->group('property-1-rbac');

// ---------------------------------------------------------------------------
// Property 1b — CheckPermission: access granted iff user has the permission
//               through at least one of their roles
// ---------------------------------------------------------------------------
it('grants access via CheckPermission iff user has the required permission (100 iterations)', function (): void {
    for ($i = 0; $i < 100; $i++) {
        fake()->unique(true);

        $user = TenantUser::factory()->create();

        // Build a pool of 3 permissions and 2 roles; randomly wire them up
        $permissions = Permission::factory()->count(3)->create();
        $roles = Role::factory()->count(2)->create();

        // Attach random subsets of permissions to each role
        foreach ($roles as $role) {
            $permCount = rand(0, 3);
            $rolePerms = $permCount > 0 ? $permissions->random($permCount) : collect();
            $role->permissions()->sync($rolePerms->pluck('id'));
        }

        // Randomly assign a subset of roles to the user
        $roleCount = rand(0, 2);
        $assignedRoles = $roleCount > 0 ? $roles->random($roleCount) : collect();
        $user->roles()->sync($assignedRoles->pluck('id'));

        // Determine which permissions the user actually has
        $userPermissionNames = $assignedRoles->isNotEmpty()
            ? Role::with('permissions')
                ->whereIn('id', $assignedRoles->pluck('id'))
                ->get()
                ->pluck('permissions.*.name')
                ->flatten()
                ->unique()
                ->values()
            : collect();

        // Pick a random permission from the pool as the "required" one
        $requiredPermission = $permissions->random(1)->first();
        $userHasPermission = $userPermissionNames->contains($requiredPermission->name);

        // Register a fresh route with this permission requirement
        Route::middleware(['web', CheckPermission::class.':'.$requiredPermission->name])
            ->get('/__test/rbac/permission/'.$i, fn () => response('ok', 200));

        $response = $this->actingAs($user, 'web')
            ->get('/__test/rbac/permission/'.$i);

        if ($userHasPermission) {
            expect($response->status())->toBe(200, "Iteration {$i}: user SHOULD have permission '{$requiredPermission->name}' but got 403");
        } else {
            expect($response->status())->toBe(403, "Iteration {$i}: user SHOULD NOT have permission '{$requiredPermission->name}' but got 200");
        }
    }
})->group('property-1-rbac');

// ---------------------------------------------------------------------------
// Unit: CheckRole aborts 403 when user is unauthenticated
// ---------------------------------------------------------------------------
it('aborts 403 when no user is authenticated for role check', function (): void {
    Route::middleware(['web', CheckRole::class.':admin'])
        ->get('/__test/rbac/role-unauth', fn () => response('ok', 200));

    $response = $this->get('/__test/rbac/role-unauth');
    $response->assertStatus(403);
})->group('property-1-rbac');

// ---------------------------------------------------------------------------
// Unit: CheckPermission aborts 403 when user is unauthenticated
// ---------------------------------------------------------------------------
it('aborts 403 when no user is authenticated for permission check', function (): void {
    Route::middleware(['web', CheckPermission::class.':admin'])
        ->get('/__test/rbac/permission-unauth', fn () => response('ok', 200));

    $response = $this->get('/__test/rbac/permission-unauth');
    $response->assertStatus(403);
})->group('property-1-rbac');
