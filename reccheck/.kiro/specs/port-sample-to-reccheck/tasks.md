# Implementation Plan: Port Sample to Reccheck

## Overview

This plan converts the design into discrete coding tasks. Each task builds on the previous one, ending with full wiring. All PHP code uses the existing project stack (Laravel 13, Pest, Fortify). All frontend code uses JSX files (not TSX) to match the sample app and minimize conversion friction. Tasks are ordered so that backend foundations come first, then middleware, then controllers, then frontend.

## Tasks

- [x] 1. Create tenant database migrations
  - Create `database/migrations/tenant/0001_create_tenant_users_table.php` — columns: `id`, `name`, `email`, `email_verified_at`, `password`, `theme_color` (default `'zinc'`), `remember_token`, `timestamps`
  - Create `database/migrations/tenant/0002_create_roles_table.php` — columns: `id`, `name`, `timestamps`
  - Create `database/migrations/tenant/0003_create_permissions_table.php` — columns: `id`, `name`, `timestamps`
  - Create `database/migrations/tenant/0004_create_role_user_table.php` — columns: `role_id` (FK roles), `user_id` (FK users); composite PK
  - Create `database/migrations/tenant/0005_create_permission_role_table.php` — columns: `permission_id` (FK permissions), `role_id` (FK roles); composite PK
  - Create `database/migrations/tenant/0006_create_processes_table.php` — columns: `id`, `name`, `description` (text, nullable), `timestamps`
  - Create `database/migrations/tenant/0007_create_phases_table.php` — columns: `id`, `process_id` (FK processes), `name`, `order` (int, default 0), `timestamps`
  - Create `database/migrations/tenant/0008_create_actions_table.php` — columns: `id`, `phase_id` (FK phases), `name`, `description` (text, nullable), `order` (int, default 0), `timestamps`
  - Create `database/migrations/tenant/0009_create_documents_table.php` — columns: `id`, `name`, `file_path`, `file_type`, `label` (default `'doc'`), `timestamps`
  - _Requirements: 1.1–1.10_

  - [ ]* 1.1 Write smoke test for tenant migrations
    - Assert all 9 tables exist after running `artisan migrate --database=tenant --path=database/migrations/tenant`
    - Assert `users` table has `theme_color` column with default `'zinc'`
    - _Requirements: 1.1–1.10_

- [x] 2. Create Eloquent models for tenant entities
  - Create `app/Models/TenantUser.php` — extends `Authenticatable`, `$connection = 'tenant'`, fillable: `name`, `email`, `password`, `theme_color`; `belongsToMany(Role::class, 'role_user')` relationship; `casts`: `password => 'hashed'`
  - Create `app/Models/Role.php` — `$connection = 'tenant'`, fillable: `name`; `belongsToMany(TenantUser::class, 'role_user')`, `belongsToMany(Permission::class, 'permission_role')` relationships
  - Create `app/Models/Permission.php` — `$connection = 'tenant'`, fillable: `name`; `belongsToMany(Role::class, 'permission_role')` relationship
  - Create `app/Models/Process.php` — `$connection = 'tenant'`, fillable: `name`, `description`; `hasMany(Phase::class)` relationship
  - Create `app/Models/Phase.php` — `$connection = 'tenant'`, fillable: `name`, `order`; `belongsTo(Process::class)`, `hasMany(Action::class)` relationships
  - Create `app/Models/Action.php` — `$connection = 'tenant'`, fillable: `name`, `description`, `order`; `belongsTo(Phase::class)` relationship
  - Create `app/Models/Document.php` — `$connection = 'tenant'`, fillable: `name`, `file_path`, `file_type`, `label`
  - Create database factories for TenantUser, Role, Permission, Process, Phase, Action, Document in `database/factories/`
  - _Requirements: 2.1–2.9_

  - [ ]* 2.1 Write unit tests for model relationships
    - Verify `Role::belongsToMany(TenantUser)` and `Role::belongsToMany(Permission)` are correctly typed
    - Verify `Process::hasMany(Phase)` and `Phase::hasMany(Action)` return correct related models using factories
    - _Requirements: 2.1–2.8_

