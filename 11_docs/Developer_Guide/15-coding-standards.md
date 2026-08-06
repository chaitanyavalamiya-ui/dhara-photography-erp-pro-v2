# Coding Standards

## Document Information

| Item | Value |
|------|-------|
| Module | Coding Standards |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

This document defines the coding standards for Dhara Photography ERP Pro V2.

Every developer and AI coding assistant (Codex) must follow these standards.

---

# General Principles

- Clean Code
- Modular Architecture
- Reusable Components
- No Hardcoded Data
- Configuration Driven Development
- Readable Code
- Consistent Naming
- Production Ready Quality

---

# Frontend Standards

Technology

- React
- Vite
- JavaScript (ES6+)

Rules

- One component = One responsibility.
- Reusable UI components.
- No duplicate code.
- API calls only through service layer.
- No business logic inside UI components.

---

# Backend Standards

Technology

- Node.js
- Express.js
- PostgreSQL

Rules

- Controller → Service → Repository pattern.
- Validation before database operations.
- Standard API responses.
- Proper error handling.

---

# Database Standards

- PostgreSQL
- Foreign Keys
- Index frequently searched fields.
- Soft Delete (Archive).
- No duplicate master data.
- created_at and updated_at in all business tables.

---

# Folder Naming

- lowercase
- kebab-case for folders
- PascalCase for React Components
- camelCase for variables/functions

Examples

- booking-service.js
- ClientCard.jsx
- calculateTotal()

---

# File Naming

Pages

- Booking.jsx
- Clients.jsx

Components

- ClientTable.jsx
- PackageCard.jsx

Services

- bookingService.js
- clientService.js

---

# UI Standards

- Responsive Layout
- Dark Theme
- Consistent Spacing
- Premium Design
- Reusable Buttons
- Reusable Tables
- Reusable Forms
- Loading States
- Error Messages

---

# API Standards

- REST API
- JSON Request/Response
- JWT Authentication
- Role Based Authorization
- Versioned APIs (/api/v1)

---

# Git Standards

Branch Naming

- feature/module-name
- fix/issue-name
- docs/update

Commit Examples

- feat: booking module
- fix: payment calculation
- docs: update business rules

---

# Error Handling

- User-friendly messages
- Log server errors
- Never expose sensitive information

---

# Security Standards

- Password hashing
- JWT authentication
- Role-based access
- Input validation
- SQL Injection protection
- XSS protection

---

# Performance Standards

- Lazy loading
- Pagination
- Optimized queries
- Image optimization
- Component reuse

---

# Testing Standards

- Test every module
- Validate forms
- Verify permissions
- Verify calculations
- Regression testing before release

---

# Documentation Rules

Every new module must include:

- Business Rules
- Database Changes
- API Changes
- UI Changes
- Test Cases

---

# Business Rules

- Never hardcode prices.
- Never hardcode packages.
- Never hardcode services.
- Never permanently delete business data.
- Archive instead of Delete.
- Every critical action must be logged.

---

# Future Scope

- TypeScript Migration
- Automated Testing
- CI/CD
- Docker Deployment
- Kubernetes Support

END OF DOCUMENT
