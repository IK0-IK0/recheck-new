<?php

namespace App\Services;

use App\Models\Action;
use App\Models\SuperadminTenantUser;
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

        $institutionId = $request->user()->getInstitutionId();
        if ($institutionId === null) {
            return [];
        }

        $roleAssignments = DB::connection('tenant')
            ->table('role_tenant_user')
            ->whereIn('role_id', $roleIds)
            ->get(['tenant_user_id', 'role_id'])
            ->groupBy('tenant_user_id')
            ->map(fn ($assignments): array => $assignments
                ->pluck('role_id')
                ->map(fn ($roleId): int => (int) $roleId)
                ->all());
        $users = SuperadminTenantUser::query()
            ->where('institution_id', $institutionId)
            ->whereIn('id', $roleAssignments->keys())
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (SuperadminTenantUser $user): array => [
                'id' => (int) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => SuperadminTenantUser::class,
                'role_ids' => $roleAssignments->get($user->id, []),
            ])
            ->all();

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

    public function mainReviewerRoleId(Action $action): ?int
    {
        $roleId = collect($action->reviewer_groups ?? [])
            ->first()['role_ids'][0] ?? null;

        return is_numeric($roleId) ? (int) $roleId : null;
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
