from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Alert, AlertPriority
from app.schemas.schemas import AlertsTrendPoint

TREND_DAYS = 7

PRIORITY_TO_SEVERITY = {
    AlertPriority.P1: "critical",
    AlertPriority.P2: "high",
    AlertPriority.P3: "medium",
    AlertPriority.P4: "low",
    AlertPriority.P5: "low",
}


def _day_bounds(day_offset: int, now: datetime) -> tuple[datetime, datetime]:
    day = (now - timedelta(days=day_offset)).date()
    start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return start, end


async def build_alerts_trend(db: AsyncSession) -> list[AlertsTrendPoint]:
    now = datetime.now(timezone.utc)
    points: list[AlertsTrendPoint] = []

    for offset in range(TREND_DAYS - 1, -1, -1):
        start, end = _day_bounds(offset, now)
        rows = await db.execute(
            select(Alert.priority, func.count())
            .where(Alert.created_at >= start, Alert.created_at < end)
            .group_by(Alert.priority)
        )

        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for priority, count in rows.all():
            severity = PRIORITY_TO_SEVERITY.get(priority)
            if severity:
                counts[severity] += count

        points.append(
            AlertsTrendPoint(
                date=start.date().isoformat(),
                label=start.strftime("%a"),
                critical=counts["critical"],
                high=counts["high"],
                medium=counts["medium"],
                low=counts["low"],
            )
        )

    return points
