# SmartOps

Unified service-lifecycle platform — alert management, incident management,
and change management in a single, modular hub.

## What's included (MVP v0.1)

This initial scaffold implements the core foundation from the PRD:

| Module | Status |
|--------|--------|
| **Service Catalog** | Three-tier model (Business → Software → Microservice), health scores, ownership |
| **Alert Management** | Live console, split-panel detail view, acknowledge action, timeline |
| **Incident Management** | Kanban board (Open → In Progress → PIR Pending → Action Items Pending → Closed) |
| **Change Management** | Change list, AI risk scoring, deployment freeze banners |
| **Dashboards** | Executive overview with MTTR, PIR tracking, tier-1 health |
| **AI Layer** | Human-in-the-loop suggestions with confidence scores (mock inference) |
| **Authentication** | JWT-based login, role-based access control, protected routes |
| **Notification Policy Engine** | Org → Team → User hierarchy, rule builder, channels, mandatory rules, notification log |
| **On-Call Schedules** | Rotations, current on-call, overrides, multi-level escalation policies |
| **Administration** | Users, teams, audit logs, integrations, dashboard parameters, export |

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Google Sans Text + React Router + TanStack React Query
- **Backend:** Python 3.12 + FastAPI + SQLAlchemy (async) + JWT + bcrypt + pydantic-settings
- **Database:** PostgreSQL 16
- **Schema management:** SQLAlchemy `create_all` on startup (Alembic listed in requirements but not configured yet)

## Quick start

### 1. Start infrastructure

