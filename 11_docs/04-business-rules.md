# Business Rules

## Document Information

| Item | Value |
|------|-------|
| Module | Business Rules |
| Version | 3.0 |
| Status | Final |
| Documentation Type | Codex Ready |
| Business Layer | Enterprise |
| Last Updated | August 2026 |

---

# Purpose

This document defines the mandatory business rules for Dhara Photography ERP Pro V2.

Business Rules have the highest priority.

Whenever business rules conflict with implementation, the business rules always take precedence.

No module may violate these rules.

---

# Objectives

The business rules should ensure

- Data Consistency
- Business Integrity
- Operational Accuracy
- Financial Accuracy
- Enterprise Scalability
- White Label Compatibility
- AI Readiness
- Mobile Compatibility
- Multi Branch Support

---

# Core Principles

Every module shall follow the following principles.

## Documentation First

Business rules must be finalized before development.

---

## No Hardcoded Business Data

The following data must never be hardcoded.

- Services
- Packages
- Event Types
- Staff Roles
- Equipment Categories
- Payment Modes
- Expense Categories
- GST
- Company Information

Everything comes from Settings.

---

## Archive Instead of Delete

Business records must never be permanently deleted.

Examples

- Client
- Booking
- Invoice
- Payment
- Expense
- Equipment
- Staff

Archive preserves historical records.

---

## Activity Logging

Every important business activity must be logged.

Examples

- Login
- Booking Created
- Booking Updated
- Payment Received
- Invoice Generated
- Equipment Assigned
- Equipment Returned
- Delivery Completed
- Settings Updated

---

## Unique Business Identity

Every major business object must have a unique identifier.

Examples

Client ID

Booking ID

Invoice Number

Expense Number

Equipment Code

Staff Code

Project Code

IDs must never be reused.

---

# Data Integrity Rules

The ERP must always maintain data integrity.

Rules

- Every Booking belongs to one Client.
- Every Invoice belongs to one Booking.
- Every Payment belongs to one Invoice.
- Every Expense belongs to one Category.
- Every Equipment belongs to one Category.
- Every Staff belongs to one Role.
- Every Gallery belongs to one Project.

Broken relationships are not allowed.

---

# Client Rules

A client may have

- Multiple Bookings
- Multiple Payments
- Multiple Events
- Multiple Invoices

Duplicate mobile numbers should generate warnings.

Client history must never be deleted.

Birthday and Anniversary should be stored.

Client relationship history should remain permanently available.

---

# Booking Rules

Booking requires

- Valid Client
- Event Type
- Event Date
- Package
- Assigned Staff
- Booking Status

Booking Number must be automatically generated.

Booking Status must follow predefined workflow.

Booking cannot be locked before completion.

---

# Booking Status Workflow

Every booking follows the workflow below.

Draft

↓

Confirmed

↓

Scheduled

↓

On Shoot

↓

Editing

↓

Album Design

↓

Printing

↓

Ready

↓

Delivered

↓

Locked

Status cannot skip mandatory business stages unless approved by Owner.

---

# Package Rules

Packages are managed only through Package Master.

Rules

- Packages are editable.
- Package prices come from Settings.
- Manual package is allowed.
- Package Override requires authorization.
- Package History should remain preserved.

---

# Service Rules

Services come only from Service Master.

Rules

- Editable from Settings.
- Default Rate comes from Settings.
- Quantity × Rate = Total.
- GST calculated automatically.
- Service History retained permanently.

---

# Pricing Rules

Every financial calculation should follow a standard sequence.

Base Amount

↓

Package Price

↓

Additional Services

↓

Discount

↓

GST

↓

Final Amount

Manual calculation is not permitted.

---

# Discount Rules

Below ₹100000

- Manual Discount Allowed

₹100000 and Above

- Maximum ₹5000 Discount

Discount Reason Mandatory.

Future versions may require Owner Approval for exceptional discounts.

---
# Staff Rules

Every staff member shall have a unique Staff ID.

Rules

- One staff member may work on multiple projects.
- Staff availability must be verified before assignment.
- Schedule conflicts are not permitted.
- Attendance history must be maintained.
- Assignment history must never be deleted.
- Staff cannot be permanently deleted.
- Archived staff records remain available for reporting.
- Freelancer assignments must be tracked separately.

---

# Equipment Rules

Every equipment item must have

- Unique Asset Code
- Category
- Purchase Date
- Current Status
- Assigned Branch
- Warranty Details
- Service Schedule

Equipment Status

- Available
- Reserved
- Assigned
- On Shoot
- Under Repair
- Service Due
- Borrowed
- Rented
- Lost
- Damaged
- Retired

Business Rules

- Only Available equipment may be assigned.
- One equipment item cannot be assigned to multiple projects at the same time.
- Equipment issue and return must be recorded.
- QR Code support is mandatory.
- Purchase history must never be removed.
- Maintenance history must remain permanent.

