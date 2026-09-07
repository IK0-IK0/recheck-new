# Database Setup Troubleshooting Guide

## Common Issues and Solutions

### 1. "Could not translate host name to address" Error

**Error Message:**
```
SQLSTATE[08006] [7] could not translate host name "db.xxxxx.supabase.co" to address: Name or service not known
```

**What it means:**
Your server cannot resolve the Supabase hostname to an IP address. This is a DNS resolution issue.

**Solutions:**

#### A. Check Internet Connection
```bash
# Test if you can reach Supabase
ping db.tvsrfpkraxyecalljjrz.supabase.co
```

If the ping fails, check:
- Your internet connection
- Firewall settings
- VPN configuration

#### B. Verify Hostname
Common mistakes:
- Extra spaces before/after the hostname
- Missing `.co` at the end
- Wrong project ID

Example correct format:
```
db.tvsrfpkraxyecalljjrz.supabase.co
```

#### C. Use IP Address Instead (Temporary)
If DNS is blocked, you can use Supabase's IP address:
```bash
# Get the IP address
nslookup db.tvsrfpkraxyecalljjrz.supabase.co
```
Then use the IP address in the Host field.

⚠️ **Warning:** IPs may change; hostnames are preferred.

#### D. Check PHP Network Access
Ensure PHP can make outbound connections:
```bash
# Test with PHP
php -r "echo gethostbyname('db.tvsrfpkraxyecalljjrz.supabase.co');"
```

#### E. Firewall/Security Software
Check if your firewall or antivirus is blocking PHP from making network connections:
- Windows Defender Firewall
- Corporate firewalls
- Antivirus software
- Docker network restrictions

#### F. Skip Connection Test (Development Only)
For local development where you can't reach Supabase but need to save the config:
1. Check "Skip connection test" in the footer
2. Save the configuration
3. The connection will work in production where network access is available

---

### 2. "Access Denied" or Authentication Errors

**Error Message:**
```
SQLSTATE[08006] [7] FATAL: password authentication failed
```

**Solutions:**

#### A. Verify Password
- Ensure you're using the correct database password
- Check for typos
- Passwords are case-sensitive

#### B. Check Username
- Supabase default username is `postgres`
- Some projects may use custom usernames

#### C. Reset Password
In Supabase Dashboard:
1. Go to Project Settings → Database
2. Reset the database password
3. Update the password in your configuration

---

### 3. SSL/TLS Connection Issues

**Error Message:**
```
SQLSTATE[08006] [7] could not connect to server: Connection refused
```

**Solutions:**

#### A. SSL Mode
The configuration automatically sets `sslmode=require` for Supabase.

If you need to change it, modify `app/Models/TenantDatabaseConfig.php`:
```php
$config['sslmode'] = 'require'; // Options: require, verify-full, prefer
```

#### B. Port Configuration
Ensure you're using the correct port:
- Standard PostgreSQL: `5432`
- Connection Pooling: `6543` (check Supabase dashboard)

---

### 4. PostgreSQL Extension Not Installed

**Error Message:**
```
could not find driver
```

**Solutions:**

#### Check if pdo_pgsql is installed:
```bash
php -m | grep pdo_pgsql
```

#### Install on Ubuntu/Debian:
```bash
sudo apt-get install php-pgsql
sudo systemctl restart apache2  # or php-fpm
```

#### Install on macOS (Homebrew):
```bash
brew install php
pecl install pdo_pgsql
```

#### Install on Windows:
1. Edit `php.ini`
2. Uncomment: `extension=pdo_pgsql`
3. Restart web server

---

### 5. Connection Timeout

**Error Message:**
```
SQLSTATE[08006] [7] timeout expired
```

**Solutions:**

#### A. Network Latency
- Supabase servers may be geographically distant
- Increase timeout in Laravel configuration

#### B. Connection Pooling
Use Supabase's connection pooling endpoint:
- Host remains the same
- Change port to `6543`
- This provides better performance

---

### 6. "Too Many Connections"

**Error Message:**
```
SQLSTATE[53300] [53300] FATAL: remaining connection slots are reserved
```

**Solutions:**

#### A. Use Connection Pooling
In Supabase dashboard:
- Enable connection pooling
- Use port `6543` instead of `5432`

#### B. Close Unused Connections
Ensure your application properly closes database connections after use.

---

## Testing Connection Manually

### Using psql command line:
```bash
psql "postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

### Using PHP directly:
```php
php artisan tinker

$pdo = new PDO(
    'pgsql:host=db.xxxxx.supabase.co;port=5432;dbname=postgres',
    'postgres',
    'YOUR_PASSWORD',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "Connected successfully!";
```

---

## Getting Help

If you're still experiencing issues:

1. **Check Supabase Status**: https://status.supabase.com
2. **Review Logs**: Check Laravel logs in `storage/logs/laravel.log`
3. **Test Connection**: Use `psql` or DBeaver to test connection independently
4. **Supabase Support**: Contact Supabase support for host-specific issues

---

## Production vs Development

### Development (Local)
- DNS resolution may be blocked by corporate networks
- Use "Skip connection test" if needed
- SQLite is recommended for local development

### Production
- Ensure server has outbound internet access
- Use environment variables for sensitive credentials
- Consider using connection pooling (port 6543)
- Enable SSL certificate verification

---

## Configuration Checklist

Before saving your configuration, verify:

- [ ] Host has no extra spaces
- [ ] Port is correct (5432 for direct, 6543 for pooling)
- [ ] Database name is correct (usually `postgres`)
- [ ] Username is correct (usually `postgres`)
- [ ] Password is correct (check for typos)
- [ ] Your server has internet access
- [ ] PostgreSQL PHP extension is installed
- [ ] Firewall allows outbound connections on port 5432/6543
