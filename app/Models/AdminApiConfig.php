<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class AdminApiConfig extends Model
{
    protected $table = 'admin_api_configs';

    protected $fillable = [
        'ilove_public_key',
        'ilove_secret_key',
    ];

    protected $hidden = [
        'ilove_public_key',
        'ilove_secret_key',
    ];

    public function setIlovePublicKeyAttribute(?string $value): void
    {
        $this->attributes['ilove_public_key'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getIlovePublicKeyAttribute(?string $value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    public function setIloveSecretKeyAttribute(?string $value): void
    {
        $this->attributes['ilove_secret_key'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getIloveSecretKeyAttribute(?string $value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }
}
