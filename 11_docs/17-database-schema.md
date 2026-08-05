# Database Schema

## Document Information

| Item | Value |
|------|-------|
| Module | Database Schema |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

This document defines the core database schema for Dhara Photography ERP Pro V2.

All tables must use PostgreSQL and follow relational database best practices.

---

# Common Columns (All Business Tables)

| Column | Type |
|--------|------|
| id | BIGSERIAL PRIMARY KEY |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |
| created_by | BIGINT |
| updated_by | BIGINT |
| is_active | BOOLEAN |
| archived_at | TIMESTAMP NULL |

---

# users

- id
- full_name
- email
- mobile
- password_hash
- role_id
- status
- last_login

---

# roles

- id
- role_name
- description

---

# clients

- id
- client_code
- full_name
- mobile
- alternate_mobile
- email
- address
- city
- state
- pincode
- birth_date
- anniversary_date
- reference_by
- notes

---

# bookings

- id
- booking_number
- client_id (FK)
- package_id (FK)
- event_type_id (FK)
- event_date
- event_time
- venue
- total_amount
- discount
- gst_amount
- grand_total
- advance_amount
- balance_amount
- booking_status

---

# booking_services

- id
- booking_id (FK)
- service_id (FK)
- quantity
- rate
- amount

---

# booking_staff

- id
- booking_id (FK)
- staff_id (FK)
- role
- reporting_time

---

# booking_assets

- id
- booking_id (FK)
- asset_id (FK)
- issue_time
- return_time
- status

---

# packages

- id
- package_name
- description
- package_price
- status

---

# package_services

- id
- package_id (FK)
- service_id (FK)
- quantity

---

# services

- id
- service_name
- category
- unit
- default_rate
- gst_rate

---

# staff

- id
- employee_code
- full_name
- role_id (FK)
- mobile
- email
- joining_date
- salary
- status

---

# assets

- id
- asset_code
- asset_name
- category_id (FK)
- brand
- model
- serial_number
- purchase_date
- purchase_price
- warranty_end
- asset_status

---

# asset_issue

- id
- asset_id (FK)
- booking_id (FK)
- staff_id (FK)
- issue_date
- return_date

---

# asset_service_history

- id
- asset_id (FK)
- service_date
- vendor
- amount
- next_service_date

---

# invoices

- id
- invoice_number
- booking_id (FK)
- invoice_date
- total_amount
- gst_amount
- balance_amount

---

# payments

- id
- booking_id (FK)
- payment_date
- payment_mode_id (FK)
- amount
- reference_number

---

# expenses

- id
- expense_category_id (FK)
- booking_id (FK) NULL
- vendor
- amount
- expense_date
- notes

---

# reports_summary

Generated reporting cache.

---

# activity_logs

- id
- user_id
- module
- action
- record_id
- ip_address
- created_at

---

# Relationships

- One Client → Many Bookings
- One Booking → Many Services
- One Booking → Many Staff
- One Booking → Many Assets
- One Booking → Many Payments
- One Package → Many Services
- One Asset → Many Issue Records

---

# Indexes

Create indexes on:

- booking_number
- client_code
- mobile
- event_date
- asset_code
- serial_number
- invoice_number

---

# Business Rules

- Use Foreign Keys.
- No duplicate booking numbers.
- No duplicate asset codes.
- Archive instead of delete.
- Store timestamps on every business table.

---

# Future Scope

- Multi Branch Tables
- Audit Partitioning
- Database Versioning
- Read Replicas
- Warehouse Database

END OF DOCUMENT
