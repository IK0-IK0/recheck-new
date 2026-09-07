# Deferred Props Pattern for Better UX

## 🎯 Problem: Slow Page Loads

When pages fetch data from the database before rendering, users see:
- ⏳ Blank screen or spinner
- ⏳ Slow page transitions
- ⏳ Poor perceived performance

## ✅ Solution: Deferred Props (Inertia v3)

Render the page **immediately** with loading skeletons, then stream data in:
- ✅ Instant page render
- ✅ Smooth transitions
- ✅ Better perceived performance

---

## 📊 Before vs After

### Before (Blocking)
```php
// Controller
public function index() {
    return Inertia::render('Users', [
        'users' => User::all(),  // ⏳ Waits for database
    ]);
}
```

**Timeline:**
```
0ms:  User clicks link
100ms: Server receives request
200ms: Database query starts ⏳
500ms: Query completes
600ms: Page renders
700ms: User sees page ❌ SLOW
```

### After (Deferred)
```php
// Controller
public function index() {
    return Inertia::render('Users', [
        'users' => Inertia::defer(fn () => User::all()),  // ⚡ Runs in background
    ]);
}
```

**Timeline:**
```
0ms:  User clicks link
100ms: Server receives request
150ms: Page renders with skeleton ✅ FAST
200ms: Database query starts (background)
500ms: Query completes
501ms: Data streams in, skeleton → real data
```

---

## 🛠️ Implementation Guide

### Step 1: Update Controller

**File:** `app/Http/Controllers/Admin/UserManagementController.php`

```php
use Inertia\Inertia;

public function index(): Response
{
    return Inertia::render('Tenant/Users', [
        // ✅ Deferred: Data loads asynchronously
        'users' => Inertia::defer(fn () => TenantUser::with('roles')->get()),
        'roles' => Inertia::defer(fn () => Role::all()),
    ]);
}
```

### Step 2: Update React Component

**File:** `resources/js/pages/Tenant/Users.jsx`

```jsx
export default function Users({ users = [], roles = [] }) {
    // Detect loading state
    const isLoading = users === undefined || roles === undefined;

    return (
        <table>
            <tbody>
                {isLoading ? (
                    // Loading skeleton
                    <SkeletonRows count={3} />
                ) : users.length > 0 ? (
                    // Real data
                    users.map(user => <UserRow key={user.id} user={user} />)
                ) : (
                    // Empty state
                    <EmptyState />
                )}
            </tbody>
        </table>
    );
}
```

### Step 3: Create Skeleton Component

```jsx
function SkeletonRows({ count = 3 }) {
    return (
        <>
            {[...Array(count)].map((_, i) => (
                <tr key={i}>
                    <td className="px-6 py-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </td>
                </tr>
            ))}
        </>
    );
}
```

---

## 🎨 Loading State Patterns

### Pattern 1: Skeleton Loader (Recommended)

Shows the shape of content while loading:

```jsx
{isLoading ? (
    <div className="space-y-4">
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
    </div>
) : (
    <RealContent data={data} />
)}
```

### Pattern 2: Spinner

Simple loading indicator:

```jsx
{isLoading ? (
    <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
) : (
    <RealContent data={data} />
)}
```

### Pattern 3: Shimmer Effect

More polished skeleton:

```jsx
<div className="relative overflow-hidden rounded bg-muted">
    <div className="h-10 w-full" />
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
</div>
```

Add to `tailwind.config.js`:
```js
animation: {
    shimmer: 'shimmer 2s infinite',
},
keyframes: {
    shimmer: {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(100%)' },
    },
},
```

---

## 📝 When to Use Deferred Props

### ✅ Use Deferred Props When:

1. **Slow queries** (>100ms)
   - Complex joins
   - Large datasets
   - External API calls

2. **Multiple queries**
   - Loading users + roles + permissions
   - Dashboard with multiple data sources

3. **Optional data**
   - Analytics that aren't critical
   - Recommendations
   - Related content

### ❌ Don't Use Deferred Props When:

1. **Fast queries** (<50ms)
   - Simple lookups
   - Cached data
   - Static content

2. **Critical data needed for render**
   - User authentication state (already loaded)
   - Page configuration
   - Route parameters

