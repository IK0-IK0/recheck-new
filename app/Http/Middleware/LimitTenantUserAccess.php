<?php

namespace App\Http\Middleware;

use App\Models\SuperadminTenantUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LimitTenantUserAccess
{
    /**
     * Limit superadmin tenant users to proposal routes within the tenant area.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() instanceof SuperadminTenantUser && ! $request->routeIs('tenant.proposals.*')) {
            abort(403);
        }

        return $next($request);
    }
}
