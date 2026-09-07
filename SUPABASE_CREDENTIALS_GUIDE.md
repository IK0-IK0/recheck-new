# Where to Get Supabase Storage Credentials

## Quick Answer

**You need TWO things from Supabase:**

1. **Project URL** (to build the endpoint URL)
2. **Service Role Key** (for authentication)

Both are found in the same place in your Supabase dashboard!

---

## Step-by-Step Guide

### Step 1: Go to Your Supabase Project

1. Open [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project from the dashboard

### Step 2: Navigate to Project Settings

1. Click the **⚙️ Settings** icon in the left sidebar (bottom of the sidebar)
2. Click on **API** in the settings menu

### Step 3: Find Your Credentials

You'll see a page with your API credentials. Here's what you need:

#### A. Project URL

```
Location: API Settings → Project URL
Example: https://abcdefghijklmnop.supabase.co
```

**Copy this URL exactly as shown**

#### B. Service Role Key

```
Location: API Settings → Project API keys → service_role
Label: "service_role" or "Service role (secret)"
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk5OTk5OTk5LCJleHAiOjE5OTk5OTk5OTl9.xxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANT:**
- Click the 👁️ **"Reveal"** or **"Show"** button to see the key
- Use the **`service_role`** key, NOT the `anon` key
- The service_role key is a long string (looks like gibberish)
- Click the 📋 **Copy** button to copy it

---

## Visual Reference

```
┌─────────────────────────────────────────────────┐
│ Project Settings > API                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Configuration                                   │
│ ─────────────────                              │
│                                                 │
│ Project URL                                     │
│ https://abcdefghijklmnop.supabase.co          │
│ [Copy]                                         │
│                                                 │
│ ─────────────────────────────────────────────  │
│                                                 │
│ Project API keys                                │
│ ─────────────────                              │
│                                                 │
│ anon public                                     │
│ eyJhbGc... [👁️ Reveal] [Copy]                  │
│                                                 │
│ service_role secret                             │
│ eyJhbGc... [👁️ Reveal] [Copy] ← YOU NEED THIS! │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Building the Endpoint URL

### The Formula:

```
Endpoint URL = Project URL + /storage/v1/s3
```

### Example:

If your **Project URL** is:
```
https://abcdefghijklmnop.supabase.co
```

Your **Endpoint URL** becomes:
```
https://abcdefghijklmnop.supabase.co/storage/v1/s3
```

### In the Laravel Settings:

When filling out the storage form:

1. **Endpoint URL field**: Paste your Project URL + `/storage/v1/s3`
   ```
   https://abcdefghijklmnop.supabase.co/storage/v1/s3
   ```

2. **Service Role Key field**: Paste your service_role key (the very long string)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
   ```

3. **Secret Key field**: Paste the SAME service_role key again
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
   ```

---

## Why You Need the Service Role Key

### What is it?

The **service_role key** is a special API key that has **full administrative access** to your Supabase project.

### Why do we need it?

For Supabase Storage with S3 compatibility:
- Both **Access Key** AND **Secret Key** use the same `service_role` key
- This authenticates your Laravel server with full storage permissions
- Allows creating, reading, updating, and deleting files

### Why not the anon key?

The `anon` (anonymous) key:
- ❌ Is meant for browser/client-side usage
- ❌ Has limited permissions (RLS policies apply)
- ❌ Cannot access storage without additional RLS setup
- ✅ The `service_role` key bypasses RLS and has full access

---

## Security Notes

### ⚠️ Keep Your Service Role Key Secret!

The service_role key should:
- ✅ Only be stored on your **server** (Laravel encrypts it)
- ✅ Never be committed to version control (Git)
- ✅ Never be exposed to browser/frontend JavaScript
- ❌ Never be shared publicly

### How Laravel Protects It

When you save storage settings:
1. The key is **encrypted** using Laravel's encryption
2. Stored in the database encrypted
3. Only decrypted when needed server-side
4. Never sent to the frontend

---

## Complete Example

### Your Supabase Dashboard Shows:

```yaml
Project URL: https://xyzproject.supabase.co
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk5OTk5OTk5LCJleHAiOjE5OTk5OTk5OTl9.abc123xyz
```

### Fill In Laravel Settings:

| Field | Value |
|-------|-------|
| **Endpoint URL** | `https://xyzproject.supabase.co/storage/v1/s3` |
| **Region** | `us-east-1` (leave as default) |
| **Bucket Name** | `documents` (or your bucket name) |
| **Access Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk5OTk5OTk5LCJleHAiOjE5OTk5OTk5OTl9.abc123xyz` |
| **Secret Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk5OTk5OTk5LCJleHAiOjE5OTk5OTk5OTl9.abc123xyz` |

Notice: **Access Key** and **Secret Key** are THE SAME!

---

## Troubleshooting

### "Cannot find service_role key"

**Solution**: Make sure you're looking at the right section:
1. Settings (⚙️ icon)
2. API (not Database or Authentication)
3. Scroll down to "Project API keys"
4. Look for "service_role" (NOT "anon")

### "The key is hidden"

**Solution**: Click the 👁️ "Reveal" or "Show" button next to the key

### "Which key do I use?"

You have multiple keys in Supabase:
- `anon` / `anon public` ❌ Don't use this
- `service_role` / `service_role secret` ✅ Use this one!

### "My endpoint isn't working"

Double-check the format:
- ✅ Correct: `https://projectref.supabase.co/storage/v1/s3`
- ❌ Wrong: `https://projectref.supabase.co` (missing `/storage/v1/s3`)
- ❌ Wrong: `https://projectref.supabase.co/storage` (incomplete path)
- ❌ Wrong: `https://api.supabase.co` (should be your project-specific URL)

---

## Quick Checklist

Before clicking "Save Storage Settings":

- [ ] I copied my **Project URL** from Supabase
- [ ] I added `/storage/v1/s3` to the end of the Project URL
- [ ] I copied the **service_role** key (not anon key)
- [ ] I clicked "Reveal" to see the full key
- [ ] I pasted the service_role key in BOTH Access Key AND Secret Key fields
- [ ] I have a bucket created (or I'll create one using "Create Bucket" button)
- [ ] I entered my bucket name correctly (lowercase, no spaces)

---

## Need More Help?

### Supabase Documentation
- [Storage Overview](https://supabase.com/docs/guides/storage)
- [Storage API Reference](https://supabase.com/docs/reference/javascript/storage)
- [API Settings](https://supabase.com/docs/guides/api/api-keys)

### Testing Your Credentials

You can test if your credentials work by clicking the **"List Buckets"** button in the storage settings page. If it shows your buckets, your credentials are correct!
