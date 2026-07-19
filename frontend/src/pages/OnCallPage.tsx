import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, RefreshCw, Shield, User, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CurrentOnCall, OnCallSchedule, OnCallScheduleType } from '@/types/notifications';

const scheduleTypeConfig: Record<
  OnCallScheduleType,
  { label: string; color: string; icon: React.ElementType }
> = {
  service_owner: { label: 'Service Owner', color: 'text-blue-400', icon: User },
  noc: { label: 'NOC Coverage', color: 'text-red-400', icon: Shield },
  incident_commander: { label: 'Incident Commander', color: 'text-amber-400', icon: Shield },
  incident_manager: { label: 'Incident Manager', color: 'text-purple-400', icon: Users },
};

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function OnCallPage() {
  const { data: current = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ['on-call-current'],
    queryFn: api.getCurrentOnCall,
    refetchInterval: 60000,
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['on-call-schedules'],
    queryFn: api.getOnCallSchedules,
  });

  const { data: escalations = [] } = useQuery({
    queryKey: ['escalation-policies'],
    queryFn: api.getEscalationPolicies,
  });

  if (loadingCurrent || loadingSchedules) {
    return <div className="p-8 text-slate-400">Loading on-call schedules...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">On-Call Schedules</h1>
        <p className="text-slate-400">Manage rotations, overrides, and escalation policies</p>
      </div>

      {current.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Who&apos;s On-Call Now</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {current.map((entry) => (
              <CurrentOnCallCard key={entry.schedule_id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-white">Schedules</h2>
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <ScheduleCard key={schedule.id} schedule={schedule} />
          ))}
        </div>
      </div>

      {escalations.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Escalation Policies</h2>
          {escalations.map((policy) => (
            <div key={policy.id} className="card p-5">
              <h3 className="font-semibold text-white">{policy.name}</h3>
              {policy.description && (
                <p className="mt-1 text-sm text-slate-400">{policy.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {policy.levels.map((level, idx) => (
                  <div key={level.id} className="flex items-center gap-2">
                    <div className="rounded-md border border-ops-border bg-ops-bg px-3 py-2 text-sm">
                      <div className="font-medium text-white">Level {level.level_number}</div>
                      <div className="text-xs text-slate-500">{level.target_label}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                        <Clock className="h-3 w-3" />
                        {level.timeout_minutes} min timeout
                      </div>
                    </div>
                    {idx < policy.levels.length - 1 && (
                      <span className="text-slate-600">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CurrentOnCallCard({ entry }: { entry: CurrentOnCall }) {
  const config = scheduleTypeConfig[entry.schedule_type];
  const Icon = config.icon;

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
        {entry.is_override && (
          <span className="badge bg-purple-500/20 text-purple-400">Override</span>
        )}
      </div>
      <div className="text-lg font-semibold text-white">{entry.user.name}</div>
      <div className="text-xs text-slate-500">{entry.schedule_name}</div>
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <Calendar className="h-3 w-3" />
        until {new Date(entry.shift_end).toLocaleDateString()}
      </div>
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: OnCallSchedule }) {
  const config = scheduleTypeConfig[schedule.schedule_type];
  const Icon = config.icon;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between border-b border-ops-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Icon className={cn('h-5 w-5', config.color)} />
          <div>
            <h3 className="font-semibold text-white">{schedule.name}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span>{config.label}</span>
              <span>·</span>
              <span className="capitalize">{schedule.rotation_frequency} rotation</span>
              <span>·</span>
              <span>{schedule.timezone}</span>
              {schedule.team_name && (
                <>
                  <span>·</span>
                  <span>{schedule.team_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {schedule.current_on_call && (
          <div className="text-right">
            <div className="text-xs text-slate-500">Current</div>
            <div className="font-medium text-green-400">{schedule.current_on_call.name}</div>
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
          <RefreshCw className="h-4 w-4" />
          Upcoming Shifts
        </h4>
        <div className="space-y-2">
          {schedule.shifts.slice(0, 4).map((shift) => {
            const isActive = new Date(shift.start_time) <= new Date() && new Date(shift.end_time) > new Date();
            return (
              <div
                key={shift.id}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm',
                  isActive ? 'bg-green-500/10 border border-green-500/20' : 'bg-ops-bg'
                )}
              >
                <span className={isActive ? 'font-medium text-green-300' : 'text-slate-300'}>
                  {shift.user?.name ?? `User #${shift.user_id}`}
                </span>
                <span className="text-xs text-slate-500">
                  {formatDateRange(shift.start_time, shift.end_time)}
                </span>
              </div>
            );
          })}
        </div>

        {schedule.overrides.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-medium text-slate-300">Active Overrides</h4>
            {schedule.overrides.map((o) => (
              <div key={o.id} className="rounded-md bg-purple-500/10 px-3 py-2 text-sm text-purple-300">
                {o.original_user?.name} → {o.override_user?.name}
                {o.reason && <span className="text-purple-400/70"> — {o.reason}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
