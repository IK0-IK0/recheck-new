<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class TenantDatabaseConfig extends Model
{
    protected $fillable = [
        'driver',
        'host',
        'port',
        'database',
        'username',
        'password',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'password',
    ];

    /**
     * Encrypt the password before saving.
     */
    public function setPasswordAttribute(?string $value): void
    {
        $this->attributes['password'] = $value ? Crypt::encryptString($value) : null;
    }

    /**
     * Decrypt the password when accessing.
     */
    public function getPasswordAttribute(?string $value): ?string
    {
        return $value ? Crypt::decryptString($value) : null;
    }

    /**
     * Get the configuration as an array suitable for database connection config.
     */
    public function toConnectionConfig(): array
    {
        $config = [
            'driver' => $this->driver,
            'database' => $this->database,
            'prefix' => '',
            'foreign_key_constraints' => true,
        ];

        if ($this->driver === 'pgsql') {
            $config['host'] = $this->host;
            $config['port'] = $this->port ?? '5432';
            $config['username'] = $this->username;
            $config['password'] = $this->password;
            $config['charset'] = 'utf8';
            $config['prefix_indexes'] = true;
            $config['search_path'] = env('DB_TENANT_SCHEMA', 'public'); // Configurable schema
            $config['sslmode'] = 'require';
            $config['options'] = [
                \PDO::ATTR_EMULATE_PREPARES => true,
            ];
        } elseif ($this->driver === 'sqlite') {
            $config['url'] = null;
            $config['busy_timeout'] = null;
            $config['journal_mode'] = null;
            $config['synchronous'] = null;
            $config['transaction_mode'] = 'DEFERRED';
        }

        return $config;
    }
}
