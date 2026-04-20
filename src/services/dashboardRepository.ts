import type { DashboardDataset } from '../types/dashboard';

export interface DashboardRepository {
  getDataset: () => Promise<DashboardDataset>;
}
