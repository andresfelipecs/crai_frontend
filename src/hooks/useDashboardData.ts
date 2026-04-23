import { useEffect, useMemo, useState } from 'react';
import { createMonthRange, monthKey, monthLabel, normalizeText, toDateInput } from '../lib/parsing';
import { MockDashboardRepository } from '../services/mockDashboardRepository';
import { createRepository, shouldFallbackToMock, type DataSource } from '../services/createRepository';
import type {
  DashboardDataset,
  DashboardFilters,
  DashboardViewModel,
  DistributionPoint,
  FacultyPoint,
  ProgramPoint,
  ResourceUsagePoint,
  SeriesPoint,
} from '../types/dashboard';

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
  loanTotals: {
    total: 0,
    uniquePrograms: 0,
    uniqueCollections: 0,
    uniqueFaculties: 0,
  },
  resourceTotals: {
    interactions: 0,
    sessions: 0,
    searches: 0,
    downloads: 0,
    uniqueResources: 0,
    rows: 0,
  },
  surveyTotals: {
    responses: 0,
    averageSatisfaction: 0,
    satisfiedRate: 0,
  },
  clubTotals: {
    attendance: 0,
    uniqueClubs: 0,
    uniquePrograms: 0,
  },
  crossTotals: {
    clubLoanOverlap: 0,
    loanAttentionMatches: 0,
    loanResourceMatches: 0,
    averageAttentionScore: 0,
    resourceCoverageRate: 0,
  },
  availableFaculties: [],
  availableUserTypes: [],
  dateBounds: { min: '', max: '' },
};

const toMapArray = (source: Map<string, number>): DistributionPoint[] =>
  [...source.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

const toFacultyArray = (source: Map<string, number>): FacultyPoint[] =>
  [...source.entries()]
    .map(([faculty, value]) => ({ faculty, value }))
    .sort((a, b) => b.value - a.value);

const matchesFilter = (value: string, selected: string): boolean => {
  if (!selected || selected === 'Todas' || selected === 'Todos') {
    return true;
  }

  return normalizeText(value) === normalizeText(selected);
};

const inRange = (date: Date, start: Date, end: Date): boolean => date >= start && date <= end;

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);

const formatDecimal = (value: number): string =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

const isStudentUser = (value: string): boolean => normalizeText(value).includes('estudiante');

const toStudentAlias = (personKey: string): string => {
  if (personKey.startsWith('id:')) {
    const digits = personKey.slice(3);
    return `Est. ${digits.slice(-6)}`;
  }

  const email = personKey.replace('email:', '');
  const localPart = email.split('@')[0] ?? 'usuario';
  return `Est. ${localPart.slice(0, 6)}`;
};

const getDateBounds = (dataset: DashboardDataset): { min: string; max: string } => {
  const dates = [
    ...dataset.loans.map((item) => item.loanDate),
    ...dataset.survey.map((item) => item.submittedAt),
    ...dataset.clubs.map((item) => item.attendanceDate),
  ].sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    const today = toDateInput(new Date());
    return { min: today, max: today };
  }

  return { min: toDateInput(dates[0]), max: toDateInput(dates[dates.length - 1]) };
};

const safeDate = (value: string, fallback: string): Date => {
  if (!value) {
    return new Date(`${fallback}T00:00:00`);
  }

  return new Date(`${value}T00:00:00`);
};

