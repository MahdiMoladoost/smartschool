import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

import {
  DisciplineDashboardStats,
  DisciplineIncident,
  DisciplineIncidentCreateInput,
  DisciplineIncidentStatus,
} from '../components/discipline/types/discipline';
import { disciplineIncidentCreateSchema } from '../components/discipline/schemas/incidentSchema';

export interface ApiResponse<TData> {
  success: boolean;
  data: TData;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface FetchIncidentsFilters {
  page?: number;
  limit?: number;
  search?: string;
  class_id?: number;
  grade_id?: number;
  severity?: DisciplineIncident['severity'];
  status?: DisciplineIncidentStatus;
  incident_type?: DisciplineIncident['incident_type'];
  reported_by?: number;
  assigned_to?: number;
  parent_notified?: boolean;
  counselor_referred?: boolean;
  date_from?: string;
  date_to?: string;
  sort?: 'created_at' | 'updated_at' | 'severity' | 'status' | 'incident_type';
  order?: 'asc' | 'desc';
}

export interface FetchStatsFilters {
  academic_year_id?: number;
  term_id?: number;
  date_from?: string;
  date_to?: string;
  class_id?: number;
  grade_id?: number;
}

export interface UpdateIncidentStatusInput {
  status: DisciplineIncidentStatus;
  reason?: string;
  updated_by: number;
}

export class DisciplineServiceError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'DisciplineServiceError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

const DEFAULT_BASE_URL = '/api/v1';

function createDefaultHttpClient(): AxiosInstance {
  return axios.create({
    baseURL: DEFAULT_BASE_URL,
    timeout: 15000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });
}

let httpClient: AxiosInstance = createDefaultHttpClient();

export function setDisciplineHttpClient(client: AxiosInstance): void {
  httpClient = client;
}

export function resetDisciplineHttpClient(): void {
  httpClient = createDefaultHttpClient();
}

function hasApiEnvelope(value: unknown): value is Partial<ApiResponse<unknown>> {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as Partial<ApiResponse<unknown>>).success === 'boolean';
}

function isApiResponse<TData>(value: unknown): value is ApiResponse<TData> {
  return hasApiEnvelope(value) && Object.prototype.hasOwnProperty.call(value, 'data');
}

function normalizeAxiosError(error: unknown): DisciplineServiceError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    return new DisciplineServiceError(
      responseData?.message || axiosError.message || 'Discipline API request failed.',
      {
        status,
        code: responseData?.code,
        details: responseData?.errors || responseData,
      },
    );
  }

  if (error instanceof DisciplineServiceError) {
    return error;
  }

  if (error instanceof Error) {
    return new DisciplineServiceError(error.message);
  }

  return new DisciplineServiceError('Unexpected discipline service error.');
}

async function requestData<TData>(config: AxiosRequestConfig): Promise<TData> {
  try {
    const response = await httpClient.request<ApiResponse<TData> | TData>(config);
    const payload = response.data;

    if (hasApiEnvelope(payload) && !payload.success) {
      throw new DisciplineServiceError(
        payload.message || 'Discipline API returned an unsuccessful response.',
        { status: response.status },
      );
    }

    if (isApiResponse<TData>(payload)) {
      return payload.data;
    }

    // Backward-compatible fallback for legacy endpoints that return raw data.
    return payload as TData;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

function cleanQuery<T extends object>(query: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>;
}

export const disciplineService = {
  async fetchIncidents(
    filters: FetchIncidentsFilters = {},
    options: Pick<AxiosRequestConfig, 'signal'> = {},
  ): Promise<PaginatedResult<DisciplineIncident>> {
    return requestData<PaginatedResult<DisciplineIncident>>({
      method: 'GET',
      url: '/discipline/incidents',
      params: cleanQuery({ page: 1, limit: 20, order: 'desc', sort: 'created_at', ...filters }),
      signal: options.signal,
    });
  },

  async fetchStats(
    filters: FetchStatsFilters = {},
    options: Pick<AxiosRequestConfig, 'signal'> = {},
  ): Promise<DisciplineDashboardStats> {
    return requestData<DisciplineDashboardStats>({
      method: 'GET',
      url: '/discipline/stats',
      params: cleanQuery(filters),
      signal: options.signal,
    });
  },

  async createIncident(input: DisciplineIncidentCreateInput): Promise<DisciplineIncident> {
    const parsed = disciplineIncidentCreateSchema.safeParse(input);

    if (!parsed.success) {
      throw new DisciplineServiceError('Discipline incident validation failed.', {
        code: 'VALIDATION_FAILED',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    return requestData<DisciplineIncident>({
      method: 'POST',
      url: '/discipline/incidents',
      data: parsed.data,
    });
  },

  async updateIncidentStatus(id: number, input: UpdateIncidentStatusInput): Promise<DisciplineIncident> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new DisciplineServiceError('A valid incident id is required.', { code: 'INVALID_INCIDENT_ID' });
    }

    return requestData<DisciplineIncident>({
      method: 'PATCH',
      url: `/discipline/incidents/${id}/status`,
      data: input,
    });
  },
};

export default disciplineService;