- [ ] 3. Implement RBAC middleware
  - Create `app/Http/Middleware/CheckRole.php`:
    - Accept variadic `$roles` parameter
    - Load user's roles from tenant DB via `Auth::user()->roles()->pluck('name')`
    - If the user has any of the required roles, call `$next($request)`; else `abort(403)`
  - Create `app/Http/Middleware/CheckPermission.php`:
    - Accept variadic `$permissions` parameter
    - Load user's permissions from tenant DB via `Auth::user()->roles()->with('permissions')->get()->pluck('permissions.*.name')->flatten()`
    - If the user has any of the required permissions, call `$next($request)`; else `abort(403)`
  - Update `bootstrap/app.php` to register `CheckRole` as `role` and `CheckPermission` as `permission` middleware aliases
  - Update `HandleInertiaRequests::share()` to add `auth.roles` (array of role name strings) and `auth.permissions` (array of permission name strings) from the authenticated user's tenant relationships
  - _Requirements: 3.1–3.5_

  - [ ]* 3.1 Write property test for RBAC access control (Property 1)
    - **Property 1: RBAC Access Control Correctness**
    - Generate 100 TenantUsers with random subsets of roles/permissions using factories
    - For CheckRole: assert HTTP 200 iff user has required role, HTTP 403 otherwise
    - For CheckPermission: assert HTTP 200 iff user has permission via roles, HTTP 403 otherwise
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ] 4. Checkpoint — Run migrations and basic tests
  - Run `php artisan migrate --database=tenant --path=database/migrations/tenant` and confirm no errors
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement ProcessManagementController
  - Create `app/Http/Controllers/ProcessManagementController.php` with these methods:
    - `index()`: Load all `Process::with(['phases.actions'])->orderBy('id')->get()`, return Inertia `ProcessManagement` page
    - `storeProcess(Request $request)`: Validate `name` required, create `Process`
    - `updateProcess(Request $request, Process $process)`: Validate `name` required, update
    - `destroyProcess(Process $process)`: Delete child actions, child phases, then process
    - `storePhase(Request $request, Process $process)`: Validate `name` required, create `Phase` with `order = $process->phases()->max('order') + 1`
    - `updatePhase(Request $request, Phase $phase)`: Validate `name` required, update
    - `destroyPhase(Phase $phase)`: Delete child actions, then phase
    - `reorderPhases(Request $request, Process $process)`: Validate `order` array, update each phase's `order` to its 1-indexed position in the array
    - `storeAction(Request $request, Phase $phase)`: Validate `name` required, create `Action` with `order = $phase->actions()->max('order') + 1`
    - `updateAction(Request $request, Action $action)`: Validate `name` required, update
    - `destroyAction(Action $action)`: Delete action
    - `reorderActions(Request $request, Phase $phase)`: Validate `order` array, update each action's `order`
  - _Requirements: 4.1–4.12_

  - [ ]* 5.1 Write property test for phase reorder (Property 2)
    - **Property 2: Phase Reorder Consistency**
    - Generate a Process with 2–10 Phases; shuffle Phase IDs 100 times
    - POST each shuffle to `reorderPhases`; assert each Phase's `order` equals its 1-indexed position in the submitted array
    - **Validates: Requirements 4.11**

  - [ ]* 5.2 Write property test for action reorder (Property 3)
    - **Property 3: Action Reorder Consistency**
    - Same approach as Property 2 but for Actions within a Phase
    - **Validates: Requirements 4.12**

  - [ ]* 5.3 Write unit tests for ProcessManagementController
    - Test cascade delete of Process removes all phases and actions
    - Test cascade delete of Phase removes all actions
    - Test storePhase assigns correct `order` value
    - _Requirements: 4.3, 4.8, 4.9_

