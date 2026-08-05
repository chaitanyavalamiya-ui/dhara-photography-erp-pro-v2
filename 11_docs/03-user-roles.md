# User Roles & Permissions

## Document Information

| Item | Value |
|------|-------|
| Module | User Roles & Permissions |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

Define role-based access control (RBAC) for Dhara Photography ERP Pro V2.

Every user can access only the modules and actions permitted for their role.

---

# System Roles

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

Custom roles can be created from Settings.

---

# Owner

Full Access

Permissions:

- View All
- Create
- Edit
- Archive
- Lock Project
- Unlock Project
- Manage Settings
- Manage Users
- View Reports
- Export Reports
- Approve Discount
- View Accounts

---

# Manager

Permissions:

- Manage Bookings
- Assign Staff
- Assign Equipment
- View Reports
- Manage Clients
- Approve Daily Operations

Restrictions:

- Cannot Lock Projects
- Cannot Change Global Settings

---

# Reception

Permissions:

- Create Client
- Create Booking
- Generate Quotation
- Generate Invoice
- Receive Payments
- View Calendar

Restrictions:

- Cannot View Profit Reports
- Cannot Change Settings

---

# Photographer

Permissions:

- View Assigned Projects
- View Shoot Schedule
- View Assigned Equipment
- Update Shoot Status
- Upload Notes

Restrictions:

- No Accounts Access
- No Settings Access

---

# Videographer

Permissions:

- View Assigned Projects
- View Equipment
- Update Shoot Status

Restrictions:

- No Accounts
- No Reports

---

# Drone Operator

Permissions:

- View Assigned Shoots
- View Drone Equipment
- Update Assignment Status

Restrictions:

- No Financial Access

---

# Editor

Permissions:

- View Assigned Projects
- Update Editing Progress
- Upload Final Files
- Mark Editing Complete

Restrictions:

- Cannot Change Booking Details

---

# Album Designer

Permissions:

- View Selected Photos
- Upload Album Design
- Update Album Status

Restrictions:

- No Accounts Access

---

# Accountant

Permissions:

- Manage Payments
- Generate Receipts
- Manage Expenses
- Salary Management
- Financial Reports

Restrictions:

- Cannot Change Booking Package
- Cannot Modify Settings

---

# Delivery Staff

Permissions:

- View Delivery List
- Update Delivery Status
- Record Customer Acknowledgement

Restrictions:

- Read-only access to project details

---

# Permission Matrix

| Module | Owner | Manager | Reception | Photographer | Videographer | Editor | Accountant |
|--------|:-----:|:-------:|:----------:|:------------:|:------------:|:------:|:-----------:|
| Dashboard | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Clients | ✔ | ✔ | ✔ | View | View | View | View |
| Booking | ✔ | ✔ | ✔ | View | View | View | View |
| Equipment | ✔ | ✔ | View | Assigned | Assigned | No | View |
| Staff | ✔ | ✔ | View | No | No | No | View |
| Accounts | ✔ | View | Receive Payment | No | No | No | ✔ |
| Reports | ✔ | ✔ | Limited | No | No | No | Financial |
| Settings | ✔ | No | No | No | No | No | No |

---

# Business Rules

- Every user has exactly one primary role.
- Role permissions come from Settings.
- Activity Log records all important actions.
- Locked projects are read-only for everyone except Owner.
- Archived data cannot be edited.
- Password required for login.
- Owner can create custom roles.

---

# Security Rules

- Strong password policy.
- Session timeout.
- Role-based authorization.
- Audit log for login and critical actions.

---

# Dependencies

- Users
- Settings
- Booking
- Accounts
- Reports

---

# Future Scope

- Two-Factor Authentication
- Biometric Login
- Mobile App Roles
- Branch-wise Permissions
- Custom Permission Builder

END OF DOCUMENT
