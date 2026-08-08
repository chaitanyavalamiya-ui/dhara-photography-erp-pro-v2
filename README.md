# Dhara Photography ERP Pro V2

Premium wedding photography studio ERP for **Dhara Photography Patan**.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod, Zustand |
| Backend | NestJS, Prisma, PostgreSQL, JWT, Swagger |
| Database | PostgreSQL 16 (Docker) |
| API | REST `/api/v1` |

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for PostgreSQL)

## Quick Start

### 1. Clone and configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your local values. **Never commit `.env`.**

Required variables:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Local PostgreSQL password |
| `DATABASE_URL` | Prisma connection string (must match Docker credentials) |
| `JWT_ACCESS_SECRET` | Min 32 random characters |
| `JWT_REFRESH_SECRET` | Min 32 random characters |
| `SEED_ADMIN_EMAIL` | Development admin email |
| `SEED_ADMIN_PASSWORD` | Development admin password (min 8 chars) |

### 2. Start PostgreSQL

```bash
npm run docker:up
```

### 3. Install dependencies and set up database

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Start development servers

**Terminal 1 — Backend API:**

```bash
npm run backend:dev
```

API: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/api/docs`

**Terminal 2 — Frontend:**

```bash
npm run frontend:dev
```

App: `http://localhost:5173`

### 5. Login

Use the credentials from your `.env` file:

- Email: value of `SEED_ADMIN_EMAIL`
- Password: value of `SEED_ADMIN_PASSWORD`

## Project Structure

```
04_Frontend/frontend/     React application
05_Backend/backend/       NestJS API
03_Database/              Prisma schema, migrations, seeds
09_Testing/               Test utilities
11_docs/                  Business & architecture documentation
16_decisions/             Architecture Decision Records
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start PostgreSQL container |
| `npm run docker:down` | Stop PostgreSQL container |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed development data |
| `npm run backend:dev` | Start NestJS in watch mode |
| `npm run frontend:dev` | Start Vite dev server |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run test` | Run all tests |

## API Endpoints (Phase 0)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | Public | Health check |
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/refresh` | Public | Refresh tokens |
| POST | `/api/v1/auth/logout` | JWT | Logout |
| GET | `/api/v1/auth/me` | JWT | Current user profile |

## Development Seed Data

The seed creates:

- Company: **Dhara Photography Patan** (`DHARA-PATAN`)
- Branch: **Patan Main Studio** (`PATAN`)
- Roles: Owner, Admin, Manager, Staff, Viewer
- Permissions: dashboard, clients, bookings, invoices, payments, settings, users, roles
- Master data: client statuses, booking statuses, payment modes
- Admin user with Owner role

## Security Notes

- Never hardcode passwords or JWT secrets in source code.
- Use strong random secrets in `.env` for local development.
- Production deployment requires separate secret management.

## Documentation

See `11_docs/` for full business and architecture documentation.  
See `16_decisions/` for Architecture Decision Records.

## Phase Status

**Phase 0 (Foundation)** — Complete  
- Project scaffolding, auth, health check, UI shell, database foundation

**Phase 1 (Next)** — Client → Booking → Invoice → Payment flow

## License

Proprietary — Dhara Photography Patan
