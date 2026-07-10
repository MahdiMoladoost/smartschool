import React from 'react';

import { DisciplineSeverity } from '../types/discipline';
import { severityLabels } from '../utils/disciplineLabels';

export interface SeverityBadgeProps {
  severity: DisciplineSeverity;
  className?: string;
}

const severityClassName: Record<DisciplineSeverity, string> = {
  low: 'discipline-badge discipline-badge--low',
  medium: 'discipline-badge discipline-badge--medium',
  high: 'discipline-badge discipline-badge--high',
  critical: 'discipline-badge discipline-badge--critical',
};

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps): React.ReactElement {
  return (
    <span
      className={`${severityClassName[severity]} ${className}`.trim()}
      data-severity={severity}
      aria-label={`Severity: ${severityLabels[severity]}`}
    >
      {severityLabels[severity]}
    </span>
  );
}

export default SeverityBadge;
