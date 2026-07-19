# OpsCore

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

## Demo data

On first startup the API seeds eToro-style demo data:

- 4 teams, 6 users (NOC, SRE, Incident Manager, etc.)
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

**Phase 2:** Authentication (Azure AD SSO), notification policy engine, on-call schedules  
**Phase 3:** PIR workflow, action items, Jira/Teams integrations  
**Phase 4:** Change calendar, CI/CD auto-detection, deployment freezes  
**Phase 5:** Public status page, mobile app, Elasticsearch search

## License

Proprietary — eToro internal use.
