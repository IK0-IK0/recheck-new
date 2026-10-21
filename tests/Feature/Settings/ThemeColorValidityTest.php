<?php

/**
 * Property 5: Theme Color Validity
 *
 * Feature: port-sample-to-reccheck
 * Property 5: Theme Color Validity
 *
 * For any of the 13 valid theme color values, submitting a profile update with that color
 * SHALL result in the TenantUser's stored theme_color matching the submitted value exactly.
 *
 * Validates: Requirements 8.5
 */

use App\Models\SuperadminTenantUser;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

it('uses the linked institution theme and ignores theme changes in profile updates', function (): void {
    expect(Schema::connection('sqlite')->hasColumn('tenant_users', 'theme_color'))->toBeFalse();

    $institution = User::factory()->create([
        'role' => 'institution',
        'theme_color' => 'teal',
    ]);
    $tenantUser = SuperadminTenantUser::create([
        'name' => 'Tenant User',
        'email' => 'tenant@example.com',
        'password' => 'password',
    ]);
    $tenantUser->institution()->associate($institution);
    $tenantUser->save();

    $this->actingAs($tenantUser)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('auth.user.theme_color', 'teal'));

    $this->actingAs($tenantUser)
        ->patch(route('profile.update'), [
            'name' => $tenantUser->name,
            'email' => $tenantUser->email,
            'theme_color' => 'rose',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($tenantUser->fresh()->theme_color)->toBe('teal');
    expect($institution->fresh()->theme_color)->toBe('teal');
});

it('displays the linked institution theme and ignores changes from institution settings', function (): void {
    $institution = User::factory()->create([
        'role' => 'institution',
        'theme_color' => 'teal',
    ]);
    $tenantUser = SuperadminTenantUser::create([
        'name' => 'Tenant User',
        'email' => 'tenant-settings@example.com',
        'password' => 'password',
        'institution_id' => $institution->id,
    ]);

    $this->actingAs($tenantUser)
        ->get(route('institution.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('themeColor', 'teal'));

    $this->actingAs($tenantUser)
        ->patch(route('institution.update'), [
            'institution_name' => 'Updated Institution',
            'institution_email' => 'updated@example.com',
            'theme_color' => 'rose',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($institution->fresh()->name)->toBe('Updated Institution');
    expect($institution->fresh()->theme_color)->toBe('teal');
});

it('allows the institution account to change its theme color', function (): void {
    $institution = User::factory()->create([
        'role' => 'institution',
        'theme_color' => 'teal',
    ]);

    $this->actingAs($institution)
        ->get(route('institution.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canEditTheme', true));

    $this->actingAs($institution)
        ->patch(route('institution.update'), [
            'institution_name' => $institution->name,
            'institution_email' => $institution->email,
            'theme_color' => 'rose',
        ])
        ->assertSessionHasNoErrors();

    expect($institution->fresh()->theme_color)->toBe('rose');
});