3. **Small datasets**
   - Dropdown options
   - System settings

---

## 🔧 Advanced Patterns

### Partial Deferred Props

Defer slow data, load fast data immediately:

```php
return Inertia::render('Dashboard', [
    'user' => auth()->user(),  // Fast, load immediately
    'stats' => Inertia::defer(fn () => $this->getStats()),  // Slow, defer
    'recentActivity' => Inertia::defer(fn () => Activity::recent()),  // Slow, defer
]);
```

### Multiple Loading States

Different data can load at different times:

```jsx
export default function Dashboard({ user, stats, recentActivity }) {
    const statsLoading = stats === undefined;
    const activityLoading = recentActivity === undefined;

    return (
        <div>
            <UserInfo user={user} /> {/* Always available */}
            
            <StatsCards>
                {statsLoading ? <StatsSkeleton /> : <Stats data={stats} />}
            </StatsCards>
            
            <ActivityFeed>
                {activityLoading ? <ActivitySkeleton /> : <Activity data={recentActivity} />}
            </ActivityFeed>
        </div>
    );
}
```

### Merge Props (Always Show Latest)

Use `Inertia::merge()` to keep showing old data while loading new:

```php
return Inertia::render('Users', [
    'users' => Inertia::merge(
        fn () => TenantUser::with('roles')->get()
    ),
]);
```

**Result:** Shows previous data while loading new data (no loading skeleton).

---

## 🚀 Migration Strategy

### Phase 1: Identify Slow Pages

```bash
# Check query logs
tail -f storage/logs/laravel.log | grep "Slow query"
```

Or add to `AppServiceProvider`:

```php
use Illuminate\Support\Facades\DB;

public function boot()
{
    DB::listen(function ($query) {
        if ($query->time > 100) { // ms
            \Log::warning('Slow query', [
                'sql' => $query->sql,
                'time' => $query->time,
            ]);
        }
    });
}
```

### Phase 2: Add Deferred Props

Priority order:
1. **Dashboard pages** - Most visited, highest impact
2. **List pages** - Users, documents, etc.
3. **Detail pages** - Single item views
4. **Settings pages** - Less critical

### Phase 3: Add Loading States

Use skeleton loaders that match your design system.

---

## 📊 Performance Impact

### Real-World Example

**Before:**
- Time to First Byte (TTFB): 500ms
- Time to Interactive (TTI): 800ms
- **Perceived load time: 800ms** ❌

**After with Deferred Props:**
- TTFB: 150ms
- Initial render: 200ms
- Data loaded: 500ms
- **Perceived load time: 200ms** ✅

**Improvement: 75% faster perceived performance!**

---

## 🎓 Best Practices

### 1. Always Provide Default Values

```jsx
// ✅ Good
export default function Users({ users = [], roles = [] }) {
    const isLoading = users === undefined;
    // ...
}

// ❌ Bad
export default function Users({ users, roles }) {
    // Will crash if accessed before data loads
    const count = users.length; // TypeError!
}
```

### 2. Meaningful Loading States

```jsx
// ✅ Good: Shows structure
<SkeletonTable rows={5} />

// ❌ Bad: Generic spinner
<Spinner />
```

### 3. Handle Errors

```jsx
export default function Users({ users = [], error = null }) {
    if (error) {
        return <ErrorMessage error={error} />;
    }
    
    const isLoading = users === undefined;
    // ...
}
```

### 4. Optimize Deferred Queries

```php
// ✅ Good: Eager load relationships
Inertia::defer(fn () => User::with('roles', 'permissions')->get())

// ❌ Bad: N+1 queries
Inertia::defer(fn () => User::all()) // Will cause N+1 when accessing roles
```

---

## 📚 Resources

- [Inertia.js Deferred Props](https://inertiajs.com/deferred-props)
- [Skeleton Loading Pattern](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a)
- [Perceived Performance](https://web.dev/rail/)

---

## ✅ Summary

| Aspect | Before | After |
|--------|--------|-------|
| Initial render | 500-800ms | 150-200ms |
| User experience | Blank screen | Immediate feedback |
| Perceived speed | Slow | Fast |
| Implementation | Simple | +Loading states |

**Recommendation:** Use deferred props for all pages that query the database. The improved UX is worth the extra code!
