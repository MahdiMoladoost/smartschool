import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DisciplineDashboardStats,
  DisciplineIncident,
  DisciplineIncidentCreateInput,
  DisciplineIncidentStatus,
} from '../types/discipline';
import disciplineService, {
  DisciplineServiceError,
  FetchIncidentsFilters,
  FetchStatsFilters,
  PaginatedResult,
  UpdateIncidentStatusInput,
} from '../../../services/disciplineService';

export interface DisciplineIncidentsState {
  incidents: DisciplineIncident[];
  stats: DisciplineDashboardStats | null;
  pagination: PaginatedResult<DisciplineIncident>['pagination'] | null;
  filters: FetchIncidentsFilters;
  statsFilters: FetchStatsFilters;
  isLoadingIncidents: boolean;
  isLoadingStats: boolean;
  isCreating: boolean;
  isUpdatingStatus: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
}

export interface UseDisciplineIncidentsOptions {
  initialFilters?: FetchIncidentsFilters;
  initialStatsFilters?: FetchStatsFilters;
  autoFetch?: boolean;
  cacheTtlMs?: number;
}

export interface UseDisciplineIncidentsResult extends DisciplineIncidentsState {
  setFilters: (nextFilters: FetchIncidentsFilters) => void;
  mergeFilters: (nextFilters: FetchIncidentsFilters) => void;
  resetFilters: () => void;
  setStatsFilters: (nextFilters: FetchStatsFilters) => void;
  refreshIncidents: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  createIncident: (input: DisciplineIncidentCreateInput) => Promise<DisciplineIncident>;
  updateIncidentStatus: (
    id: number,
    status: DisciplineIncidentStatus,
    options: Omit<UpdateIncidentStatusInput, 'status'>,
  ) => Promise<DisciplineIncident>;
  clearError: () => void;
}

interface CacheEntry<TData> {
  data: TData;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 30_000;
const incidentCache = new Map<string, CacheEntry<PaginatedResult<DisciplineIncident>>>();
const statsCache = new Map<string, CacheEntry<DisciplineDashboardStats>>();

function stableCacheKey(prefix: string, value: unknown): string {
  return `${prefix}:${JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort())}`;
}

function readCache<TData>(cache: Map<string, CacheEntry<TData>>, key: string): TData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function writeCache<TData>(
  cache: Map<string, CacheEntry<TData>>,
  key: string,
  data: TData,
  ttlMs: number,
): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function invalidateDisciplineCache(): void {
  incidentCache.clear();
  statsCache.clear();
}

function toSafeErrorMessage(error: unknown): string {
  if (error instanceof DisciplineServiceError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected discipline module error.';
}

const defaultFilters: FetchIncidentsFilters = {
  page: 1,
  limit: 20,
  sort: 'created_at',
  order: 'desc',
};

export function useDisciplineIncidents(
  options: UseDisciplineIncidentsOptions = {},
): UseDisciplineIncidentsResult {
  const {
    initialFilters = defaultFilters,
    initialStatsFilters = {},
    autoFetch = true,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  } = options;

  const initialFiltersRef = useRef<FetchIncidentsFilters>(initialFilters);
  const incidentsAbortRef = useRef<AbortController | null>(null);
  const statsAbortRef = useRef<AbortController | null>(null);

  const [incidents, setIncidents] = useState<DisciplineIncident[]>([]);
  const [stats, setStats] = useState<DisciplineDashboardStats | null>(null);
  const [pagination, setPagination] = useState<PaginatedResult<DisciplineIncident>['pagination'] | null>(null);
  const [filters, setFiltersState] = useState<FetchIncidentsFilters>(initialFilters);
  const [statsFilters, setStatsFiltersState] = useState<FetchStatsFilters>(initialStatsFilters);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const incidentCacheKey = useMemo(() => stableCacheKey('discipline-incidents', filters), [filters]);
  const statsCacheKey = useMemo(() => stableCacheKey('discipline-stats', statsFilters), [statsFilters]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setFilters = useCallback((nextFilters: FetchIncidentsFilters) => {
    setFiltersState({ ...defaultFilters, ...nextFilters });
  }, []);

  const mergeFilters = useCallback((nextFilters: FetchIncidentsFilters) => {
    setFiltersState((current) => ({ ...current, ...nextFilters, page: nextFilters.page ?? 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFiltersRef.current);
  }, []);

  const setStatsFilters = useCallback((nextFilters: FetchStatsFilters) => {
    setStatsFiltersState(nextFilters);
  }, []);

  const refreshIncidents = useCallback(async () => {
    const cached = readCache(incidentCache, incidentCacheKey);
    if (cached) {
      setIncidents(cached.items);
      setPagination(cached.pagination);
      setLastUpdatedAt(new Date().toISOString());
      return;
    }

    incidentsAbortRef.current?.abort();
    const abortController = new AbortController();
    incidentsAbortRef.current = abortController;

    setIsLoadingIncidents(true);
    setError(null);

    try {
      const result = await disciplineService.fetchIncidents(filters, { signal: abortController.signal });
      writeCache(incidentCache, incidentCacheKey, result, cacheTtlMs);
      setIncidents(result.items);
      setPagination(result.pagination);
      setLastUpdatedAt(new Date().toISOString());
    } catch (requestError) {
      if (abortController.signal.aborted) return;
      setError(toSafeErrorMessage(requestError));
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingIncidents(false);
      }
    }
  }, [cacheTtlMs, filters, incidentCacheKey]);

  const refreshStats = useCallback(async () => {
    const cached = readCache(statsCache, statsCacheKey);
    if (cached) {
      setStats(cached);
      setLastUpdatedAt(new Date().toISOString());
      return;
    }

    statsAbortRef.current?.abort();
    const abortController = new AbortController();
    statsAbortRef.current = abortController;

    setIsLoadingStats(true);
    setError(null);

    try {
      const result = await disciplineService.fetchStats(statsFilters, { signal: abortController.signal });
      writeCache(statsCache, statsCacheKey, result, cacheTtlMs);
      setStats(result);
      setLastUpdatedAt(new Date().toISOString());
    } catch (requestError) {
      if (abortController.signal.aborted) return;
      setError(toSafeErrorMessage(requestError));
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingStats(false);
      }
    }
  }, [cacheTtlMs, statsCacheKey, statsFilters]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshIncidents(), refreshStats()]);
  }, [refreshIncidents, refreshStats]);

