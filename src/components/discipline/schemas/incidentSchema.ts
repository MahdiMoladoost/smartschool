import { z } from 'zod';

export const disciplineSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const disciplineIncidentTypeSchema = z.enum([
  'classroom_disruption',
  'disrespect',
  'fighting',
  'bullying',
  'property_damage',
  'attendance_related',
  'academic_misconduct',
  'safety_violation',
  'other',
]);

const optionalEvidenceReferenceSchema = z
  .string()
  .trim()
  .max(500, 'Evidence attachment reference must not exceed 500 characters.')
  .optional()
  .nullable()
  .transform((value) => (value === '' ? null : value));

export const disciplineIncidentCreateSchema = z.object({
  student_id: z.coerce
    .number({ invalid_type_error: 'Student is required.' })
    .int('Student id must be an integer.')
    .positive('Student is required.'),

  incident_type: disciplineIncidentTypeSchema,

  severity: disciplineSeveritySchema,

  description: z
    .string({ required_error: 'Description is required.' })
    .trim()
    .min(20, 'Description must be at least 20 characters.')
    .max(5000, 'Description must not exceed 5000 characters.')
    .refine(
      (value) => !/(password|secret|api[_-]?key|token)\s*[:=]/i.test(value),
      'Description must not contain passwords, secrets, API keys, or tokens.',
    ),

  reported_by: z.coerce
    .number({ invalid_type_error: 'Reporter is required.' })
    .int('Reporter id must be an integer.')
    .positive('Reporter is required.'),

  evidence_attachment_reference: optionalEvidenceReferenceSchema,
});

export type DisciplineIncidentCreateFormValues = z.infer<typeof disciplineIncidentCreateSchema>;

export function getFieldError(
  fieldErrors: z.typeToFlattenedError<DisciplineIncidentCreateFormValues>['fieldErrors'],
  fieldName: keyof DisciplineIncidentCreateFormValues,
): string | undefined {
  return fieldErrors[fieldName]?.[0];
}
