# SSL Certificate Fix for Windows

The SSL certificate error occurs because Windows doesn't have the CA certificate bundle that cURL needs to verify HTTPS connections.

## Solution 1: Download CA Certificate Bundle (Recommended for Production)

1. Download the CA certificate bundle from: https://curl.se/ca/cacert.pem
2. Save it somewhere on your computer (e.g., `C:\cacert.pem`)
3. Update your `php.ini` file:
   - Find your `php.ini` file (run `php --ini` to locate it)
   - Open it in a text editor
   - Find the line `;curl.cainfo =` (it might be commented out with `;`)
   - Uncomment it and set the path: `curl.cainfo = "C:\cacert.pem"`
   - Find the line `;openssl.cafile=` 
   - Uncomment it and set the path: `openssl.cafile="C:\cacert.pem"`
4. Restart your Laravel development server

## Solution 2: Disable SSL Verification (Local Development Only)

This is already configured in the application but requires the CA bundle approach above to work properly.

The current configuration in `.env`:
```
SUPABASE_VERIFY_SSL=false
```

However, the Supabase package creates its own HTTP client before our global options are applied.

## Solution 3: Use Local Storage Instead

For local development, you could temporarily use local file storage:

1. In `.env`, change: `FILESYSTEM_DISK=local`
2. Files will be stored in `storage/app/private`
3. Switch back to Supabase for production

## Solution 4: Use Postman/Insomnia to Test

Test the Supabase API directly to confirm it's an SSL issue:
- URL: `https://gxtxpqgivhhbaqlhewzw.supabase.co/storage/v1/object/files`
- Method: POST
- Headers:
  - `Authorization: Bearer YOUR_ANON_KEY`
  - `apiKey: YOUR_ANON_KEY`
- Body: Upload a file

If this works in Postman but not in Laravel, it confirms the SSL certificate issue.

## Recommended Action

Use Solution 1 (download CA bundle) as it's the proper fix and will work in all environments.
