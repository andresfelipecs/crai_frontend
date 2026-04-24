import type { DashboardRepository } from './dashboardRepository';
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

export class MockDashboardRepository implements DashboardRepository {
  async getDashboard(_filters: DashboardFilters): Promise<DashboardViewModel> {
    return EMPTY_MODEL;
  }
}
