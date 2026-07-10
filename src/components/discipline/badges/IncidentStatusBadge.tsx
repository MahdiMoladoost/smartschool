import React from 'react';

import { DisciplineIncidentStatus } from '../types/discipline';
import { incidentStatusLabels } from '../utils/disciplineLabels';

export interface IncidentStatusBadgeProps {
  status: DisciplineIncidentStatus;
  className?: string;
}

const statusClassName: Record<DisciplineIncidentStatus, string> = {
  reported: 'discipline-status discipline-status--reported',
  investigating: 'discipline-status discipline-status--investigating',
  pending_approval: 'discipline-status discipline-status--pending-approval',
  resolved: 'discipline-status discipline-status--resolved',
  closed: 'discipline-status discipline-status--closed',
};

export function IncidentStatusBadge({ status, className = '' }: IncidentStatusBadgeProps): React.ReactElement {
  return (
    <span
      className={`${statusClassName[status]} ${className}`.trim()}
      data-status={status}
      aria-label={`Incident status: ${incidentStatusLabels[status]}`}
    >
      {incidentStatusLabels[status]}
    </span>
  );
}

export default IncidentStatusBadge;
