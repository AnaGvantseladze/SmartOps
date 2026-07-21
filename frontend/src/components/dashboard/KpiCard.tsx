import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  GitPullRequest,
  Minus,
  Phone,
  Siren,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardKpi, KpiStatus } from '@/types';

const KPI_ICONS: Record<string, React.ElementType> = {
  active_alerts: AlertTriangle,
  open_incidents: Siren,
  pending_changes: GitPullRequest,
  engineers_on_call: Phone,
  system_uptime: TrendingUp,
  mttr: Clock,
};

const STATUS_STYLES: Record<KpiStatus, { dot: string; spark: string; ring: string }> = {
  good: {
    dot: 'bg-emerald-500',
    spark: 'stroke-emerald-500',
    ring: 'ring-emerald-500/20',
  },
  warning: {
    dot: 'bg-amber-500',
    spark: 'stroke-amber-500',
    ring: 'ring-amber-500/20',
  },
  critical: {
    dot: 'bg-red-500',
    spark: 'stroke-red-500',
    ring: 'ring-red-500/20',
  },
  neutral: {
    dot: 'bg-blue-500',
    spark: 'stroke-blue-500',
    ring: 'ring-blue-500/20',
  },
};

const ICON_STYLES: Record<string, string> = {
  active_alerts: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400',
  open_incidents: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  pending_changes: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
  engineers_on_call: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
  system_uptime: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  mttr: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) {
    return <svg viewBox="0 0 80 28" className={cn('h-7 w-20', className)} aria-hidden />;
  }

  const width = 80;
  const height = 28;
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-7 w-20', className)} aria-hidden>
      <polygon points={areaPoints} className="fill-current opacity-10" />
      <polyline
        points={points.join(' ')}
        fill="none"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="fill-none"
      />
    </svg>
  );
}

function TrendBadge({ percent, higherIsBetter }: { percent: number; higherIsBetter: boolean }) {
  const isFlat = Math.abs(percent) < 0.05;
  const isUp = percent > 0;
  const isPositive = higherIsBetter ? isUp : !isUp;

  if (isFlat) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Minus className="h-3 w-3" />
        0% vs yesterday
      </span>
    );
  }

  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(percent).toFixed(1)}% vs yesterday
    </span>
  );
}

interface KpiCardProps {
  kpi: DashboardKpi;
}

export function KpiCard({ kpi }: KpiCardProps) {
  const Icon = KPI_ICONS[kpi.id] ?? AlertTriangle;
  const statusStyle = STATUS_STYLES[kpi.status];
  const iconStyle = ICON_STYLES[kpi.id] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

  const content = (
    <Card
      className={cn(
        'group relative overflow-hidden transition-shadow hover:shadow-md',
        kpi.href && 'cursor-pointer',
        statusStyle.ring,
        'ring-1 ring-inset'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', statusStyle.dot)}
                title={kpi.status}
                aria-label={`Status: ${kpi.status}`}
              />
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {kpi.label}
              </p>
            </div>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {kpi.display_value}
            </p>
            <div className="mt-1.5">
              <TrendBadge percent={kpi.trend_percent} higherIsBetter={kpi.higher_is_better} />
            </div>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconStyle)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            7-day trend
          </p>
          <Sparkline data={kpi.sparkline} className={cn(statusStyle.spark)} />
        </div>
      </CardContent>
    </Card>
  );

  return kpi.href ? <Link to={kpi.href}>{content}</Link> : content;
}
