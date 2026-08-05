# Settings Module

## Document Information

| Item | Value |
|------|-------|
| Module | Settings |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

The Settings module controls all configurable data in the ERP.
No business value should be hardcoded.

---

# Company Settings

- Studio Name
- Logo
- Owner Name
- GST Number
- PAN Number
- Address
- Mobile
- WhatsApp
- Email
- Website
- Bank Details
- UPI QR
- Invoice Footer

---

# Event Master

- Wedding
- Pre Wedding
- Engagement
- Reception
- Birthday
- Baby Shower
- Corporate
- Other

Owner can add unlimited event types.

---

# Service Master

Each service contains:

- Service Name
- Category
- Unit
- Default Rate
- GST
- Status

Examples:
- Photography
- Videography
- Drone
- Reel
- Album
- Poster
- Calendar
- Live Streaming
- LED Wall

---

# Package Master

Package contains:

- Package Name
- Description
- Included Services
- Included Quantities
- Price
- Offer Price
- Status

---

# Equipment Categories

Examples:

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
- Hard Disk
- Printer

Owner can create unlimited categories.

---

# Asset Master

Each Asset stores:

- Asset Code
- Asset Name
- Category
- Brand
- Model
- Serial Number
- Purchase Date
- Purchase Price
- Warranty
- Vendor
- QR Code
- Current Status

Status:
- Available
- On Shoot
- Under Repair
- Borrowed
- Rented
- Lost
- Retired

---

# Staff Roles

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

Custom roles allowed.

---

# Payment Modes

- Cash
- UPI
- Bank
- Card
- Cheque

---

# Discount Policy

- Below ₹100000 → Manual Discount
- ₹100000 and Above → Maximum ₹5000
- Reason Required

---

# Reminder Templates

- Birthday
- Anniversary
- Payment Reminder
- Album Ready
- Delivery Reminder

---

# Backup Settings

- Local Backup
- External Backup
- Cloud Backup (Future)

---

# Global Rules

- No Hardcoded Values
- Everything editable from Settings
- Changes recorded in Activity Log
- Inactive records cannot be selected in new bookings

---

# Dependencies

- Booking
- Clients
- Accounts
- Equipment
- Reports

---

# Future Scope

- Multi Branch Settings
- Multi Currency
- Multi Language
- AI Configuration

END OF DOCUMENT
