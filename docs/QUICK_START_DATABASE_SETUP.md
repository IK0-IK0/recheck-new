# Quick Start: Database Setup

## 🚀 Two-Minute Setup

### For Local Development (SQLite)

1. **Navigate to Database Setup**
   ```
   Sidebar → Database Setup
   ```

2. **Select SQLite**
   - Already selected by default
   - Enter: `database/tenant.sqlite`
   - Click **"Save Configuration"**

3. **Run Migrations**
   - Click **"Run Migrations"** button
   - Wait for success message

4. **Done! ✅**
   - Your app now uses SQLite for tenant data

---

### For Production (Supabase)

1. **Create Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create new project
   - Wait for database to provision

2. **Get Credentials**
   ```
   Supabase Dashboard
   → Settings
   → Database
   → Connection String
   ```

   Example:
   ```
   postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

   Extract:
   - Host: `db.xxxxx.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: `[YOUR-PASSWORD]`

3. **Configure in App**
   ```
   Sidebar → Database Setup
   → Switch to "Supabase" tab
   → Enter credentials
   → Check "Skip test" (if local network blocks connection)
   → Click "Save Configuration"
   ```

4. **Run Migrations**
   - Click **"Run Migrations"** button
   - Wait for completion

5. **Restart Your App**
   ```bash
   # Stop current dev server (Ctrl+C)
   composer run dev
   # or
   npm run dev
   ```

6. **Done! ✅**
   - Your app now uses Supabase (cloud database)

---

## 🔄 Switching Between Databases

You can switch anytime:

1. Go to **Database Setup**
2. Switch tabs (SQLite ↔ Supabase)
3. Enter credentials
4. **Save** → **Run Migrations**
5. Restart app

---

## ⌨️ Using Terminal (Alternative)

If you prefer the command line:

```bash
# After configuring via UI:
php artisan tenant:setup

# With no prompts:
php artisan tenant:setup --force

# Fresh start (⚠️ deletes data):
php artisan tenant:setup --fresh
```

---

## ✅ Verify It's Working

Check the header in Database Setup page:
- 🟢 **Migrated (X migrations)** = Ready to use!
- 🟡 **Not migrated** = Click "Run Migrations"
- 🔴 **Connection error** = Check credentials

---

## 🆘 Troubleshooting

### "Could not translate host name"
- Check "Skip test" when saving
- Your local network might block Supabase
- Migrations will still work in production

### Migrations fail
```bash
# Clear cache
php artisan config:clear

# Try setup command
php artisan tenant:setup
```

### App still uses old database
```bash
# Restart your dev server
Ctrl+C
composer run dev
```

---

## 📚 Need More Help?

See the comprehensive guide:
- [Full Documentation](./DYNAMIC_DATABASE_SETUP.md)
- [Troubleshooting Guide](./DATABASE_SETUP_TROUBLESHOOTING.md)
