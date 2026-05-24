# TIDDS — Tertiary Institution Digital Disciplinary System

## Project structure

```
disciplinary system/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── app.js                  Entry point
│   │   ├── config/db.js            PostgreSQL connection pool
│   │   ├── middleware/
│   │   │   ├── auth.js             JWT verification + RBAC
│   │   │   └── audit.js            Audit log writer
│   │   ├── routes/
│   │   │   ├── auth.js             Login, invitation acceptance
│   │   │   ├── complaints.js       Stage 01 — complaint filing
│   │   │   ├── cases.js            Stages 03–07 — workflow
│   │   │   └── admin.js            User invitations, analytics
│   │   ├── services/
│   │   │   ├── notifications.js    Email + SMS dispatch + templates
│   │   │   └── workflow.js         Stage advancement engine
│   │   └── db/
│   │       ├── schema.sql          Full PostgreSQL schema
│   │       └── migrate.js          Schema migration runner
│   └── .env.example
│
└── frontend/         React + Vite + Tailwind CSS
    └── src/
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── AcceptInvitation.jsx
        │   ├── student/            Student portal (dormant → active)
        │   ├── officer/            Complaint filing interface
        │   └── committee/          Committee dashboard + case management
        ├── components/
        │   ├── Layout.jsx
        │   └── StageBadge.jsx
        ├── context/AuthContext.jsx
        └── lib/api.js
```

## Setup

### 1. Database

```bash
# Create a PostgreSQL database
createdb tidds

# Copy and fill in environment variables
cp backend/.env.example backend/.env

# Run the schema migration
cd backend && node src/db/migrate.js
```

### 2. Backend

```bash
cd backend
npm install
npm run dev        # development (nodemon)
# or
npm start          # production
```

API runs on `http://localhost:4000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs on `http://localhost:5173`

---

## The seven-stage workflow

| Stage | Name | Trigger |
|-------|------|---------|
| 01 | Complaint filed | Officer submits complaint |
| 02 | Student notified | Auto — email + SMS dispatched immediately |
| 03 | Student response | Student submits via portal (3-day window) |
| 04 | Panel constituted | Committee admin constitutes panel |
| 05 | Appearance notice | Auto — sent when hearing is scheduled |
| 06 | Panel hearing | Secretary records hearing + outcome |
| 07 | Verdict | Secretary records verdict; auto-communicated to student |

Target: **two working weeks** from Stage 01 to Stage 07.

---

## User roles

| Role | Access |
|------|--------|
| `student` | Own case only — view complaint, submit response, view verdict |
| `complaints_officer` | File complaints, view own filings only |
| `committee_member` | Full dashboard, constitute panels, schedule hearings, record verdicts |
| `panel_member` | Assigned cases only, record hearings |
| `platform_admin` | Full system access across all institutions |

---

## Key design decisions

- **Multi-tenant from day one** — every table has `institution_id`. One codebase, data isolation between institutions.
- **Audit log is append-only** — every action writes to `audit_logs`. Never updated. Never deleted.
- **Workflow is enforced by the API** — no stage can be skipped. The route layer validates current stage before any transition.
- **Notifications are dual-channel** — every student-facing notification goes by email AND SMS, accounting for variable email reliability.
- **Role-based UI** — the frontend routes to a completely different interface depending on the user's role. Students never see committee views; officers never see other officers' complaints.
