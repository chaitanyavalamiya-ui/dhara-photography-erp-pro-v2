# Booking Module

## Document Information

| Item | Value |
|------|-------|
| Module | Booking |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

Manage the complete booking lifecycle from enquiry to project completion, project lock and archive.

---

# Main Features

- Create Booking
- Edit Booking
- View Booking
- Booking Calendar
- Package Selection
- Extra Services
- Staff Assignment
- Equipment Assignment
- Payment Tracking
- Invoice Generation
- Project Timeline
- Project Lock
- Archive

---

# Booking Information

## Auto Generated

- Booking ID
- Booking Number
- Project Code

## Client Details

- Existing Client
- New Client
- Event Type
- Event Date
- Event Time
- Venue
- Google Map Link
- Contact Person

---

# Package

Package comes only from Package Master.

Fields:

- Package Name
- Package Price
- Included Services
- Included Deliverables

Manual package is allowed.

---

# Extra Services

Services come only from Service Master.

Examples

- Photography
- Videography
- Drone
- Reel
- Poster
- Calendar
- LED Wall
- Live Streaming
- Soft Copy
- Album Upgrade

System automatically recalculates the total amount.

---

# Amount Calculation

- Package Amount
- Extra Services
- Discount
- GST
- Grand Total
- Advance
- Balance

No hardcoded prices.

---

# Staff Assignment

Assign:

- Photographer
- Videographer
- Drone Operator
- Editor
- Album Designer
- Delivery Staff

Availability must be checked before assignment.

---

# Equipment Assignment

Assign available assets only.

Examples:

- Camera
- Lens
- Drone
- Battery
- Memory Card
- Light
- Gimbal
- Tripod
- Mic

Issue and Return history must be stored.

---

# Deliverables

- Album
- Mini Album
- Pendrive
- Soft Copy
- Poster
- Calendar
- Video
- Reel
- Other Items

---

# Payment

Support:

- Cash
- UPI
- Bank
- Card
- Cheque

Generate receipt for every payment.

---

# Booking Status

- Draft
- Confirmed
- Scheduled
- On Shoot
- Editing
- Album Design
- Printing
- Ready
- Delivered
- Locked
- Archived

---

# Timeline

Record every activity:

- Booking Created
- Payment Received
- Staff Assigned
- Equipment Issued
- Shoot Completed
- Editing Started
- Album Approved
- Delivered
- Locked

---

# Business Rules

- Booking requires Client.
- Package comes from Package Master.
- Services come from Service Master.
- Prices come from Settings.
- Equipment must be available.
- Staff schedule conflict not allowed.
- Booking cannot be deleted.
- Archive only.
- Project Lock requires:
  - 100% Payment
  - Delivery Complete
  - Owner Approval

---

# Validation Rules

- Event Date is mandatory.
- Client is mandatory.
- At least one package or service required.
- Advance cannot exceed Grand Total.
- Discount follows company policy.

---

# Dependencies

- Clients
- Settings
- Packages
- Services
- Staff
- Equipment
- Accounts
- Reports

---

# Used By

- Dashboard
- Calendar
- Accounts
- Reports
- CRM
- Analytics

---

# Future Scope

- Online Booking
- Client Portal
- AI Schedule Planning
- WhatsApp Confirmation
- GPS Event Location
- Digital Signature

END OF DOCUMENT
