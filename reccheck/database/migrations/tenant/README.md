# Tenant Migrations

Migration files in this folder are the **default baseline** that gets stamped onto every tenant's database when they first connect.

These run automatically via:

```php
Artisan::call('migrate', [
    '--database' => 'tenant',
    '--path'     => 'database/migrations/tenant',
]);
```

## What belongs here:
- Tables every tenant always needs (e.g. `settings`, `activity_log`)
- Any shared structural defaults across all tenants

## What does NOT belong here:
- Superadmin tables → those live in `migrations/superadmin/`
- Tenant custom tables → those are built dynamically at runtime via the Schema builder, no migration file needed
