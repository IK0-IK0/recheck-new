# Internal Validation: Operational Check

## Purpose

This document defines the operational validation for the current Laravel and Inertia application. It is built around the real system architecture used in this project: superadmin database configuration, tenant database switching, storage driver activation, document upload and persistence, role-based access, and process/action workflow integrity.

The purpose of this operational check is not to claim that tests have already been executed. It is to define how the system should be validated when the lab run, log review, and readiness check are performed.

## 1. System Under Review

The operational check should consider the actual software components in this repository:

- Laravel backend with controllers, models, service providers, and middleware
- Inertia frontend with tenant pages and settings screens
- Superadmin database config and tenant database config logic
- Runtime tenant connection switching based on the active database configuration
- Storage configuration and runtime default-disk selection
- Document upload and persistence through `DocumentManagementController`
- Process, phase, action, role, and document relationships through `ProcessManagementController`
- Role-based authorization and user-scoped data separation

The validation scope should include both the normal user flows and the configuration paths that change system runtime behavior.

## 2. Operational Objectives

The internal validation should confirm that the system:

- starts cleanly and remains stable under normal operating load
- validates database configuration before activation and correctly handles failed connections
- activates the correct storage driver and writes/reads files through the active configuration
- preserves tenant isolation and prevents data leaks across users and institutional scopes
- supports document creation, saving, and retrieval without corrupting recorded paths or metadata
- maintains process, phase, and action integrity when workflow records are created or reordered
- logs operational events in a way that supports diagnosis and recovery

## 3. Controlled Lab Environment

The lab environment should reflect the real runtime configuration used by this application.

- Application stack: Laravel + Inertia
- Primary database: default Laravel database connection for superadmin configuration
- Tenant database: dynamic `tenant` connection configured at runtime
- Storage model: `StorageConfig` with runtime activation through `StorageServiceProvider`
- Document flow: upload through controller, store path and driver in document records
- Workflow structure: process > phase > action, with linked roles and documents
- Roles and permissions: tenant-scoped role checks and access boundaries
- Monitoring: application logs, storage validation messages, and request-level diagnostics

Record the exact environment used for each run, including the active database and storage driver, user role used, and any configuration changes between runs.

## 4. Validation Scenarios

### 4.1 Startup and Baseline Stability

Validate the application when it is started in a clean environment.

- application boots without blocking errors
- active database config loads correctly or reports a missing configuration
- storage config is resolved and default disk selection is set
- user sessions can authenticate and access tenant-scoped views
- asset and page loads remain stable with no obvious missing-config failures

### 4.2 Database Configuration Check

This is a core operational validation area because the project supports dynamic database configuration.

| Scenario | Expected outcome |
|---|---|
| Valid superadmin database config | Application accepts config and allows migration or setup operations |
| Valid tenant database config | Tenant connection is activated and data operations are routed correctly |
| Invalid host, credentials, or DB name | Save or activation fails cleanly and does not leave the system in a broken state |
| Repeated config changes | Previous active config is deactivated before the new one becomes active |
| Migration attempt against invalid config | Migration stops with a clear error and preserves an actionable trace |

### 4.3 Storage Configuration Check

This is another core requirement because file storage is dynamic and driver-dependent.

| Scenario | Expected outcome |
|---|---|
| Valid local storage config | Files save and retrieve correctly with the active local disk |
| Valid S3-compatible config | Driver is activated, bucket access is tested, and file write/read succeeds |
| Invalid endpoint or credentials | Connection test fails with clear error output and rollback is performed |
| Storage change between drivers | Runtime default disk switches without stale path confusion |
| Upload failure | Error is captured with a diagnostic reference and no silent partial success |

### 4.4 Document Workflow Check

Validate document operations through the actual document management flow.

- document upload stores file path and storage driver
- file upload can be completed through normal upload or direct-upload flow
- file metadata is written to the document record
- invalid or blocked uploads fail with actionable logs
- the system preserves the storage driver in the document record for later reads

### 4.5 Workflow and Process Integrity Check

The application contains process-driven operational rules. This check should validate:

- process creation and update behavior
- phase ordering and reorder logic
- action creation with required metadata
- role and document linkage for actions
- deletion or reordering behavior without broken references
- consistency of tenant-scoped data records

### 4.6 Permission and Isolation Check

