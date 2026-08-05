# Equipment & Asset Management Module

## Document Information

| Item | Value |
|------|-------|
| Module | Equipment & Asset Management |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

Manage every physical asset owned, rented or borrowed by the studio.
Track complete lifecycle from purchase to retirement.

---

# Main Features

- Asset Register
- QR Code Support
- Equipment Issue
- Equipment Return
- Asset Inspection
- Repair Management
- Service Schedule
- Warranty Tracking
- Rental Assets
- Borrowed Assets
- Inventory Stock
- Purchase History
- Asset Reports

---

# Asset Categories

Owner can create unlimited categories.

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
- Desktop
- Printer
- Hard Disk
- SSD
- Camera Bag
- LED Wall
- Live Streaming Kit
- Other

---

# Asset Details

Each asset stores:

- Asset Code (Auto)
- Asset Name
- Category
- Brand
- Model
- Serial Number
- QR Code
- Purchase Date
- Purchase Price
- Vendor
- Warranty Start
- Warranty End
- Current Value
- Notes

---

# Ownership Type

- Own
- Rented
- Borrowed

Rental Details:

- Vendor
- Rent Per Day
- Deposit
- Return Date

---

# Asset Status

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

---

# Equipment Issue

Record:

- Booking
- Staff
- Issue Date
- Issue Time
- Issued By
- Expected Return

---

# Equipment Return

Record:

- Return Date
- Returned By
- Checked By
- Missing Items
- Damage Notes

---

# Inspection

Check:

- Physical Condition
- Cleaning Required
- Service Required
- Missing Accessories

---

# Service History

Store:

- Service Date
- Service Center
- Cost
- Description
- Next Service Date

---

# Consumables

Track stock for:

- AA Battery
- Cleaning Kit
- Tape
- Cable
- Memory Card Case
- Labels

Store:

- Current Stock
- Minimum Stock
- Reorder Level

---

# Dashboard

Show:

- Total Assets
- Available Assets
- On Shoot
- Under Repair
- Service Due
- Lost Assets
- Total Asset Value

---

# Reports

- Category Wise Assets
- Brand Wise Assets
- Purchase Year Report
- Service Cost Report
- Asset Usage Report
- Rental Report
- Missing Asset Report

---

# Business Rules

- Every asset has unique Asset Code.
- QR Code generated automatically.
- Only Available assets can be assigned.
- Every Issue requires Return.
- Every movement recorded.
- Assets cannot be permanently deleted.
- Retired assets remain searchable.

---

# Validation Rules

- Category required.
- Asset Name required.
- Duplicate Serial Number warning.
- Purchase Price cannot be negative.
- Return required before booking closure.

---

# Dependencies

- Settings
- Booking
- Staff
- Dashboard
- Reports

---

# Future Scope

- Barcode Scanner
- Mobile QR Scan
- GPS Tracking
- Asset Depreciation
- Insurance Tracking
- Vendor Portal

END OF DOCUMENT
