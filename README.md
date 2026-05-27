# TIDDS — Tertiary Institution Digital Disciplinary System

**Built by Reforma Digital Solutions Ltd**
Pilot institution: University of Lagos (UNILAG)

---

## Overview

TIDDS is a multi-tenant web platform for managing student disciplinary cases at Nigerian tertiary institutions. Phase 1 (this codebase) is the **Platform Administrator Module** — the engine room that manages institutions, users, offence types, and system configuration.

### Access tiers

| Role | Description |
|------|-------------|
| **Reforma Admin** | Hardcoded env credential. Full platform visibility. Manages all institutions. |
| **Institution Admin** | Stored in DB. Scoped to one institution. Manages users and configuration. |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker + Docker Compose (optional)

---

## Local development setup

### 1. Copy environment variables

```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, REFORMA_ADMIN_EMAIL, REFORMA_ADMIN_PASSWORD
# and SMTP / Termii credentials
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Run database migrations

```bash
cd server
npx prisma migrate dev --schema ../prisma/schema.prisma --name init
```

### 4. Seed demo data

```bash
cd server
node ../prisma/seed.js
```

### 5. Start development servers

```bash
# Terminal 1 — API
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

- API: `http://localhost:5000`
- Frontend: `http://localhost:5173`

---

## Running with Docker

```bash
docker-compose up
```

This starts PostgreSQL, the Express API, and the Vite dev server. On first run, exec into the server container to run migrations and seed:

```bash
docker-compose exec server sh -c "npx prisma migrate dev --schema /prisma/schema.prisma && node /prisma/seed.js"
```

---

## Default credentials

| Account | Email | Password |
|---------|-------|----------|
| Reforma Admin | Set via `REFORMA_ADMIN_EMAIL` env | Set via `REFORMA_ADMIN_PASSWORD` env |
| UNILAG Institution Admin | `admin@unilag.edu.ng` | `TIDDSunilag2025!` |

> **Warning:** Change all default passwords before any production deployment.

---

## Project structure

```
/
├── client/                     React + Vite + Tailwind CSS
│   └── src/
│       ├── components/ui/      Shared UI primitives (Button, Modal, DataTable, etc.)
│       ├── context/            AuthContext, ToastContext
│       ├── pages/
│       │   ├── auth/           Login, AcceptInvitation
│       │   ├── reforma-admin/  Dashboard, Institutions, Logs
│       │   └── institution-admin/ Dashboard, Users, OffenceTypes, Settings, Logs
│       └── utils/              api.js (Axios), formatters, constants
│
├── server/                     Express.js API
│   └── src/
│       ├── controllers/        auth, institutions, users, offenceTypes, dashboard, logs
│       ├── middleware/         auth, role, validate, upload
│       ├── routes/             REST routes for each domain
│       ├── services/           email, SMS, notification, log
│       └── utils/              jwt, crypto, workingDays, caseRef
│
├── prisma/
│   ├── schema.prisma           Full schema (all 4 phases)
│   └── seed.js                 UNILAG demo data
│
├── docker-compose.yml
└── .env.example
```

---

## Environment variable reference

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 64-char random string for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (default `8h`) |
| `REFORMA_ADMIN_EMAIL` | Reforma admin login email (not stored in DB) |
| `REFORMA_ADMIN_PASSWORD` | Reforma admin password (not stored in DB) |
| `SMTP_HOST` | Platform fallback SMTP host |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `EMAIL_FROM_NAME` | Platform sender name |
| `EMAIL_FROM_ADDR` | Platform sender email |
| `TERMII_API_KEY` | Termii SMS API key |
| `TERMII_BASE_URL` | Termii base URL |
| `TERMII_DEFAULT_SENDER` | Default SMS sender ID |
| `PORT` | API port (default 5000) |
| `CLIENT_URL` | Frontend origin for CORS |
| `VITE_API_URL` | API base URL for the React client |

---

## API endpoint reference

### Auth
```
POST /api/auth/login          Login (Reforma Admin or institution user)
POST /api/auth/accept-invite  Set password from invitation token
GET  /api/auth/me             Current user profile
```

### Institutions (PLATFORM_ADMIN only)
```
GET    /api/institutions
POST   /api/institutions
GET    /api/institutions/:id
PATCH  /api/institutions/:id
PATCH  /api/institutions/:id/branding
PATCH  /api/institutions/:id/integrations
PATCH  /api/institutions/:id/licence
DELETE /api/institutions/:id      (soft delete)
```

### Users
```
GET    /api/institutions/:institutionId/users
POST   /api/institutions/:institutionId/users
GET    /api/institutions/:institutionId/users/:userId
PATCH  /api/institutions/:institutionId/users/:userId
PATCH  /api/institutions/:institutionId/users/:userId/status
POST   /api/institutions/:institutionId/users/:userId/resend-invite
```

### Offence Types
```
GET    /api/institutions/:institutionId/offence-types
POST   /api/institutions/:institutionId/offence-types
PATCH  /api/institutions/:institutionId/offence-types/:id
DELETE /api/institutions/:institutionId/offence-types/:id
```

### Dashboard
```
GET /api/dashboard/reforma
GET /api/dashboard/institution/:institutionId
```

### System Logs
```
GET  /api/logs
GET  /api/logs/institution/:institutionId
POST /api/logs/test-email
POST /api/logs/test-sms
```

---

## Role guide (Phase 1)

| Role | Can do in Phase 1 |
|------|-------------------|
| `PLATFORM_ADMIN` | Create/edit institutions, manage all users, view all logs, test SMTP/SMS |
| `INSTITUTION_ADMIN` | Invite/deactivate own institution's users, manage offence types, view own logs |
| `COMMITTEE_MEMBER` | Phase 2 — case management |
| `PANEL_MEMBER` | Phase 2 — hearing management |
| `COMPLAINTS_OFFICER` | Phase 2 — complaint filing |
| `STUDENT` | Phase 2 — case portal |

---

## Key design decisions

- **Multi-tenant from day one** — all models carry `institutionId`. Queries are scoped by middleware.
- **Reforma Admin is not in the DB** — credentials live in env vars only, keeping them completely separate from institution user records.
- **SMTP passwords never returned by the API** — `smtpPass` and `sisApiKey` are excluded from all GET responses.
- **Invitation-only account creation** — no public registration. All users receive a time-limited email link to set their password.
- **Notification + SystemLog written on every email/SMS** — every delivery attempt (success or failure) is recorded for auditability.
- **Audit log is append-only** — Phase 2 will enforce no-DELETE/no-UPDATE at the PostgreSQL role level.
