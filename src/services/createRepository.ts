import { ApiDashboardRepository } from './apiDashboardRepository';
import type { DashboardRepository } from './dashboardRepository';
import { MockDashboardRepository } from './mockDashboardRepository';

export type DataSource = 'mock' | 'api';

const getDataSource = (): DataSource => {
  const raw = (import.meta.env.VITE_DATA_SOURCE as string | undefined)?.toLowerCase();
  return raw === 'api' ? 'api' : 'mock';
};

export const shouldFallbackToMock = (): boolean => {
  const raw = (import.meta.env.VITE_API_FALLBACK_TO_MOCK as string | undefined)?.toLowerCase();

  if (raw === 'false') {
    return false;
  }

  return true;
};

export const createRepository = (): { repository: DashboardRepository; source: DataSource } => {
  const source = getDataSource();

  if (source === 'api') {
    return {
      repository: new ApiDashboardRepository(),
      source,
    };
  }

  return {
    repository: new MockDashboardRepository(),
    source,
  };
};
