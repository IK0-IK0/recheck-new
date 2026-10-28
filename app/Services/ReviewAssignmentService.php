<?php

namespace App\Services;

use App\Models\Action;
use App\Models\SuperadminTenantUser;
use App\Models\TenantUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewAssignmentService
{
    /**
     * @param  list<int>  $roleIds
     * @return list<array{id: int, name: string, email: string, user_type: class-string, role_ids: list<int>}>
     */
    public function usersForRoles(Request $request, array $roleIds): array
    {
        $roleIds = array_values(array_unique(array_map('intval', $roleIds)));

        if ($roleIds === []) {
            return [];
        }

        $users = [];
        $localAssignments = DB::connection('tenant')
            ->table('role_user')
            ->whereIn('role_id', $roleIds)
            ->get(['user_id', 'role_id']);
        $localUserRoleIds = $localAssignments
            ->groupBy('user_id')
            ->map(fn ($assignments): array => $assignments
                ->pluck('role_id')
                ->map(fn ($roleId): int => (int) $roleId)
                ->all());
        $localUsers = TenantUser::query()
            ->whereIn('id', $localUserRoleIds->keys())
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        foreach ($localUsers as $user) {
            $users[] = [
                'id' => (int) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => TenantUser::class,
                'role_ids' => $localUserRoleIds->get($user->id, []),
            ];
        }

        $centralAssignments = DB::connection('tenant')
            ->table('role_tenant_user')
            ->whereIn('role_id', $roleIds)
            ->get(['tenant_user_id', 'role_id']);
        $centralUserRoleIds = $centralAssignments
            ->groupBy('tenant_user_id')
            ->map(fn ($assignments): array => $assignments
                ->pluck('role_id')
                ->map(fn ($roleId): int => (int) $roleId)
                ->all());
        $institutionId = $request->user()->getInstitutionId();
        $centralUsers = $institutionId === null
            ? collect()
            : SuperadminTenantUser::query()
                ->where('institution_id', $institutionId)
                ->whereIn('id', $centralUserRoleIds->keys())
                ->orderBy('name')
                ->get(['id', 'name', 'email']);

        foreach ($centralUsers as $user) {
            $users[] = [
                'id' => (int) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => SuperadminTenantUser::class,
                'role_ids' => $centralUserRoleIds->get($user->id, []),
            ];
        }

        usort($users, fn (array $first, array $second): int => strcasecmp($first['name'], $second['name']));

        return $users;
    }

    /**
     * @return list<int>
     */
    public function roleIdsForAction(Action $action): array
    {
        return array_values(array_unique([
            ...$action->roles()->pluck('roles.id')->map(fn ($roleId): int => (int) $roleId)->all(),
            ...collect($action->reviewer_groups ?? [])
                ->flatMap(fn (array $group): array => $group['role_ids'] ?? [])
                ->map(fn ($roleId): int => (int) $roleId)
                ->all(),
        ]));
    }

    public function isUserAssignedToRoles(
        Request $request,
        int $userId,
        string $userType,
        array $roleIds,
    ): bool {
        return collect($this->usersForRoles($request, $roleIds))
            ->contains(fn (array $user): bool => $user['id'] === $userId && $user['user_type'] === $userType);
    }

    /**
     * @return array{user_id: int, user_type: class-string}
     */
    public function identity(Request $request): array
    {
        return [
            'user_id' => (int) $request->user()->getKey(),
            'user_type' => $request->user()::class,
        ];
    }
}
