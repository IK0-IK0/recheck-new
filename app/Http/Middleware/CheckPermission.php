<?php

namespace App\Http\Middleware;

use App\Models\SuperadminTenantUser;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * Grants access if the authenticated user has at least one of the required
     * permissions through their assigned roles. Aborts with HTTP 403 otherwise.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = Auth::user();
        $userPermissions = $user instanceof SuperadminTenantUser
            ? $user->tenantRoles()->pluck('permissions.*.name')->flatten()
            : ($user
                ? $user->roles()->with('permissions')->get()->pluck('permissions.*.name')->flatten()
                : collect());

        foreach ($permissions as $permission) {
            if ($userPermissions->contains($permission)) {
                return $next($request);
            }
        }

        abort(403);
    }
}
