export type PolicyLevel = 'organization' | 'team' | 'user';
export type NotificationChannel = 'push' | 'sms' | 'phone' | 'email' | 'teams' | 'in_app';
export type OnCallScheduleType = 'service_owner' | 'noc' | 'incident_commander' | 'incident_manager';
export type RotationFrequency = 'daily' | 'weekly' | 'custom';

export interface NotificationRule {
  id: number;
  policy_id: number;
  name: string;
  sort_order: number;
  priority_filter?: string;
  tier_filter?: string;
  time_of_day: string;
  on_call_only: boolean;
  event_type: string;
  channels: string[];
  delay_minutes: number;
  bundle_minutes?: number;
  suppress: boolean;
  is_mandatory: boolean;
}

export interface NotificationPolicy {
  id: number;
  name: string;
  level: PolicyLevel;
  team_id?: number;
  user_id?: number;
  description?: string;
  is_active: boolean;
  team_name?: string;
  user_name?: string;
  rules: NotificationRule[];
}

export interface NotificationLog {
  id: number;
  channel: NotificationChannel;
  event_type: string;
  subject: string;
  status: string;
  sent_at: string;
}

export interface OnCallShift {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  user?: { id: number; name: string; email: string; role: string };
}

export interface OnCallOverride {
  id: number;
  schedule_id: number;
  original_user_id: number;
  override_user_id: number;
  start_time: string;
  end_time: string;
  reason?: string;
  original_user?: { id: number; name: string; email: string; role: string };
  override_user?: { id: number; name: string; email: string; role: string };
}

export interface OnCallSchedule {
  id: number;
  name: string;
  schedule_type: OnCallScheduleType;
  team_id?: number;
  service_id?: number;
  rotation_frequency: RotationFrequency;
  timezone: string;
  is_active: boolean;
  team_name?: string;
  service_name?: string;
  current_on_call?: { id: number; name: string; email: string; role: string };
  shifts: OnCallShift[];
  overrides: OnCallOverride[];
}

export interface CurrentOnCall {
  schedule_id: number;
  schedule_name: string;
  schedule_type: OnCallScheduleType;
  user: { id: number; name: string; email: string; role: string };
  shift_start: string;
  shift_end: string;
  is_override: boolean;
}

export interface EscalationLevel {
  id: number;
  level_number: number;
  timeout_minutes: number;
  target_type: string;
  target_id?: number;
  target_label?: string;
}

export interface EscalationPolicy {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  levels: EscalationLevel[];
}
