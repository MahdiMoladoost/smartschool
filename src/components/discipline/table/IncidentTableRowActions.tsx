import React from 'react';

import { DisciplineIncident } from '../types/discipline';

export interface IncidentTableRowActionsProps {
  incident: DisciplineIncident;
  disabled?: boolean;
  onViewIncident?: (incident: DisciplineIncident) => void;
  onEditIncident?: (incident: DisciplineIncident) => void;
  onAssignOfficer?: (incident: DisciplineIncident) => void;
  onNotifyParent?: (incident: DisciplineIncident) => void;
  onReferCounselor?: (incident: DisciplineIncident) => void;
  onCloseIncident?: (incident: DisciplineIncident) => void;
}

export function IncidentTableRowActions({
  incident,
  disabled = false,
  onViewIncident,
  onEditIncident,
  onAssignOfficer,
  onNotifyParent,
  onReferCounselor,
  onCloseIncident,
}: IncidentTableRowActionsProps): React.ReactElement {
  const isClosed = incident.status === 'closed';

  return (
    <div className="discipline-table__row-actions" aria-label={`Actions for incident ${incident.id}`}>
      <button type="button" onClick={() => onViewIncident?.(incident)} disabled={disabled}>
        View
      </button>
      <button type="button" onClick={() => onEditIncident?.(incident)} disabled={disabled || isClosed}>
        Edit
      </button>
      <button type="button" onClick={() => onAssignOfficer?.(incident)} disabled={disabled || isClosed}>
        Assign
      </button>
      <button type="button" onClick={() => onNotifyParent?.(incident)} disabled={disabled || isClosed}>
        Notify Parent
      </button>
      <button type="button" onClick={() => onReferCounselor?.(incident)} disabled={disabled || isClosed}>
        Refer Counselor
      </button>
      <button type="button" onClick={() => onCloseIncident?.(incident)} disabled={disabled || isClosed}>
        Close
      </button>
    </div>
  );
}

export default IncidentTableRowActions;