---

# Inventory Rules

Consumable inventory shall support

- Opening Stock
- Purchase
- Usage
- Adjustment
- Closing Stock

Business Rules

- Negative stock is not allowed.
- Minimum stock alerts must be generated.
- Every stock movement requires a transaction record.
- Stock history must remain permanent.

---

# Calendar Rules

Calendar scheduling must prevent conflicts.

Rules

- Double booking is not allowed.
- Staff availability must be checked.
- Equipment availability must be checked.
- Event dates cannot overlap for the same resources.
- Rescheduling must preserve history.
- Calendar updates generate notifications.

---

# Payment Rules

Payments may be received using

- Cash
- UPI
- Bank Transfer
- Card
- Cheque

Rules

- Advance payment is optional.
- Every payment generates a receipt.
- Partial payments are supported.
- Outstanding balance updates automatically.
- Duplicate payment entries are not allowed.
- Payment history is permanent.

---

# Invoice Rules

Invoices must be generated from bookings.

Rules

- Invoice Number is automatically generated.
- Invoice cannot exist without a booking.
- GST calculated automatically.
- Discounts follow company policy.
- Invoice history must never be deleted.
- PDF generation is mandatory.

---

# Delivery Rules

Projects may be delivered only after

- Editing completed
- Album approved (if applicable)
- Final payment completed
- Owner or Manager approval

Delivery Rules

- Delivery date recorded.
- Delivery proof uploaded.
- Customer signature stored.
- Delivery status updated automatically.

---

# Gallery Rules

Gallery management shall follow

- Project based organization.
- Client access only to assigned gallery.
- Download permission follows settings.
- Selection history maintained.
- Photo deletion requires authorization.
- Original files remain protected.

---

# CRM Rules

Customer relationship management shall support

- Lead Management
- Follow-up
- Reminder
- Customer Notes
- Communication History

Business Rules

- Every follow-up recorded.
- Reminder history retained.
- Customer interaction never deleted.

---

# Marketing Rules

Marketing module shall support

- Campaigns
- Referral Tracking
- Repeat Customers
- Promotions
- Festival Offers

Rules

- Campaign performance recorded.
- Referral rewards configurable.
- Marketing history maintained.

---

# Notification Rules

Notifications may be delivered using

- In-App
- WhatsApp
- SMS
- Email

Rules

- Booking Confirmation
- Payment Reminder
- Staff Assignment
- Equipment Assignment
- Editing Completed
- Album Ready
- Delivery Ready

Notification history must remain available.

---
# Project Lock Rules

A project may be locked only after all mandatory business conditions are satisfied.

Mandatory Conditions

- Final Payment Completed
- Delivery Completed
- Customer Approval (if required)
- Owner or Manager Approval
- No Pending Financial Transactions
- No Pending Equipment Return

Locked Project Rules

- Read Only
- Cannot Edit
- Cannot Delete
- Cannot Change Invoice
- Cannot Modify Payment
- Can Only Be Archived

Only Owner may unlock a locked project.

---

# Archive Rules

Archive preserves historical business records.

Rules

- Archive never deletes data.
- Archived records remain searchable.
- Archived records are excluded from active operations.
- Archived records support reporting.
- Archive history must remain permanently available.

Business records should support at least 10 years of history.

---

# Security Rules

All modules shall follow enterprise security standards.

Mandatory Rules

- Role Based Access Control (RBAC)
- Backend Permission Validation
- Secure Authentication
- Password Encryption
- Session Validation
- Activity Logging
- Device Tracking
- API Authorization

Security Rules

- Frontend permissions never replace backend validation.
- Unauthorized access attempts must be logged.
- Sensitive data must never be exposed without authorization.
- Critical operations require authenticated users.

---

# Audit Rules

Every important business event must generate an audit log.

Examples

- User Login
- User Logout
- Failed Login
- Booking Created
- Booking Updated
- Booking Cancelled
- Payment Received
- Invoice Generated
- Expense Recorded
- Equipment Assigned
- Equipment Returned
- Staff Assignment
- Delivery Completed
- Settings Updated
- Permission Changed

Audit records shall include

- User
- Date
- Time
- IP Address
- Device
- Action
- Module
- Record ID

Audit records cannot be modified.

---

# AI Business Rules

The AI Assistant is an advisory system.

Business Rules

- AI cannot modify business data directly.
- AI follows Role Based Access Control.
- AI recommendations require user confirmation.
- AI activity must be logged.
- AI cannot bypass approval workflow.
- AI respects company settings.

Examples

- Booking Suggestions
- Schedule Suggestions
- Expense Analysis
- Revenue Analysis
- Customer Follow-up Suggestions
- Marketing Suggestions

---

# Mobile Application Rules

The Mobile App shall follow the same business rules as the web application.

