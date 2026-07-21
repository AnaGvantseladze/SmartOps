import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';

const PRIORITY_ORDER = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;

const PRIORITY_COLORS: Record<(typeof PRIORITY_ORDER)[number], string> = {
  P1: '#F2495C',
  P2: '#FF9830',
  P3: '#FADE2A',
  P4: '#5794F2',
  P5: '#B0B8C4',
};

interface AlertsByPriorityDonutProps {
  alertsByPriority: Record<string, number>;
}

interface ChartSlice {
  priority: (typeof PRIORITY_ORDER)[number];
  name: string;
  value: number;
  color: string;
  percent: number;
}

interface TooltipPayloadItem {
  payload: ChartSlice;
}

function DonutTooltip({
  active,
  payload,
  isDark,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  isDark: boolean;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: isDark ? '#181B1F' : '#FFFFFF',
        borderColor: isDark ? '#2A2F36' : '#E2E8F0',
        color: isDark ? '#D8D9DA' : '#334155',
      }}
    >
      <div className="flex items-center gap-2 font-medium">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
        {item.priority}
      </div>
      <div className="mt-1 font-mono tabular-nums">
        {item.value} alerts ({item.percent}%)
      </div>
    </div>
  );
}

export function AlertsByPriorityDonut({ alertsByPriority }: AlertsByPriorityDonutProps) {
  const { isDark } = useTheme();

  const total = PRIORITY_ORDER.reduce((sum, priority) => sum + (alertsByPriority[priority] ?? 0), 0);

  const slices: ChartSlice[] = PRIORITY_ORDER.map((priority) => {
    const value = alertsByPriority[priority] ?? 0;
    return {
      priority,
      name: priority,
      value,
      color: PRIORITY_COLORS[priority],
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
    };
  });

  const chartData = slices.filter((slice) => slice.value > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div>
          <CardTitle>Alerts by Priority</CardTitle>
          <CardDescription>Distribution of alerts created in the selected time range</CardDescription>
        </div>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300"
        >
          Open console
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {total === 0 ? (
          <EmptyState title="No alerts" message="No alerts were created in this time range." />
        ) : (
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <div className="relative h-[240px] w-full max-w-[280px] shrink-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {chartData.map((slice) => (
                      <Cell key={slice.priority} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip isDark={isDark} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {total}
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Total alerts
                </span>
              </div>
            </div>

            <div className="w-full flex-1 space-y-2 md:max-w-sm">
              {slices.map((slice) => (
                <div
                  key={slice.priority}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{slice.priority}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm tabular-nums">
                    <span className="text-slate-500 dark:text-slate-400">{slice.percent}%</span>
                    <span className="min-w-[2rem] text-right font-semibold text-slate-900 dark:text-slate-100">
                      {slice.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
