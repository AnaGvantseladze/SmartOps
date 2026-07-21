import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AlertsTrendPoint } from '@/types';

const SERIES = [
  { key: 'critical' as const, label: 'Critical', color: '#F2495C' },
  { key: 'high' as const, label: 'High', color: '#FF9830' },
  { key: 'medium' as const, label: 'Medium', color: '#FADE2A' },
  { key: 'low' as const, label: 'Low', color: '#73BF69' },
];

interface AlertsTrendChartProps {
  data: AlertsTrendPoint[];
}

interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  isDark: boolean;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: isDark ? '#181B1F' : '#FFFFFF',
        borderColor: isDark ? '#2A2F36' : '#E2E8F0',
        color: isDark ? '#D8D9DA' : '#334155',
      }}
    >
      <div className="mb-1.5 font-medium">{label}</div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-mono font-semibold tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
      <div
        className="mt-1.5 border-t pt-1.5 font-medium tabular-nums"
        style={{ borderColor: isDark ? '#2A2F36' : '#E2E8F0' }}
      >
        Total: {total}
      </div>
    </div>
  );
}

export function AlertsTrendChart({ data }: AlertsTrendChartProps) {
  const { isDark } = useTheme();

  const axisColor = isDark ? '#8E8E8E' : '#64748B';
  const gridColor = isDark ? '#2A2F36' : '#E2E8F0';
  const legendColor = isDark ? '#C7D0D9' : '#475569';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle>Alerts Trend</CardTitle>
          <CardDescription>Alert volume by severity over the last 7 days</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[280px] w-full min-w-0 sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                dy={8}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                content={<ChartTooltip isDark={isDark} />}
                cursor={{ stroke: isDark ? '#4A5568' : '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: legendColor, paddingTop: 12 }}
              />
              {SERIES.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
