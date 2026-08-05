# Codex Development Guide

## Document Information

| Item | Value |
|------|-------|
| Module | Codex Development Guide |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

This document defines the development workflow for building Dhara Photography ERP Pro V2 with Codex.

Codex must follow the documentation before generating or modifying code.

---

# Development Principles

- Documentation First
- Module by Module Development
- No Hardcoded Business Data
- Production Quality Code
- Small, Reviewable Changes
- Git Commit After Stable Milestone

---

# Required Reading

Before writing any code, Codex must read:

1. 01-project-overview.md
2. 02-business-workflow.md
3. 03-user-roles.md
4. 04-business-rules.md
5. 05-settings.md
6. 06-clients.md
7. 07-booking.md
8. 08-equipment.md
9. 09-staff.md
10. 10-dashboard.md
11. 11-accounts.md
12. 12-reports.md
13. 13-database.md
14. 14-api.md
15. 15-coding-standards.md
16. 16-folder-structure.md
17. 17-database-schema.md
18. 18-master-readme.md
19. 19-feature-checklist.md
20. 20-ui-design-system.md
21. 21-security.md
22. 22-backup-recovery.md
23. 23-testing-checklist.md
24. 24-deployment-guide.md
25. 25-master-settings-list.md

---

# Development Order

Phase 1
- Project Setup
- Authentication
- Layout
- Dashboard

Phase 2
- Settings
- Services
- Packages
- Equipment

Phase 3
- Clients
- Booking
- Calendar

Phase 4
- Staff
- Accounts
- Reports

Phase 5
- CRM
- Archive
- Notifications
- AI Ready Features

---

# Mandatory Rules

- Never hardcode prices.
- Never hardcode packages.
- Never hardcode services.
- Never hardcode equipment.
- All configurable values come from Settings.
- Follow database relationships.
- Respect role permissions.
- Keep code modular and reusable.

---

# Working Method

For every module:

1. Read documentation.
2. Design database changes.
3. Build backend.
4. Build frontend.
5. Test.
6. Commit to Git.
7. Continue to next module.

---

# Git Workflow

Branch:
feature/module-name

Commit examples:

- feat: booking module
- feat: equipment module
- fix: payment calculation
- docs: update blueprint

---

# Quality Checklist

Before completing a module:

- Business rules followed
- APIs working
- UI responsive
- Database verified
- Permissions tested
- No console errors
- No duplicate code

---

# When Documentation Changes

If documentation changes:

- Update code only where required.
- Do not rewrite unrelated modules.
- Keep backward compatibility whenever possible.

---

# Bug Fix Policy

- Reproduce bug
- Find root cause
- Fix minimum required code
- Test affected module
- Commit with clear message

---

# Completion Criteria

Project is complete only when:

- All checklist items finished
- All modules tested
- Documentation matches code
- Production deployment successful

---

# Future Scope

- AI Pair Programming
- Automated Code Review
- CI/CD Integration
- Performance Optimization
- Multi Branch Support

END OF DOCUMENT
