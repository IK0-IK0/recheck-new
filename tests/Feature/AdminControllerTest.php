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
use App\Models\SuperadminTenantUser;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;

// ---------------------------------------------------------------------------
function institutionRequest(User $institution, string $uri, string $method, array $data = []): Request
{
    $request = Request::create($uri, $method, $data);
    $request->setUserResolver(fn (): User => $institution);

    return $request;
}

test('store creates a centrally authenticated tenant user with a hashed password', function (): void {
    $institution = User::factory()->create(['role' => 'institution']);
    $role = Role::factory()->create();
    $controller = new UserManagementController;

    $plainPassword = 'secret1234';
    $request = institutionRequest($institution, '/tenant/users', 'POST', [
        'name' => 'New User',
        'email' => 'newuser@example.com',
        'password' => $plainPassword,
        'role_id' => $role->id,
    ]);

    $controller->store($request);

    $user = SuperadminTenantUser::where('email', 'newuser@example.com')->firstOrFail();

    expect(Hash::check($plainPassword, $user->password))->toBeTrue();
    expect((int) $user->institution_id)->toBe((int) $institution->id);
    expect(DB::connection('tenant')->table('role_tenant_user')
        ->where('tenant_user_id', $user->id)
        ->where('role_id', $role->id)
        ->exists())->toBeTrue();
})->group('admin-users');

test('store assigns the tenant default role when no role is specified', function (): void {
    $institution = User::factory()->create(['role' => 'institution']);
    $defaultRole = Role::factory()->create(['is_default' => true]);

    (new UserManagementController)->store(institutionRequest($institution, '/tenant/users', 'POST', [
        'name' => 'Default Role User',
        'email' => 'default-role@example.com',
        'password' => 'secret1234',
    ]));

    $user = SuperadminTenantUser::where('email', 'default-role@example.com')->firstOrFail();

    expect(DB::connection('tenant')->table('role_tenant_user')
        ->where('tenant_user_id', $user->id)
        ->value('role_id'))->toBe($defaultRole->id);
})->group('admin-users');

test('update changes central user details and replaces tenant role assignments', function (): void {
    $institution = User::factory()->create(['role' => 'institution']);
    $user = SuperadminTenantUser::create([
        'institution_id' => $institution->id,
        'name' => 'Old Name',
        'email' => 'old@example.com',
        'password' => 'password123',
    ]);
    $oldRole = Role::factory()->create();
    $newRole = Role::factory()->create();
    DB::connection('tenant')->table('role_tenant_user')->insert([
        'role_id' => $oldRole->id,
        'tenant_user_id' => $user->id,
    ]);

    (new UserManagementController)->update(
        institutionRequest($institution, '/tenant/users/'.$user->id, 'PUT', [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
            'role_id' => $newRole->id,
        ]),
        $user->id
    );

    expect($user->fresh()->name)->toBe('Updated Name');
    expect($user->fresh()->email)->toBe('updated@example.com');
    expect(DB::connection('tenant')->table('role_tenant_user')
        ->where('tenant_user_id', $user->id)
        ->pluck('role_id')->all())->toBe([$newRole->id]);
})->group('admin-users');

test('tenant user management is scoped to the signed-in institution', function (): void {
    $institution = User::factory()->create(['role' => 'institution']);
    $otherInstitution = User::factory()->create(['role' => 'institution']);
    $user = SuperadminTenantUser::create([
        'institution_id' => $otherInstitution->id,
        'name' => 'Other User',
        'email' => 'other@example.com',
        'password' => 'password123',
    ]);

    expect(fn () => (new UserManagementController)->update(
        institutionRequest($institution, '/tenant/users/'.$user->id, 'PUT', ['name' => 'Changed']),
        $user->id
    ))->toThrow(HttpException::class);
})->group('admin-users');

test('destroy deletes the central user and tenant role assignments', function (): void {
    $institution = User::factory()->create(['role' => 'institution']);
    $user = SuperadminTenantUser::create([
        'institution_id' => $institution->id,
        'name' => 'Tenant User',
        'email' => 'tenant@example.com',
        'password' => 'password123',
    ]);
    $role = Role::factory()->create();
    DB::connection('tenant')->table('role_tenant_user')->insert([
        'role_id' => $role->id,
        'tenant_user_id' => $user->id,
    ]);

    (new UserManagementController)->destroy(
        institutionRequest($institution, '/tenant/users/'.$user->id, 'DELETE'),
        $user->id
    );

    expect(SuperadminTenantUser::find($user->id))->toBeNull();
    expect(DB::connection('tenant')->table('role_tenant_user')
        ->where('tenant_user_id', $user->id)->exists())->toBeFalse();
})->group('admin-users');

// ---------------------------------------------------------------------------
// Requirement 7.1: Role index returns all roles with permissions
// ---------------------------------------------------------------------------
test('RoleManagementController index loads roles with permissions', function (): void {
    $controller = new RoleManagementController;

    $role = Role::factory()->create();
    $perm = Permission::factory()->create();
    $role->permissions()->attach([$perm->id]);

    $allRoles = Role::with('permissions')->get();
    expect($allRoles->firstWhere('id', $role->id)?->permissions->pluck('id')->toArray())
        ->toBe([$perm->id]);

    $request = Request::create('/tenant/roles', 'GET', server: ['HTTP_X_INERTIA' => 'true']);
    $response = $controller->index()->toResponse($request);
    $permissionNames = collect($response->getData(true)['props']['permissions'])
        ->pluck('name');

    expect($permissionNames)
        ->toContain('proposal.view.all', 'proposal.view.own_or_assigned');
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

test('setting a default role clears the previous default', function (): void {
    $oldDefault = Role::factory()->create(['is_default' => true]);
    $newDefault = Role::factory()->create(['is_default' => false]);

    $response = (new RoleManagementController)->setDefault($newDefault);

    expect($oldDefault->fresh()->is_default)->toBeFalse();
    expect($newDefault->fresh()->is_default)->toBeTrue();
    expect($response->getStatusCode())->toBe(302);
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
