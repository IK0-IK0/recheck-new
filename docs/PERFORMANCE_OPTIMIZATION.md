# Performance Optimization Guide

## 🐌 Issue: Delay After Loading Bar Finishes

### Symptoms
- Loading bar completes at 100%
- Page shows blank/white screen
- 200-500ms delay before content appears

### Root Causes

1. **React Hydration/Mounting** - Component tree takes time to render
2. **localStorage Operations** - Synchronous reads block rendering
3. **Layout Calculations** - Browser reflow/repaint
4. **Large Data Rendering** - Heavy DOM operations
5. **CSS-in-JS** - Runtime style calculations

---

## ✅ Solutions Applied

### 1. Debounced localStorage Saves
**Problem:** Writing to localStorage on every keystroke blocks render
**Solution:** Debounce writes by 300ms

```javascript
useEffect(() => {
    const timeoutId = setTimeout(() => {
        localStorage.setItem('key', JSON.stringify(data));
    }, 300);
    return () => clearTimeout(timeoutId);
}, [data]);
```

### 2. Progress Bar Delay
**Problem:** Progress bar shows/hides too aggressively
**Solution:** Only show if request takes >250ms

```javascript
progress: {
    delay: 250, // Don't show for fast requests
}
```

### 3. Try-Catch on localStorage
**Problem:** localStorage errors can crash the app
**Solution:** Wrap all localStorage operations in try-catch

```javascript
try {
    const saved = localStorage.getItem('key');
    return saved ? JSON.parse(saved) : defaults;
} catch (e) {
    console.error('localStorage error:', e);
    return defaults;
}
```

### 4. Cached Queries
**Problem:** Database queries on every page load
**Solution:** Cache static/semi-static data

```php
$roles = Cache::remember('roles', 3600, fn () => Role::all());
```

---

## 🔍 Debugging Performance Issues

### 1. Chrome DevTools Performance Tab

```
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Navigate to slow page
5. Stop recording
6. Look for:
   - Long tasks (>50ms)
   - Layout/Paint operations
   - Script execution time
```

### 2. React DevTools Profiler

```
1. Install React DevTools extension
2. Go to Profiler tab
3. Click Record
4. Navigate to page
5. Stop recording
6. Look for:
   - Components taking >16ms to render
   - Unnecessary re-renders
```

### 3. Inertia Events

Add timing logs:

```javascript
// In app.tsx
import { router } from '@inertiajs/react';

router.on('start', (event) => {
    console.time('navigation');
});

router.on('finish', (event) => {
    console.timeEnd('navigation');
});
```

---

## 🚀 Additional Optimizations

### 1. Lazy Load Heavy Components

```javascript
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('@/components/HeavyChart'));

export default function Dashboard() {
    return (
        <Suspense fallback={<ChartSkeleton />}>
            <HeavyChart />
        </Suspense>
    );
}
```

### 2. Memoize Expensive Computations

```javascript
import { useMemo } from 'react';

export default function UserList({ users }) {
    const sortedUsers = useMemo(() => {
        return users.sort((a, b) => a.name.localeCompare(b.name));
    }, [users]);

    return <>{sortedUsers.map(...)}</>;
}
```

### 3. Virtual Lists for Large Data

For 100+ items:

```bash
npm install @tanstack/react-virtual
```

```javascript
import { useVirtualizer } from '@tanstack/react-virtual';

export default function LargeList({ items }) {
    const parentRef = useRef(null);
    
    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
    });

    return (
        <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
            <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {virtualizer.getVirtualItems().map((virtualRow) => (
                    <div key={virtualRow.index}>
                        {items[virtualRow.index].name}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### 4. Optimize Images

```javascript
// Use modern formats
<img src="image.webp" />

// Lazy load images
<img loading="lazy" src="image.jpg" />

// Specify dimensions to prevent layout shift
<img width="300" height="200" src="image.jpg" />
```

### 5. Code Splitting by Route

Inertia automatically does this, but verify:

```bash
npm run build
ls public/build/assets/
# Should see multiple JS chunks, not one huge file
```

---

## 📊 Performance Targets

| Metric | Target | Good | Poor |
|--------|--------|------|------|
| Time to Interactive (TTI) | <500ms | <1s | >2s |
| First Contentful Paint (FCP) | <200ms | <500ms | >1s |
| Component Render | <16ms | <50ms | >100ms |
| Database Query | <50ms | <200ms | >500ms |

---

## 🎯 Quick Wins Checklist

- [x] Add `delay: 250` to progress bar config
- [x] Debounce localStorage writes
- [x] Wrap localStorage in try-catch
- [x] Cache static database queries
- [ ] Enable production build (`npm run build`)
- [ ] Enable gzip compression on server
- [ ] Use CDN for assets (optional)
- [ ] Add database indexes for slow queries

---

## 🔧 Production Optimizations

### Vite Build Optimizations

**File:** `vite.config.js`

```javascript
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': ['react', 'react-dom'],
                    'inertia': ['@inertiajs/react'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
});
```

### Laravel Optimizations

```bash
# Optimize autoloader
composer install --optimize-autoloader --no-dev

# Cache config
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize
php artisan optimize
```

### Database Indexes

Add indexes for frequently queried columns:

```php
Schema::table('tenant_users', function (Blueprint $table) {
    $table->index('email');
    $table->index(['created_at', 'id']);
});
```

---

## 📈 Monitoring Performance

### Add Performance Logging

```javascript
// In app.tsx
router.on('start', (event) => {
    performance.mark('navigation-start');
});

router.on('finish', (event) => {
    performance.mark('navigation-end');
    performance.measure(
        'navigation',
        'navigation-start',
        'navigation-end'
    );
    
    const measure = performance.getEntriesByName('navigation')[0];
    console.log(`Navigation took ${measure.duration}ms`);
    
    // Send to analytics if > 1s
    if (measure.duration > 1000) {
        // analytics.track('slow-navigation', { duration: measure.duration });
    }
});
```

---

## 🐛 Common Issues

### Issue: "White flash" between pages
**Solution:** Ensure layouts are persistent

```javascript
// Already configured in app.tsx
layout: (name) => {
    // Returns same layout instance, preventing unmount/remount
    return AppLayout;
}
```

### Issue: Slow on first load only
**Solution:** This is normal - JavaScript needs to parse/execute
- In production, enable gzip/brotli compression
- Consider using a CDN

### Issue: Slow on every navigation
**Solution:** Check for:
- Heavy database queries (add caching)
- N+1 queries (use eager loading)
- Large datasets (add pagination)

---

## ✅ Summary

Your app now has:
- ✅ Debounced localStorage writes
- ✅ 250ms progress bar delay
- ✅ Try-catch error handling
- ✅ Cached role queries
- ✅ Optimized progress bar config

**Expected improvement:** 200-400ms faster page transitions

For further improvements, run performance profiling and optimize the slowest operations first.
