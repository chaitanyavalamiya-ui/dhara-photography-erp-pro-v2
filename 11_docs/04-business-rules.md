# Business Rules

## Document Information

| Item | Value |
|------|-------|
| Module | Business Rules |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

This document defines the business rules that every module of Dhara Photography ERP Pro V2 must follow.

Business Rules have higher priority than implementation.

---

# Global Rules

- No Hardcoded Data.
- No Permanent Delete.
- Archive Instead of Delete.
- Every important action must be logged.
- All master data comes from Settings.
- Every project has a unique Project ID.
- Every client has a unique Client ID.

---

# Booking Rules

- Booking requires an existing or new Client.
- Booking Number is auto-generated.
- Event Date cannot be blank.
- Package comes from Package Master.
- Extra Services come from Service Master.
- Total Amount updates automatically.
- Booking cannot be locked before completion.

---

# Client Rules

- Duplicate mobile numbers should be warned.
- One client can have multiple bookings.
- Birthday and Anniversary can be stored.
- Client history must remain forever.

---

# Package Rules

- Packages are editable only from Package Master.
- Manual package allowed.
- Package price can be overridden only by authorized users.

---

# Service Rules

- Services come from Service Master.
- Service rates come from Settings.
- Quantity and unit determine total cost.

---

# Discount Rules

- Orders below ₹100000 allow manual discount.
- Orders ₹100000 and above allow maximum ₹5000 discount.
- Discount reason is mandatory.
- Owner approval required if policy changes in future.

---

# Staff Rules

- One staff can work on multiple projects if schedule does not conflict.
- Attendance and assignment history must be stored.
- Staff cannot be deleted if linked with completed projects.

---

# Equipment & Asset Rules

- Every asset has a unique Asset Code.
- Every asset belongs to a Category.
- Status:
  - Available
  - On Shoot
  - Under Repair
  - Borrowed
  - Rented
  - Lost
  - Retired
- Equipment can be assigned only if Available.
- Equipment issue and return must be recorded.
- QR Code support should be available.
- Purchase history must remain permanently.

---

# Inventory Rules

- Consumables support stock quantity.
- Minimum stock alert.
- Stock movement history maintained.

---

# Payment Rules

- Advance payment optional.
- Final payment required before Project Lock.
- Every payment generates receipt.
- Multiple payment modes supported.

---

# Project Lock Rules

Project can be locked only if:

- 100% Payment Completed
- Delivery Completed
- Owner Approval

Locked Project:

- Read Only
- Cannot Edit
- Cannot Delete
- Can be Archived

---

# Archive Rules

- Archive never deletes data.
- Archived projects remain searchable.
- Archive supports 10+ years of history.

---

# Reminder Rules

Automatic reminders:

- Birthday
- Anniversary
- Pending Payment
- Album Ready
- Delivery Reminder

---

# Security Rules

- Role Based Access Control.
- Owner has full access.
- Activity Log for critical actions.
- Password protected login.

---

# Audit Rules

Log:

- Login
- Booking Created
- Booking Updated
- Payment
- Equipment Issue
- Equipment Return
- Project Lock

---

# Future Rules

Architecture must support:

- Mobile App
- AI Assistant
- Cloud Backup
- Multi Branch
- Client Portal
- WhatsApp Integration

---

END OF DOCUMENT
