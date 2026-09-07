<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class StorageConfig extends Model
{
    protected $fillable = [
        'driver',
        'root',
        'endpoint',
        'region',
        'bucket',
        'access_key',
        'secret_key',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'access_key',
        'secret_key',
    ];

    /**
     * Encrypt the access_key before saving.
     */
    public function setAccessKeyAttribute(?string $value): void
    {
        $this->attributes['access_key'] = $value ? Crypt::encryptString($value) : null;
    }

    /**
     * Decrypt the access_key when accessing.
     */
    public function getAccessKeyAttribute(?string $value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    /**
     * Encrypt the secret_key before saving.
     */
    public function setSecretKeyAttribute(?string $value): void
    {
        $this->attributes['secret_key'] = $value ? Crypt::encryptString($value) : null;
    }

    /**
     * Decrypt the secret_key when accessing.
     */
    public function getSecretKeyAttribute(?string $value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    /**
     * Get the configuration as an array suitable for filesystem disk config.
     */
    public function toFilesystemConfig(): array
    {
        $config = [
            'driver' => $this->driver,
        ];

        if ($this->driver === 'local') {
            $config['root'] = $this->root ?? storage_path('app/private');
            $config['serve'] = true;
            $config['throw'] = false;
        } elseif ($this->driver === 's3') {
            $config['key'] = $this->access_key;
            $config['secret'] = $this->secret_key;
            $config['region'] = $this->region ?? 'us-east-1';
            $config['bucket'] = $this->bucket;
            $config['endpoint'] = $this->endpoint;
            $config['use_path_style_endpoint'] = true;
            $config['throw'] = true;
        }

        return $config;
    }
}
