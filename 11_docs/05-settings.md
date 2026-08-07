# Settings Module

## Document Information

| Item | Value |
|------|-------|
| Module | Settings |
| Version | 3.0 |
| Status | Final |
| Documentation Type | Codex Ready |
| Configuration Type | Enterprise Master Settings |
| Last Updated | August 2026 |

---

# Purpose

The Settings Module is the central configuration hub of Dhara Photography ERP Pro V2.

Every configurable business value must be maintained through Settings.

Business logic must never depend on hardcoded values.

---

# Objectives

The Settings Module shall

- Centralize Business Configuration
- Eliminate Hardcoded Data
- Support White Label ERP
- Support Multi Branch
- Support Mobile Application
- Support AI Configuration
- Support Future Expansion
- Reduce Code Changes

---

# Core Principles

## No Hardcoded Values

The following data must never be hardcoded.

- Company Information
- Packages
- Services
- GST
- Payment Modes
- Staff Roles
- Event Types
- Equipment Categories
- Expense Categories
- Invoice Prefix
- Notification Templates

Everything must come from Settings.

---

## Editable Masters

Every master should support

- Create
- Edit
- Archive
- Restore
- Active / Inactive Status

Permanent deletion is not allowed.

---

## Activity Logging

Every configuration change must record

- User
- Date
- Time
- Module
- Previous Value
- New Value
- Device
- IP Address

---

# Company Settings

Store

- Studio Name
- Business Name
- Logo
- Invoice Logo
- Owner Name
- GST Number
- PAN Number
- Registration Number
- Address
- City
- State
- Country
- PIN Code
- Mobile Number
- WhatsApp Number
- Email Address
- Website
- Business Hours
- Financial Year
- Default Currency
- Default Time Zone

Bank Details

- Bank Name
- Account Name
- Account Number
- IFSC Code
- Branch
- UPI ID
- UPI QR Code

Invoice Details

- Invoice Prefix
- Invoice Footer
- Terms & Conditions
- Digital Signature
- Company Stamp

---

# Event Master

Default Events

- Wedding
- Pre Wedding
- Engagement
- Reception
- Birthday
- Baby Shower
- Maternity
- Corporate
- Product Shoot
- Fashion Shoot
- Other

Rules

- Unlimited event types.
- Editable by authorized users.
- Active / Inactive supported.
- Display order configurable.

---

# Service Master

Each service shall store

- Service Name
- Service Code
- Category
- Unit
- Default Rate
- GST Rate
- HSN / SAC Code
- Estimated Duration
- Online Booking Available
- Display Order
- Active Status

Examples

- Photography
- Videography
- Drone
- Reel
- Album
- Poster
- Calendar
- LED Wall
- Live Streaming
- Soft Copy

Rules

- Rates editable.
- GST configurable.
- Archive supported.
- No hardcoded prices.

---

# Package Master

Every package shall contain

- Package Name
- Package Code
- Category
- Description
- Included Services
- Included Deliverables
- Included Quantities
- Default Price
- Offer Price
- Validity
- Revision Policy
- Terms & Conditions
- Active Status

Rules

- Unlimited packages.
- Editable.
- Archive supported.
- Price history maintained.

---

# Discount Policy

Business Rules

Orders Below ₹100000

- Manual Discount Allowed

Orders ₹100000 and Above

- Maximum ₹5000 Discount

Discount Reason Mandatory.

Future

- Owner Approval
- Manager Approval
- Approval Workflow

---

# Payment Mode Master

Supported Modes

- Cash
- UPI
- Bank Transfer
- Credit Card
- Debit Card
- Cheque
- Online Gateway

Rules

- Unlimited payment modes.
- Active / Inactive support.
- Default payment mode configurable.

---
# Equipment Category Master

Default Categories

- Camera
- Lens
- Drone
- Battery
- Memory Card
- Light
- Flash
- Gimbal
- Tripod
- Mic
- Laptop
- Desktop
- Hard Disk
- SSD
- Printer
- Camera Bag
- Generator
- LED Screen
- Other

Rules

- Unlimited categories.
- Custom categories allowed.
- Active / Inactive support.
- Archive supported.
- Category history maintained.

---

# Asset Master

Every Asset shall store

General Information

- Asset Code
- Asset Name
- Category
- Brand
- Model
- Serial Number

Purchase Information

- Purchase Date
- Purchase Price
- Vendor
- Invoice Number
- Warranty Start
- Warranty End

Operational Information

- Branch
- Current Location
- QR Code
- Barcode
- Assigned Staff
- Assigned Project

Maintenance Information

- Last Service Date
- Next Service Date
- Service Reminder Days
- Maintenance Cost