- [ ] 6. Implement DocumentManagementController
  - Create `app/Http/Controllers/DocumentManagementController.php`:
    - `index()`: Load all `Document::all()`, return Inertia `DocumentManagement` page
    - `store(Request $request)`: Validate `file` (required, file), `label` (in: `form,doc`); store file via `$request->file('file')->store('documents')`; create `Document` record with `name`, `file_path`, `file_type`, `label`
    - `download(Document $document)`: Check `Storage::disk('local')->exists($document->file_path)`; if not, `abort(404)`; return `Storage::disk('local')->download($document->file_path, $document->name)`
    - `destroy(Document $document)`: Delete file via `Storage::disk('local')->delete($document->file_path)`; delete document record
  - _Requirements: 5.1–5.7_

  - [ ]* 6.1 Write integration tests for document management
    - Test upload creates record and file exists on disk
    - Test download returns file content
    - Test download returns 404 when file missing
    - Test destroy removes record and file from disk
    - _Requirements: 5.1–5.5_

- [ ] 7. Implement Admin controllers
  - Create `app/Http/Controllers/Admin/UserManagementController.php`:
    - `index()`: Load `TenantUser::with('roles')->get()` and all `Role::all()`, return Inertia `Admin/Users` page
    - `store(Request $request)`: Validate `name`, `email` (unique:tenant.users), `password` (min:8), `roles` (array); create `TenantUser` with hashed password; sync roles via `$user->roles()->sync($request->roles)`
    - `update(Request $request, TenantUser $user)`: Validate `name`, `email`, `roles`; update user; sync roles
    - `destroy(TenantUser $user)`: If `$user->id === Auth::id()`, abort 403 with message; else detach roles and delete user
  - Create `app/Http/Controllers/Admin/RoleManagementController.php`:
    - `index()`: Load `Role::with('permissions')->get()` and `Permission::all()`, return Inertia `Admin/Roles` page
    - `store(Request $request)`: Validate `name`, `permissions` (array); create Role; attach permissions
    - `update(Request $request, Role $role)`: Validate `name`, `permissions`; update name; sync permissions via `$role->permissions()->sync($request->permissions)`
    - `destroy(Role $role)`: Detach permission_role and role_user, delete role
  - _Requirements: 6.1–6.6, 7.1–7.4_

  - [ ]* 7.1 Write property test for role permission sync (Property 4)
    - **Property 4: Role Permission Sync Exactness**
    - Create a Role and 5–10 Permissions; generate 100 random subsets of Permission IDs
    - For each subset, PUT to `roles/{role}` and assert `$role->fresh()->permissions->pluck('id')->sort()` equals submitted IDs sorted
    - **Validates: Requirements 7.3**

  - [ ]* 7.2 Write unit tests for admin controllers
    - Test self-deletion returns 403
    - Test user creation hashes password
    - Test role deletion detaches all pivots
    - _Requirements: 6.5, 6.2, 7.4_

- [ ] 8. Implement ProfileController (tenant-side)
  - Create or update `app/Http/Controllers/Settings/ProfileController.php` to handle tenant users:
    - `update(ProfileUpdateRequest $request)`: Update `TenantUser` `name`, `email`, `theme_color` in tenant DB; validate `theme_color` is one of the 13 valid values
    - `updatePassword(PasswordUpdateRequest $request)`: Verify current password; update hashed password in tenant DB; return Inertia redirect back
    - `destroy(ProfileDeleteRequest $request)`: Verify password; delete TenantUser from tenant DB; log out; redirect to home
  - Add `theme_color` validation rule: `in:zinc,slate,stone,gray,neutral,red,rose,orange,amber,yellow,lime,green,teal`
  - _Requirements: 8.1–8.6_

  - [ ]* 8.1 Write property test for theme color validity (Property 5)
    - **Property 5: Theme Color Validity**
    - For all 13 valid theme colors, submit a profile update and assert stored `theme_color` matches submitted value
    - Submit one invalid color and assert 422 validation error
    - **Validates: Requirements 8.5**

