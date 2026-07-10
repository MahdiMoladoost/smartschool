import React, { useMemo, useState } from 'react';

import { DisciplineIncident, DisciplineIncidentStatus } from '../types/discipline';
import { incidentTypeLabels, formatDisciplineDate } from '../utils/disciplineLabels';
import IncidentStatusBadge from '../badges/IncidentStatusBadge';
import SeverityBadge from '../badges/SeverityBadge';
import IncidentTableFilters from './IncidentTableFilters';
import IncidentTableRowActions from './IncidentTableRowActions';
import useDisciplineIncidents from '../hooks/useDisciplineIncidents';
import { FetchIncidentsFilters } from '../../../services/disciplineService';

export interface IncidentTableProps {
  currentUserId?: number;
  initialFilters?: FetchIncidentsFilters;
  autoFetch?: boolean;
  className?: string;
  onNewIncident?: () => void;
  onViewIncident?: (incident: DisciplineIncident) => void;
  onEditIncident?: (incident: DisciplineIncident) => void;
  onAssignOfficer?: (incident: DisciplineIncident) => void;
  onNotifyParent?: (incident: DisciplineIncident) => void;
  onReferCounselor?: (incident: DisciplineIncident) => void;
  onCloseIncident?: (incident: DisciplineIncident) => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
}

const pageSizeOptions = [10, 20, 50, 100];

function getStudentLabel(incident: DisciplineIncident): string {
  const maybeExpanded = incident as DisciplineIncident & {
    student_name?: string;
    student_number?: string;
    class_name?: string;
  };

  if (maybeExpanded.student_name) {
    return maybeExpanded.student_number
      ? `${maybeExpanded.student_name} (${maybeExpanded.student_number})`
      : maybeExpanded.student_name;
  }

  return `Student #${incident.student_id}`;
}

function getReporterLabel(incident: DisciplineIncident): string {
  const maybeExpanded = incident as DisciplineIncident & { reported_by_name?: string };
  return maybeExpanded.reported_by_name ?? `User #${incident.reported_by}`;
}

function getClassLabel(incident: DisciplineIncident): string {
  const maybeExpanded = incident as DisciplineIncident & { class_name?: string };
  return maybeExpanded.class_name ?? '—';
}

