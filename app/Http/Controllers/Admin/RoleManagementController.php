<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleManagementController extends Controller
{
    /**
     * Display all roles with their assigned permissions and all available permissions.
     */
    public function index(): Response
    {
        return Inertia::render('Admin/Roles', [
            'roles' => Role::with('permissions')->get(),
            'permissions' => Permission::all(),
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

        $role = Role::create(['name' => $validated['name']]);
        $role->permissions()->attach($request->input('permissions', []));

        return redirect()->back();
    }

    /**
     * Update the role's name and sync its permission IDs.
     */
    public function update(Request $request, Role $role): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'permissions' => ['array'],
        ]);

        $role->update(['name' => $request->input('name')]);
        $role->permissions()->sync($request->input('permissions', []));

        return redirect()->back();
    }

    /**
     * Delete the role, detaching all permission_role and role_user pivot records.
     */
    public function destroy(Role $role): RedirectResponse
    {
        $role->permissions()->detach();
        $role->users()->detach();
        $role->delete();

        return redirect()->back();
    }
}
