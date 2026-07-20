export type AlertPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type AlertStatus = 'triggered' | 'acknowledged' | 'snoozed' | 'resolved';
export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type IncidentStatus = 'open' | 'in_progress' | 'pending_teams' | 'closed';
export type ChangeType = 'standard' | 'normal' | 'emergency' | 'custom';
export type ChangeStatus = 'submitted' | 'reviewing' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'rolled_back' | 'failed' | 'rejected';
export type ChangeRisk = 'low' | 'medium' | 'high' | 'critical';
export type ServiceTier = 1 | 2 | 3;

export interface UserBrief {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  team_id?: number;
  team?: { id: number; name: string };
}

export interface ServiceBrief {
  id: number;
  name: string;
  tier: ServiceTier;
  health_score: number;
}

export interface Service extends ServiceBrief {
  description?: string;
  team_id?: number;
  owner_id?: number;
  github_repo?: string;
  confluence_runbook_url?: string;
  monitoring_dashboard_url?: string;
  dependency_threshold: number;
  created_at: string;
  team?: { id: number; name: string };
  owner?: UserBrief;
  active_alerts: number;
  open_incidents: number;
}

export interface AlertTimelineEntry {
  id: number;
  entry_type: string;
  content: string;
  created_at: string;
  author?: UserBrief;
}

export interface Alert {
  id: number;
  title: string;
  description?: string;
  priority: AlertPriority;
  status: AlertStatus;
  source: string;
  service_id?: number;
  assignee_id?: number;
  occurrence_count: number;
  snooze_reason?: string;
  snoozed_until?: string;
  resolution_summary?: string;
  root_cause?: string;
  incident_id?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  service?: ServiceBrief;
  assignee?: UserBrief;
  responsible_team?: { id: number; name: string };
  latest_note?: string;
  timeline: AlertTimelineEntry[];
}

export interface IncidentTimelineEntry {
  id: number;
  entry_type: string;
  content: string;
  created_at: string;
  author?: UserBrief;
}

export interface ActionItem {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: AlertPriority;
  owner_id?: number;
  due_date?: string;
  created_at: string;
  owner?: UserBrief;
}

export interface IncidentSourceAlert {
  id: number;
  title: string;
  priority: AlertPriority;
  status: AlertStatus;
  created_at: string;
}

export interface Incident {
  id: number;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category?: string;
  business_impact?: string;
  resolution_summary?: string;
  root_cause?: string;
  manager_id?: number;
  commander_id?: number;
  war_room_url?: string;
  pir_due_at?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  manager?: UserBrief;
  commander?: UserBrief;
  services: ServiceBrief[];
  timeline: IncidentTimelineEntry[];
  action_items: ActionItem[];
  source_alerts: IncidentSourceAlert[];
}

export interface Change {
  id: number;
  title: string;
  description?: string;
  change_type: ChangeType;
  risk: ChangeRisk;
  risk_score: number;
  risk_reasoning?: string;
  status: ChangeStatus;
  service_id?: number;
  submitter_id?: number;
  implementation_plan?: string;
  rollback_plan?: string;
  potential_business_impact?: string;
  affected_scope?: string;
  expected_downtime?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_at: string;
  updated_at: string;
  service?: ServiceBrief;
  submitter?: UserBrief;
}

export type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

export interface EngineerResolvedCount {
  engineer_id: number;
  engineer_name: string;
  count: number;
}

export interface DashboardStats {
  period: DashboardPeriod;
  active_alerts: number;
  alerts_by_priority: Record<string, number>;
  alerts_resolved_by_engineer: EngineerResolvedCount[];
  open_incidents: number;
  incidents_by_severity: Record<string, number>;
  pending_changes: number;
  pending_teams: number;
  sla_at_risk: number;
  sla_compliance_percent: number;
}

export interface FreezeBanner {
  active: boolean;
  title?: string;
  reason?: string;
  end_time?: string;
}