export function IncidentTable({
  currentUserId,
  initialFilters,
  autoFetch = true,
  className = '',
  onNewIncident,
  onViewIncident,
  onEditIncident,
  onAssignOfficer,
  onNotifyParent,
  onReferCounselor,
  onCloseIncident,
  onExport,
}: IncidentTableProps): React.ReactElement {
  const {
    incidents,
    pagination,
    filters,
    isLoadingIncidents,
    isUpdatingStatus,
    error,
    lastUpdatedAt,
    mergeFilters,
    resetFilters,
    refreshIncidents,
    updateIncidentStatus,
    clearError,
  } = useDisciplineIncidents({ initialFilters, autoFetch });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected = incidents.length > 0 && incidents.every((incident) => selectedIdSet.has(incident.id));
  const disableActions = isLoadingIncidents || isUpdatingStatus;

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(incidents.map((incident) => incident.id));
      setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...incidents.map((incident) => incident.id)])));
  };

  const toggleRowSelection = (incidentId: number) => {
    setSelectedIds((current) =>
      current.includes(incidentId) ? current.filter((id) => id !== incidentId) : [...current, incidentId],
    );
  };

  const goToPage = (page: number) => {
    mergeFilters({ page });
  };

  const changePageSize = (event: React.ChangeEvent<HTMLSelectElement>) => {
    mergeFilters({ limit: Number(event.target.value), page: 1 });
  };

  const changeSort = (sort: NonNullable<FetchIncidentsFilters['sort']>) => {
    const nextOrder = filters.sort === sort && filters.order === 'asc' ? 'desc' : 'asc';
    mergeFilters({ sort, order: nextOrder, page: 1 });
  };

  const updateSelectedStatus = async (status: DisciplineIncidentStatus) => {
    if (!currentUserId || selectedIds.length === 0) return;

    await Promise.all(
      selectedIds.map((incidentId) =>
        updateIncidentStatus(incidentId, status, {
          updated_by: currentUserId,
          reason: `Bulk status update to ${status}`,
        }),
      ),
    );
    setSelectedIds([]);
  };

  const closeIncident = (incident: DisciplineIncident) => {
    if (onCloseIncident) {
      onCloseIncident(incident);
      return;
    }

    if (!currentUserId) return;
    void updateIncidentStatus(incident.id, 'closed', {
      updated_by: currentUserId,
      reason: 'Closed from incident table row action.',
    });
  };

  return (
    <section className={`discipline-table ${className}`.trim()} aria-labelledby="discipline-incident-table-title">
      <header className="discipline-table__header">
        <div>
          <h2 id="discipline-incident-table-title">Discipline Incident Register</h2>
          <p>Search, review, assign, notify, and close discipline cases.</p>
          {lastUpdatedAt ? <small>Last refreshed: {formatDisciplineDate(lastUpdatedAt)}</small> : null}
        </div>

        <div className="discipline-table__header-actions">
          <button type="button" onClick={onNewIncident} disabled={disableActions}>
            New Incident
          </button>
          <button type="button" onClick={() => void refreshIncidents()} disabled={disableActions}>
            Refresh
          </button>
          <button type="button" onClick={() => onExport?.('csv')} disabled={disableActions}>
            Export CSV
          </button>
          <button type="button" onClick={() => onExport?.('excel')} disabled={disableActions}>
            Export Excel
          </button>
          <button type="button" onClick={() => onExport?.('pdf')} disabled={disableActions}>
            Export PDF
          </button>
        </div>
      </header>

      <IncidentTableFilters
        value={filters}
        disabled={disableActions}
        onChange={mergeFilters}
        onReset={resetFilters}
      />

      {selectedIds.length > 0 ? (
        <div className="discipline-table__bulk-actions" role="region" aria-label="Bulk incident actions">
          <strong>{selectedIds.length} selected</strong>
          <button type="button" disabled={disableActions || !currentUserId} onClick={() => void updateSelectedStatus('investigating')}>
            Mark Investigating
          </button>
          <button type="button" disabled={disableActions || !currentUserId} onClick={() => void updateSelectedStatus('resolved')}>
            Mark Resolved
          </button>
          <button type="button" disabled={disableActions || !currentUserId} onClick={() => void updateSelectedStatus('closed')}>
            Close Selected
          </button>
          <button type="button" disabled={disableActions} onClick={() => setSelectedIds([])}>
            Clear Selection
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="discipline-table__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="discipline-table__table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">
                <input
                  type="checkbox"
                  aria-label="Select all visible incidents"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  disabled={disableActions || incidents.length === 0}
                />
              </th>
              <th scope="col">
                <button type="button" onClick={() => changeSort('created_at')} disabled={disableActions}>
                  Incident
                </button>
              </th>
              <th scope="col">Student</th>
              <th scope="col">Class</th>
              <th scope="col">
                <button type="button" onClick={() => changeSort('incident_type')} disabled={disableActions}>
                  Type
                </button>
              </th>
              <th scope="col">
                <button type="button" onClick={() => changeSort('severity')} disabled={disableActions}>
                  Severity
                </button>
              </th>
              <th scope="col">
                <button type="button" onClick={() => changeSort('status')} disabled={disableActions}>
                  Status
                </button>
              </th>
              <th scope="col">Reported By</th>
              <th scope="col">Created</th>
              <th scope="col">Updated</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingIncidents ? (
              <tr>
                <td colSpan={11}>Loading discipline incidents…</td>
              </tr>
            ) : null}

            {!isLoadingIncidents && incidents.length === 0 ? (
              <tr>
                <td colSpan={11}>No discipline incidents match the current filters.</td>
              </tr>
            ) : null}

            {!isLoadingIncidents
              ? incidents.map((incident) => (
                  <tr key={incident.id} data-incident-id={incident.id} data-severity={incident.severity}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select incident ${incident.id}`}
                        checked={selectedIdSet.has(incident.id)}
                        onChange={() => toggleRowSelection(incident.id)}
                        disabled={disableActions}
                      />
                    </td>
                    <td>#{incident.id}</td>
                    <td>{getStudentLabel(incident)}</td>
                    <td>{getClassLabel(incident)}</td>
                    <td>{incidentTypeLabels[incident.incident_type]}</td>
                    <td>
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td>
                      <IncidentStatusBadge status={incident.status} />
                    </td>
                    <td>{getReporterLabel(incident)}</td>
                    <td>{formatDisciplineDate(incident.created_at)}</td>
                    <td>{formatDisciplineDate(incident.updated_at)}</td>
                    <td>
                      <IncidentTableRowActions
                        incident={incident}
                        disabled={disableActions}
                        onViewIncident={onViewIncident}
                        onEditIncident={onEditIncident}
                        onAssignOfficer={onAssignOfficer}
                        onNotifyParent={onNotifyParent}
                        onReferCounselor={onReferCounselor}
                        onCloseIncident={closeIncident}
                      />
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <footer className="discipline-table__pagination" aria-label="Discipline incident pagination">
        <span>
          Page {pagination?.page ?? filters.page ?? 1} of {pagination?.total_pages ?? 1}
        </span>
        <span>Total: {pagination?.total ?? incidents.length}</span>
        <label>
          Page size
          <select value={filters.limit ?? 20} onChange={changePageSize} disabled={disableActions}>
            {pageSizeOptions.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => goToPage(Math.max(1, (pagination?.page ?? filters.page ?? 1) - 1))}
          disabled={disableActions || (pagination?.page ?? filters.page ?? 1) <= 1}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => goToPage((pagination?.page ?? filters.page ?? 1) + 1)}
          disabled={disableActions || (pagination?.page ?? 1) >= (pagination?.total_pages ?? 1)}
        >
          Next
        </button>
      </footer>
    </section>
  );
}

export default IncidentTable;