Current Status

- Available
- Reserved
- On Shoot
- Under Repair
- Service Due
- Borrowed
- Rented
- Lost
- Damaged
- Retired

Rules

- Every asset has a unique Asset Code.
- QR Code generated automatically.
- Asset history is permanent.
- Service history maintained.
- Depreciation supported in future.

---

# Staff Role Master

Default Roles

- Owner
- Manager
- Reception
- Photographer
- Videographer
- Drone Operator
- Editor
- Album Designer
- Accountant
- Delivery Staff
- Freelancer

Future Roles

- Super Admin
- Branch Manager
- Customer Portal
- Vendor Portal

Rules

- Unlimited custom roles.
- Role permissions managed separately.
- Active / Inactive support.
- Archive supported.

---

# Expense Category Master

Default Categories

- Salary
- Travel
- Fuel
- Food
- Printing
- Equipment Purchase
- Equipment Repair
- Marketing
- Electricity
- Internet
- Office Expense
- Rent
- Software Subscription
- Miscellaneous

Rules

- Unlimited categories.
- Editable.
- Archive supported.
- Used in financial reports.

---

# Reminder Templates

Available Templates

- Birthday Reminder
- Anniversary Reminder
- Payment Reminder
- Album Ready
- Delivery Reminder
- Equipment Service Reminder
- Staff Birthday
- Project Deadline

Rules

- Fully editable.
- Supports variables.
- Multi-language ready.

---

# Notification Templates

Supported Channels

- In-App Notification
- WhatsApp
- SMS
- Email
- Push Notification

Templates

- Booking Confirmation
- Payment Received
- Payment Reminder
- Shoot Assigned
- Editing Assigned
- Album Ready
- Delivery Ready
- Equipment Assigned
- Equipment Returned

Rules

- Templates editable.
- Channel configurable.
- Active / Inactive support.

---

# Calendar Settings

Configuration

- Business Hours
- Weekly Off
- Public Holidays
- Booking Buffer Time
- Maximum Bookings Per Day
- Reminder Timing
- Time Zone

Rules

- Double booking prevention.
- Staff availability validation.
- Equipment availability validation.

---

# Invoice Settings

Configuration

- Invoice Prefix
- Invoice Number Format
- GST Display
- Digital Signature
- Company Stamp
- Footer Notes
- Terms & Conditions
- Payment Instructions

Rules

- Auto numbering.
- No duplicate invoice numbers.
- Editable template.

---

# Gallery Settings

Configuration

- Default Gallery Expiry
- Download Permission
- Watermark
- Image Quality
- Gallery Password
- Maximum Upload Size
- Client Selection Limit

Rules

- Gallery linked to Booking.
- Original images protected.
- Download controlled by settings.

---

# CRM Settings

Configuration

- Lead Sources
- Follow-up Status
- Customer Tags
- Priority Levels
- Reminder Frequency
- Sales Pipeline

Rules

- Unlimited lead sources.
- Custom tags supported.
- CRM history permanent.

---
# Backup Settings

Backup Types

- Manual Backup
- Automatic Backup
- Local Backup
- External Drive Backup
- Cloud Backup (Future)

Configuration

- Backup Frequency
- Backup Time
- Backup Retention Period
- Compression
- Encryption
- Backup Verification
- Restore Verification

Rules

- Automatic backups should never overwrite previous backups.
- Backup history must remain available.
- Backup logs must be recorded.
- Restore operation requires Owner permission.

---

# Security Settings

Authentication

- Password Policy
- Session Timeout
- Login Attempts
- Account Lock Duration
- Password Expiry
- Password History

Advanced Security

- Two Factor Authentication
- Device Authorization
- IP Whitelist
- Browser Validation
- Login Notifications
- Activity Log

Rules

- Security changes require Owner permission.
- Passwords must never be stored in plain text.
- Every failed login attempt must be logged.

---

# AI Configuration

Configuration

- AI Provider
- AI Model
- Default Prompt Library
- AI Language
- AI Response Style
- AI Logging
- AI Permission Level

Business Rules

- AI follows RBAC.
- AI cannot modify business data directly.
- AI suggestions require user confirmation.
- AI activity must be recorded.

Future

- AI Workflow Automation
- Predictive Analytics
- Smart Scheduling
- Revenue Forecasting

---

# Mobile Application Settings

Configuration

- Push Notifications
- Offline Mode
- Auto Sync
- Upload Quality
- Download Quality
- Image Compression
- Video Compression
- Session Timeout

Rules

- Mobile permissions follow RBAC.
- Device registration supported.
- Offline changes synchronize after reconnect.