- [ ] 9. Register routes in web.php
  - Add to `routes/web.php` inside `auth` + `verified` middleware group:
    ```php
    // Process Management
    Route::controller(ProcessManagementController::class)->group(function () {
        Route::get('/processes', 'index')->name('processes.index');
        Route::post('/processes', 'storeProcess')->name('processes.store');
        Route::put('/processes/{process}', 'updateProcess')->name('processes.update');
        Route::delete('/processes/{process}', 'destroyProcess')->name('processes.destroy');
        Route::post('/processes/{process}/phases', 'storePhase')->name('phases.store');
        Route::put('/phases/{phase}', 'updatePhase')->name('phases.update');
        Route::delete('/phases/{phase}', 'destroyPhase')->name('phases.destroy');
        Route::post('/processes/{process}/phases/reorder', 'reorderPhases')->name('phases.reorder');
        Route::post('/phases/{phase}/actions', 'storeAction')->name('actions.store');
        Route::put('/actions/{action}', 'updateAction')->name('actions.update');
        Route::delete('/actions/{action}', 'destroyAction')->name('actions.destroy');
        Route::post('/phases/{phase}/actions/reorder', 'reorderActions')->name('actions.reorder');
    });

    // Document Management
    Route::controller(DocumentManagementController::class)->group(function () {
        Route::get('/documents', 'index')->name('documents.index');
        Route::post('/documents', 'store')->name('documents.store');
        Route::get('/documents/{document}/download', 'download')->name('documents.download');
        Route::delete('/documents/{document}', 'destroy')->name('documents.destroy');
    });

    // Admin (permission-gated)
    Route::middleware('permission:admin')->prefix('admin')->group(function () {
        Route::resource('users', Admin\UserManagementController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::resource('roles', Admin\RoleManagementController::class)->only(['index', 'store', 'update', 'destroy']);
    });
    ```
  - Run `php artisan wayfinder:generate` to regenerate typed route helpers
  - _Requirements: 11.1–11.6_

  - [ ]* 9.1 Write smoke tests for route registration
    - Assert `/processes`, `/documents`, `/admin/users`, `/admin/roles` routes exist
    - Assert `/admin/users` redirects unauthenticated requests
    - Assert `/admin/users` returns 403 for authenticated users without `admin` permission
    - _Requirements: 11.1–11.6_

- [ ] 10. Create frontend constants and base JSX setup
  - Create `resources/js/constants/workflowConstants.js`:
    - Export `AVAILABLE_ROLES`, `THEME_COLORS` (13 values), `DOCUMENT_LABELS`
  - Update `resources/js/app.tsx` to ensure Sonner `<Toaster />` is mounted at the app root (inside `createInertiaApp` render)
  - _Requirements: 10.1–10.7_

- [ ] 11. Create AuthenticatedLayout and GuestLayout JSX
  - Create `resources/js/layouts/AuthenticatedLayout.jsx`:
    - Import `usePage` from `@inertiajs/react` to read `auth.permissions`
    - Render sidebar with nav links: Dashboard, Process Management (`/processes`), Document Management (`/documents`)
    - Conditionally render Admin nav section (Users, Roles) when `auth.permissions` includes `'admin'`
    - Display authenticated user name in sidebar footer with logout button
    - Apply `theme_color` CSS class from `auth.user.theme_color` to the layout root element
    - Accept `children` prop for page content
  - Create `resources/js/layouts/GuestLayout.jsx`:
    - Render a centered card layout for auth pages (login, register, password reset)
    - Accept `children` prop
  - _Requirements: 9.1–9.4_

- [ ] 12. Create reusable UI components
  - Create `resources/js/components/ProcessModal.jsx` — modal dialog (using `@radix-ui/react-dialog`) for create/edit Process with `name` and `description` fields
  - Create `resources/js/components/PhaseModal.jsx` — modal for create/edit Phase with `name` field
  - Create `resources/js/components/ActionModal.jsx` — modal for create/edit Action with `name` and `description` fields
  - Create `resources/js/components/PhaseComponent.jsx` — renders a Phase row with expand/collapse toggle, add/edit/delete/reorder controls, and renders child `ActionComponent` items
  - Create `resources/js/components/ActionComponent.jsx` — renders an Action row with edit/delete/reorder controls
  - Create `resources/js/components/DocumentUploadModal.jsx` — modal with file input and label selector (`form` / `doc`)
  - Create `resources/js/components/UserModal.jsx` — modal for create/edit TenantUser with name, email, password (optional on edit), and role multi-select
  - Create `resources/js/components/RoleModal.jsx` — modal for create/edit Role with name and permission multi-select checkboxes
  - _Requirements: 10.1–10.4_