  const createIncident = useCallback(
    async (input: DisciplineIncidentCreateInput): Promise<DisciplineIncident> => {
      setIsCreating(true);
      setError(null);

      try {
        const created = await disciplineService.createIncident(input);
        invalidateDisciplineCache();
        setIncidents((current) => [created, ...current]);
        setLastUpdatedAt(new Date().toISOString());
        void refreshStats();
        return created;
      } catch (requestError) {
        const message = toSafeErrorMessage(requestError);
        setError(message);
        throw requestError;
      } finally {
        setIsCreating(false);
      }
    },
    [refreshStats],
  );

  const updateIncidentStatus = useCallback(
    async (
      id: number,
      status: DisciplineIncidentStatus,
      optionsForUpdate: Omit<UpdateIncidentStatusInput, 'status'>,
    ): Promise<DisciplineIncident> => {
      setIsUpdatingStatus(true);
      setError(null);

      try {
        const updated = await disciplineService.updateIncidentStatus(id, {
          ...optionsForUpdate,
          status,
        });
        invalidateDisciplineCache();
        setIncidents((current) => current.map((incident) => (incident.id === id ? updated : incident)));
        setLastUpdatedAt(new Date().toISOString());
        void refreshStats();
        return updated;
      } catch (requestError) {
        const message = toSafeErrorMessage(requestError);
        setError(message);
        throw requestError;
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [refreshStats],
  );

  useEffect(() => {
    if (!autoFetch) return;
    void refreshIncidents();
  }, [autoFetch, refreshIncidents]);

  useEffect(() => {
    if (!autoFetch) return;
    void refreshStats();
  }, [autoFetch, refreshStats]);

  useEffect(() => {
    return () => {
      incidentsAbortRef.current?.abort();
      statsAbortRef.current?.abort();
    };
  }, []);

  return {
    incidents,
    stats,
    pagination,
    filters,
    statsFilters,
    isLoadingIncidents,
    isLoadingStats,
    isCreating,
    isUpdatingStatus,
    error,
    lastUpdatedAt,
    setFilters,
    mergeFilters,
    resetFilters,
    setStatsFilters,
    refreshIncidents,
    refreshStats,
    refreshAll,
    createIncident,
    updateIncidentStatus,
    clearError,
  };
}

export default useDisciplineIncidents;
