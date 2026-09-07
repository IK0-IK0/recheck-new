# Dynamic Database Setup System

## Overview

The dynamic database setup system allows you to configure and switch between different database backends (SQLite for development, Supabase/PostgreSQL for production) through a UI and have it automatically applied to your application.

## Architecture

### Components

1. **Service Provider** (`TenantDatabaseServiceProvider`)
   - Automatically loads the active database configuration on app boot
   - Updates the `tenant` connection dynamically
   - Gracefully handles errors

2. **Model** (`TenantDatabaseConfig`)
   - Stores database configurations with encrypted passwords
   - Converts config to Laravel connection format
   - Only one config can be active at a time

3. **Controller** (`DatabaseSetupController`)
   - Provides UI for database configuration
   - Tests connections before saving
   - Triggers migrations via UI button

4. **Artisan Command** (`tenant:setup`)
   - CLI tool for database setup
   - Tests connections
   - Runs migrations
   - Displays progress and errors

5. **React UI** (`DatabaseSetup.jsx`)
   - Tabbed interface (SQLite / Supabase)
   - Real-time validation
   - Migration status indicator
   - One-click migration runner

---

## How It Works

### 1. Configuration Flow

```
┌──────────────────────────────────────────────┐
│ Admin opens Database Setup UI                │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Selects database type (SQLite/Supabase)      │
│ Enters credentials                            │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Clicks "Save Configuration"                   │
│ - Tests connection (optional skip)            │
│ - Encrypts password                           │
│ - Saves to tenant_database_configs table      │
│ - Marks as active                             │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Service Provider loads config on next request │
│ - Reads active config                         │
│ - Updates database.connections.tenant         │
│ - Purges old connection                       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Clicks "Run Migrations"                       │
│ - Connects to new database                    │
│ - Runs tenant migrations                      │
│ - Creates all tables                          │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Application uses new database! ✅             │
└──────────────────────────────────────────────┘
```

### 2. Runtime Behavior

**On Every App Boot:**
```php
// TenantDatabaseServiceProvider boots
$activeConfig = TenantDatabaseConfig::where('is_active', true)->first();

if ($activeConfig) {
    Config::set('database.connections.tenant', $activeConfig->toConnectionConfig());
    DB::purge('tenant');
}

// Now all queries using 'tenant' connection use the configured database
```

**On Database Queries:**
```php
// This now uses whatever database is configured (SQLite or Supabase)
TenantUser::all();
Process::with('phases')->get();
Document::where('user_id', auth()->id())->get();
```

---

## Usage

### Method 1: Using the UI (Recommended)

#### Step 1: Configure Database

1. Navigate to **Database Setup** in the sidebar
2. Choose your database type:
   - **SQLite**: For local development
   - **Supabase**: For production

3. Fill in the credentials:

**For SQLite:**
```
Database Path: database/tenant.sqlite
```

**For Supabase:**
```
Host: db.xxxxxxxxxxxxx.supabase.co
Port: 5432
Database: postgres
Username: postgres
Password: your-password
```

4. Click **"Save Configuration"**
   - Connection is tested automatically
   - If you can't reach the database locally, check "Skip test"

#### Step 2: Run Migrations

1. After saving successfully, click **"Run Migrations"**
2. Wait for the process to complete
3. You'll see a success message when done

#### Step 3: Verify

The migration status indicator will show:
- 🟢 **Migrated (X migrations)** - Database is ready
- 🟡 **Not migrated** - Need to run migrations
- 🔴 **Connection error** - Check your configuration

### Method 2: Using Artisan Command

#### Basic Setup

```bash
php artisan tenant:setup
```

This will:
1. Display current configuration
2. Ask for confirmation
3. Test the connection
4. Run migrations

#### Force (No Prompts)

```bash
php artisan tenant:setup --force
```

Skip all confirmation prompts.

#### Fresh Migration

```bash
php artisan tenant:setup --fresh
```

Drop all tables and migrate fresh (⚠️ **WARNING: Deletes all data!**)

#### Example Output

