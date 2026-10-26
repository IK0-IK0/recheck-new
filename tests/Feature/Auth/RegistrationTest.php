<?php

use App\Models\SuperadminTenantUser;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    User::factory()->create([
        'name' => 'Example Institution',
        'role' => 'institution',
    ]);

    $response = $this->get(route('register'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('auth/register')
        ->where('institutions.0.name', 'Example Institution'));
});

test('new users register as tenant accounts for the selected institution', function () {
    $institution = User::factory()->create(['role' => 'institution']);

    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'institution_id' => $institution->id,
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
    $this->assertDatabaseHas('tenant_users', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'institution_id' => $institution->id,
    ]);
    $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    expect(auth()->user())->toBeInstanceOf(SuperadminTenantUser::class);
});

test('registration requires selecting an existing institution', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'institution_id' => 999,
    ]);

    $response->assertSessionHasErrors('institution_id');
    $this->assertDatabaseMissing('tenant_users', ['email' => 'test@example.com']);
});

test('registration does not allow selecting a non-institution account', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'institution_id' => $admin->id,
    ]);

    $response->assertSessionHasErrors('institution_id');
    $this->assertDatabaseMissing('tenant_users', ['email' => 'test@example.com']);
});
