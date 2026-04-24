import type { DashboardRepository } from './dashboardRepository';
import type { DashboardFilters, DashboardViewModel } from '../types/dashboard';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const DASHBOARD_ENDPOINT = (import.meta.env.VITE_API_DASHBOARD_ENDPOINT as string | undefined) ?? '/api/v1/dashboard/bootstrap';

const buildUrl = (filters: DashboardFilters): string => {
  const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const normalizedPath = DASHBOARD_ENDPOINT.startsWith('/') ? DASHBOARD_ENDPOINT : `/${DASHBOARD_ENDPOINT}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  if (filters.startDate) url.searchParams.set('date_from', filters.startDate);
  if (filters.endDate) url.searchParams.set('date_to', filters.endDate);
  if (filters.faculty && filters.faculty !== 'Todas') url.searchParams.set('faculty', filters.faculty);
  if (filters.userType && filters.userType !== 'Todos') url.searchParams.set('user_type', filters.userType);

  return url.toString();
};

export class ApiDashboardRepository implements DashboardRepository {
  async getDashboard(filters: DashboardFilters): Promise<DashboardViewModel> {
    const response = await fetch(buildUrl(filters), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`API dashboard request failed (${response.status})`);
    }

    return (await response.json()) as DashboardViewModel;
  }
}
