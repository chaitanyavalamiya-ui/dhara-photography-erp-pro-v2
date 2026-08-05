# Database Design

## Document Information

| Item | Value |
|------|-------|
| Module | Database Design |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

This document defines the database architecture for Dhara Photography ERP Pro V2.

The database must support long-term storage, high performance, scalability and zero hardcoded business data.

---

# Database Engine

- PostgreSQL
- UTF-8 Encoding
- UUID / BigInt Primary Keys
- Timestamp Audit Fields

---

# Database Principles

- No Hardcoded Data
- Master / Transaction Separation
- Archive Instead of Delete
- Activity Log for Important Actions
- Foreign Keys for Relationships
- Soft Delete (IsActive / Archived)

---

# Master Tables

- company_settings
- event_types
- services
- packages
- package_services
- equipment_categories
- assets
- asset_brands
- staff_roles
- users
- payment_modes
- expense_categories
- reminder_templates

---

# Transaction Tables

- clients
- bookings
- booking_services
- booking_staff
- booking_assets
- booking_deliverables
- invoices
- receipts
- payments
- expenses
- attendance
- asset_issue
- asset_return
- asset_service_history
- inventory_stock
- crm_followups

---

# Reporting Tables

- dashboard_cache
- monthly_summary
- yearly_summary

---

# Audit Tables

- activity_logs
- login_logs
- error_logs

---

# Archive Tables

- archived_bookings
- archived_clients
- archived_invoices

---

# Common Columns

Every table should contain:

- id
- created_at
- updated_at
- created_by
- updated_by
- is_active

Business tables should also support:

- archived_at
- archived_by

---

# Relationships

Client
→ Many Bookings

Booking
→ Many Services

Booking
→ Many Staff

Booking
→ Many Assets

Booking
→ Many Payments

Booking
→ One Invoice

Asset
→ Many Issue Records

Staff
→ Many Assignments

---

# Index Strategy

Create indexes on:

- booking_number
- mobile_number
- event_date
- payment_status
- asset_code
- serial_number

---

# File Storage

Store references for:

- Photos
- Videos
- Invoices
- Contracts
- Client Documents

Do not store binary media inside database.

---

# Backup Strategy

- Daily Backup
- Weekly Full Backup
- Monthly Archive Backup
- Restore Verification

---

# Security Rules

- Role Based Access
- Encrypted Passwords
- Audit Logging
- Database Backup Protection

---

# Performance Rules

- Use pagination
- Use indexes
- Avoid duplicate data
- Normalize master data

---

# Dependencies

- Settings
- Booking
- Clients
- Staff
- Equipment
- Accounts
- Reports

---

# Future Scope

- Database Partitioning
- Read Replicas
- Cloud Database
- Multi Branch Support
- API Optimization

END OF DOCUMENT
