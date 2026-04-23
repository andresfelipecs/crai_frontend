export interface LoanRecord {
  personKey: string;
  faculty: string;
  program: string;
  userType: string;
  collection: string;
  loanDate: Date;
}

export interface SurveyRecord {
  personKey: string;
  faculty: string;
  program: string;
  userType: string;
  visitFrequency: string;
  satisfactionLabel: string;
  satisfactionScore: number;
  digitalEaseLabel: string;
  attentionLabel: string;
  attentionScore: number;
  submittedAt: Date;
}

export interface ClubRecord {
  personKey: string;
  club: string;
  userType: string;
  program: string;
  attendee: string;
  attendanceDate: Date;
}

export interface ResourceRecord {
  personKey: string;
  faculty: string;
  userType: string;
  resource: string;
  sessions: number;
  searches: number;
  downloads: number;
  total: number;
}

export interface DashboardDataset {
  loans: LoanRecord[];
  survey: SurveyRecord[];
  clubs: ClubRecord[];
  resources: ResourceRecord[];
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  faculty: string;
  userType: string;
}

export interface MetricItem {
  label: string;
  value: string;
  helper: string;
}

export interface SeriesPoint {
  label: string;
  loans: number;
  survey: number;
  clubs: number;
}

export interface DistributionPoint {
  label: string;
  value: number;
}

export interface ResourceUsagePoint {
  resource: string;
  total: number;
}

export interface ProgramPoint {
  program: string;
  value: number;
}

export interface FacultyPoint {
  faculty: string;
  value: number;
}

export interface StudentClubLoanPoint {
  student: string;
  loans: number;
  clubs: number;
}

export interface StudentAttentionPoint {
  student: string;
  loans: number;
  attentionScore: number;
}

export interface StudentResourcePoint {
  student: string;
  loans: number;
  digitalUsage: number;
}

export interface DashboardViewModel {
  metrics: MetricItem[];
  timeSeries: SeriesPoint[];
  satisfactionDistribution: DistributionPoint[];
  resourceUsage: ResourceUsagePoint[];
  clubDistribution: DistributionPoint[];
  loanCollections: DistributionPoint[];
  loanUserTypes: DistributionPoint[];
  loanFaculties: FacultyPoint[];
  resourceActions: DistributionPoint[];
  resourceFacultyUsage: FacultyPoint[];
  surveyFrequencyDistribution: DistributionPoint[];
  surveyDigitalEaseDistribution: DistributionPoint[];
  surveyUserTypes: DistributionPoint[];
  clubUserTypes: DistributionPoint[];
  clubPrograms: ProgramPoint[];
  topPrograms: ProgramPoint[];
  facultyLoad: FacultyPoint[];
  clubLoanStudents: StudentClubLoanPoint[];
  loanAttentionStudents: StudentAttentionPoint[];
  loanResourceStudents: StudentResourcePoint[];
  loanTotals: {
    total: number;
    uniquePrograms: number;
    uniqueCollections: number;
    uniqueFaculties: number;
  };
  resourceTotals: {
    interactions: number;
    sessions: number;
    searches: number;
    downloads: number;
    uniqueResources: number;
    rows: number;
  };
  surveyTotals: {
    responses: number;
    averageSatisfaction: number;
    satisfiedRate: number;
  };
  clubTotals: {
    attendance: number;
    uniqueClubs: number;
    uniquePrograms: number;
  };
  crossTotals: {
    clubLoanOverlap: number;
    loanAttentionMatches: number;
    loanResourceMatches: number;
    averageAttentionScore: number;
    resourceCoverageRate: number;
  };
  availableFaculties: string[];
  availableUserTypes: string[];
  dateBounds: { min: string; max: string };
}
