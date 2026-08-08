# ADR-0003: Phase 0 Foundation Architecture

- Status: Approved
- Date: 2026-08-08
- Decision owner: Product Owner

## Context

Phase 0 establishes the runnable foundation for Dhara Photography ERP Pro V2.
Prior documentation contained conflicting technology choices (NestJS vs Express,
BIGSERIAL vs UUID, archive field naming).

## Decision

### Approved technology stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite + TypeScript |
| Backend | NestJS |
| Database | PostgreSQL + Prisma |
| Authentication | JWT access + refresh tokens, database-driven RBAC |
| Primary keys | UUID |
| UI | Maroon + Gold luxury theme, dark sidebar |
| Deployment | Docker for local PostgreSQL; VPS/cloud deferred |

### Infrastructure scope (Phase 0)

- PostgreSQL via Docker Compose only.
- Redis, BullMQ, MinIO/S3, and WhatsApp integration are **deferred** until a real feature requires them.
- Architecture remains modular to add these services later without restructuring.

### Documentation conflict resolution

When documentation conflicts with this ADR, **this ADR takes precedence** for implementation.
Existing documentation is preserved; conflicts are resolved in favor of the decisions above.

### Database schema (Phase 0 foundation models)

Physical PostgreSQL schemas: `master`, `transaction`, `audit`, `system`.

Foundation models: Company, CompanyBranch, User, Role, Permission, RolePermission,
UserRole, MasterData, Client, ClientBranch, Booking, Invoice, Payment, AuditLog,
RefreshToken.

Archive standard per ADR-0002: `is_active`, `archived_at`, `archived_by_id`, `archived_reason`.

## Consequences

- All new code follows NestJS modular architecture with `/api/v1` REST endpoints.
- Prisma migrations are the sole method for database schema changes.
- Development seed credentials come from environment variables only.
- Phase 1 modules (Clients, Bookings, Invoices, Payments CRUD) build on this foundation.
