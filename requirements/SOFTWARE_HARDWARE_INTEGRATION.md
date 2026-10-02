# Systems Engineering: Software Integration

## Purpose

These guidelines define the integration requirements for this Laravel and Inertia application. The current system integrates tenant and superadmin databases, configurable storage providers, document workflows, and process/action records. They support the integration lab, the Integration Demo presentation, and WPR 08: Integration Logs.

## Required Deliverables

- **Lab:** Integration unit testing and system-wide handshake logs.
- **Presentation:** Integration Demo.
- **WPR 08:** Integration Logs.

The deliverables should show that application components exchange valid requests and responses, transition through expected states, handle failures, and produce traceable logs. Physical-device integration should use the adapter boundary defined below if hardware is added later. Attach existing test results and logs when available; this document does not create or claim test execution.

## System Basis

### Application Stack

- Backend: Laravel application with controllers, Eloquent models, service providers, and Artisan operations.
- Frontend: Inertia with React pages and components.
- Central data: Superadmin database configured through the default Laravel connection.
- Tenant data: Tenant database configured through the dynamic `tenant` connection.
- File storage: Runtime-selected local or S3-compatible storage through `StorageConfig` and `StorageServiceProvider`.
- Operational workflows: Processes contain phases, phases contain actions, and actions can reference roles and documents.

### Current Integration Boundaries

| Boundary | Current implementation | Required evidence |
|---|---|---|
| Superadmin to tenant database | `SetupController` stores active configuration and applies the tenant connection | Connection, migration, and tenant-isolation logs |
| Settings to runtime storage | `StorageServiceProvider` loads the active `StorageConfig` and sets the default disk | Driver selection and configuration logs |
| Document upload to storage | `DocumentManagementController` writes files and persists their storage driver and path | Upload, read, failure, and cleanup records |
| Process management to tenant data | `ProcessManagementController` manages processes, phases, actions, roles, and documents | Request, validation, ordering, and persistence records |
| Future hardware adapter | Not currently implemented | Versioned protocol and handshake evidence before hardware use |

## 1. Define the Integration Contract

Before implementation, document:

- Device identity and supported models
- Firmware and protocol versions
- Electrical, mechanical, and environmental assumptions
- Transport layer and physical interface
- Message formats, units, ranges, and encoding
- Command, response, acknowledgment, and timeout behavior
- State transitions and permitted operations
- Failure behavior and recovery expectations

Treat the contract as versioned interface documentation. A device should not be considered compatible solely because a connection can be opened.

## 2. Establish Clear Ownership Boundaries

Assign responsibility for each concern:

| Concern | Owning layer | Required behavior |
|---|---|---|
| Database configuration | `SetupController`, database config models | Validate, activate, connect, and report failure |
| Storage configuration | `StorageController`, `StorageConfig`, `StorageServiceProvider` | Validate, test, activate, and apply the selected disk |
| Document persistence | `DocumentManagementController`, `Document` | Store the file, record its path and driver, and report failures |
| Workflow persistence | `ProcessManagementController`, process models | Validate relationships, preserve ordering, and persist changes |
| Request and response boundary | Laravel routes/controllers and Inertia pages | Validate input and return success or actionable errors |
| Future device adapter | [Adapter/service] | Isolate protocol, state, reconnect, and hardware-specific behavior |

Keep hardware-specific details behind an adapter or driver boundary so domain logic can be tested independently.

## 3. Communication and Timing

Document timing assumptions explicitly for both HTTP/database operations and any future device adapter:

- Polling interval: [Value]
- Command timeout: [Value]
- Device startup time: [Value]
- Heartbeat interval: [Value]
- Retry limit and backoff: [Policy]
- Maximum queue depth: [Value]
- Clock source and synchronization: [Method]

Application-specific values to record include:

- Database connection and migration timeout: [Value]
- Storage connection verification duration: [Value]
- Presigned upload URL lifetime: 10 minutes unless changed by configuration
- Upload completion callback timeout: [Value]
- Maximum accepted upload size: 10 MB unless changed by validation rules

Use monotonic time for elapsed-time and timeout calculations. Use synchronized wall-clock time for audit records, while recording timezone and clock quality where relevant.

## 4. Data Integrity and Validation

Every inbound and outbound message should be validated for:

- Message type and version
- Length and framing
- Required fields
- Numeric ranges and units
- Enumeration values
- Sequence or correlation identifiers
- Checksum, signature, or integrity marker
- Freshness and replay conditions

Reject invalid data deliberately and record a diagnostic reason without exposing secrets. Normalize units at the integration boundary and use one canonical unit internally.

## 5. State Management

Represent uncertain states explicitly. Recommended states include:

- Disconnected
- Connecting
- Connected but unverified
- Ready
- Busy
- Degraded
- Faulted
- Shutting down

State transitions should be caused by observable events, not inferred from UI appearance alone. Define which commands are valid in each state and what happens when state information is stale.

## 6. Failure Handling

Plan for failures in:

