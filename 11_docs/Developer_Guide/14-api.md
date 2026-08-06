# API Documentation

## Document Information

| Item | Value |
|------|-------|
| Module | API Documentation |
| Version | 2.0 |
| Status | Final |
| Documentation Type | Codex Ready |

---

# Purpose

This document defines all REST APIs used by Dhara Photography ERP Pro V2.

All frontend modules must communicate only through documented APIs.

Every API must follow a consistent structure, validation, authentication and response format.

No undocumented API should be created.

---

# API Standards

## Base URL

```
/api/v1
```

## API Architecture

- REST API
- JSON Request
- JSON Response
- Stateless
- JWT Authentication
- Role Based Access Control (RBAC)

---

## Content Type

```
application/json
```

---

## Date Format

```
YYYY-MM-DD
```

---

## Time Format

```
HH:mm:ss
```

---

## Time Zone

```
Asia/Kolkata
```

---

# Standard Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

---

# Standard Error Response

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

---

# HTTP Status Codes

| Code | Meaning |
|------|---------|
|200|Success|
|201|Created|
|400|Bad Request|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Validation Error|
|500|Internal Server Error|

---

# Authentication

Every protected API must require:

- JWT Access Token
- Valid User
- Active Account
- Role Permission

---

# API Versioning

Current Version

```
v1
```

Future versions

```
v2
v3
```

---

# API Modules

1. Authentication
2. Users
3. Clients
4. Booking
5. Packages
6. Services
7. Equipment
8. Staff
9. Accounts
10. Dashboard
11. Reports
12. CRM
13. Settings
14. Notifications
15. Upload
16. Archive
17. Search

---

# Business Rules

- All APIs use `/api/v1`.
- Every protected API requires JWT.
- All requests and responses use JSON.
- Every create/update/delete action is logged.
- Validation errors return HTTP 422.
- Archived records remain searchable where applicable.

---

# Future Scope

- API Rate Limiting
- API Documentation (Swagger/OpenAPI)
- GraphQL Gateway
- Webhooks
- Mobile API
- Public Client Portal API

---

END OF PART 1