```
🔧 Tenant Database Setup

Driver        PostgreSQL
Database      postgres
Host          db.tvsrfpkraxyecalljjrz.supabase.co
Port          5432
Username      postgres

Do you want to proceed with the setup? Yes

Testing database connection...
Connection successful!

Running migrations...

2024_01_01_000000_create_tenant_users_table .............. DONE
2024_01_02_000000_create_roles_table ..................... DONE
2024_01_03_000000_create_processes_table ................. DONE
...

Tenant database setup completed successfully!
```

---

## Migration Status

The system tracks migration status in three ways:

### 1. In the UI

Header shows:
- Current database (SQLite / PostgreSQL)
- Database name
- Migration status with color coding

### 2. Via Database

Check the `migrations` table in the tenant database:
```sql
SELECT * FROM migrations ORDER BY batch DESC;
```

### 3. Via Artisan

```bash
php artisan migrate:status --database=tenant
```

---

## Configuration Options

### Skip Connection Test

Useful when:
- Your local machine can't reach Supabase
- Behind corporate firewall
- Testing configuration for production use

**UI:** Check "Skip test" checkbox  
**Result:** Configuration is saved without testing

### Connection Pooling (Supabase)

For better performance in production:
- Change Port from `5432` to `6543`
- Enables Supabase's connection pooling
- Reduces connection overhead

---

## Troubleshooting

### Configuration Not Loading

**Problem:** Saved configuration but app still uses old database

**Solution:**
```bash
php artisan config:clear
php artisan cache:clear
```

Then restart your dev server.

### Service Provider Not Booting

**Problem:** Service provider isn't loading config

**Check:**
1. Is it registered in `bootstrap/providers.php`?
```php
App\Providers\TenantDatabaseServiceProvider::class,
```

2. Does the table exist?
```bash
php artisan migrate --path=database/migrations/superadmin
```

### Migrations Fail

**Problem:** Migration command fails with connection error

**Solutions:**

1. Test connection manually:
```bash
php artisan tinker
DB::connection('tenant')->getPdo();
```

2. Check migration status:
```bash
php artisan tenant:setup
```

3. Verify credentials in Database Setup UI

### "Table already exists" Error

**Problem:** Trying to migrate but tables exist

**Solution:**
```bash
# Check what's already migrated
php artisan migrate:status --database=tenant

# If you want to start fresh (⚠️ deletes data):
php artisan tenant:setup --fresh
```

---

## Development Workflow

### Scenario 1: Starting a New Project

```bash
# 1. Run superadmin migrations
php artisan migrate --path=database/migrations/superadmin

# 2. Configure database via UI
# Navigate to /tenant/database-setup
# Choose SQLite, enter: database/tenant.sqlite
# Click "Save Configuration"

# 3. Run tenant migrations via UI
# Click "Run Migrations"

# Done! Start developing
```

### Scenario 2: Switching to Supabase

```bash
# 1. Create Supabase project at https://supabase.com

# 2. Get credentials
# Dashboard → Settings → Database → Connection string

# 3. Configure in UI
# Navigate to /tenant/database-setup
# Switch to "Supabase" tab
# Enter credentials
# Check "Skip test" if needed
# Click "Save Configuration"

# 4. Run migrations
# Click "Run Migrations"

# 5. Restart app
composer run dev
# or
npm run dev

# Done! Now using Supabase
```

### Scenario 3: Team Onboarding

**For New Developers:**

```bash
# 1. Clone repo
git clone ...

# 2. Copy .env
cp .env.example .env

# 3. Install dependencies
composer install
npm install

# 4. Run superadmin migrations
php artisan migrate --path=database/migrations/superadmin

# 5. Setup tenant database via UI
# Use SQLite: database/tenant.sqlite
# Click "Save" then "Run Migrations"

# 6. Start dev server
composer run dev
```

---

## Production Deployment

### Step 1: Configure Supabase

1. Create production Supabase project
2. Note the credentials

### Step 2: Configure via UI or Artisan

**Option A: Via UI**
```
1. Deploy application
2. Login as admin
3. Navigate to Database Setup
4. Enter Supabase credentials
5. Save and Run Migrations
```

**Option B: Via Artisan**
```bash
# SSH into production server
ssh user@yourserver.com

# Configure via UI first, then:
php artisan tenant:setup --force
```

### Step 3: Verify

```bash
# Check migration status
php artisan migrate:status --database=tenant

# Test a query
php artisan tinker
TenantUser::count();
```

