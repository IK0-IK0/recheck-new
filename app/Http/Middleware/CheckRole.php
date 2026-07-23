<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Grants access if the authenticated user has at least one of the required roles.
     * Aborts with HTTP 403 if no matching role is found.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $userRoles = Auth::user()?->roles()->pluck('name') ?? collect();

        foreach ($roles as $role) {
            if ($userRoles->contains($role)) {
                return $next($request);
            }
        }

        abort(403);
    }
}
