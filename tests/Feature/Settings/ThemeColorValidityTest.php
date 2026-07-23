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

use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\TenantUser;

// ---------------------------------------------------------------------------
// Property 5 — All 13 valid theme colors are accepted and persisted correctly
// ---------------------------------------------------------------------------
it('stores each of the 13 valid theme colors exactly as submitted (Property 5)', function (): void {
    $validColors = ProfileUpdateRequest::THEME_COLORS;

    expect($validColors)->toHaveCount(13);

    foreach ($validColors as $color) {
        $user = TenantUser::factory()->create(['theme_color' => 'zinc']);

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                'theme_color' => $color,
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('profile.edit'));

        expect($user->fresh()->theme_color)
            ->toBe($color, "theme_color '{$color}' should be stored exactly as submitted");
    }
})->group('property-5-theme-color');

// ---------------------------------------------------------------------------
// Property 5 edge case — An invalid theme color returns HTTP 422
// ---------------------------------------------------------------------------
it('rejects an invalid theme_color value with a 422 validation error (Property 5)', function (): void {
    $user = TenantUser::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'theme_color' => 'invalidcolor',
        ]);

    $response->assertSessionHasErrors('theme_color');
})->group('property-5-theme-color');

// ---------------------------------------------------------------------------
// Property 5 additional edge cases — Other clearly invalid values also rejected
// ---------------------------------------------------------------------------
it('rejects other invalid theme_color values including empty string and numeric (Property 5)', function (string $invalidColor): void {
    $user = TenantUser::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'theme_color' => $invalidColor,
        ]);

    $response->assertSessionHasErrors('theme_color');
})->with(['blue', 'purple', 'white', 'black', '123', 'ZINC'])
    ->group('property-5-theme-color');
