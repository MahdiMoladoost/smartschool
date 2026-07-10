import {
  DisciplineIncidentStatus,
  DisciplineIncidentType,
  DisciplineSeverity,
} from '../types/discipline';

export const severityLabels: Record<DisciplineSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const incidentStatusLabels: Record<DisciplineIncidentStatus, string> = {
  reported: 'Reported',
  investigating: 'Investigating',
  pending_approval: 'Pending Approval',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const incidentTypeLabels: Record<DisciplineIncidentType, string> = {
  classroom_disruption: 'Classroom Disruption',
  disrespect: 'Disrespect',
  fighting: 'Fighting',
  bullying: 'Bullying',
  property_damage: 'Property Damage',
  attendance_related: 'Attendance Related',
  academic_misconduct: 'Academic Misconduct',
  safety_violation: 'Safety Violation',
  other: 'Other',
};

export const severityRank: Record<DisciplineSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function formatDisciplineDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
