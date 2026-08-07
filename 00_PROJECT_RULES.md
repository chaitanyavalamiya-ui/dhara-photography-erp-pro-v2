# Dhara Photography ERP Pro

# PROJECT RULES

Version : 1.0

Status : ACTIVE

Documentation Status : Frozen (v3.0)

Development Status : Ready

Last Updated : August 2026

---

# Purpose

This document is the single source of truth for all software development.

Every developer, AI assistant and Codex session shall follow these rules before writing, modifying or reviewing any code.

If any instruction conflicts with these rules, this document takes priority unless the business documentation explicitly overrides it.

---

# Project Vision

Dhara Photography ERP Pro is an enterprise-grade photography business management platform.

Primary Goals

- Production Ready
- Enterprise Architecture
- High Performance
- Secure by Default
- AI Assisted
- Multi Branch Ready
- White Label Ready
- Mobile Ready
- Cloud Ready

---

# Golden Rules

1. Documentation First.
2. Business Rules First.
3. Database Before APIs.
4. APIs Before UI.
5. Never Hardcode Business Values.
6. Keep Code Modular.
7. Every Change Must Be Traceable.
8. Security Is Mandatory.
9. Performance Matters.
10. Simplicity Over Complexity.

---

# Development Order

Development shall always follow this order.

Documentation

↓

Database

↓

Backend

↓

Frontend

↓

Testing

↓

Deployment

↓

Production

---

# Folder Rules

Root folders shall never be mixed.

01_Blueprint

Business planning only.

02_UI_Design

UI references only.

03_Database

Database related files only.

04_Frontend

React application only.

05_Backend

NestJS application only.

06_Assets

Brand assets only.

08_API

API documentation only.

09_Testing

Testing related files.

10_Release

Deployment packages.

11_docs

Official documentation.

12_prompts

AI prompts.

13_templates

Reusable templates.

14_scripts

Automation scripts.

15_sprints

Sprint planning.

16_decisions

Architecture Decision Records.

17_reference

Technology references.

18_tools

Developer tools.

---

# Technology Stack

Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zustand

Backend

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ

Storage

- MinIO
- Amazon S3 Compatible

Authentication

- JWT
- Refresh Token
- RBAC

Deployment

- Docker
- Nginx
- GitHub Actions

---

# Database Rules

- UUID primary keys.
- Soft delete supported.
- Audit columns mandatory.
- Foreign keys enforced.
- Indexes where required.
- No duplicate tables.
- Naming consistent.
- No business logic inside database.

---

# Backend Rules

- Feature based modules.
- Controllers remain thin.
- Business logic inside services.
- Validation mandatory.
- Repository pattern where appropriate.
- DTO validation required.
- Centralized exception handling.

---

# Frontend Rules

- Feature based folders.
- Reusable components.
- Responsive design.
- Dark mode supported.
- Form validation required.
- No inline styles.
- Business logic outside UI components.

---

# API Rules

- REST first.
- Versioned APIs.
- Consistent response format.
- Pagination support.
- Filtering support.
- Sorting support.
- Swagger documentation.

---

# Security Rules

- JWT authentication.
- RBAC authorization.
- Input validation.
- SQL Injection prevention.
- XSS prevention.
- CSRF protection where applicable.
- Audit logging.
- Sensitive data never exposed.

---

# Git Rules

Branch Naming

feature/module-name

bugfix/module-name

hotfix/module-name

release/version

Commit Format

feat:

fix:

docs:

refactor:

test:

style:

perf:

chore:

Never push broken code.

---

# Naming Rules

Components

PascalCase

Variables

camelCase

Folders

PascalCase or numbered project folders as defined.

Files

kebab-case

Database

snake_case

---

# UI Rules

Modern enterprise design.

Clean spacing.

Consistent typography.

Consistent colors.

No visual clutter.

Responsive first.

Accessibility considered.

---

# AI Rules

AI may

- Generate code.
- Suggest improvements.
- Generate documentation.
- Generate tests.

AI may NOT

- Change business rules.
- Bypass permissions.
- Delete production data.
- Modify architecture without approval.

---

# Business Rules

Business documentation always has priority.

Master Settings control business values.

No business value shall be hardcoded.

Configuration must be editable.

---

# Performance Rules

Fast APIs.

Optimized SQL.

Lazy loading.

Caching where required.

Avoid unnecessary renders.

---

# Testing Rules

Unit Tests.

Integration Tests.

API Tests.

Regression Tests.

Critical modules require testing before merge.

---

# Error Handling

Never expose internal errors.

Log server errors.

Return user friendly messages.

---

# Logging Rules

Log

- Login
- Logout
- CRUD
- Payments
- Settings
- Security Events

Never log

- Passwords
- JWT Secrets
- API Keys

---

# Coding Standards

Readable code.

Reusable code.

Maintainable code.

No duplicate logic.

Small functions.

Meaningful names.

Comments only when necessary.

---

# Development Philosophy

Write code for future developers.

Keep modules independent.

Avoid technical debt.

Optimize only when required.

---

# Sprint Rules

Every Sprint shall have

- Goal
- Tasks
- Testing
- Review
- Git Commit
- Completion Notes

---

# Change Management

Business changes require documentation update.

Architecture changes require ADR.

Major changes require approval.

---

# Production Rules

Never deploy without testing.

Always backup before deployment.

Rollback plan required.

Monitor production continuously.

---

# Codex Instructions

Every coding session shall

1. Read this file.
2. Read related documentation.
3. Follow project architecture.
4. Generate production-ready code.
5. Avoid assumptions.
6. Explain important decisions.

---

# Final Rule

If there is uncertainty,

STOP

Review documentation.

Ask for clarification.

Never guess business logic.

---

END OF DOCUMENT