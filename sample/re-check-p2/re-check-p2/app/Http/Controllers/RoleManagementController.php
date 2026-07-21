<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleManagementController extends Controller
{
    /**
     * Display a listing of roles.
     */
    public function index(Request $request): Response
    {
        $query = Role::with(['permissions', 'users']);

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        // Sorting
        $sortField = $request->input('sort', 'name');
        $sortDirection = $request->input('direction', 'asc');
        $query->orderBy($sortField, $sortDirection);

        $roles = $query->paginate(15)->through(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'is_protected' => (bool) $role->is_protected,
                'users_count' => $role->users->count(),
                'permissions_count' => $role->permissions->count(),
                'created_at' => $role->created_at->format('Y-m-d H:i'),
            ];
        });

        return Inertia::render('Admin/Roles/Index', [
            'roles' => $roles,
            'filters' => $request->only(['search', 'sort', 'direction']),
        ]);
    }

    /**
     * Show the form for creating a new role.
     */
    public function create(): Response
    {
        $permissions = Permission::all()->groupBy('category')->map(function ($group) {
            return $group->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'display_name' => $permission->display_name,
                    'description' => $permission->description,
                ];
            });
        });

        return Inertia::render('Admin/Roles/Create', [
            'permissions' => $permissions,
        ]);
    }

    /**
     * Store a newly created role in storage.
     */
    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $role = Role::create([
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'is_protected' => 0,
        ]);

        // Attach permissions
        if ($request->has('permissions')) {
            $role->permissions()->sync($request->input('permissions'));
        }

        return redirect()->route('roles.index')
            ->with('success', 'Role created successfully.');
    }

    /**
     * Show the form for editing the specified role.
     */
    public function edit(Role $role): Response
    {
        $role->load(['permissions', 'users']);

        $permissions = Permission::all()->groupBy('category')->map(function ($group) {
            return $group->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'display_name' => $permission->display_name,
                    'description' => $permission->description,
                ];
            });
        });

        $roleData = [
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'is_protected' => (bool) $role->is_protected,
            'permission_ids' => $role->permissions->pluck('id'),
            'users_count' => $role->users->count(),
        ];

        return Inertia::render('Admin/Roles/Edit', [
            'role' => $roleData,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Update the specified role in storage.
     */
    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        // Prevent updating protected roles' name
        if ($role->is_protected && $request->input('name') !== $role->name) {
            return redirect()->back()->withErrors([
                'name' => 'Cannot change the name of a protected role.',
            ]);
        }

        $role->update([
            'name' => $request->input('name'),
            'description' => $request->input('description'),
        ]);

        // Update permissions
        if ($request->has('permissions')) {
            $role->permissions()->sync($request->input('permissions'));
        }

        return redirect()->route('roles.index')
            ->with('success', 'Role updated successfully.');
    }

    /**
     * Remove the specified role from storage.
     */
    public function destroy(Role $role): RedirectResponse
    {
        // Prevent deletion of protected roles
        if ($role->is_protected) {
            return redirect()->back()->withErrors([
                'error' => 'Cannot delete a protected role.',
            ]);
        }

        // Check if role has users
        $usersCount = $role->users()->count();
        if ($usersCount > 0) {
            return redirect()->back()->withErrors([
                'error' => "Cannot delete role with {$usersCount} assigned user(s). Please reassign users first.",
            ]);
        }

        $role->delete();

        return redirect()->route('roles.index')
            ->with('success', 'Role deleted successfully.');
    }

    /**
     * Get users assigned to a role for reassignment.
     */
    public function getUsersForReassignment(Role $role)
    {
        $users = $role->users()->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ];
        });

        $availableRoles = Role::where('id', '!=', $role->id)->get()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
            ];
        });

        return response()->json([
            'users' => $users,
            'available_roles' => $availableRoles,
        ]);
    }

    /**
     * Reassign users and delete role.
     */
    public function reassignAndDelete(Request $request, Role $role): RedirectResponse
    {
        $request->validate([
            'reassignments' => 'required|array',
            'reassignments.*.user_id' => 'required|exists:users,id',
            'reassignments.*.new_role_id' => 'required|exists:roles,id',
        ]);

        // Prevent deletion of protected roles
        if ($role->is_protected) {
            return redirect()->back()->withErrors([
                'error' => 'Cannot delete a protected role.',
            ]);
        }

        // Reassign users
        foreach ($request->input('reassignments') as $reassignment) {
            $user = \App\Models\User::find($reassignment['user_id']);
            $user->removeRole($role);
            $user->assignRole($reassignment['new_role_id'], $request->user()->id);
        }

        // Now delete the role
        $role->delete();

        return redirect()->route('roles.index')
            ->with('success', 'Users reassigned and role deleted successfully.');
    }
}
