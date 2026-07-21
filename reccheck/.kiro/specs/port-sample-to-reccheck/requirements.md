# Requirements Document

## Introduction

This document defines requirements for porting the sample `re-check-p2` Laravel application into the `reccheck` project. The `reccheck` project uses Laravel 13, Inertia v3, React 19, TypeScript, Tailwind v4, and a two-database architecture (superadmin SQLite + tenant SQLite). The port replaces Supabase file storage with local filesystem storage and removes all Supabase dependencies. The goal is a fully functional multi-tenant process and document management web application.

## Glossary

- **Superadmin_DB**: The default SQLite connection (`database/superadmin.sqlite`) used for superadmin logins, sessions, cache, and tenant connection configs.
- **Tenant_DB**: The tenant SQLite connection (`database/tenant.sqlite` in dev) used for all tenant user data, RBAC, processes, phases, actions, and documents.
- **Superadmin**: A user whose authentication and session data lives entirely in the Superadmin_DB. Never touches the Tenant_DB.
- **Tenant_User**: A user whose authentication is checked against the Superadmin_DB, but whose profile, roles, and app activity are stored in the Tenant_DB.
- **RBAC**: Role-based access control system using custom roles and permissions (no third-party package). Roles and permissions are tenant-scoped.
- **Process**: The top-level entity in the process hierarchy, owned by a tenant.
- **Phase**: A second-level entity belonging to a Process, with an orderable position.
- **Action**: A third-level entity belonging to a Phase, with an orderable position.
- **Document**: A file record stored in the Tenant_DB with metadata, and whose binary content is stored on the local filesystem.
- **Role**: A named set of permissions assigned to Tenant_Users.
- **Permission**: A named capability that gates access to specific functionality.
- **Theme_Color**: One of 13 preset color values assigned to a Tenant_User's profile.

---

## Requirements

### Requirement 1: Tenant Database Migrations

**User Story:** As a developer, I want tenant database migrations for all tenant-scoped tables, so that a new tenant database can be bootstrapped with the correct schema.

#### Acceptance Criteria

1. THE Migration_Runner SHALL create a `users` table in the Tenant_DB with columns: `id`, `name`, `email`, `email_verified_at`, `password`, `theme_color`, `remember_token`, `created_at`, `updated_at`.
2. THE Migration_Runner SHALL create a `roles` table in the Tenant_DB with columns: `id`, `name`, `created_at`, `updated_at`.
3. THE Migration_Runner SHALL create a `permissions` table in the Tenant_DB with columns: `id`, `name`, `created_at`, `updated_at`.
4. THE Migration_Runner SHALL create a `role_user` pivot table in the Tenant_DB with columns: `role_id`, `user_id`.
5. THE Migration_Runner SHALL create a `permission_role` pivot table in the Tenant_DB with columns: `permission_id`, `role_id`.
6. THE Migration_Runner SHALL create a `processes` table in the Tenant_DB with columns: `id`, `name`, `description`, `created_at`, `updated_at`.
7. THE Migration_Runner SHALL create a `phases` table in the Tenant_DB with columns: `id`, `process_id` (FK to processes), `name`, `order`, `created_at`, `updated_at`.
8. THE Migration_Runner SHALL create an `actions` table in the Tenant_DB with columns: `id`, `phase_id` (FK to phases), `name`, `description`, `order`, `created_at`, `updated_at`.
9. THE Migration_Runner SHALL create a `documents` table in the Tenant_DB with columns: `id`, `name`, `file_path`, `file_type`, `label`, `created_at`, `updated_at`.
10. WHEN the `theme_color` column is absent from an existing Tenant_DB `users` table, THE Migration_Runner SHALL add it with a default value of `'zinc'`.

---

### Requirement 2: Eloquent Models

**User Story:** As a developer, I want Eloquent models for all tenant entities, so that the application can interact with the Tenant_DB through a clean ORM layer.

#### Acceptance Criteria

1. THE `Role` model SHALL specify `protected $connection = 'tenant'` and define a `belongsToMany` relationship to `User` via `role_user`.
2. THE `Role` model SHALL define a `belongsToMany` relationship to `Permission` via `permission_role`.
3. THE `Permission` model SHALL specify `protected $connection = 'tenant'` and define a `belongsToMany` relationship to `Role` via `permission_role`.
4. THE `Process` model SHALL specify `protected $connection = 'tenant'` and define a `hasMany` relationship to `Phase`.
5. THE `Phase` model SHALL specify `protected $connection = 'tenant'`, define a `belongsTo` relationship to `Process`, and define a `hasMany` relationship to `Action`.
6. THE `Action` model SHALL specify `protected $connection = 'tenant'`, define a `belongsTo` relationship to `Phase`, and include `order` in its fillable attributes.
7. THE `Document` model SHALL specify `protected $connection = 'tenant'` and include `name`, `file_path`, `file_type`, `label` in its fillable attributes.
8. THE `TenantUser` model SHALL specify `protected $connection = 'tenant'`, include `theme_color` in its fillable attributes, and define `belongsToMany` relationship to `Role` via `role_user`.
9. WHEN the tenant `User` model is queried, THE `TenantUser` model SHALL return all tenant-scoped user data without touching the Superadmin_DB.

