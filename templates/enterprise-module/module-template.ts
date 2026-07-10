/**
 * Enterprise module template.
 * Replace __MODULE_NAME__, __ENTITY_NAME__, and __ENTITY_ROUTE__ placeholders.
 */

export interface __ENTITY_NAME__ {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface __ENTITY_NAME__CreateInput {
  // Define create fields here.
}

export interface __MODULE_NAME__DashboardStats {
  total: { value: number; trend_percent?: number };
  open: { value: number; trend_percent?: number };
  updated_at: string;
}

export const __MODULE_NAME__Routes = {
  list: '/api/v1/__ENTITY_ROUTE__',
  stats: '/api/v1/__ENTITY_ROUTE__/stats',
  create: '/api/v1/__ENTITY_ROUTE__',
  updateStatus: (id: number) => `/api/v1/__ENTITY_ROUTE__/${id}/status`,
};
