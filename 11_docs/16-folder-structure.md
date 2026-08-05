# Folder Structure

## Document Information

| Item | Value |
|------|-------|
| Module | Folder Structure |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

Define the standard folder structure for Dhara Photography ERP Pro V2.

All developers and AI coding assistants must follow this structure.

---

# Root Structure

```text
Dhara Photography ERP Pro V2/
│
├── 01_Blueprint/
├── 02_UI_Design/
├── 03_Database/
├── 04_Frontend/
├── 05_Backend/
├── 06_Assets/
├── 07_Documents/
├── 08_API/
├── 09_Testing/
├── 10_Release/
├── 11_docs/
├── 12_prompts/
├── .gitignore
├── README.md
└── LICENSE
```

---

# Frontend Structure

```text
04_Frontend/
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   ├── layouts/
    │   ├── pages/
    │   ├── routes/
    │   ├── services/
    │   ├── hooks/
    │   ├── context/
    │   ├── utils/
    │   ├── styles/
    │   ├── constants/
    │   ├── config/
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

---

# Backend Structure

```text
05_Backend/
└── backend/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── repositories/
    │   ├── routes/
    │   ├── services/
    │   ├── validations/
    │   ├── utils/
    │   ├── uploads/
    │   └── app.js
    ├── server.js
    └── package.json
```

---

# Database Structure

```text
03_Database/
├── schema/
├── migrations/
├── seeds/
├── backups/
└── scripts/
```

---

# Assets Structure

```text
06_Assets/
├── logos/
├── icons/
├── templates/
├── fonts/
├── sample-data/
└── branding/
```

---

# Documentation Structure

```text
11_docs/
01-project-overview.md
02-business-workflow.md
03-user-roles.md
04-business-rules.md
05-settings.md
06-clients.md
07-booking.md
08-equipment.md
09-staff.md
10-dashboard.md
11-accounts.md
12-reports.md
13-database.md
14-api.md
15-coding-standards.md
16-folder-structure.md
17-database-schema.md
18-master-readme.md
```

---

# Prompt Structure

```text
12_prompts/
booking.md
clients.md
dashboard.md
equipment.md
reports.md
settings.md
```

---

# Naming Standards

- Folders: kebab-case
- React Components: PascalCase
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE

---

# Business Rules

- No hardcoded business data.
- Shared components only in components/.
- API calls only from services/.
- Configuration only in config/.
- Keep documentation updated with code.

---

# Future Scope

- Mobile App Folder
- Desktop App Folder
- Docker
- CI/CD
- Infrastructure as Code

END OF DOCUMENT
