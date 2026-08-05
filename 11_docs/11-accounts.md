# Accounts Module

## Document Information

| Item | Value |
|------|-------|
| Module | Accounts |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

Manage all financial transactions of the studio including income, expenses, invoices, receipts, salaries and profit analysis.

---

# Main Features

- Income Management
- Expense Management
- Invoice Management
- Receipt Management
- Payment Tracking
- Salary Management
- Vendor Payments
- Cash Book
- Bank Accounts
- UPI Transactions
- Profit & Loss
- Financial Reports

---

# Income

Track:

- Booking Income
- Advance Payment
- Final Payment
- Extra Service Income
- Rental Income
- Other Income

Fields:

- Date
- Source
- Amount
- Payment Mode
- Booking Reference
- Notes

---

# Expenses

Categories:

- Salary
- Fuel
- Food
- Travel
- Equipment Purchase
- Equipment Repair
- Printing
- Office Expense
- Marketing
- Internet
- Electricity
- Miscellaneous

Store:

- Vendor
- Bill Number
- GST
- Amount
- Payment Status

---

# Invoice Management

Generate:

- Booking Invoice
- Tax Invoice
- Proforma Invoice

Invoice contains:

- Client
- Services
- Package
- GST
- Discount
- Total
- Balance

---

# Receipt Management

Generate receipt for every payment.

Receipt includes:

- Receipt Number
- Date
- Amount
- Payment Mode
- Booking Number

---

# Payment Modes

- Cash
- UPI
- Bank Transfer
- Card
- Cheque

---

# Salary Management

Track:

- Monthly Salary
- Freelancer Payment
- Advance
- Incentive
- Pending Salary

---

# Vendor Payments

Track:

- Vendor Name
- Purchase
- Repair
- Printing
- Outstanding Balance

---

# Cash & Bank

Maintain:

- Cash Book
- Bank Accounts
- Daily Closing
- UPI Collection

---

# Profit & Loss

Calculate:

- Total Income
- Total Expenses
- Gross Profit
- Net Profit
- Monthly Profit
- Yearly Profit

---

# Dashboard Widgets

- Today's Income
- Today's Expense
- Pending Payments
- Monthly Profit
- Cash Balance
- Bank Balance

---

# Reports

- Daily Income
- Daily Expense
- Monthly Income
- Monthly Expense
- Profit & Loss
- Outstanding Report
- GST Summary
- Salary Report
- Vendor Report

---

# Business Rules

- Every payment generates a receipt.
- Every booking is linked to accounts.
- Expenses require category.
- Income cannot be negative.
- Financial records cannot be permanently deleted.
- Archive only.

---

# Validation Rules

- Amount is mandatory.
- Payment mode is mandatory.
- Booking reference required for booking income.
- Receipt number auto-generated.

---

# Dependencies

- Booking
- Clients
- Staff
- Reports
- Dashboard
- Settings

---

# Future Scope

- GST Return Export
- TDS Support
- Accounting Software Integration
- Bank API Integration
- Auto Reconciliation
- Multi Company Accounts

END OF DOCUMENT
