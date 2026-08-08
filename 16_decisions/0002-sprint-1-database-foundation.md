# ADR-0002: Sprint-1 Database Foundation Architecture

- Status: Approved
- Date: 2026-08-08
- Decision owner: Product Owner

## Context

Sprint-1 requires an agreed database foundation before implementation begins.
The database design documentation defines enterprise-wide requirements, while
Sprint-1 deliberately establishes only the foundations and the minimum
end-to-end business flow needed for a safe initial release.

## Decision

### Sprint-1 scope

Sprint-1 delivers the database foundation and the minimum supported business
flow:

Client -> Booking -> Invoice -> Payment.

Sprint-1 includes PostgreSQL and Prisma baseline configuration, migrations,
seed strategy, companies, branches, configurable RBAC, user-role assignments,
centralized master data, company and branch isolation, the archive standard,
minimal clients, bookings, invoices, payments, core activity and audit logging,
and the required constraints and indexes.

### Branch model

Every branch-owned transactional record must contain a mandatory `branch_id`.

Clients use a different model: each client has a mandatory
`primary_branch_id`, and `client_branches` records provide shared-branch
access.

### RBAC

Users may have multiple roles through a `user_roles` assignment table. A
primary or default role may be retained where useful, but it must not replace
role assignments.

Roles, permissions, role permissions, and scope assignments remain
database-configurable. Role names must never be used as hardcoded
authorization checks.

### Archive standard

Business records use the following archive fields:

- `is_active`
- `archived_at`
- `archived_by_id`
- `archived_reason`

Normal business archiving does not create physical archive-copy tables.

### Company isolation

Critical relationships use company-aware compound foreign keys or constraints.
Backend validation must also enforce company boundaries. PostgreSQL Row Level
Security is a future defense layer and is not part of Sprint-1.

### Master data

Configurable business values, including statuses and payment modes, use the
centralized `master_data` approach. Configurable business values must not be
represented by unrestricted hardcoded strings.

### PostgreSQL physical schemas

Sprint-1 uses these physical PostgreSQL schemas:

- `master`
- `transaction`
- `audit`
- `system`

Physical `reporting` and `archive` schemas are deferred.

### Deferred work

Sprint-1 defers HR, attendance, leave, payroll, equipment and inventory, full
accounting and ledgers, advanced CRM automation, reporting and materialized
views, dedicated archive tables, RLS, partitioning, replication, advanced
backup automation, and other advanced infrastructure.

## Consequences

- All Sprint-1 transactional models must be designed with mandatory branch
  ownership where applicable.
- Client sharing across branches must be explicit through `client_branches`.
- Authorization and configurable business values remain data-driven.
- Company isolation is enforced both by the database design and backend
  validation.
- The Prisma schema, migrations, seeds, and application code must be updated
  in later approved implementation work to conform to this ADR.
- Deferred capabilities must not be introduced incidentally during Sprint-1
  implementation.