Rules

- Same Role Permissions
- Same Approval Workflow
- Secure Login
- Offline Synchronization (Future)
- Push Notifications
- Device Validation
- Secure Session Management

Mobile users must never receive permissions greater than the web application.

---

# Multi Branch Rules

Future versions shall support multiple business branches.

Rules

- Separate Branch Data
- Separate Staff Assignment
- Separate Equipment
- Separate Reports
- Separate Accounts
- Branch Level Permissions
- Global Reports for Owner

Branch users cannot access another branch unless authorized.

---

# White Label Rules

The ERP shall support deployment for multiple photography studios.

Each company may configure

- Company Name
- Logo
- Theme
- Packages
- Services
- Invoice Design
- Workflow
- Staff Roles
- Business Settings

No application code changes should be required.

---

# Reporting Rules

Reports must always use verified business data.

Rules

- Reports generated from approved records.
- Financial reports include only finalized transactions.
- Archived records appear only when requested.
- Export follows user permissions.
- Report history remains available.

Supported Formats

- PDF
- Excel
- CSV

---

# Backup & Recovery Rules

Business continuity is mandatory.

Rules

- Automatic Backup
- Manual Backup
- Backup Verification
- Restore Validation
- Backup History
- Recovery Testing

Backups should never overwrite previous backup files.

---
# Error Handling Rules

Every business operation must handle errors gracefully.

Rules

- Display user-friendly error messages.
- Never expose database or server errors to users.
- Validation errors must clearly identify the affected field.
- Failed transactions must automatically rollback.
- System errors must be recorded in Error Logs.
- Critical failures must notify the Administrator.

---

# Import & Export Rules

The ERP shall support secure import and export operations.

Import Rules

- Validate file format before processing.
- Reject duplicate records where applicable.
- Mandatory fields cannot be empty.
- Invalid records must be reported.
- Import history must be stored.

Export Rules

Supported Formats

- PDF
- Excel
- CSV

Business Rules

- Export permissions follow RBAC.
- Financial exports require authorization.
- Export activity must be logged.

---

# Settings Rules

All configurable business values must come from Settings.

Examples

- Services
- Packages
- GST
- Payment Modes
- Expense Categories
- Event Types
- Staff Roles
- Company Details

Business Rules

- Business settings cannot be hardcoded.
- Changes require appropriate permissions.
- Every change must be recorded in Activity Log.

---

# Relationship Rules

The ERP shall maintain valid business relationships.

Client

↓

Booking

↓

Invoice

↓

Payment

↓

Delivery

Rules

- Parent records must exist before child records.
- Orphan records are not allowed.
- Relationships cannot be broken manually.
- Archive preserves relationships.

---

# Workflow Rules

Every module shall follow a predefined workflow.

Booking Workflow

Draft

↓

Confirmed

↓

Scheduled

↓

On Shoot

↓

Editing

↓

Album Design

↓

Printing

↓

Ready

↓

Delivered

↓

Locked

Business Rules

- Mandatory stages cannot be skipped.
- Status changes require validation.
- Workflow history must remain permanent.

---

# Compliance Rules

The ERP should support statutory and business compliance.

Requirements

- GST Ready
- Financial Audit Support
- Historical Record Preservation
- Secure User Authentication
- Activity Logging
- Data Integrity
- Report Traceability

Future Compliance

- Multi Company
- Multi Currency
- Regional Tax Rules

---

# Performance Rules

Business operations should remain responsive.

Rules

- Dashboard should load optimized data.
- Reports should support filtering.
- Large datasets should use pagination.
- Background jobs should handle heavy processing.
- Frequently used master data should be cached.

---

# Future Scope

Future versions shall support

- AI Workflow Automation
- Customer Portal
- Vendor Portal
- Mobile Offline Mode
- Digital Signatures
- QR Based Attendance
- Online Payments
- WhatsApp Automation
- Cloud Synchronization
- Multi Branch
- Multi Company
- White Label Deployment
- Business Intelligence Dashboard
- Predictive Analytics

---

# Dependencies

This document applies to every ERP module.

- Authentication
- Users
- Settings
- Clients
- Booking
- Calendar
- Gallery
- Equipment
- Staff
- Accounts
- Reports
- CRM
- Tasks
- Notifications
- Vendors
- Marketing
- Mobile App
- AI Assistant

Every module must comply with these Business Rules.

---

# Review Status

Review Result

✅ Business Logic Reviewed

✅ Enterprise Rules Verified

✅ Data Integrity Verified

✅ Security Rules Verified

✅ Workflow Verified

✅ AI Ready

✅ Mobile Ready

✅ White Label Ready

✅ Multi Branch Ready

✅ Future Ready

---

# Final Approval

Status

FINAL APPROVED

Production Ready

Enterprise Ready

Codex Ready

No Further Review Required

---

END OF DOCUMENT