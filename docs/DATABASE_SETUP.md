# Database Setup Feature

## Overview

The Database Setup feature allows administrators to configure the tenant database connection through a user-friendly interface. This supports switching between SQLite (for local development) and Supabase/PostgreSQL (for production).

## Features

- **Visual UI**: Clean, intuitive interface for database configuration
- **Multiple Drivers**: Support for SQLite and PostgreSQL (Supabase)
- **Encrypted Storage**: Database passwords are encrypted before storage
- **Connection Testing**: Automatic connection validation before saving
- **Active Configuration**: Only one configuration can be active at a time
- **Real-time Feedback**: Success/error messages with toast notifications

## Accessing the Setup

Navigate to **Database Setup** in the main sidebar navigation, or visit:
```
/tenant/database-setup
```

## Configuration Options

### SQLite Configuration
- **Database Path**: Relative path from project root (e.g., `database/tenant.sqlite`)
- Best for: Local development and testing

### Supabase (PostgreSQL) Configuration
Required fields:
- **Host**: Your Supabase database host (e.g., `db.xxxxxxxxxxxxx.supabase.co`)
- **Port**: Database port (default: `5432`)
- **Database Name**: Database name (typically `postgres`)
- **Username**: Database username (typically `postgres`)
- **Password**: Database password (encrypted before storage)

Best for: Production deployments

## Finding Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to: **Project Settings** → **Database**
3. Look for the **Connection string** tab or **Connection pooling** section
4. Extract the required values:
   - Host: The server address
   - Port: Usually 5432
   - Database: Usually postgres
   - Username: Usually postgres
   - Password: Your database password

## Technical Details

### Database Structure

The configuration is stored in the `tenant_database_configs` table in the **superadmin database**:

```php
- id: Primary key
- driver: 'sqlite' or 'pgsql'
- host: Database host (nullable, required for pgsql)
- port: Database port (nullable)
- database: Database path or name
- username: Database username (nullable, required for pgsql)
- password: Encrypted password (nullable)
- is_active: Boolean flag (only one config can be active)
- timestamps: created_at, updated_at
```

### Model: `TenantDatabaseConfig`

Located at: `app/Models/TenantDatabaseConfig.php`

Key features:
- Automatic password encryption/decryption
- `toConnectionConfig()` method for generating Laravel database config arrays
- Supports SQLite and PostgreSQL drivers

### Controller: `DatabaseSetupController`

Located at: `app/Http/Controllers/Admin/DatabaseSetupController.php`

Methods:
- `index()`: Display the database setup page
- `store()`: Save and test database configuration
- `testConnection()`: Validate database connection

### Routes

```php
GET  /tenant/database-setup      // Display setup page
POST /tenant/database-setup      // Save configuration
```

## Security

- Passwords are encrypted using Laravel's `Crypt` facade before storage
- Connection testing validates credentials before saving
- Failed connections automatically rollback the configuration
- Encrypted passwords are hidden in API responses

## Future Enhancements

To dynamically load the tenant database at runtime, you'll need to:

1. Retrieve the active configuration when a tenant user logs in
2. Use `Config::set()` to update the `tenant` connection configuration
3. Reconnect to the database using the new credentials

Example:
```php
$config = TenantDatabaseConfig::where('is_active', true)->first();
if ($config) {
    Config::set('database.connections.tenant', $config->toConnectionConfig());
    DB::purge('tenant');
    DB::reconnect('tenant');
}
```

## Testing

Run the test suite:
```bash
php artisan test --filter=DatabaseSetupTest
```

Tests cover:
- Page rendering
- SQLite configuration saving
- PostgreSQL validation
- Invalid driver rejection
