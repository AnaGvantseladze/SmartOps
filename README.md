# Smartops

Unified service-lifecycle platform — alert management, incident management,
and change management in a single, modular hub.

## What's included (MVP v0.1)

This initial scaffold implements the core foundation from the PRD:

| Module | Status |
|--------|--------|
| **Service Catalog** | Three-tier model (Business → Software → Microservice), health scores, ownership |
| **Alert Management** | Live console, split-panel detail view, acknowledge/snooze/escalate actions, timeline |
| **Incident Management** | Kanban board (Open → In Progress → PIR Pending → Action Items → Closed) |
| **Change Management** | Change list, AI risk scoring, deployment freeze banners |
| **Dashboards** | Executive overview with MTTR, PIR tracking, tier-1 health |
| **AI Layer** | Human-in-the-loop suggestions with confidence scores (mock inference) |
| **Notification Policy Engine** | Org → Team → User hierarchy, rule builder, channels, mandatory rules, notification log |
| **On-Call Schedules** | Rotations, current on-call, overrides, multi-level escalation policies |

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Python 3.12 + FastAPI + SQLAlchemy (async)
- **Database:** PostgreSQL 16
- **Cache:** Redis 7

## Quick start

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Demo logins

Four persona accounts are available for testing:

| Role | Email | Password | Landing page |
|------|-------|----------|--------------|
| **Administrator** | `admin@opscore.com` | `admin123` | Settings / Administration |
| **SRE Engineer** | `sre@opscore.com` | `engineer123` | Alert Console |
| **Manager** | `cto@opscore.com` | `manager123` | Executive Dashboard |
| **Change Manager** | `change@opscore.com` | `change123` | Changes |

The login page includes one-click buttons for each role.

## Role-based access

Each role sees different navigation, pages, and actions:

| Role | Nav items | Key access |
|------|-----------|------------|
| **Administrator** | All modules + Administration | Users & teams, system config, full alerts/incidents, schedules & policies, dashboard parameters, audit logs, export |
| **SRE Engineer** | All modules | Manage alerts & incidents, submit changes, own services |
| **Manager** | All modules | Executive dashboard, critical alerts only (P1/P2), approve changes |
| **Change Manager** | Dashboard, Changes, Services | Approve & manage changes only |

Unauthorized page access returns a 403 from the API and redirects to `/unauthorized` in the UI.

### Administrator capabilities

Administrators land on **Settings** and have access to the **Administration** section:

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
- Active P1 alert on Trading, P2 on Payment Gateway
- P1 incident in progress with war room link
- 3 change requests with AI risk scores
- Upcoming deployment freeze

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/dashboard/stats` | Executive dashboard metrics |
| `GET /api/v1/alerts` | Alert list with filters |
| `POST /api/v1/alerts/{id}/acknowledge` | Acknowledge alert |
| `GET /api/v1/incidents` | Incident list |
| `GET /api/v1/changes` | Change requests |
| `GET /api/v1/services` | Service catalog |
| `GET /api/v1/ai/suggestions` | AI suggestions (human-in-the-loop) |
| `GET /api/v1/notification-policies/effective` | Merged notification policies for current user |
| `GET /api/v1/on-call/schedules` | On-call schedule list with shifts |
| `GET /api/v1/on-call/current` | Who is on-call right now |
| `GET /api/v1/escalation-policies` | Multi-level escalation policies |
| `GET /api/v1/admin/users` | List users (admin) |
| `POST /api/v1/admin/users` | Create user (admin) |
| `GET /api/v1/admin/teams` | List teams (admin) |
| `GET /api/v1/admin/audit-logs` | Audit trail (admin) |
| `GET /api/v1/admin/integrations` | Integration status (admin) |
| `GET/PATCH /api/v1/admin/dashboard-config` | Dashboard parameters (admin) |
| `POST /api/v1/admin/export` | Export platform data (admin) |
| `WS /api/v1/ws/alerts` | Real-time alert WebSocket |

## Project structure

```
opscore/
├── backend/          # FastAPI application
│   └── app/
│       ├── api/      # REST + WebSocket routes
│       ├── models/   # SQLAlchemy entities
│       └── schemas/  # Pydantic models
├── frontend/         # React SPA
│   └── src/
│       ├── pages/    # Dashboard, Alerts, Incidents, Changes, Services
│       └── components/
├── docker-compose.yml
└── docs/
```

## Roadmap (from PRD)

**Phase 2:** ~~Authentication~~, ~~notification policy engine~~, ~~on-call schedules~~ — Azure AD SSO remaining  
**Phase 3:** PIR workflow, action items, Jira/Teams integrations  
**Phase 4:** Change calendar, CI/CD auto-detection, deployment freezes  
**Phase 5:** Public status page, mobile app, Elasticsearch search

## License

Proprietary — all rights reserved.
