# OpsCore Architecture (MVP)

## Overview

OpsCore is a modular SaaS platform unifying three operational modules on a shared foundation:

```
┌─────────────────────────────────────────────────────────────┐
│                     OpsCore Platform                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    Alert     │  │   Incident   │  │    Change    │       │
│  │  Management  │  │  Management  │  │  Management  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Service Catalog │ AI Engine │ Dashboards │ Search  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Data model

### Service tiers

| Tier | Type | Example |
|------|------|---------|
| 1 | Business Service | Trading, Deposits |
| 2 | Software Service | Order Service, Payment Gateway |
| 3 | Microservice | Pricing, Auth, Cache |

### Alert lifecycle

`Triggered → Acknowledged → Resolved` (with `Snoozed` at any point)

P1–P5 at alert level. P0 exists only at incident level.

### Incident lifecycle

`Open → In Progress → PIR Pending → Action Items Pending → Closed`

### Change lifecycle

`Submitted → Reviewing → Approved → Scheduled → In Progress → Completed`

## AI design

All AI features follow human-in-the-loop principles:

- Every suggestion shows confidence score (0–100%) and reasoning
- Accept / Reject / Modify actions on all suggestions
- No autonomous actions — AI suggests, humans decide

## Next integration targets

1. Azure AD / Entra ID (SSO + SCIM)
2. Microsoft Teams (war rooms, notifications)
3. Splunk / Grafana / Azure Monitor (alert ingestion)
4. GitHub (enrichment), Confluence (runbook snippets)
5. Jira (incidents, action items)
