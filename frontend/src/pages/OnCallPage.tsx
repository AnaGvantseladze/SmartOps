import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, RefreshCw, Shield, User, Users, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';
import { cn } from '@/lib/utils';
import type { CurrentOnCall, OnCallSchedule, OnCallScheduleType } from '@/types/notifications';

const scheduleTypeConfig: Record<
  OnCallScheduleType,
  { label: string; color: string; icon: React.ElementType }
> = {
  service_owner: { label: 'Service Owner', color: 'text-blue-600', icon: User },
  noc: { label: 'NOC Coverage', color: 'text-red-600', icon: Shield },
  incident_commander: { label: 'Incident Commander', color: 'text-amber-600', icon: Shield },
  incident_manager: { label: 'Incident Manager', color: 'text-purple-600', icon: Users },
};

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function OnCallPage() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [overrideScheduleId, setOverrideScheduleId] = useState<number | null>(null);

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

  const { data: users = [] } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: api.getAssignableUsers,
    enabled: overrideScheduleId != null,
  });

  const createOverride = useMutation({
    mutationFn: api.createOnCallOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['on-call-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['on-call-current'] });
      setOverrideScheduleId(null);
      toast.success('On-call override created');
    },
    onError: (err: Error) => toast.error('Failed to create override', err.message),
  });

  if (loadingCurrent || loadingSchedules) {
    return <div className="page-container text-slate-500">Loading on-call schedules...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">On-Call Schedules</h1>
        <p className="page-subtitle">Manage rotations, overrides, and escalation policies</p>
      </div>

      {current.length > 0 && (
        <div className="mb-8">
          <h2 className="section-title mb-4">Who&apos;s On-Call Now</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {current.map((entry) => (
              <CurrentOnCallCard key={entry.schedule_id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="section-title mb-4">Schedules</h2>
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onManageOverride={() => setOverrideScheduleId(schedule.id)}
            />
          ))}
        </div>
      </div>

      {overrideScheduleId != null && (
        <OverrideModal
          schedule={schedules.find((s) => s.id === overrideScheduleId)!}
          users={users}
          isSubmitting={createOverride.isPending}
          onClose={() => setOverrideScheduleId(null)}
          onSubmit={(data) => createOverride.mutate(data)}
        />
      )}

      {escalations.length > 0 && (
        <div>
          <h2 className="section-title mb-4">Escalation Policies</h2>
          {escalations.map((policy) => (
            <div key={policy.id} className="card p-5">
              <h3 className="font-display font-semibold text-slate-900">{policy.name}</h3>
              {policy.description && (
                <p className="mt-1 text-sm text-slate-600">{policy.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {policy.levels.map((level, idx) => (
                  <div key={level.id} className="flex items-center gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900">Level {level.level_number}</div>
                      <div className="text-xs text-slate-500">{level.target_label}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" />
                        {level.timeout_minutes} min timeout
                      </div>
                    </div>
                    {idx < policy.levels.length - 1 && (
                      <span className="text-slate-400">→</span>
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
          <span className="badge border bg-purple-50 text-purple-700 border-purple-200">Override</span>
        )}
      </div>
      <div className="text-lg font-semibold text-slate-900">{entry.user.name}</div>
      <div className="text-xs text-slate-500">{entry.schedule_name}</div>
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
        <Calendar className="h-3 w-3" />
        until {new Date(entry.shift_end).toLocaleDateString()}
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule,
  onManageOverride,
}: {
  schedule: OnCallSchedule;
  onManageOverride: () => void;
}) {
  const config = scheduleTypeConfig[schedule.schedule_type];
  const Icon = config.icon;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <Icon className={cn('h-5 w-5', config.color)} />
          <div>
            <h3 className="font-display font-semibold text-slate-900">{schedule.name}</h3>
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
            <div className="font-medium text-green-600">{schedule.current_on_call.name}</div>
          </div>
        )}
        <button type="button" className="btn-secondary ml-3 text-xs" onClick={onManageOverride}>
          <Plus className="h-3 w-3" /> Override
        </button>
      </div>

      <div className="px-5 py-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <RefreshCw className="h-4 w-4 text-slate-400" />
          Upcoming Shifts
        </h4>
        <div className="space-y-2">
          {schedule.shifts.slice(0, 4).map((shift) => {
            const isActive = new Date(shift.start_time) <= new Date() && new Date(shift.end_time) > new Date();
            return (
              <div
                key={shift.id}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                  isActive ? 'border border-green-200 bg-green-50' : 'bg-slate-50'
                )}
              >
                <span className={isActive ? 'font-medium text-green-700' : 'text-slate-700'}>
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
            <h4 className="mb-2 text-sm font-medium text-slate-700">Active Overrides</h4>
            {schedule.overrides.map((o) => (
              <div key={o.id} className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700">
                {o.original_user?.name} → {o.override_user?.name}
                {o.reason && <span className="text-purple-600/70"> — {o.reason}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OverrideModal({
  schedule,
  users,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  schedule: OnCallSchedule;
  users: { id: number; name: string }[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    schedule_id: number;
    original_user_id: number;
    override_user_id: number;
    start_time: string;
    end_time: string;
    reason?: string;
  }) => void;
}) {
  const defaultOriginal = schedule.current_on_call?.id ?? schedule.shifts[0]?.user_id ?? users[0]?.id ?? 0;
  const [originalUserId, setOriginalUserId] = useState(String(defaultOriginal));
  const [overrideUserId, setOverrideUserId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/30" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Create override — {schedule.name}</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-2 py-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!originalUserId || !overrideUserId || !startTime || !endTime) return;
            onSubmit({
              schedule_id: schedule.id,
              original_user_id: Number(originalUserId),
              override_user_id: Number(overrideUserId),
              start_time: new Date(startTime).toISOString(),
              end_time: new Date(endTime).toISOString(),
              reason: reason.trim() || undefined,
            });
          }}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Original on-call</label>
            <select className="input w-full" value={originalUserId} onChange={(e) => setOriginalUserId(e.target.value)} required>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Override with</label>
            <select className="input w-full" value={overrideUserId} onChange={(e) => setOverrideUserId(e.target.value)} required>
              <option value="">Select engineer</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start</label>
              <input type="datetime-local" className="input w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End</label>
              <input type="datetime-local" className="input w-full" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
            <input className="input w-full" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create override'}
          </button>
        </form>
      </div>
    </div>
  );
}