---

## Security Considerations

### Password Encryption

Passwords are automatically encrypted using Laravel's `Crypt` facade:
```php
// In TenantDatabaseConfig model
public function setPasswordAttribute(?string $value): void {
    $this->attributes['password'] = $value 
        ? Crypt::encryptString($value) 
        : null;
}
```

### Environment Variables

While the UI stores credentials in the database, you can also use `.env`:
```env
TENANT_DB_CONNECTION=pgsql
TENANT_DB_HOST=db.xxxxx.supabase.co
TENANT_DB_PORT=5432
TENANT_DB_DATABASE=postgres
TENANT_DB_USERNAME=postgres
TENANT_DB_PASSWORD=your-password
```

The service provider will use the database config if available, falling back to `.env`.

### Permission Considerations

- Only authenticated admin users should access `/tenant/database-setup`
- Consider adding role-based access control
- Audit log configuration changes

---

## Advanced Usage

### Programmatic Configuration

```php
use App\Models\TenantDatabaseConfig;

// Create new config
$config = TenantDatabaseConfig::create([
    'driver' => 'pgsql',
    'host' => 'db.example.supabase.co',
    'port' => '5432',
    'database' => 'postgres',
    'username' => 'postgres',
    'password' => 'secret', // Automatically encrypted
    'is_active' => true,
]);

// Apply immediately
Config::set('database.connections.tenant', $config->toConnectionConfig());
DB::purge('tenant');
DB::reconnect('tenant');
```

### Multiple Tenant Databases

While currently only one tenant database is active at a time, you can extend this to support multiple tenants:

```php
// Store tenant_id in session or JWT
$tenantId = auth()->user()->tenant_id;

// Load that tenant's config
$config = TenantDatabaseConfig::where('tenant_id', $tenantId)
    ->where('is_active', true)
    ->first();

// Apply dynamically
Config::set('database.connections.tenant', $config->toConnectionConfig());
DB::purge('tenant');
```

---

## Files Reference

### Core Files

- `app/Models/TenantDatabaseConfig.php` - Database config model
- `app/Providers/TenantDatabaseServiceProvider.php` - Auto-loads config
- `app/Console/Commands/TenantSetupCommand.php` - CLI setup tool
- `app/Http/Controllers/Admin/DatabaseSetupController.php` - UI controller
- `resources/js/pages/Admin/DatabaseSetup.jsx` - React UI
- `database/migrations/superadmin/*_create_tenant_database_configs_table.php` - Migration

### Routes

```php
GET  /tenant/database-setup         - Display UI
POST /tenant/database-setup         - Save configuration
POST /tenant/database-setup/migrate - Run migrations
```

### Artisan Commands

```bash
php artisan tenant:setup            - Setup tenant database
php artisan tenant:setup --force    - Skip confirmations
php artisan tenant:setup --fresh    - Migrate fresh
```

---

## Testing

The system includes comprehensive tests:

```bash
# Run all database setup tests
php artisan test --filter=DatabaseSetup

# Test configuration saving
php artisan test --filter=database_configuration_can_be_saved

# Test connection validation
php artisan test --filter=postgresql_configuration_requires_host
```

---

## FAQ

**Q: Does changing the config affect the superadmin database?**  
A: No. The superadmin database (SQLite) always remains on SQLite. Only the tenant database can be switched.

**Q: Can I use MySQL instead of PostgreSQL?**  
A: The current implementation supports SQLite and PostgreSQL. To add MySQL, update the validation rules in the controller and the `toConnectionConfig()` method in the model.

**Q: What happens to existing data when I switch databases?**  
A: Existing data remains in the old database. The new database starts empty until you run migrations. Consider data migration strategies if needed.

**Q: Can I revert to a previous configuration?**  
A: Yes. Just go to Database Setup, re-enter the old credentials, save, and run migrations (if the database already has tables, migrations won't recreate them).

**Q: Does this work with Laravel Forge/Vapor?**  
A: Yes! The configuration is stored in the database and persists across deployments. Just make sure to run `php artisan tenant:setup` after deploying.

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review logs: `storage/logs/laravel.log`
3. Test connection: `php artisan tenant:setup`
4. Verify service provider is registered
