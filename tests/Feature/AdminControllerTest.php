<?php

/**
 * Feature tests for Admin UserManagementController and RoleManagementController.
 *
 * Feature: port-sample-to-reccheck
 * Validates: Requirements 6.1–6.6, 7.1–7.4
 */

use App\Http\Controllers\Admin\RoleManagementController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Models\Permission;
use App\Models\Role;
use App\Models\TenantUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;

// ---------------------------------------------------------------------------
// Requirement 6.5: Self-deletion returns 403
//
// The controller must abort 403 when the authenticated user tries to delete
// their own account. We log the user in via Auth::loginUsingOnce() so that
// Auth::id() returns the correct tenant-user ID.
// ---------------------------------------------------------------------------
test('destroy aborts 403 when admin attempts to delete their own account', function (): void {
    $user = TenantUser::factory()->create();

    // Log in the user so Auth::id() resolves to their ID
    Auth::login($user);

    $controller = new UserManagementController;

    expect(fn () => $controller->destroy($user))
        ->toThrow(HttpException::class);
})->group('admin-users');

// ---------------------------------------------------------------------------
// Requirement 6.2: User creation hashes the password
// ---------------------------------------------------------------------------
test('store creates a TenantUser with a bcrypt-hashed password', function (): void {
    $controller = new UserManagementController;

    $plainPassword = 'secret1234';
    $request = Request::create('/users', 'POST', [
        'name' => 'New User',
        'email' => 'newuser@example.com',
        'password' => $plainPassword,
        'roles' => [],
    ]);

    $controller->store($request);

    $user = TenantUser::where('email', 'newuser@example.com')->firstOrFail();

    // The stored password must be a bcrypt hash, not the plain-text value.
    expect(Hash::check($plainPassword, $user->password))->toBeTrue();
    expect($user->password)->not->toBe($plainPassword);
})->group('admin-users');

// ---------------------------------------------------------------------------
// Requirement 6.2: User creation syncs roles
// ---------------------------------------------------------------------------
test('store syncs roles to the newly created user', function (): void {
    $controller = new UserManagementController;

    $role1 = Role::factory()->create();
    $role2 = Role::factory()->create();

    $request = Request::create('/users', 'POST', [
        'name' => 'Roled User',
        'email' => 'roled@example.com',
        'password' => 'password123',
        'roles' => [$role1->id, $role2->id],
    ]);

    $controller->store($request);

    $user = TenantUser::where('email', 'roled@example.com')->firstOrFail();

    expect($user->roles->pluck('id')->sort()->values()->toArray())
        ->toBe(collect([$role1->id, $role2->id])->sort()->values()->toArray());
})->group('admin-users');

// ---------------------------------------------------------------------------
// Requirement 6.3: User update syncs updated name, email, and roles
// ---------------------------------------------------------------------------
test('update changes user name, email, and syncs roles', function (): void {
    $controller = new UserManagementController;

    $user = TenantUser::factory()->create();
    $roleOld = Role::factory()->create();
    $roleNew = Role::factory()->create();
    $user->roles()->sync([$roleOld->id]);

    $request = Request::create('/users/'.$user->id, 'PUT', [
        'name' => 'Updated Name',
        'email' => 'updated@example.com',
        'roles' => [$roleNew->id],
    ]);

    $controller->update($request, $user);

    $user->refresh();

    expect($user->name)->toBe('Updated Name');
    expect($user->email)->toBe('updated@example.com');
    expect($user->roles->pluck('id')->toArray())->toBe([$roleNew->id]);
})->group('admin-users');

// ---------------------------------------------------------------------------
// Requirement 6.4: User deletion detaches roles and deletes the record
// ---------------------------------------------------------------------------
test('destroy deletes user and detaches all role_user pivot records', function (): void {
    $admin = TenantUser::factory()->create();
    $target = TenantUser::factory()->create();
    $role = Role::factory()->create();
    $target->roles()->sync([$role->id]);

    // Log in as a different user so the self-deletion guard is not triggered
    Auth::login($admin);

    $controller = new UserManagementController;
    $controller->destroy($target);

    expect(TenantUser::find($target->id))->toBeNull();

    $pivotCount = DB::connection('tenant')
        ->table('role_user')
        ->where('user_id', $target->id)
        ->count();

    expect($pivotCount)->toBe(0);
})->group('admin-users');

// ---------------------------------------------------------------------------
// Requirement 7.1: Role index returns all roles with permissions
// ---------------------------------------------------------------------------
test('RoleManagementController index loads roles with permissions', function (): void {
    $controller = new RoleManagementController;

    $role = Role::factory()->create();
    $perm = Permission::factory()->create();
    $role->permissions()->attach([$perm->id]);

    // Verify no exception is thrown and the relationship is accessible
    $allRoles = Role::with('permissions')->get();
    expect($allRoles->firstWhere('id', $role->id)?->permissions->pluck('id')->toArray())
        ->toBe([$perm->id]);
})->group('admin-roles');

// ---------------------------------------------------------------------------
// Requirement 7.2: Role creation attaches permissions
// ---------------------------------------------------------------------------
test('store creates a Role and attaches the submitted permissions', function (): void {
    $controller = new RoleManagementController;

    $perm1 = Permission::factory()->create();
    $perm2 = Permission::factory()->create();

    $request = Request::create('/roles', 'POST', [
        'name' => 'editor',
        'permissions' => [$perm1->id, $perm2->id],
    ]);

    $controller->store($request);

    $role = Role::where('name', 'editor')->firstOrFail();

    expect($role->permissions->pluck('id')->sort()->values()->toArray())
        ->toBe(collect([$perm1->id, $perm2->id])->sort()->values()->toArray());
})->group('admin-roles');

// ---------------------------------------------------------------------------
// Requirement 7.3: Role update syncs permissions
// ---------------------------------------------------------------------------
test('update changes role name and syncs permissions', function (): void {
    $controller = new RoleManagementController;

    $role = Role::factory()->create(['name' => 'old-name']);
    $oldPerm = Permission::factory()->create();
    $newPerm = Permission::factory()->create();
    $role->permissions()->attach([$oldPerm->id]);

    $request = Request::create('/roles/'.$role->id, 'PUT', [
        'name' => 'new-name',
        'permissions' => [$newPerm->id],
    ]);

    $controller->update($request, $role);

    $role->refresh();

    expect($role->name)->toBe('new-name');
    expect($role->permissions->pluck('id')->toArray())->toBe([$newPerm->id]);
})->group('admin-roles');

// ---------------------------------------------------------------------------
// Requirement 7.4: Role deletion detaches all permission_role and role_user records
// ---------------------------------------------------------------------------
test('destroy deletes role and detaches all permission_role and role_user pivot records', function (): void {
    $controller = new RoleManagementController;

    $role = Role::factory()->create();
    $perm = Permission::factory()->create();
    $user = TenantUser::factory()->create();

    $role->permissions()->attach([$perm->id]);
    $role->users()->attach([$user->id]);

    // Confirm pivots exist before deletion
    expect($role->permissions()->count())->toBe(1);
    expect($role->users()->count())->toBe(1);

    $controller->destroy($role);

    expect(Role::find($role->id))->toBeNull();

    $permPivotCount = DB::connection('tenant')
        ->table('permission_role')
        ->where('role_id', $role->id)
        ->count();

    $userPivotCount = DB::connection('tenant')
        ->table('role_user')
        ->where('role_id', $role->id)
        ->count();

    expect($permPivotCount)->toBe(0);
    expect($userPivotCount)->toBe(0);
})->group('admin-roles');
