<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RoleManagementController extends Controller
{
    /**
     * Display all roles with their assigned permissions and all available permissions.
     */
    public function index(): Response
    {
        foreach (['proposal.view.all', 'proposal.view.own_or_assigned'] as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName]);
        }

        return Inertia::render('Tenant/Roles', [
            'roles' => Role::with('permissions')->orderByDesc('id')->get(),
            'permissions' => Permission::all(),
            'defaultRoleId' => Role::query()->where('is_default', true)->value('id'),
        ]);
    }

    /**
     * Create a new role and attach the submitted permission IDs.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'permissions' => ['array'],
        ]);

        DB::connection('tenant')->transaction(function () use ($validated): void {
            $role = Role::create(['name' => $validated['name']]);
            $role->permissions()->sync($validated['permissions'] ?? []);
        });

        return redirect()->back();
    }

    /**
     * Update the role's name and sync its permission IDs.
     */
    public function update(Request $request, Role|int|string $role): RedirectResponse
    {
        $role = $role instanceof Role ? $role : Role::query()->findOrFail((int) $role);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'permissions' => ['array'],
        ]);

        DB::connection('tenant')->transaction(function () use ($role, $validated): void {
            $role->update(['name' => $validated['name']]);
            $role->permissions()->sync($validated['permissions'] ?? []);
        });

        return redirect()->back();
    }

    public function setDefault(Role $role): RedirectResponse
    {
        abort_if($role->name === 'institution', 422, 'Institution accounts cannot be assigned as the default tenant role.');

        DB::connection('tenant')->transaction(function () use ($role): void {
            Role::query()->update(['is_default' => false]);
            $role->update(['is_default' => true]);
        });

        return redirect()->back();
    }

    /**
     * Delete the role, detaching all permission_role and role_user pivot records.
     */
    public function destroy(Role|int|string $role): RedirectResponse
    {
        $role = $role instanceof Role ? $role : Role::query()->findOrFail((int) $role);

        $role->permissions()->detach();
        $role->users()->detach();
        DB::connection('tenant')
            ->table('role_tenant_user')
            ->where('role_id', $role->id)
            ->delete();
        $role->delete();

        return redirect()->back();
    }
}