- Missing or invalid database configuration
- Tenant connection failure or migration failure
- Storage endpoint, bucket, or credential failure
- Upload rejection, incomplete upload, or storage write failure
- Duplicate form submission or repeated workflow update
- Invalid role, document, or action relationship
- Stale configuration after a runtime change
- Software process restart or unavailable dependency
- Future device restart, disconnect, or malformed message

Use bounded retries with backoff and clear escalation. Make commands idempotent where possible. For non-idempotent commands, use a unique command identifier and a durable acknowledgment strategy.

## 7. Safety and Protective Controls

For systems that can affect people, equipment, or regulated data:

- Define safe defaults on startup and communication loss.
- Enforce limits in the control layer, not only in the interface.
- Require explicit confirmation for hazardous or irreversible actions.
- Separate monitoring permissions from control permissions.
- Provide a physical or independently controlled stop mechanism where required.
- Record command origin, operator, timestamp, target, and result.
- Test fault behavior under controlled conditions before field use.

A software control must not be treated as the only safety mechanism when independent protection is required.

## 8. Security

- Authenticate devices and services where supported.
- Use encrypted transport for data that requires confidentiality or integrity.
- Rotate credentials and certificates according to policy.
- Store secrets outside source code and ordinary logs.
- Apply least privilege to service accounts and operator roles.
- Validate device identity before accepting commands.
- Record security-relevant connection and command events.
- Define behavior for expired credentials and certificate failures.

## 9. Observability and Diagnostics

Emit structured events for:

- Database configuration activation and connection results
- Tenant connection and migration results
- Storage configuration activation and driver selection
- Document upload start, completion, and failure
- Direct-upload URL creation and completion
- Process, phase, action, role, and document changes
- Validation failures, retries, and timeouts
- Future device connection, acknowledgment, and protocol failures

Include a correlation ID or error reference, authenticated user or tenant context, storage driver, software version, and event timestamp where available. Redact credentials, access keys, secret keys, file contents, and sensitive payloads.

### Required Handshake Traces

The integration log should make these application flows traceable:

1. User submits database or storage configuration.
2. Request validation succeeds or returns a named validation error.
3. Configuration is saved as active and prior configuration is deactivated.
4. Connection or storage verification succeeds or rolls back the new configuration.
5. Runtime configuration is applied to the tenant connection or default storage disk.
6. A document upload or workflow change completes and persists its record.
7. A failure returns an actionable response and records a reference for diagnosis.

## 10. Deployment and Maintenance

Document the deployment topology and operational dependencies:

- Service placement
- Network zones and firewall rules
- Device provisioning
- Configuration management
- Firmware update process
- Rollback process
- Backup and restore requirements
- Maintenance windows
- Compatibility matrix

Use staged rollout where practical: bench, integration environment, representative field environment, then production.

## 11. Integration Review Checklist

- [ ] Interface contract is versioned and approved.
- [ ] Units, ranges, timing, and state transitions are documented.
- [ ] Disconnect, restart, timeout, and malformed-message behavior is defined.
- [ ] Safe defaults and command limits are implemented at the correct layer.
- [ ] Secrets are excluded from code and logs.
- [ ] Observability supports diagnosis without direct device access.
- [ ] Compatibility with device and firmware versions is recorded.
- [ ] Upgrade and rollback procedures are documented.
- [ ] Relevant tests or field evidence are linked.

## 12. Evidence and Test References

When tests exist, record them here:

| Area | Test or report | Environment | Result | Follow-up |
|---|---|---|---|---|
| Database configuration handshake | [ID/path] | [Environment] | [Result] | [Action] |
| Storage configuration handshake | [ID/path] | [Environment] | [Result] | [Action] |
| Document upload and persistence | [ID/path] | [Environment] | [Result] | [Action] |
| Workflow persistence and relationships | [ID/path] | [Environment] | [Result] | [Action] |
| Failure recovery and error references | [ID/path] | [Environment] | [Result] | [Action] |

## 13. Integration Lab Record

Complete this section after the lab work exists:

- Test environment: [Application build, database, storage, network]
- Integration checks executed: [Identifiers or paths]
- Handshake scenarios: [Configuration, connection test, runtime apply, upload, persistence]
- Fault scenarios: [Invalid credentials, unavailable endpoint, timeout, rollback, restart]
- Results: [Summary or report reference]
- Open issues: [Issue identifiers]

## 14. Integration Demo Outline

The presentation should demonstrate, using a representative workflow:

1. System architecture and integration boundaries.
2. Database configuration and tenant-connection handshake.
3. Storage configuration and connection verification.
4. A document upload or process/action workflow with persisted records.
5. A system-wide event trace using error references and user or tenant context.
6. One controlled failure, rollback, and recovery behavior.
7. A summary of limitations and next validation steps.

## 15. WPR 08: Integration Logs

The WPR should include:

- Log format and event schema
- Software, database, storage, and hardware versions where applicable
- Time synchronization method
- Configuration, connection, and runtime-apply traces
- Upload, persistence, and acknowledgment traces
- Errors, retries, rollbacks, and disconnects
- Log retention and redaction rules
- Links to raw logs and analysis, when they exist
