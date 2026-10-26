<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\SuperadminTenantUser;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Display tenant users from the central database with roles from this tenant.
     */
    public function index(Request $request): Response
    {
        $institutionId = $this->institutionId($request);
        $users = SuperadminTenantUser::query()
            ->where('institution_id', $institutionId)
            ->orderBy('name')
            ->get();

        $roleAssignments = DB::connection('tenant')
            ->table('role_tenant_user')
            ->join('roles', 'roles.id', '=', 'role_tenant_user.role_id')
            ->whereIn('role_tenant_user.tenant_user_id', $users->modelKeys())
            ->select('role_tenant_user.tenant_user_id', 'roles.id', 'roles.name')
            ->get()
            ->keyBy('tenant_user_id');

        return Inertia::render('Tenant/Users', [
            'users' => $users->map(function (SuperadminTenantUser $user) use ($roleAssignments): array {
                $role = $roleAssignments->get($user->getKey());

                return [
                    ...$user->toArray(),
                    'role' => $role === null ? null : [
                            'id' => (int) $role->id,
                            'name' => $role->name,
                        ],
                ];
            })->values(),
            'roleOptions' => Role::query()
                ->where('name', '!=', 'institution')
                ->orderBy('name')
                ->get(['id', 'name']),
            'defaultRoleId' => Role::query()
                ->where('is_default', true)
                ->where('name', '!=', 'institution')
                ->value('id'),
        ]);
    }

    /**
     * Create a centrally authenticated user for the current institution.
     */
    public function store(Request $request): RedirectResponse
    {
        $institutionId = $this->institutionId($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('tenant_users', 'email'),
                Rule::unique('users', 'email'),
            ],
            'password' => ['required', 'string', 'min:8'],
            'role_id' => ['nullable', 'integer', Rule::exists('tenant.roles', 'id')],
        ]);

        $user = new SuperadminTenantUser;
        $user->forceFill([
            'institution_id' => $institutionId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);
        $user->save();

        $roleId = array_key_exists('role_id', $validated)
            ? $validated['role_id']
            : Role::query()->where('is_default', true)->where('name', '!=', 'institution')->value('id');

        $this->syncRole($user, $roleId);

        return redirect()->back();
    }

    /**
     * Update the central tenant user's details and tenant-specific roles.
     */
    public function update(Request $request, int|string $user): RedirectResponse
    {
        $tenantUser = $this->findInstitutionUser($request, $user);
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('tenant_users', 'email')->ignore($tenantUser->getKey()),
                Rule::unique('users', 'email'),
            ],
            'role_id' => ['sometimes', 'nullable', 'integer', Rule::exists('tenant.roles', 'id')],
        ]);

        $tenantUser->forceFill(array_intersect_key($validated, array_flip(['name', 'email'])))->save();

        if (array_key_exists('role_id', $validated)) {
            $this->syncRole($tenantUser, $validated['role_id']);
        }

        return redirect()->back();
    }

    /**
     * Delete a tenant user's central account and tenant-specific role assignments.
     */
    public function destroy(Request $request, int|string $user): RedirectResponse
    {
        $tenantUser = $this->findInstitutionUser($request, $user);

        if (Auth::user() instanceof SuperadminTenantUser
            && (int) Auth::user()->getKey() === (int) $tenantUser->getKey()) {
            abort(403, 'You cannot delete your own account.');
        }

        DB::connection('tenant')
            ->table('role_tenant_user')
            ->where('tenant_user_id', $tenantUser->getKey())
            ->delete();

        $tenantUser->delete();

        return redirect()->back();
    }

    private function institutionId(Request $request): int
    {
        $user = $request->user();

        abort_unless(
            $user instanceof User
                && ! ($user instanceof SuperadminTenantUser)
                && $user->role === 'institution',
            403
        );

        return (int) $user->getKey();
    }

    private function findInstitutionUser(Request $request, int|string $user): SuperadminTenantUser
    {
        return SuperadminTenantUser::query()
            ->where('institution_id', $this->institutionId($request))
            ->findOrFail($user);
    }

    /**
     */
    private function syncRole(SuperadminTenantUser $user, int|string|null $roleId): void
    {
        DB::connection('tenant')->transaction(function () use ($user, $roleId): void {
            DB::connection('tenant')
                ->table('role_tenant_user')
                ->where('tenant_user_id', $user->getKey())
                ->delete();

            if ($roleId !== null) {
                DB::connection('tenant')->table('role_tenant_user')->insert([
                    'role_id' => $roleId,
                    'tenant_user_id' => $user->getKey(),
                ]);
            }
        });
    }
}
