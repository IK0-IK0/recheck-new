<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\TenantUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Display all tenant users with their assigned roles and available roles.
     */
    public function index(): Response
    {
        return Inertia::render('Admin/Users', [
            'users' => TenantUser::with('roles')->get(),
            'roles' => Role::all(),
        ]);
    }

    /**
     * Create a new tenant user with a hashed password and sync their roles.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('tenant.users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'roles' => ['array'],
        ]);

        $user = TenantUser::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $user->roles()->sync($request->input('roles', []));

        return redirect()->back();
    }

    /**
     * Update the tenant user's name, email, and assigned roles.
     */
    public function update(Request $request, TenantUser $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('tenant.users', 'email')->ignore($user->id)],
            'roles' => ['array'],
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        $user->roles()->sync($request->input('roles', []));

        return redirect()->back();
    }

    /**
     * Delete a tenant user, detaching all assigned roles first.
     *
     * Aborts with HTTP 403 if the user attempts to delete their own account.
     */
    public function destroy(TenantUser $user): RedirectResponse
    {
        if ((int) $user->id === (int) Auth::id()) {
            abort(403, 'You cannot delete your own account.');
        }

        $user->roles()->detach();
        $user->delete();

        return redirect()->back();
    }
}
