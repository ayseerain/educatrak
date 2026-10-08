<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\CapabilityMap;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCapability
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $capability): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! CapabilityMap::allows($user->role, $capability)) {
            abort(403, 'You do not have permission to perform this action.');
        }

        return $next($request);
    }
}