---

### Requirement 3: RBAC Middleware

**User Story:** As a system administrator, I want role and permission middleware, so that routes can be protected based on the authenticated user's roles and permissions.

#### Acceptance Criteria

1. WHEN a request is made to a role-protected route, THE `CheckRole` middleware SHALL verify that the authenticated Tenant_User has at least one of the required roles.
2. IF the authenticated Tenant_User does not have a required role, THEN THE `CheckRole` middleware SHALL abort the request with HTTP 403.
3. WHEN a request is made to a permission-protected route, THE `CheckPermission` middleware SHALL verify that the authenticated Tenant_User has at least one of the required permissions through their assigned roles.
4. IF the authenticated Tenant_User does not have a required permission, THEN THE `CheckPermission` middleware SHALL abort the request with HTTP 403.
5. THE `HandleInertiaRequests` middleware SHALL share the authenticated user's roles and permissions array with all Inertia responses so the frontend can gate UI elements.

---

### Requirement 4: Process Management

**User Story:** As a tenant user, I want to create, view, edit, and delete processes with phases and actions, so that I can manage structured workflows.

#### Acceptance Criteria

1. THE `ProcessManagementController` SHALL return all Processes with their nested Phases and Actions to the Inertia `ProcessManagement` page.
2. WHEN a user submits a valid process creation form, THE `ProcessManagementController` SHALL create a new Process record in the Tenant_DB and return updated data.
3. WHEN a user submits a valid phase creation form for an existing Process, THE `ProcessManagementController` SHALL create a new Phase record with the next available `order` value.
4. WHEN a user submits a valid action creation form for an existing Phase, THE `ProcessManagementController` SHALL create a new Action record with the next available `order` value.
5. WHEN a user submits a process edit form, THE `ProcessManagementController` SHALL update the matching Process record in the Tenant_DB.
6. WHEN a user submits a phase edit form, THE `ProcessManagementController` SHALL update the matching Phase record in the Tenant_DB.
7. WHEN a user submits an action edit form, THE `ProcessManagementController` SHALL update the matching Action record in the Tenant_DB.
8. WHEN a user requests deletion of a Process, THE `ProcessManagementController` SHALL delete the Process and cascade-delete its Phases and Actions from the Tenant_DB.
9. WHEN a user requests deletion of a Phase, THE `ProcessManagementController` SHALL delete the Phase and cascade-delete its Actions from the Tenant_DB.
10. WHEN a user requests deletion of an Action, THE `ProcessManagementController` SHALL delete the Action from the Tenant_DB.
11. WHEN a user submits a reorder request for Phases within a Process, THE `ProcessManagementController` SHALL update the `order` field of each Phase to match the submitted sequence.
12. WHEN a user submits a reorder request for Actions within a Phase, THE `ProcessManagementController` SHALL update the `order` field of each Action to match the submitted sequence.

---

### Requirement 5: Document Management

**User Story:** As a tenant user, I want to upload, view, download, and delete documents, so that I can manage files associated with the workflow.

#### Acceptance Criteria

1. WHEN a user uploads a file, THE `DocumentManagementController` SHALL store the file on the local filesystem and create a Document record in the Tenant_DB containing the file's name, stored path, MIME type, and label.
2. THE `DocumentManagementController` SHALL return all Document records to the Inertia `DocumentManagement` page.
3. WHEN a user requests a document download, THE `DocumentManagementController` SHALL serve the file as a download response using the stored `file_path`.
4. IF the file referenced by a Document record does not exist on the filesystem, THEN THE `DocumentManagementController` SHALL return an HTTP 404 response.
5. WHEN a user requests deletion of a Document, THE `DocumentManagementController` SHALL delete the file from the filesystem and remove the Document record from the Tenant_DB.
6. WHERE the label feature is enabled, THE `DocumentManagementController` SHALL accept a `label` value of either `'form'` or `'doc'` when creating a Document record.
7. THE `Document` model SHALL store `file_path` as the relative path under the `storage/app` directory.

---

### Requirement 6: Admin Panel — User Management

**User Story:** As an admin, I want to list, create, edit, and delete tenant users, so that I can manage who has access to the system.

#### Acceptance Criteria

1. THE `UserManagementController` SHALL return all Tenant_Users with their assigned roles to the Inertia `Admin/Users` page.
2. WHEN an admin submits a valid user creation form, THE `UserManagementController` SHALL create a new Tenant_User record in the Tenant_DB with a hashed password.
3. WHEN an admin submits a user edit form, THE `UserManagementController` SHALL update the matching Tenant_User's `name`, `email`, and assigned roles in the Tenant_DB.
4. WHEN an admin requests deletion of a Tenant_User, THE `UserManagementController` SHALL delete the Tenant_User record and detach all associated role_user records from the Tenant_DB.
5. IF an admin attempts to delete the currently authenticated user, THEN THE `UserManagementController` SHALL return an error response and not perform the deletion.
6. WHEN routes under `/admin` are accessed, THE Route_Group SHALL require the `admin` permission via the `CheckPermission` middleware.

