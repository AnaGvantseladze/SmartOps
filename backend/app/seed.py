from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import hash_password
from app.engineers import DEMO_AUTH_USERS, DEMO_USERS, build_demo_users

from app.models.entities import (
    ActionItem,
    ActionItemStatus,
    Alert,
    AlertPriority,
    AlertStatus,
    AlertTimelineEntry,
    Change,
    ChangeRisk,
    ChangeStatus,
    ChangeType,
    DeploymentFreeze,
    Incident,
    IncidentSeverity,
    IncidentService,
    IncidentStatus,
    IncidentTimelineEntry,
    MaintenanceWindow,
    Service,
    ServiceTier,
    Team,
    User,
    UserRole,
)


async def seed_demo_data(session: AsyncSession) -> None:
    existing = await session.scalar(select(func.count()).select_from(Team))
    if existing:
        return


    teams = [
        Team(name="NOC Operations", description="24/7 network operations center"),
        Team(name="Trading Platform", description="Core trading services"),
        Team(name="Payments", description="Deposits and withdrawals"),
        Team(name="Platform Engineering", description="Shared infrastructure and SRE"),
    ]
    session.add_all(teams)
    await session.flush()

    users = build_demo_users(team_id=teams[3].id)
    session.add_all(users)
    await session.flush()

    saba, ana, eka, _change_manager = users

    services = [
        Service(
            name="Trading",
            tier=ServiceTier.BUSINESS,
            description="Core trading platform — revenue-critical",
            team_id=teams[1].id,
            owner_id=ana.id,
            github_repo="opscore/trading-platform",
            confluence_runbook_url="https://confluence.example.com/trading-runbook",
            monitoring_dashboard_url="https://grafana.example.com/d/trading",
            health_score=72,
        ),
        Service(
            name="Deposits",
            tier=ServiceTier.BUSINESS,
            description="Customer deposit processing",
            team_id=teams[2].id,
            owner_id=ana.id,
            github_repo="opscore/deposits",
            health_score=95,
        ),
        Service(
            name="Order Service",
            tier=ServiceTier.SOFTWARE,
            description="Order execution and routing",
            team_id=teams[1].id,
            owner_id=ana.id,
            github_repo="opscore/order-service",
            health_score=68,
        ),
        Service(
            name="Payment Gateway",
            tier=ServiceTier.SOFTWARE,
            description="Payment provider integrations",
            team_id=teams[2].id,
            owner_id=ana.id,
            github_repo="opscore/payment-gateway",
            health_score=85,
        ),
        Service(
            name="Pricing Service",
            tier=ServiceTier.MICROSERVICE,
            description="Real-time price feeds",
            team_id=teams[1].id,
            owner_id=ana.id,
            github_repo="opscore/pricing-service",
            health_score=90,
        ),
        Service(
            name="Auth Service",
            tier=ServiceTier.MICROSERVICE,
            description="Authentication and authorization",
            team_id=teams[3].id,
            owner_id=ana.id,
            github_repo="opscore/auth-service",
            health_score=98,
        ),
        Service(
            name="Cache Layer",
            tier=ServiceTier.MICROSERVICE,
            description="Distributed Redis cache cluster",
            team_id=teams[3].id,
            owner_id=ana.id,
            health_score=88,
        ),
    ]
    session.add_all(services)
    await session.flush()

    now = datetime.now(timezone.utc)

    alerts = [
        Alert(
            title="Order timeout — Trading Service",
            description="P99 order latency exceeded 5s threshold",
            priority=AlertPriority.P1,
            status=AlertStatus.TRIGGERED,
            source="Splunk",
            service_id=services[0].id,
            occurrence_count=3,
            created_at=now - timedelta(minutes=2),
        ),
        Alert(
            title="High latency — Payment Gateway",
            description="Response time above 2s for 10 minutes",
            priority=AlertPriority.P2,
            status=AlertStatus.ACKNOWLEDGED,
            source="Grafana",
            service_id=services[3].id,
            assignee_id=ana.id,
            created_at=now - timedelta(minutes=12),
        ),
        Alert(
            title="Memory warning — Cache Layer",
            description="Redis memory usage at 85%",
            priority=AlertPriority.P3,
            status=AlertStatus.SNOOZED,
            source="Azure Monitor",
            service_id=services[6].id,
            snooze_reason="Known deployment in progress",
            snoozed_until=now + timedelta(hours=1),
            created_at=now - timedelta(minutes=30),
        ),
        Alert(
            title="Slow query — Auth Service",
            description="Database query latency spike",
            priority=AlertPriority.P4,
            status=AlertStatus.RESOLVED,
            source="Coralogix",
            service_id=services[5].id,
            assignee_id=ana.id,
            resolution_summary="Added missing index on sessions table",
            root_cause="Configuration",
            resolved_at=now - timedelta(hours=1),
            created_at=now - timedelta(hours=2),
        ),
    ]
    session.add_all(alerts)
    await session.flush()

    for alert in alerts[:2]:
        session.add(
            AlertTimelineEntry(
                alert_id=alert.id,
                author_id=ana.id,
                entry_type="status-change",
                content=f"Alert ingested from {alert.source} and routed to on-call",
            )
        )

    session.add(
        AlertTimelineEntry(
            alert_id=alerts[1].id,
            author_id=ana.id,
            entry_type="note",
            content="Investigating latency spike — checking recent deployments.",
        )
    )

    incidents = [
        Incident(
            title="Trading platform degradation — order timeouts",
            description="Multiple users reporting failed order submissions",
            severity=IncidentSeverity.P1,
            status=IncidentStatus.IN_PROGRESS,
            category="Application",
            business_impact="~15% of orders failing in EU region",
            manager_id=eka.id,
            commander_id=eka.id,
            team_id=teams[1].id,
            war_room_url="https://teams.microsoft.com/l/channel/trading-war-room",
            created_at=now - timedelta(hours=1),
        ),
        Incident(
            title="Payment Gateway latency spike",
            description="Elevated response times affecting deposit flow",
            severity=IncidentSeverity.P2,
            status=IncidentStatus.PENDING_TEAMS,
            category="Infrastructure",
            manager_id=eka.id,
            team_id=teams[2].id,
            resolution_summary="Scaled payment gateway pods from 4 to 8",
            root_cause="Traffic spike after marketing campaign",
            resolved_at=now - timedelta(days=1),
            pir_due_at=now + timedelta(days=2),
            created_at=now - timedelta(days=2),
        ),
        Incident(
            title="Cache service memory pressure",
            description="Redis cluster approaching memory limits",
            severity=IncidentSeverity.P3,
            status=IncidentStatus.CLOSED,
            category="Infrastructure",
            manager_id=eka.id,
            team_id=teams[3].id,
            resolution_summary="Evicted stale keys and increased memory limit",
            closed_at=now - timedelta(days=5),
            created_at=now - timedelta(days=6),
        ),
    ]
    session.add_all(incidents)
    await session.flush()

    session.add_all(
        [
            IncidentService(incident_id=incidents[0].id, service_id=services[0].id),
            IncidentService(incident_id=incidents[0].id, service_id=services[2].id),
            IncidentService(incident_id=incidents[1].id, service_id=services[3].id),
            IncidentService(incident_id=incidents[2].id, service_id=services[6].id),
        ]
    )

    alerts[0].incident_id = incidents[0].id

    session.add_all(
        [
            IncidentTimelineEntry(
                incident_id=incidents[0].id,
                author_id=eka.id,
                entry_type="status-change",
                content="Incident created from P1 alert — Trading Service order timeout",
            ),
            IncidentTimelineEntry(
                incident_id=incidents[0].id,
                author_id=eka.id,
                entry_type="decision",
                content="Decision: Scale Order Service replicas from 6 to 12",
            ),
            IncidentTimelineEntry(
                incident_id=incidents[0].id,
                author_id=ana.id,
                entry_type="action",
                content="Investigating recent deployment CHG-499 on Order Service",
            ),
        ]
    )

    session.add_all(
        [
            ActionItem(
                title="Add circuit breaker for payment provider failover",
                description="Implement automatic failover when primary provider latency exceeds 3s",
                status=ActionItemStatus.IN_PROGRESS,
                priority=AlertPriority.P2,
                owner_id=ana.id,
                incident_id=incidents[1].id,
                service_id=services[3].id,
                due_date=now + timedelta(days=7),
            ),
            ActionItem(
                title="Update runbook for cache memory management",
                status=ActionItemStatus.COMPLETED,
                priority=AlertPriority.P3,
                owner_id=ana.id,
                incident_id=incidents[2].id,
                service_id=services[6].id,
                completed_at=now - timedelta(days=3),
            ),
        ]
    )

    changes = [
        Change(
            title="Deploy Order Service v2.3.1",
            description="Routine release with performance improvements",
            change_type=ChangeType.STANDARD,
            risk=ChangeRisk.LOW,
            risk_score=22,
            risk_reasoning="Standard deployment with staging verification passed",
            status=ChangeStatus.REVIEWING,
            service_id=services[2].id,
            submitter_id=ana.id,
            implementation_plan="Rolling deployment via ArgoCD, 25% traffic increments",
            rollback_plan="Revert to v2.3.0 via ArgoCD rollback",
            potential_business_impact="Minor latency increase possible during rollout; no expected order loss",
            affected_scope="Order Service, internal API consumers",
            expected_downtime="None",
            scheduled_start=now + timedelta(days=2),
        ),
        Change(
            title="DB migration — users table indexes",
            description="Add composite index for session lookups",
            change_type=ChangeType.NORMAL,
            risk=ChangeRisk.HIGH,
            risk_score=78,
            risk_reasoning="Affects Tier 2 service with 3 incidents in last 30 days",
            status=ChangeStatus.REVIEWING,
            service_id=services[5].id,
            submitter_id=ana.id,
            implementation_plan="Online DDL migration during low-traffic window",
            rollback_plan="Drop index if query performance degrades",
            potential_business_impact="Slower login and session lookups if migration fails",
            affected_scope="All authenticated users, session service",
            expected_downtime="Up to 15 minutes",
            scheduled_start=now + timedelta(days=5),
        ),
        Change(
            title="Hotfix auth flow redirect",
            description="Emergency fix for OAuth redirect loop",
            change_type=ChangeType.EMERGENCY,
            risk=ChangeRisk.MEDIUM,
            risk_score=55,
            status=ChangeStatus.APPROVED,
            service_id=services[5].id,
            submitter_id=ana.id,
            implementation_plan="Deploy hotfix branch directly to production",
            rollback_plan="Revert commit abc123",
            potential_business_impact="Users unable to log in until fix is deployed",
            affected_scope="All users attempting OAuth login",
            expected_downtime="None — rolling hotfix",
            scheduled_start=now + timedelta(hours=4),
        ),
    ]
    session.add_all(changes)

    session.add(
        DeploymentFreeze(
            title="Mobile release code freeze",
            reason="Annual mobile app release — no non-emergency deploys",
            start_time=now + timedelta(days=1),
            end_time=now + timedelta(days=6),
            is_active=False,
        )
    )

    session.add(
        MaintenanceWindow(
            title="Cache cluster maintenance",
            reason="Redis cluster version upgrade",
            start_time=now + timedelta(days=3, hours=2),
            end_time=now + timedelta(days=3, hours=4),
            created_by_id=saba.id,
        )
    )

    await session.commit()


async def ensure_auth_users(session: AsyncSession) -> None:
    """Set passwords and roles for the demo accounts."""
    team_id = await session.scalar(select(Team.id).limit(1))
    for name, email, role in DEMO_USERS:
        user = await session.scalar(select(User).where(User.email == email))
        if not user:
            user = await session.scalar(select(User).where(User.name == name))
        if user:
            user.name = name
            user.email = email
            user.role = role
            user.is_active = True
            user.password_hash = hash_password(DEMO_AUTH_USERS[email])
            if user.team_id is None:
                user.team_id = team_id
        else:
            session.add(
                User(
                    name=name,
                    email=email,
                    role=role,
                    team_id=team_id,
                    is_active=True,
                    password_hash=hash_password(DEMO_AUTH_USERS[email]),
                )
            )
    await session.commit()


async def ensure_auth_schema(engine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"))
