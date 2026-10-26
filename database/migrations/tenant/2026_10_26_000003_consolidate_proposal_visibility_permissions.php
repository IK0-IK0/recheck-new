<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissionId = DB::table('permissions')
            ->where('name', 'proposal.view.own_or_assigned')
            ->value('id');

        if ($permissionId === null) {
            $permissionId = DB::table('permissions')->insertGetId([
                'name' => 'proposal.view.own_or_assigned',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (['proposal.view.assigned', 'proposal.view.own'] as $legacyName) {
            $legacyPermissionId = DB::table('permissions')
                ->where('name', $legacyName)
                ->value('id');

            if ($legacyPermissionId === null) {
                continue;
            }

            $roleIds = DB::table('permission_role')
                ->where('permission_id', $legacyPermissionId)
                ->pluck('role_id');

            foreach ($roleIds as $roleId) {
                DB::table('permission_role')->insertOrIgnore([
                    'permission_id' => $permissionId,
                    'role_id' => $roleId,
                ]);
            }

            DB::table('permission_role')
                ->where('permission_id', $legacyPermissionId)
                ->delete();
            DB::table('permissions')
                ->where('id', $legacyPermissionId)
                ->delete();
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')
            ->where('name', 'proposal.view.own_or_assigned')
            ->value('id');

        if ($permissionId === null) {
            return;
        }

        $roleIds = DB::table('permission_role')
            ->where('permission_id', $permissionId)
            ->pluck('role_id');

        foreach (['proposal.view.assigned', 'proposal.view.own'] as $legacyName) {
            $legacyPermissionId = DB::table('permissions')->insertGetId([
                'name' => $legacyName,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($roleIds as $roleId) {
                DB::table('permission_role')->insertOrIgnore([
                    'permission_id' => $legacyPermissionId,
                    'role_id' => $roleId,
                ]);
            }
        }

        DB::table('permission_role')
            ->where('permission_id', $permissionId)
            ->delete();
        DB::table('permissions')
            ->where('id', $permissionId)
            ->delete();
    }
};