---

### Requirement 7: Admin Panel — Role Management

**User Story:** As an admin, I want to list, create, edit, and delete roles with their permissions, so that I can control what each role can do.

#### Acceptance Criteria

1. THE `RoleManagementController` SHALL return all Roles with their assigned Permissions to the Inertia `Admin/Roles` page.
2. WHEN an admin submits a valid role creation form, THE `RoleManagementController` SHALL create a new Role record and attach the submitted Permission IDs via `permission_role` in the Tenant_DB.
3. WHEN an admin submits a role edit form, THE `RoleManagementController` SHALL update the Role's `name` and sync its Permission IDs via `permission_role` in the Tenant_DB.
4. WHEN an admin requests deletion of a Role, THE `RoleManagementController` SHALL delete the Role record and detach all associated permission_role and role_user records from the Tenant_DB.

---

### Requirement 8: Profile Management

**User Story:** As a tenant user, I want to update my profile, change my password, select a theme color, and delete my account, so that I can manage my personal settings.

#### Acceptance Criteria

1. WHEN a Tenant_User submits a valid profile update form, THE `ProfileController` SHALL update the `name`, `email`, and `theme_color` fields of the Tenant_User record in the Tenant_DB.
2. WHEN a Tenant_User submits a valid password change form, THE `ProfileController` SHALL verify the current password and update the hashed password in the Tenant_DB.
3. IF the submitted current password does not match the stored password, THEN THE `ProfileController` SHALL return a validation error without changing the password.
4. WHEN a Tenant_User requests account deletion, THE `ProfileController` SHALL delete the Tenant_User record and all associated data from the Tenant_DB, then log the user out.
5. THE `ProfileController` SHALL present 13 selectable `Theme_Color` options: `zinc`, `slate`, `stone`, `gray`, `neutral`, `red`, `rose`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`.
6. WHEN the `theme_color` is updated, THE `HandleInertiaRequests` middleware SHALL share the updated `theme_color` with subsequent Inertia responses.

---

### Requirement 9: Frontend Layouts and Navigation

**User Story:** As a tenant user, I want consistent authenticated and guest layouts with navigation, so that I can navigate between features.

#### Acceptance Criteria

1. THE `AuthenticatedLayout` SHALL render a sidebar navigation with links to Dashboard, Process Management, Document Management, and conditionally to Admin pages based on the user's permissions.
2. THE `AuthenticatedLayout` SHALL display the authenticated user's name and provide a logout action.
3. THE `GuestLayout` SHALL render a centered card layout suitable for login, registration, and password reset pages.
4. WHEN the authenticated user's `theme_color` changes, THE `AuthenticatedLayout` SHALL apply the corresponding Tailwind CSS color class to the layout.

---

### Requirement 10: Frontend Pages

**User Story:** As a tenant user, I want fully functional React pages for all features, so that I can interact with the application through the browser.

#### Acceptance Criteria

1. THE `ProcessManagement` page SHALL display all Processes with expandable Phase and Action trees, and provide controls to add, edit, delete, and reorder Phases and Actions.
2. THE `DocumentManagement` page SHALL display all Documents in a table with download and delete actions, and provide a file upload form with label selection.
3. THE `Admin/Users` page SHALL display all Tenant_Users in a table and provide controls to add, edit, and delete users with role assignment.
4. THE `Admin/Roles` page SHALL display all Roles in a table with their assigned Permissions, and provide controls to add, edit, and delete roles with permission assignment.
5. THE `Dashboard` page SHALL display a welcome message and summary navigation cards linking to Process Management and Document Management.
6. WHEN a server action succeeds, THE Page SHALL display a success toast notification using the Sonner library.
7. WHEN a server action fails with validation errors, THE Page SHALL display inline field-level error messages.

---

### Requirement 11: Route Configuration

**User Story:** As a developer, I want all application routes registered in `web.php`, so that the application's URL structure is well-defined and middleware-protected.

#### Acceptance Criteria

1. THE `Router` SHALL register routes for process management under `/processes` protected by the `auth` middleware.
2. THE `Router` SHALL register routes for document management under `/documents` protected by the `auth` middleware.
3. THE `Router` SHALL register routes for admin user management under `/admin/users` protected by the `auth` and `permission:admin` middleware.
4. THE `Router` SHALL register routes for admin role management under `/admin/roles` protected by the `auth` and `permission:admin` middleware.
5. THE `Router` SHALL register the `CheckRole` middleware under the alias `role` in `bootstrap/app.php`.
6. THE `Router` SHALL register the `CheckPermission` middleware under the alias `permission` in `bootstrap/app.php`.
