import React, { FormEvent, useMemo, useState } from 'react';
import { z } from 'zod';
import type {
  DisciplineIncidentCreateInput,
  DisciplineIncidentType,
  DisciplineSeverity,
  DisciplineStudentOption,
  DisciplineUserOption,
} from '../types/discipline';
import {
  disciplineIncidentCreateSchema,
  getFieldError,
  type DisciplineIncidentCreateFormValues,
} from '../schemas/incidentSchema';

const INCIDENT_TYPES: Array<{ value: DisciplineIncidentType; label: string }> = [
  { value: 'classroom_disruption', label: 'Classroom Disruption' },
  { value: 'disrespect', label: 'Disrespect' },
  { value: 'fighting', label: 'Fighting' },
  { value: 'bullying', label: 'Bullying' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'attendance_related', label: 'Attendance Related' },
  { value: 'academic_misconduct', label: 'Academic Misconduct' },
  { value: 'safety_violation', label: 'Safety Violation' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS: Array<{ value: DisciplineSeverity; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

type FormErrors = z.typeToFlattenedError<DisciplineIncidentCreateFormValues>['fieldErrors'];

export interface IncidentFormProps {
  students: DisciplineStudentOption[];
  reporters?: DisciplineUserOption[];
  currentUserId: number;
  canSelectReporter?: boolean;
  isSubmitting?: boolean;
  initialValues?: Partial<DisciplineIncidentCreateInput>;
  onSubmit: (payload: DisciplineIncidentCreateInput) => Promise<void> | void;
  onCancel?: () => void;
}

const createInitialValues = (
  currentUserId: number,
  initialValues?: Partial<DisciplineIncidentCreateInput>,
): DisciplineIncidentCreateInput => ({
  student_id: initialValues?.student_id ?? 0,
  incident_type: initialValues?.incident_type ?? 'classroom_disruption',
  severity: initialValues?.severity ?? 'low',
  description: initialValues?.description ?? '',
  reported_by: initialValues?.reported_by ?? currentUserId,
  evidence_attachment_reference: initialValues?.evidence_attachment_reference ?? null,
});

export function IncidentForm({
  students,
  reporters = [],
  currentUserId,
  canSelectReporter = false,
  isSubmitting = false,
  initialValues,
  onSubmit,
  onCancel,
}: IncidentFormProps) {
  const [values, setValues] = useState<DisciplineIncidentCreateInput>(() =>
    createInitialValues(currentUserId, initialValues),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const descriptionLength = values.description.trim().length;

  const selectedSeverityWarning = useMemo(() => {
    if (values.severity === 'critical') {
      return 'Critical incidents require immediate escalation and principal review.';
    }
    if (values.severity === 'high') {
      return 'High severity cases may require principal review.';
    }
    return null;
  }, [values.severity]);

  const updateField = <K extends keyof DisciplineIncidentCreateInput>(
    field: K,
    value: DisciplineIncidentCreateInput[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = disciplineIncidentCreateSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setErrors({});

    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create discipline incident.');
    }
  };

  return (
    <form className="discipline-incident-form" onSubmit={handleSubmit} noValidate>
      <section className="form-section" aria-labelledby="incident-core-heading">
        <h3 id="incident-core-heading">Incident Details</h3>

        <div className="form-field">
          <label htmlFor="student_id">Student *</label>
          <select
            id="student_id"
            name="student_id"
            value={values.student_id || ''}
            onChange={(event) => updateField('student_id', Number(event.target.value))}
            disabled={isSubmitting}
            required
          >
            <option value="">Select a student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name}
                {student.student_number ? ` · ${student.student_number}` : ''}
                {student.class_name ? ` · ${student.class_name}` : ''}
              </option>
            ))}
          </select>
          {getFieldError(errors, 'student_id') && (
            <p className="field-error">{getFieldError(errors, 'student_id')}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="incident_type">Incident Type *</label>
          <select
            id="incident_type"
            name="incident_type"
            value={values.incident_type}
            onChange={(event) =>
              updateField('incident_type', event.target.value as DisciplineIncidentType)
            }
            disabled={isSubmitting}
            required
          >
            {INCIDENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {getFieldError(errors, 'incident_type') && (
            <p className="field-error">{getFieldError(errors, 'incident_type')}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="severity">Severity *</label>
          <select
            id="severity"
            name="severity"
            value={values.severity}
            onChange={(event) => updateField('severity', event.target.value as DisciplineSeverity)}
            disabled={isSubmitting}
            required
          >
            {SEVERITY_OPTIONS.map((severity) => (
              <option key={severity.value} value={severity.value}>
                {severity.label}
              </option>
            ))}
          </select>
          {selectedSeverityWarning && <p className="field-warning">{selectedSeverityWarning}</p>}
          {getFieldError(errors, 'severity') && (
            <p className="field-error">{getFieldError(errors, 'severity')}</p>
          )}
        </div>

        <div className="form-field form-field--full">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={values.description}
            onChange={(event) => updateField('description', event.target.value)}
            disabled={isSubmitting}
            minLength={20}
            maxLength={5000}
            rows={7}
            placeholder="Describe what happened using factual, professional language."
            required
          />
          <p className="field-helper">{descriptionLength}/5000 characters</p>
          {getFieldError(errors, 'description') && (
            <p className="field-error">{getFieldError(errors, 'description')}</p>
          )}
        </div>
      </section>

      <section className="form-section" aria-labelledby="audit-context-heading">
        <h3 id="audit-context-heading">Reporting & Audit</h3>

        <div className="form-field">
          <label htmlFor="reported_by">Reported By *</label>
          {canSelectReporter ? (
            <select
              id="reported_by"
              name="reported_by"
              value={values.reported_by || ''}
              onChange={(event) => updateField('reported_by', Number(event.target.value))}
              disabled={isSubmitting}
              required
            >
              <option value="">Select reporter</option>
              {reporters.map((reporter) => (
                <option key={reporter.id} value={reporter.id}>
                  {reporter.full_name}{reporter.role ? ` · ${reporter.role}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input id="reported_by" name="reported_by" value={values.reported_by} readOnly />
          )}
          {getFieldError(errors, 'reported_by') && (
            <p className="field-error">{getFieldError(errors, 'reported_by')}</p>
          )}
        </div>
      </section>

      <section className="form-section" aria-labelledby="evidence-heading">
        <h3 id="evidence-heading">Evidence Attachment</h3>

        <div className="form-field form-field--full">
          <label htmlFor="evidence_attachment_reference">Evidence Attachment Reference</label>
          <input
            id="evidence_attachment_reference"
            name="evidence_attachment_reference"
            type="text"
            value={values.evidence_attachment_reference ?? ''}
            onChange={(event) =>
              updateField('evidence_attachment_reference', event.target.value || null)
            }
            disabled={isSubmitting}
            maxLength={500}
            placeholder="Optional file reference, storage key, or uploaded file id"
          />
          <p className="field-helper">
            Store a file reference only. Do not store binary file data inside the incident record.
          </p>
          {getFieldError(errors, 'evidence_attachment_reference') && (
            <p className="field-error">{getFieldError(errors, 'evidence_attachment_reference')}</p>
          )}
        </div>
      </section>

      {formError && <div className="form-error" role="alert">{formError}</div>}

      <footer className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create Incident'}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </footer>
    </form>
  );
}

export default IncidentForm;