const aggregateModel = (dataset: DashboardDataset, filters: DashboardFilters): DashboardViewModel => {
  const bounds = getDateBounds(dataset);
  const start = safeDate(filters.startDate, bounds.min);
  const end = safeDate(filters.endDate, bounds.max);
  end.setHours(23, 59, 59, 999);

  const filteredLoans = dataset.loans.filter(
    (item) =>
      inRange(item.loanDate, start, end) &&
      matchesFilter(item.faculty, filters.faculty) &&
      matchesFilter(item.userType, filters.userType),
  );

  const filteredSurvey = dataset.survey.filter(
    (item) =>
      inRange(item.submittedAt, start, end) &&
      matchesFilter(item.faculty, filters.faculty) &&
      matchesFilter(item.userType, filters.userType),
  );

  const filteredClubs = dataset.clubs.filter(
    (item) => inRange(item.attendanceDate, start, end) && matchesFilter(item.userType, filters.userType),
  );

  const filteredResources = dataset.resources.filter(
    (item) => matchesFilter(item.faculty, filters.faculty) && matchesFilter(item.userType, filters.userType),
  );

  const filteredStudentLoans = filteredLoans.filter((item) => item.personKey && isStudentUser(item.userType));
  const filteredStudentSurvey = filteredSurvey.filter((item) => item.personKey && isStudentUser(item.userType));
  const filteredStudentClubs = filteredClubs.filter((item) => item.personKey && isStudentUser(item.userType));
  const filteredStudentResources = filteredResources.filter((item) => item.personKey && isStudentUser(item.userType));

  const resourceInteractions = filteredResources.reduce((sum, item) => sum + item.total, 0);
  const avgSatisfaction =
    filteredSurvey.length === 0
      ? 0
      : filteredSurvey.reduce((sum, item) => sum + item.satisfactionScore, 0) / filteredSurvey.length;

  const interactionsTotal =
    filteredLoans.length + filteredSurvey.length + filteredClubs.length + resourceInteractions;

  const collections = new Map<string, number>();
  filteredLoans.forEach((loan) => {
    collections.set(loan.collection, (collections.get(loan.collection) ?? 0) + 1);
  });

  const topCollection = [...collections.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin dato';

  const metrics = [
    {
      label: 'Interacciones totales',
      value: formatNumber(interactionsTotal),
      helper: `${formatNumber(filteredLoans.length)} prestamos + ${formatNumber(resourceInteractions)} recursos`,
    },
    {
      label: 'Prestamos de libros',
      value: formatNumber(filteredLoans.length),
      helper: `Coleccion principal: ${topCollection}`,
    },
    {
      label: 'Satisfaccion promedio',
      value: `${formatDecimal(avgSatisfaction)}/5`,
      helper: `${formatNumber(filteredSurvey.length)} respuestas de encuesta`,
    },
    {
      label: 'Consultas recursos digitales',
      value: formatNumber(resourceInteractions),
      helper: `${formatNumber(filteredResources.length)} registros de Elogim`,
    },
  ];

  const months = createMonthRange(start, end);
  const loansByMonth = new Map<string, number>();
  const surveyByMonth = new Map<string, number>();
  const clubsByMonth = new Map<string, number>();

  filteredLoans.forEach((item) => {
    const key = monthKey(item.loanDate);
    loansByMonth.set(key, (loansByMonth.get(key) ?? 0) + 1);
  });

  filteredSurvey.forEach((item) => {
    const key = monthKey(item.submittedAt);
    surveyByMonth.set(key, (surveyByMonth.get(key) ?? 0) + 1);
  });

  filteredClubs.forEach((item) => {
    const key = monthKey(item.attendanceDate);
    clubsByMonth.set(key, (clubsByMonth.get(key) ?? 0) + 1);
  });

  const timeSeries: SeriesPoint[] = months.map((key) => ({
    label: monthLabel(key),
    loans: loansByMonth.get(key) ?? 0,
    survey: surveyByMonth.get(key) ?? 0,
    clubs: clubsByMonth.get(key) ?? 0,
  }));

  const satisfactionDistributionMap = new Map<string, number>();
  filteredSurvey.forEach((item) => {
    satisfactionDistributionMap.set(
      item.satisfactionLabel,
      (satisfactionDistributionMap.get(item.satisfactionLabel) ?? 0) + 1,
    );
  });
  const satisfactionDistribution = toMapArray(satisfactionDistributionMap);

  const resourcesMap = new Map<string, number>();
  filteredResources.forEach((item) => {
    resourcesMap.set(item.resource, (resourcesMap.get(item.resource) ?? 0) + item.total);
  });
  const resourceUsage: ResourceUsagePoint[] = [...resourcesMap.entries()]
    .map(([resource, total]) => ({ resource, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const clubMap = new Map<string, number>();
  filteredClubs.forEach((item) => {
    clubMap.set(item.club, (clubMap.get(item.club) ?? 0) + 1);
  });
  const clubDistribution = toMapArray(clubMap);

  const programMap = new Map<string, number>();
  filteredLoans.forEach((item) => {
    programMap.set(item.program, (programMap.get(item.program) ?? 0) + 1);
  });
  const topPrograms: ProgramPoint[] = [...programMap.entries()]
    .map(([program, value]) => ({ program, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const facultyMap = new Map<string, number>();
  filteredLoans.forEach((item) => {
    facultyMap.set(item.faculty, (facultyMap.get(item.faculty) ?? 0) + 1);
  });
  filteredResources.forEach((item) => {
    facultyMap.set(item.faculty, (facultyMap.get(item.faculty) ?? 0) + item.total);
  });
  const facultyLoad: FacultyPoint[] = [...facultyMap.entries()]
    .map(([faculty, value]) => ({ faculty, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const loanCollections = toMapArray(collections).slice(0, 8);

  const loanUserTypeMap = new Map<string, number>();
  filteredLoans.forEach((item) => {
    loanUserTypeMap.set(item.userType, (loanUserTypeMap.get(item.userType) ?? 0) + 1);
  });
  const loanUserTypes = toMapArray(loanUserTypeMap);

  const loanFacultyMap = new Map<string, number>();
  filteredLoans.forEach((item) => {
    loanFacultyMap.set(item.faculty, (loanFacultyMap.get(item.faculty) ?? 0) + 1);
  });
  const loanFaculties = toFacultyArray(loanFacultyMap).slice(0, 8);

  const studentLoanMap = new Map<string, number>();
  filteredStudentLoans.forEach((item) => {
    studentLoanMap.set(item.personKey, (studentLoanMap.get(item.personKey) ?? 0) + 1);
  });

  const studentClubMap = new Map<string, number>();
  filteredStudentClubs.forEach((item) => {
    studentClubMap.set(item.personKey, (studentClubMap.get(item.personKey) ?? 0) + 1);
  });

  const studentAttentionMap = new Map<string, { scoreTotal: number; responses: number }>();
  filteredStudentSurvey.forEach((item) => {
    if (item.attentionScore <= 0) {
      return;
    }

    const current = studentAttentionMap.get(item.personKey) ?? { scoreTotal: 0, responses: 0 };
    studentAttentionMap.set(item.personKey, {
      scoreTotal: current.scoreTotal + item.attentionScore,
      responses: current.responses + 1,
    });
  });

  const studentResourceMap = new Map<string, number>();
  filteredStudentResources.forEach((item) => {
    studentResourceMap.set(item.personKey, (studentResourceMap.get(item.personKey) ?? 0) + item.total);
  });

  const clubLoanStudents = [...studentLoanMap.entries()]
    .filter(([personKey]) => studentClubMap.has(personKey))
    .map(([personKey, loans]) => ({
      student: toStudentAlias(personKey),
      loans,
      clubs: studentClubMap.get(personKey) ?? 0,
    }))
    .sort((a, b) => b.loans + b.clubs - (a.loans + a.clubs) || b.loans - a.loans)
    .slice(0, 8);

  const loanAttentionStudents = [...studentLoanMap.entries()]
    .filter(([personKey]) => studentAttentionMap.has(personKey))
    .map(([personKey, loans]) => {
      const attention = studentAttentionMap.get(personKey) ?? { scoreTotal: 0, responses: 1 };

      return {
        student: toStudentAlias(personKey),
        loans,
        attentionScore: attention.scoreTotal / Math.max(attention.responses, 1),
      };
    })
    .sort((a, b) => b.loans - a.loans || b.attentionScore - a.attentionScore)
    .slice(0, 10);

  const loanResourceStudents = [...studentLoanMap.entries()]
    .filter(([personKey]) => studentResourceMap.has(personKey))
    .map(([personKey, loans]) => ({
      student: toStudentAlias(personKey),
      loans,
      digitalUsage: studentResourceMap.get(personKey) ?? 0,
    }))
    .sort((a, b) => b.digitalUsage - a.digitalUsage || b.loans - a.loans);

  const resourceSessions = filteredResources.reduce((sum, item) => sum + item.sessions, 0);
  const resourceSearches = filteredResources.reduce((sum, item) => sum + item.searches, 0);
  const resourceDownloads = filteredResources.reduce((sum, item) => sum + item.downloads, 0);

  const resourceActions: DistributionPoint[] = [
    { label: 'Sesiones', value: resourceSessions },
    { label: 'Busquedas', value: resourceSearches },
    { label: 'Descargas', value: resourceDownloads },
  ];

  const resourceFacultyMap = new Map<string, number>();
  filteredResources.forEach((item) => {
    resourceFacultyMap.set(item.faculty, (resourceFacultyMap.get(item.faculty) ?? 0) + item.total);
  });
  const resourceFacultyUsage = toFacultyArray(resourceFacultyMap).slice(0, 8);

  const surveyFrequencyMap = new Map<string, number>();
  filteredSurvey.forEach((item) => {
    surveyFrequencyMap.set(item.visitFrequency, (surveyFrequencyMap.get(item.visitFrequency) ?? 0) + 1);
  });
  const surveyFrequencyDistribution = toMapArray(surveyFrequencyMap);

  const surveyDigitalEaseMap = new Map<string, number>();
  filteredSurvey.forEach((item) => {
    surveyDigitalEaseMap.set(item.digitalEaseLabel, (surveyDigitalEaseMap.get(item.digitalEaseLabel) ?? 0) + 1);
  });
  const surveyDigitalEaseDistribution = toMapArray(surveyDigitalEaseMap);

  const surveyUserTypeMap = new Map<string, number>();
  filteredSurvey.forEach((item) => {
    surveyUserTypeMap.set(item.userType, (surveyUserTypeMap.get(item.userType) ?? 0) + 1);
  });
  const surveyUserTypes = toMapArray(surveyUserTypeMap);

  const clubUserTypeMap = new Map<string, number>();
  filteredClubs.forEach((item) => {
    clubUserTypeMap.set(item.userType, (clubUserTypeMap.get(item.userType) ?? 0) + 1);
  });
  const clubUserTypes = toMapArray(clubUserTypeMap);

  const clubProgramsMap = new Map<string, number>();
  filteredClubs.forEach((item) => {
    clubProgramsMap.set(item.program, (clubProgramsMap.get(item.program) ?? 0) + 1);
  });
  const clubPrograms: ProgramPoint[] = [...clubProgramsMap.entries()]
    .map(([program, value]) => ({ program, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const uniqueLoanPrograms = new Set(filteredLoans.map((item) => item.program)).size;
  const uniqueLoanCollections = new Set(filteredLoans.map((item) => item.collection)).size;
  const uniqueLoanFaculties = new Set(filteredLoans.map((item) => item.faculty)).size;

  const uniqueResources = new Set(filteredResources.map((item) => item.resource)).size;

  const satisfiedCount = filteredSurvey.filter((item) => item.satisfactionScore >= 4).length;
  const satisfiedRate =
    filteredSurvey.length === 0 ? 0 : (satisfiedCount / Math.max(filteredSurvey.length, 1)) * 100;

  const uniqueClubs = new Set(filteredClubs.map((item) => item.club)).size;
  const uniqueClubPrograms = new Set(filteredClubs.map((item) => item.program)).size;

  const clubLoanOverlap = [...studentLoanMap.keys()].filter((personKey) => studentClubMap.has(personKey)).length;
  const loanAttentionMatches = [...studentLoanMap.keys()].filter((personKey) => studentAttentionMap.has(personKey)).length;
  const loanResourceMatches = [...studentLoanMap.keys()].filter((personKey) => studentResourceMap.has(personKey)).length;

  const averageAttentionScore =
    loanAttentionMatches === 0
      ? 0
      : [...studentLoanMap.keys()]
          .filter((personKey) => studentAttentionMap.has(personKey))
          .reduce((sum, personKey) => {
            const attention = studentAttentionMap.get(personKey) ?? { scoreTotal: 0, responses: 1 };
            return sum + attention.scoreTotal / Math.max(attention.responses, 1);
          }, 0) / loanAttentionMatches;

  const resourceCoverageRate =
    studentLoanMap.size === 0 ? 0 : (loanResourceMatches / Math.max(studentLoanMap.size, 1)) * 100;

  const availableFaculties = [
    ...new Set([
      ...dataset.loans.map((item) => item.faculty),
      ...dataset.survey.map((item) => item.faculty),
      ...dataset.resources.map((item) => item.faculty),
    ]),
  ]
    .filter((value) => value && normalizeText(value) !== normalizeText('No definida'))
    .sort((a, b) => a.localeCompare(b, 'es'));

  const availableUserTypes = [
    ...new Set([
      ...dataset.loans.map((item) => item.userType),
      ...dataset.survey.map((item) => item.userType),
      ...dataset.clubs.map((item) => item.userType),
      ...dataset.resources.map((item) => item.userType),
    ]),
  ]
    .filter((value) => value && normalizeText(value) !== normalizeText('No definido'))
    .sort((a, b) => a.localeCompare(b, 'es'));

  return {
    metrics,
    timeSeries,
    satisfactionDistribution,
    resourceUsage,
    clubDistribution,
    loanCollections,
    loanUserTypes,
    loanFaculties,
    resourceActions,
    resourceFacultyUsage,
    surveyFrequencyDistribution,
    surveyDigitalEaseDistribution,
    surveyUserTypes,
    clubUserTypes,
    clubPrograms,
    topPrograms,
    facultyLoad,
    clubLoanStudents,
    loanAttentionStudents,
    loanResourceStudents,
    loanTotals: {
      total: filteredLoans.length,
      uniquePrograms: uniqueLoanPrograms,
      uniqueCollections: uniqueLoanCollections,
      uniqueFaculties: uniqueLoanFaculties,
    },
    resourceTotals: {
      interactions: resourceInteractions,
      sessions: resourceSessions,
      searches: resourceSearches,
      downloads: resourceDownloads,
      uniqueResources,
      rows: filteredResources.length,
    },
    surveyTotals: {
      responses: filteredSurvey.length,
      averageSatisfaction: avgSatisfaction,
      satisfiedRate,
    },
    clubTotals: {
      attendance: filteredClubs.length,
      uniqueClubs,
      uniquePrograms: uniqueClubPrograms,
    },
    crossTotals: {
      clubLoanOverlap,
      loanAttentionMatches,
      loanResourceMatches,
      averageAttentionScore,
      resourceCoverageRate,
    },
    availableFaculties,
    availableUserTypes,
    dateBounds: bounds,
  };
};

export const useDashboardData = () => {
  const [dataset, setDataset] = useState<DashboardDataset | null>(null);
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

  useEffect(() => {
    let active = true;

    const applyDataset = (records: DashboardDataset) => {
      const bounds = getDateBounds(records);

      setDataset(records);
      setFilters((current) => ({
        ...current,
        startDate: current.startDate || bounds.min,
        endDate: current.endDate || bounds.max,
      }));
    };

    const load = async () => {
      setLoading(true);
      setError(null);

      const configured = createRepository();
      setDataSource(configured.source);
      setDataSourceDetail(configured.source === 'api' ? 'API backend' : 'Mock CSV local');

      try {
        const records = await configured.repository.getDataset();

        if (!active) {
          return;
        }

        applyDataset(records);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const canFallback = configured.source === 'api' && shouldFallbackToMock();

        if (canFallback) {
          try {
            const fallbackData = await new MockDashboardRepository().getDataset();

            if (!active) {
              return;
            }

            setDataSource('mock');
            setDataSourceDetail('Mock CSV local (fallback por error de API)');
            setError('No se pudo leer API. Se activo automaticamente el modo mock.');
            applyDataset(fallbackData);
            return;
          } catch (fallbackError) {
            setError(
              fallbackError instanceof Error
                ? `Error API y fallback mock: ${fallbackError.message}`
                : 'Error API y fallback mock.',
            );
          }
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Error cargando los datasets.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const model = useMemo(() => {
    if (!dataset) {
      return EMPTY_MODEL;
    }

    return aggregateModel(dataset, filters);
  }, [dataset, filters]);

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