From the project root (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

This starts only PostgreSQL. Verify with `docker compose ps`.

### 2. Configure environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Key variables (see [`.env.example`](.env.example)):

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql+asyncpg://opscore:opscore@localhost:5432/opscore` | PostgreSQL connection |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed frontend origins |
| `SEED_DEMO_DATA` | `true` | Seed demo users, alerts, incidents, etc. |

### 3. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs
Health check: http://localhost:8000/health

### 4. Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### 5. Log in

Use any of the demo accounts below. The backend creates them on first startup when `SEED_DEMO_DATA=true`.

## Demo logins

Four persona accounts are available for testing:

| Role | Email | Password | Landing page |
|------|-------|----------|--------------|
| **Administrator** | `admin@opscore.com` | `admin123` | Settings |
| **SRE Engineer** | `sre@opscore.com` | `engineer123` | Alert Console |
| **Manager** | `cto@opscore.com` | `manager123` | Executive Dashboard |
| **Change Manager** | `change@opscore.com` | `change123` | Changes |

The login page includes one-click buttons for each role.

## Role-based access

Each role sees different navigation, pages, and actions:

| Role | Nav items | Key access |
|------|-----------|------------|
| **Administrator** | All modules + Administration | Users & teams, system config, full alerts/incidents, schedules & policies, dashboard parameters, audit logs, export |
| **SRE Engineer** | All modules | Manage alerts & incidents, submit changes, own services, notification/on-call settings |
| **Manager** | All modules | Executive dashboard, critical alerts only (P1/P2), approve changes, notification settings |
| **Change Manager** | Dashboard, Changes, Services | Approve & manage changes, notification settings |

Unauthorized page access returns a 403 from the API and redirects to `/unauthorized` in the UI.

### Administrator capabilities

Administrators land on **Settings** and have access to the **Administration** section. The UI uses a light, corporate design system with Google Sans Text typography:

| Capability | Where |
|------------|-------|
| Users & teams | `/settings/users-teams` — add users, assign roles, view teams |
| System & integrations | `/settings/system` — service catalog link, integration status |
| Alerts & incidents | `/alerts`, `/incidents` — view, edit, change statuses |
| Schedules & policies | `/settings/notifications`, `/settings/on-call` |
| Dashboard parameters | `/settings/dashboard-config` — refresh interval, date range, TV mode |
| Audit logs | `/settings/audit` — who did what, when |
| Export data | `/settings/export` — CSV/JSON download for alerts, incidents, changes, services, audit |

## Demo data

On first startup the API seeds sample operational data:

- 4 teams, 4 users (Admin, SRE Engineer, Manager, Change Manager)
- 7 services across all three tiers
- 4 alerts: P1 triggered on Trading, P2 acknowledged on Payment Gateway, P3 snoozed on Cache, P4 resolved on Auth
- 3 incidents: P1 in progress with war room, P2 PIR pending, P3 closed
- 2 action items tied to incidents
- 3 change requests with AI risk scores
- Organization, team, and user notification policies
- NOC, Service Owner, Incident Commander, and Manager on-call schedules with escalation policy
- Sample audit log entries
- Upcoming deployment freeze and maintenance window

## API endpoints

### Authentication

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/login` | JWT login |
| `GET /api/v1/auth/me` | Current user profile |
| `GET /api/v1/auth/permissions` | Current role config, permissions, nav, landing page |
| `GET /api/v1/auth/demo-users` | Demo account credentials and landing pages |

### Core modules

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/dashboard/stats` | Executive dashboard metrics |
| `GET /api/v1/dashboard/freeze` | Deployment freeze banner |
| `GET /api/v1/alerts` | Alert list with filters |
| `GET /api/v1/alerts/{id}` | Alert detail |
| `POST /api/v1/alerts/{id}/acknowledge` | Acknowledge alert |
| `PATCH /api/v1/alerts/{id}` | Update alert fields/status |
| `GET /api/v1/incidents` | Incident list |
| `GET /api/v1/incidents/{id}` | Incident detail |
| `PATCH /api/v1/incidents/{id}` | Update incident status/fields |
| `GET /api/v1/changes` | Change requests |
| `GET /api/v1/changes/{id}` | Change detail |
| `PATCH /api/v1/changes/{id}` | Update change status/fields |
| `GET /api/v1/services` | Service catalog |
| `GET /api/v1/services/{id}` | Service detail |
| `GET /api/v1/ai/suggestions` | AI suggestions (human-in-the-loop) |
| `WS /api/v1/ws/alerts` | Real-time alert WebSocket (in-memory) |

### Notifications & on-call

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/notification-policies` | All notification policies |
| `GET /api/v1/notification-policies/effective` | Merged policies for current user |
| `POST /api/v1/notification-policies/test` | Test notification dispatch |
| `GET /api/v1/notification-log` | Notification delivery history |
| `GET /api/v1/on-call/schedules` | On-call schedules with shifts |
| `GET /api/v1/on-call/current` | Current on-call users |
| `GET /api/v1/on-call/overrides` | On-call overrides |
| `GET /api/v1/escalation-policies` | Escalation policies |

### Admin

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/admin/users` | List users |
| `POST /api/v1/admin/users` | Create user |
| `PATCH /api/v1/admin/users/{id}` | Update user |
| `GET /api/v1/admin/teams` | List teams |
| `POST /api/v1/admin/teams` | Create team |
| `GET /api/v1/admin/audit-logs` | Audit trail |
| `GET /api/v1/admin/integrations` | Integration status |
| `GET /api/v1/admin/dashboard-config` | Dashboard parameters |
| `PATCH /api/v1/admin/dashboard-config` | Update dashboard parameters |
| `POST /api/v1/admin/export` | Export data (CSV/JSON) |

### Health

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Service health check |

## Project structure

```
opscore/
├── backend/            # FastAPI application
│   ├── app/
│   │   ├── api/        # REST + WebSocket routes
│   │   ├── auth.py     # Password hashing and JWT helpers
│   │   ├── config.py   # Pydantic settings + .env
│   │   ├── database.py # SQLAlchemy async engine + session
│   │   ├── main.py     # App entrypoint, lifespan, middleware
│   │   ├── migrate_roles.py  # Legacy role migration
│   │   ├── models/     # SQLAlchemy entities
│   │   ├── permissions.py    # RBAC, role config, guards
│   │   ├── schemas/    # Pydantic models
│   │   ├── seed*.py    # Demo data seeding
│   │   └── services/   # Notification, audit services
│   └── requirements.txt
├── frontend/           # React SPA
│   └── src/
│       ├── components/ # Layout, nav, guards, panels
│       ├── context/    # Auth context
│       ├── lib/        # API client, permissions, utils
│       ├── pages/      # Dashboard, Alerts, Incidents, Changes, Services, Settings, Admin
│       └── types/      # TypeScript type definitions
├── docker-compose.yml
├── .env.example
├── docs/
│   └── ARCHITECTURE.md
└── README.md
```

## Design

The UI follows a clean, corporate design system:

- **Light theme:** white and slate backgrounds, subtle borders, soft shadows
- **Typography:** Google Sans for headings, Google Sans Text for body text
- **Color palette:** neutral slate with a single brand indigo accent
- **Components:** rounded cards, clean buttons, subtle badges, and readable data tables
- **Layout:** top navigation + main content; settings uses a left sidebar

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the high-level data model, alert/incident/change lifecycles, AI design principles, and planned integration targets.

## Roadmap (from PRD)

**Phase 2:** ~~Authentication~~, ~~notification policy engine~~, ~~on-call schedules~~ — Azure AD SSO remaining  
**Phase 3:** PIR workflow, action items, Jira/Teams integrations  
**Phase 4:** Change calendar, CI/CD auto-detection, deployment freezes  
**Phase 5:** Public status page, mobile app, Elasticsearch search

## License

Proprietary — all rights reserved.
