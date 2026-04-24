import { useEffect, useState } from 'react';
import { MockDashboardRepository } from '../services/mockDashboardRepository';
import { createRepository, shouldFallbackToMock, type DataSource } from '../services/createRepository';
import type { DashboardFilters, DashboardViewModel } from '../types/dashboard';

const EMPTY_MODEL: DashboardViewModel = {
  metrics: [
    { label: 'Interacciones totales', value: '0', helper: 'Sin datos cargados' },
    { label: 'Prestamos de libros', value: '0', helper: 'Sin datos cargados' },
    { label: 'Satisfaccion promedio', value: '0.0/5', helper: 'Sin datos cargados' },
    { label: 'Consultas recursos digitales', value: '0', helper: 'Sin datos cargados' },
  ],
  timeSeries: [],
  satisfactionDistribution: [],
  resourceUsage: [],
  clubDistribution: [],
  loanCollections: [],
  loanUserTypes: [],
  loanFaculties: [],
  resourceActions: [],
  resourceFacultyUsage: [],
  surveyFrequencyDistribution: [],
  surveyDigitalEaseDistribution: [],
  surveyUserTypes: [],
  clubUserTypes: [],
  clubPrograms: [],
  topPrograms: [],
  facultyLoad: [],
  clubLoanStudents: [],
  loanAttentionStudents: [],
  loanResourceStudents: [],
  loanTotals: { total: 0, uniquePrograms: 0, uniqueCollections: 0, uniqueFaculties: 0 },
  resourceTotals: { interactions: 0, sessions: 0, searches: 0, downloads: 0, uniqueResources: 0, rows: 0 },
  surveyTotals: { responses: 0, averageSatisfaction: 0, satisfiedRate: 0 },
  clubTotals: { attendance: 0, uniqueClubs: 0, uniquePrograms: 0 },
  crossTotals: { clubLoanOverlap: 0, loanAttentionMatches: 0, loanResourceMatches: 0, averageAttentionScore: 0, resourceCoverageRate: 0 },
  availableFaculties: [],
  availableUserTypes: [],
  dateBounds: { min: '', max: '' },
};

const FILTERS_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const FILTERS_ENDPOINT = (import.meta.env.VITE_API_FILTERS_ENDPOINT as string | undefined) ?? '/api/v1/dashboard/filters';

const buildFiltersUrl = (): string => {
  const base = FILTERS_URL.endsWith('/') ? FILTERS_URL.slice(0, -1) : FILTERS_URL;
  const path = FILTERS_ENDPOINT.startsWith('/') ? FILTERS_ENDPOINT : `/${FILTERS_ENDPOINT}`;
  return `${base}${path}`;
};

export const useDashboardData = () => {
  const [model, setModel] = useState<DashboardViewModel>(EMPTY_MODEL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    startDate: '',
    endDate: '',
    faculty: 'Todas',
    userType: 'Todos',
  });
  const [dataSource, setDataSource] = useState<DataSource>('mock');
  const [dataSourceDetail, setDataSourceDetail] = useState('Mock CSV local');

  // Load filter catalog on mount
  useEffect(() => {
    let active = true;

    const loadFilters = async () => {
      try {
        const response = await fetch(buildFiltersUrl(), { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('No se pudieron cargar los filtros');
        const catalog = (await response.json()) as {
          faculties: string[];
          userTypes: string[];
          dateBounds: { min: string; max: string };
        };
        if (!active) return;
        setFilters({
          startDate: catalog.dateBounds.min,
          endDate: catalog.dateBounds.max,
          faculty: 'Todas',
          userType: 'Todos',
        });
      } catch {
        // Fallback: leave filters empty, user can still interact
      }
    };

    void loadFilters();
    return () => { active = false; };
  }, []);

  // Load dashboard data when filters change
  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const configured = createRepository();
      setDataSource(configured.source);
      setDataSourceDetail(configured.source === 'api' ? 'API backend' : 'Mock CSV local');

      try {
        const data = await configured.repository.getDashboard(filters);
        if (!active) return;
        setModel(data);
      } catch (loadError) {
        if (!active) return;

        const canFallback = configured.source === 'api' && shouldFallbackToMock();
        if (canFallback) {
          try {
            const fallbackData = await new MockDashboardRepository().getDashboard(filters);
            if (!active) return;
            setDataSource('mock');
            setDataSourceDetail('Mock CSV local (fallback por error de API)');
            setError('No se pudo leer API. Se activo automaticamente el modo mock.');
            setModel(fallbackData);
          } catch (fallbackError) {
            setError(
              fallbackError instanceof Error
                ? `Error API y fallback mock: ${fallbackError.message}`
                : 'Error API y fallback mock.',
            );
          }
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Error cargando los datos.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [filters]);

  return {
    loading,
    error,
    filters,
    setFilters,
    model,
    dataSource,
    dataSourceDetail,
  };
};
