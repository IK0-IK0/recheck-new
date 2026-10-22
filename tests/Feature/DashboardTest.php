<?php

use App\Models\SuperadminTenantUser;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('superadmin tenant users see their own name and are limited to dashboard and proposals', function () {
    $tenantUser = new SuperadminTenantUser([
        'name' => 'Tenant User',
        'email' => 'tenant-user@example.com',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($tenantUser)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('auth.isTenantUser', true)
            ->where('auth.user.name', 'Tenant User'));

    $this->get('/tenant/processes')->assertForbidden();
    $this->get('/tenant/proposals')->assertRedirect();
});
