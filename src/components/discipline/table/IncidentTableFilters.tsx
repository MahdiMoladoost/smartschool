import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import {
  DisciplineIncidentStatus,
  DisciplineIncidentType,
  DisciplineSeverity,
} from '../types/discipline';
import {
  incidentStatusLabels,
  incidentTypeLabels,
  severityLabels,
} from '../utils/disciplineLabels';
import { FetchIncidentsFilters } from '../../../services/disciplineService';

export interface IncidentTableFiltersProps {
  value: FetchIncidentsFilters;
  disabled?: boolean;
  onChange: (filters: FetchIncidentsFilters) => void;
  onReset: () => void;
}

interface LocalFilterState {
  search: string;
  severity: '' | DisciplineSeverity;
  status: '' | DisciplineIncidentStatus;
  incident_type: '' | DisciplineIncidentType;
  date_from: string;
  date_to: string;
}

const severityOptions: DisciplineSeverity[] = ['low', 'medium', 'high', 'critical'];
const statusOptions: DisciplineIncidentStatus[] = ['reported', 'investigating', 'pending_approval', 'resolved', 'closed'];
const incidentTypeOptions: DisciplineIncidentType[] = [
  'classroom_disruption',
  'disrespect',
  'fighting',
  'bullying',
  'property_damage',
  'attendance_related',
  'academic_misconduct',
  'safety_violation',
  'other',
];

function fromFilters(filters: FetchIncidentsFilters): LocalFilterState {
  return {
    search: filters.search ?? '',
    severity: filters.severity ?? '',
    status: filters.status ?? '',
    incident_type: filters.incident_type ?? '',
    date_from: filters.date_from ?? '',
    date_to: filters.date_to ?? '',
  };
}

function toFilters(local: LocalFilterState): FetchIncidentsFilters {
  return {
    search: local.search.trim() || undefined,
    severity: local.severity || undefined,
    status: local.status || undefined,
    incident_type: local.incident_type || undefined,
    date_from: local.date_from || undefined,
    date_to: local.date_to || undefined,
    page: 1,
  };
}

export function IncidentTableFilters({
  value,
  disabled = false,
  onChange,
  onReset,
}: IncidentTableFiltersProps): React.ReactElement {
  const [localFilters, setLocalFilters] = useState<LocalFilterState>(() => fromFilters(value));

  useEffect(() => {
    setLocalFilters(fromFilters(value));
  }, [value]);

  const updateLocalFilter = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value: nextValue } = event.target;
    setLocalFilters((current) => ({ ...current, [name]: nextValue }));
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onChange(toFilters(localFilters));
  };

  return (
    <form className="discipline-table__filters" onSubmit={submitFilters} aria-label="Discipline incident filters">
      <label>
        Search
        <input
          type="search"
          name="search"
          value={localFilters.search}
          onChange={updateLocalFilter}
          placeholder="Student, incident ID, reporter"
          disabled={disabled}
        />
      </label>

      <label>
        Severity
        <select name="severity" value={localFilters.severity} onChange={updateLocalFilter} disabled={disabled}>
          <option value="">All severities</option>
          {severityOptions.map((severity) => (
            <option key={severity} value={severity}>
              {severityLabels[severity]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Status
        <select name="status" value={localFilters.status} onChange={updateLocalFilter} disabled={disabled}>
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {incidentStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Type
        <select name="incident_type" value={localFilters.incident_type} onChange={updateLocalFilter} disabled={disabled}>
          <option value="">All incident types</option>
          {incidentTypeOptions.map((incidentType) => (
            <option key={incidentType} value={incidentType}>
              {incidentTypeLabels[incidentType]}
            </option>
          ))}
        </select>
      </label>

      <label>
        From
        <input type="date" name="date_from" value={localFilters.date_from} onChange={updateLocalFilter} disabled={disabled} />
      </label>

      <label>
        To
        <input type="date" name="date_to" value={localFilters.date_to} onChange={updateLocalFilter} disabled={disabled} />
      </label>

      <div className="discipline-table__filter-actions">
        <button type="submit" disabled={disabled}>
          Apply Filters
        </button>
        <button type="button" onClick={onReset} disabled={disabled}>
          Reset
        </button>
      </div>
    </form>
  );
}

export default IncidentTableFilters;
