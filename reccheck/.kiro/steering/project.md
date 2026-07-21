# Project: Recheck

## Stack
- **Framework**: Laravel (PHP)
- **Frontend**: Vite + TypeScript
- **Auth**: Laravel Fortify (with 2FA)

## Database Architecture

### Two-Database Model

| Connection | File (dev) | Purpose |
|---|---|---|
| `sqlite` (default) | `database/superadmin.sqlite` | Superadmin logins, sessions, cache, jobs, tenant connection configs |
| `tenant` | `database/tenant.sqlite` (dev) / remote DB (prod) | Everything that happens while a user is logged in |

### Rules
- **All logins and authentication** are managed by the superadmin DB (`sqlite` connection).
- **When a superadmin is logged in** → everything stays on the superadmin DB. They never touch the tenant DB.
- **When any other user (tenant) is logged in** → everything after login (user data, custom tables, app activity) is managed by the tenant DB (`tenant` connection).
- Tenant database credentials are stored (encrypted) in the superadmin DB and loaded dynamically at runtime after a tenant logs in.
- Tenant custom tables are built dynamically via Laravel's Schema builder — no migration files for those.

### Migration Paths
- `database/migrations/superadmin/` — runs on the superadmin SQLite DB
- `database/migrations/tenant/` — default baseline that gets stamped onto every new tenant DB on first connect

### Running Migrations
```bash
# Superadmin DB
php artisan migrate --path=database/migrations/superadmin

# Tenant DB (dev)
php artisan migrate --database=tenant --path=database/migrations/tenant
```

## Key Conventions
- Models that belong to the superadmin DB do NOT specify a `$connection` (uses default).
- Models that belong to the tenant DB must specify `protected $connection = 'tenant';`.
