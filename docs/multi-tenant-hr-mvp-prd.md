# PeopleFlow HR - Multi-Tenant MVP Scope and User Journeys (v1)

Date: 2026-03-13
Issue: SAV-8

## 1. PRD-lite

### Product goal
Deliver a secure multi-tenant HR MVP that allows SMEs to onboard their company, manage employee records, and handle leave requests with manager approval.

### Target tenants (MVP)
- Tenant type A: Small business (20-100 employees), single legal entity.
- Tenant type B: Mid-size business (100-500 employees), simple department structure.

### Primary personas
- Tenant Admin (HR/Admin): configures tenant, invites users, manages directory data.
- Employee: updates profile and requests leave.
- Manager: reviews/approves leave for direct reports.

### In-scope capabilities (v1)
- Tenant onboarding and initial workspace setup.
- Employee directory CRUD within tenant boundaries.
- Leave request lifecycle (draft/submitted/cancelled).
- Manager approval workflow (approve/reject with reason).
- Audit events for critical actions.

### Out of scope (post-MVP)
- Payroll integration.
- Performance reviews and goals.
- Advanced org chart and matrix approvals.
- Multi-region data residency and SSO/SAML.

### Non-functional constraints (MVP)
- Strict tenant isolation in API and persistence.
- Role-based access control (Tenant Admin, Manager, Employee).
- Basic auditability for create/update/approval events.
- P95 API latency target under 500ms for common reads (directory list, leave list).

## 2. User journey map

### Journey A: Tenant onboarding (Admin)
1. Admin signs up and creates tenant workspace.
2. Admin enters company profile and default policies (basic leave policy).
3. Admin invites managers and employees by email.
4. Invitees accept and create accounts.
5. Tenant reaches ready state for day-to-day HR operations.

Success signal: Tenant can create first employee and submit first leave request in under 30 minutes.

### Journey B: Employee directory management (Admin)
1. Admin opens directory.
2. Admin adds employee with required profile fields.
3. Admin assigns manager relationship and department.
4. Admin edits/deactivates employee as needed.
5. Changes appear only within the same tenant workspace.

Success signal: Admin can add/update records without cross-tenant leakage.

### Journey C: Leave request (Employee)
1. Employee opens leave module.
2. Employee creates request with leave type, dates, note.
3. System validates balance/rules and submits request.
4. Employee tracks status updates.

Success signal: Employee gets deterministic status and timeline for every request.

### Journey D: Manager approval (Manager)
1. Manager receives pending request notification/inbox item.
2. Manager reviews dates and team context.
3. Manager approves or rejects with reason.
4. Employee receives decision.
5. Audit trail records actor, action, and timestamp.

Success signal: Approval decision is visible to both manager and employee with traceable history.

## 3. Tenant data ownership map

| Domain object | Tenant-scoped owner | Allowed roles | Isolation rule |
| --- | --- | --- | --- |
| Tenant profile | Tenant Admin | Tenant Admin | `tenant_id` must match auth context |
| User membership | Tenant Admin | Tenant Admin | no cross-tenant membership reads/writes |
| Employee record | Tenant Admin | Tenant Admin, Manager (read), Employee (self-read limited) | row-level filter by `tenant_id` |
| Department/team | Tenant Admin | Tenant Admin, Manager (read) | row-level filter by `tenant_id` |
| Leave request | Employee origin, Manager decision | Employee, Manager, Tenant Admin | row-level filter by `tenant_id` + relation checks |
| Approval decision | Manager | Manager, Tenant Admin, Employee (read own) | immutable history, tenant-bounded |
| Audit event | System (tenant-owned) | Tenant Admin (read) | append-only, tenant-bounded |

## 4. v1 acceptance criteria

### 4.1 Onboarding
- Given a new account, when Tenant Admin creates a workspace, then a unique `tenant_id` is generated.
- Given tenant setup completion, when Admin invites users, then invited users are bound to the same `tenant_id`.
- Given an authenticated user from another tenant, when accessing onboarding resources, then access is denied.

### 4.2 Employee directory
- Given Tenant Admin role, when creating/editing/deactivating employee records, then changes persist with the current `tenant_id`.
- Given Manager role, when listing directory, then only records from own tenant are visible.
- Given Employee role, when reading profile, then only own profile is accessible (unless elevated role).

### 4.3 Leave requests
- Given Employee role, when submitting valid leave dates, then request is created in `submitted` state.
- Given invalid payload (date overlap or invalid range), when submitting, then validation error is returned.
- Given existing requests, when listing, then employee sees only own tenant and permitted records.

### 4.4 Manager approvals
- Given Manager role and valid reporting relationship, when approving/rejecting request, then status changes accordingly and reason is stored.
- Given Employee role, when viewing request detail after decision, then final status and manager reason are visible.
- Given any approval action, when completed, then audit event is recorded with actor/time/action.

## 5. Delivery notes for next roadmap steps
- SAV-9 should formalize tenancy model decisions from this document into ADRs.
- SAV-10 should set CI/CD and environment defaults aligned with these acceptance criteria.
- SAV-11 should implement APIs and domain model exactly against these v1 scope boundaries.