This should verify that user access and tenant scope behave correctly.

- admin and tenant users are routed correctly
- role permissions are enforced consistently
- tenant-scoped records are not shown outside the correct tenant context
- invalid role or document assignment fails validation and is not persisted

## 5. Operational Check Procedure

1. Confirm the build, user role, environment, and active database/storage configuration.
2. Start the system in the controlled lab environment and collect startup logs.
3. Verify the active database configuration and tenant connection behavior.
4. Verify the active storage configuration and the default disk setting.
5. Execute representative document upload and retrieval operations.
6. Execute representative process, phase, and action changes.
7. Validate role-scoped permissions and tenant isolation.
8. Trigger a controlled failure or invalid configuration and record the response.
9. Confirm the system either rolls back or returns to a known-good state.
10. Preserve the raw logs and the final readiness record.

## 6. Operational Readiness Checklist

Use the checklist below during the lab run. Mark each item as Pass, Fail, Not Applicable, or Follow-up Required.

| Check | Expected condition | Evidence | Status |
|---|---|---|---|
| Startup | Application starts without launch-blocking failures | startup log, console output, route response | [Status] |
| Admin database config | Active superadmin configuration is valid and tested | config record, validation log | [Status] |
| Tenant DB config | Active tenant configuration is valid and applied to the `tenant` connection | active config record, migration log | [Status] |
| Storage config | Selected storage driver is active and applies to the app runtime | storage config record, disk selection log | [Status] |
| Document upload | Uploaded document persists with correct metadata and storage path | upload log, saved document record | [Status] |
| Document retrieval | File is readable from the active storage driver when appropriate | retrieval log or readback record | [Status] |
| Role permissions | User actions match allowed roles and tenant scope | access log, permission record | [Status] |
| Process workflow integrity | Process, phase, and action ordering remains consistent | workflow log, relationship record | [Status] |
| Recovery path | Failure conditions trigger rollback or error handling without silent state corruption | error log, recovery record | [Status] |
| Logging Quality | Operational changes and failures can be traced back to a user or configuration state | event log, correlation reference | [Status] |

### Operational Readiness Decision

- Decision: [Ready / Ready with conditions / Not ready]
- Conditions or restrictions: [Details]
- Blocking findings: [Issue IDs or references]
- Responsible approver: [Name and role]
- Decision date: [Date]

## 7. Performance and Stability Expectations

This operational check should capture the following where relevant:

- startup time and readiness time
- database validation time and migration time
- storage validation time and read/write completion time
- document upload completion time
- workflow update response time
- retry and failure counts
- system recovery time after invalid config or failed storage access
- degradation behavior when a storage or database dependency is unavailable

The measurements should be tracked against the current build and configuration. Any threshold should be recorded as part of the lab evidence rather than assumed.

## 8. Log Analysis Expectations

When logs exist, the review should confirm:

1. the configuration change was applied to the correct system boundary
2. the active tenant connection or storage driver matches the expected config
3. the upload or workflow action produced a valid operational result or a clear failure record
4. the failure is traceable to a specific request, user, or config change
5. the system recovered or rolled back without leaving stale state in place

The review must not treat an entry as proof of success unless it can be tied back to the correct run and the correct configuration state.

## 9. Findings and Follow-Up

| Finding | Evidence | Severity | Corrective action | Owner | Due date | Retest reference |
|---|---|---|---|---|---|---|
| [Finding] | [Log/report] | [Severity] | [Action] | [Name] | [Date] | [ID/path] |

## 10. WPR 09: Operational Check

The WPR should contain:

- the scope of the operational review
- the environment, build, and runtime configuration used in the lab
- the validation scenarios executed and the actual evidence collected
- the operational readiness checklist with each status recorded
- observations from database, storage, document, and workflow checks
- failure and recovery findings
- the final decision on operational readiness and any follow-up actions

## 11. Evidence Package

- [ ] Approved validation scope and scenario definitions
- [ ] Environment and configuration record
- [ ] Startup logs and route health evidence
- [ ] Database configuration and migration logs
- [ ] Storage driver validation and file read/write logs
- [ ] Document workflow logs and saved-record references
- [ ] Process and role validation records
- [ ] Recovery and rollback evidence
- [ ] WPR 09: Operational Check
- [ ] Final operational decision and approval