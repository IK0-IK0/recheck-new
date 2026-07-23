<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
            'theme_color' => $this->themeColorRules(),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique('tenant.users', 'email')
                : Rule::unique('tenant.users', 'email')->ignore($userId),
        ];
    }

    /**
     * Get the validation rules for theme_color.
     *
     * Resolves THEME_COLORS from the using class (e.g. ProfileUpdateRequest).
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function themeColorRules(): array
    {
        return ['sometimes', 'nullable', 'string', Rule::in(static::THEME_COLORS)];
    }
}
