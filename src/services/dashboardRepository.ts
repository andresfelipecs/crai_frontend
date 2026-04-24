import type { DashboardFilters, DashboardViewModel } from '../types/dashboard';

export interface DashboardRepository {
  getDashboard: (filters: DashboardFilters) => Promise<DashboardViewModel>;
}
