<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'users' => User::query()->where('role', 'institution')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'theme_color' => ['nullable', 'string', Rule::in(['zinc', 'slate', 'stone', 'gray', 'neutral', 'red', 'rose', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal'])],
        ]);

        $user = User::create([
            ...$validated,
            'role' => 'institution',
            'theme_color' => $validated['theme_color'] ?? 'zinc',
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        return back();
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'theme_color' => ['nullable', 'string', Rule::in(['zinc', 'slate', 'stone', 'gray', 'neutral', 'red', 'rose', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal'])],
        ]);

        $user->update($validated);

        return back();
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_if($user->role === 'admin', 403, 'Administrator accounts cannot be deleted here.');

        $user->delete();

        return back();
    }
}