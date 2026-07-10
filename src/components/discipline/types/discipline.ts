/**
 * Discipline & Behavior System data contracts.
 *
 * These interfaces mirror the RDBMS discipline_incidents contract and are meant
 * to be reused by dashboard widgets, tables, modals, forms, and API clients.
 */

export type DisciplineSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DisciplineIncidentStatus =
  | 'reported'
  | 'investigating'
  | 'pending_approval'
  | 'resolved'
  | 'closed';

export type DisciplineIncidentType =
  | 'classroom_disruption'
  | 'disrespect'
  | 'fighting'
  | 'bullying'
  | 'property_damage'
  | 'attendance_related'
  | 'academic_misconduct'
  | 'safety_violation'
  | 'other';

export interface DisciplineIncident {
  id: number;
  student_id: number;
  incident_type: DisciplineIncidentType;
  severity: DisciplineSeverity;
  description: string;
  reported_by: number;
  evidence_attachment_reference: string | null;
  status: DisciplineIncidentStatus;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input accepted by the New Discipline Incident form before backend-managed
 * fields such as id, status, created_by, updated_by, created_at, and updated_at
 * are applied by the server/database layer.
 */
export interface DisciplineIncidentCreateInput {
  student_id: number;
  incident_type: DisciplineIncidentType;
  severity: DisciplineSeverity;
  description: string;
  reported_by: number;
  evidence_attachment_reference?: string | null;
}

export interface DisciplineIncidentUpdateInput {
  incident_type?: DisciplineIncidentType;
  severity?: DisciplineSeverity;
  description?: string;
  evidence_attachment_reference?: string | null;
  status?: DisciplineIncidentStatus;
  updated_by: number;
}

export interface DisciplineStudentOption {
  id: number;
  student_number?: string | null;
  full_name: string;
  class_name?: string | null;
  grade_name?: string | null;
}

export interface DisciplineUserOption {
  id: number;
  full_name: string;
  role?: string | null;
}

export interface DisciplineKpiValue {
  value: number;
  previous_value?: number;
  trend_percent?: number;
}

export interface ParentNotificationStats {
  notified: number;
  pending: number;
  failed: number;
  acknowledged: number;
}

export interface CounselorReferralStats {
  total: number;
  pending_review: number;
  active_followups: number;
}

export interface DisciplineDashboardStats {
  total_incidents: DisciplineKpiValue;
  open_cases: DisciplineKpiValue;
  high_critical_incidents: DisciplineKpiValue;
  repeat_behavior_cases: DisciplineKpiValue;
  parent_notification_status: ParentNotificationStats;
  counselor_referrals: CounselorReferralStats;
  recent_incidents: DisciplineIncident[];
  updated_at: string;
}