- [ ] 13. Create ProcessManagement page
  - Create `resources/js/pages/ProcessManagement.jsx`:
    - Accept `processes` prop (array of processes with nested phases and actions)
    - Render list of Processes; each expandable to show Phase list via `PhaseComponent`
    - "Add Process" button opens `ProcessModal`
    - Edit/Delete buttons on each Process row open respective modals or confirm-delete
    - Drag handles for phase/action reordering (use HTML5 drag-and-drop or simple up/down buttons)
    - Use `useForm` from `@inertiajs/react` for all mutations
    - On success, call `toast.success(...)` from Sonner
    - On error, display `$page.props.errors` inline
    - Use `AuthenticatedLayout` as layout wrapper
  - _Requirements: 10.1, 10.6, 10.7_

- [ ] 14. Create DocumentManagement page
  - Create `resources/js/pages/DocumentManagement.jsx`:
    - Accept `documents` prop (array of document records)
    - Render documents in a table: columns for name, label, file type, actions (Download, Delete)
    - "Upload Document" button opens `DocumentUploadModal`
    - Download action links to `/documents/{id}/download`
    - Delete action uses `router.delete()` with confirmation
    - On success, call `toast.success(...)` from Sonner
    - Use `AuthenticatedLayout` as layout wrapper
  - _Requirements: 10.2, 10.6, 10.7_

- [ ] 15. Create Admin pages
  - Create `resources/js/pages/Admin/Users.jsx`:
    - Accept `users` prop (with roles) and `roles` prop (all available roles)
    - Render users table with name, email, roles columns and Edit/Delete actions
    - "Add User" button opens `UserModal`
    - Edit opens `UserModal` pre-populated
    - Delete calls `router.delete()` with confirmation
    - On success, `toast.success(...)`
    - Use `AuthenticatedLayout`
  - Create `resources/js/pages/Admin/Roles.jsx`:
    - Accept `roles` prop (with permissions) and `permissions` prop (all available permissions)
    - Render roles table with name, permissions columns and Edit/Delete actions
    - "Add Role" button opens `RoleModal`
    - Edit opens `RoleModal` pre-populated
    - On success, `toast.success(...)`
    - Use `AuthenticatedLayout`
  - _Requirements: 10.3, 10.4, 10.6, 10.7_

- [ ] 16. Create/update Profile page and Dashboard page
  - Update `resources/js/pages/settings/` or create `resources/js/pages/Profile/Edit.jsx`:
    - Form for name, email, theme_color (13 color swatches rendered from `THEME_COLORS` constant)
    - Form for password change (current password, new password, confirm)
    - Danger zone: Delete account button with confirmation
    - On success, `toast.success(...)`
  - Update `resources/js/pages/dashboard.tsx` (rename to `Dashboard.jsx` or update in place):
    - Welcome message with user's name
    - Navigation cards to Process Management and Document Management
    - Use `AuthenticatedLayout`
  - _Requirements: 10.5, 8.1–8.6_

- [ ] 17. Checkpoint — Full integration verification
  - Run `php artisan test` and confirm all tests pass
  - Run `npm run build` and confirm no TypeScript/ESLint errors
  - Manually verify: login → dashboard → process management → document upload → admin panel → profile update
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All PHP backend tasks are tested with Pest (existing test framework in the project)
- All frontend files use `.jsx` extension (not `.tsx`) to match the sample app and avoid full TypeScript migration
- The existing `auth/` pages (login, register, forgot-password, reset-password) are kept as-is; they already work via Fortify
- The existing superadmin `User` model (`app/Models/User.php`) is NOT modified — it stays on the default connection
- Cascade deletes in controllers use explicit PHP loops rather than DB `ON DELETE CASCADE` for SQLite compatibility
- Document files are stored via Laravel's `Storage::disk('local')` — no public disk needed for downloads
- Run `php artisan wayfinder:generate` after adding new routes to regenerate typed route helpers
