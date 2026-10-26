<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\SuperadminTenantUser;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $validated = Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
                Rule::unique('tenant_users', 'email'),
            ],
            'institution_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'institution'),
            ],
            'password' => $this->passwordRules(),
        ])->validate();

        $user = new SuperadminTenantUser;
        $user->forceFill([
            'institution_id' => $validated['institution_id'],
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);
        $user->save();

        return $user;
    }
}