---

# White Label Settings

Configuration

- Company Name
- Application Name
- Logo
- Splash Screen
- Login Screen
- Theme
- Color Palette
- App Icon
- Invoice Branding
- Email Branding
- WhatsApp Branding

Rules

- No source code changes required.
- Every company can maintain independent branding.

---

# Multi Branch Settings

Configuration

- Branch Master
- Branch Code
- Branch Prefix
- Branch Address
- Branch Contact
- Branch Manager
- Branch Working Hours

Rules

- Separate branch configuration.
- Branch level permissions.
- Branch specific numbering.
- Branch level reports.

---

# API & Integration Settings

Supported Integrations

- WhatsApp API
- SMS Gateway
- Email SMTP
- Payment Gateway
- Google Calendar
- Cloud Storage

Future

- DigiLocker
- eSign
- Accounting Software
- CRM Integration

Rules

- API Keys stored securely.
- Keys must never be hardcoded.
- Integration failures logged.

---

# Report Settings

Configuration

- Default Report Format
- Company Header
- Footer
- Watermark
- Page Size
- Date Format
- Currency Format

Supported Export

- PDF
- Excel
- CSV

Rules

- Report export follows user permissions.
- Financial reports require authorization.

---

# Dashboard Settings

Configuration

- Default Widgets
- Theme
- Home Screen Layout
- KPI Cards
- Quick Actions
- Recent Activities
- Notification Panel

Rules

- Dashboard customizable per role.
- Widget visibility controlled by permissions.

---

# User Preference Settings

Configuration

- Language
- Theme
- Date Format
- Time Format
- Currency
- Time Zone
- Default Landing Page
- Notification Preferences

Rules

- User preferences override defaults where permitted.
- Business settings remain controlled by administrators.

---
# System Configuration

The ERP shall provide centralized system configuration.

Configuration

- Application Name
- Version
- Environment
- Theme
- Language
- Date Format
- Time Format
- Time Zone
- Currency Format
- Financial Year
- Auto Number Formats
- Default Landing Module

Rules

- System configuration editable only by authorized users.
- Changes recorded in Activity Log.
- Changes become effective immediately unless restart is required.

---

# Validation Rules

Every Settings module shall validate data before saving.

General Validation

- Mandatory fields cannot be blank.
- Duplicate master records should be prevented.
- Invalid GST numbers rejected.
- Invalid PAN numbers rejected.
- Invalid Email addresses rejected.
- Invalid Mobile numbers rejected.
- Invalid URLs rejected.

Business Validation

- Inactive masters cannot be selected.
- Deleted references are not allowed.
- Settings changes must preserve data integrity.

---

# Global Business Rules

The Settings Module governs the complete ERP.

Mandatory Rules

- No Hardcoded Values.
- Everything configurable from Settings.
- Archive instead of Delete.
- Activity Log mandatory.
- Role Based Access Control applies.
- White Label Ready.
- Mobile Ready.
- AI Ready.
- Multi Branch Ready.

Settings become the single source of truth.

---

# Audit Rules

Every configuration change must generate an audit record.

Audit Fields

- User
- Role
- Date
- Time
- Module
- Previous Value
- New Value
- Device
- Browser
- IP Address

Audit logs cannot be modified or deleted.

---

# Dependencies

This module is used by every ERP module.

Dependent Modules

- Authentication
- User Roles
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
- Vendors
- Expenses
- Marketing
- Invoice
- Delivery
- Mobile App
- AI Assistant

No module should contain hardcoded business configuration.

---

# Performance Rules

Settings should be optimized.

Rules

- Frequently used masters cached.
- Lazy loading for large masters.
- Pagination for large datasets.
- Background processing for heavy operations.
- Fast lookup using indexed values.

---

# Compliance Rules

Settings must support

- GST Compliance
- Financial Audit
- Historical Records
- Business Traceability
- Secure Authentication
- Data Privacy
- Backup & Recovery

Future Compliance

- International Tax
- Multi Currency
- Regional Regulations

---

# Future Scope

Future versions shall support

- Multi Company
- Multi Branch
- White Label Marketplace
- AI Configuration Wizard
- AI Prompt Management
- AI Workflow Templates
- Plugin Marketplace
- API Marketplace
- Theme Marketplace
- Digital Signature Providers
- Cloud Backup Providers
- Business Intelligence Configuration
- Predictive Analytics Settings

---

# Review Status

Review Result

✅ Enterprise Configuration Reviewed

✅ Business Rules Verified

✅ Security Verified

✅ Validation Rules Verified

✅ White Label Ready

✅ AI Ready

✅ Mobile Ready

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