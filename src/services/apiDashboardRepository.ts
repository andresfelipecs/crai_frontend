import type { DashboardRepository } from './dashboardRepository';
import { buildPersonKey } from '../lib/parsing';
import type { ClubRecord, DashboardDataset, LoanRecord, ResourceRecord, SurveyRecord } from '../types/dashboard';

interface DashboardApiResponse {
  loans: Array<Record<string, unknown>>;
  survey: Array<Record<string, unknown>>;
  clubs: Array<Record<string, unknown>>;
  resources: Array<Record<string, unknown>>;
}

const asString = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') {
    return value.trim() || fallback;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
};

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asDate = (value: unknown): Date => {
  const raw = asString(value, '');
  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
};

const mapLoan = (item: Record<string, unknown>): LoanRecord => ({
  personKey: buildPersonKey(asString(item.userId ?? item.idUsuario ?? item.documentId, ''), asString(item.email, '')),
  faculty: asString(item.faculty ?? item.facultad, 'No definida'),
  program: asString(item.program ?? item.programa, 'No definido'),
  userType: asString(item.userType ?? item.tipoUsuario, 'No definido'),
  collection: asString(item.collection ?? item.coleccion, 'No definida'),
  loanDate: asDate(item.loanDate ?? item.fechaPrestamo),
});

const mapSurvey = (item: Record<string, unknown>): SurveyRecord => ({
  personKey: buildPersonKey(asString(item.documentId ?? item.idUsuario ?? item.userId, ''), asString(item.email, '')),
  faculty: asString(item.faculty ?? item.facultad, 'No definida'),
  program: asString(item.program ?? item.programa, 'No definido'),
  userType: asString(item.userType ?? item.tipoUsuario, 'No definido'),
  visitFrequency: asString(item.visitFrequency ?? item.frecuencia, 'Sin respuesta'),
  satisfactionLabel: asString(item.satisfactionLabel ?? item.satisfaccion, 'Sin respuesta'),
  satisfactionScore: asNumber(item.satisfactionScore ?? item.puntajeSatisfaccion),
  digitalEaseLabel: asString(item.digitalEaseLabel ?? item.facilidadDigital, 'Sin respuesta'),
  attentionLabel: asString(item.attentionLabel ?? item.attention ?? item.satisfaccionAtencion, 'Sin respuesta'),
  attentionScore: asNumber(item.attentionScore ?? item.puntajeAtencion ?? item.satisfaccionAtencionScore),
  submittedAt: asDate(item.submittedAt ?? item.fechaEncuesta),
});

const mapClub = (item: Record<string, unknown>): ClubRecord => ({
  personKey: buildPersonKey(asString(item.documentId ?? item.idUsuario ?? item.userId, ''), asString(item.email, '')),
  club: asString(item.club, 'Club no especificado'),
  userType: asString(item.userType ?? item.tipoUsuario, 'No definido'),
  program: asString(item.program ?? item.programa, 'No definido'),
  attendee: asString(item.attendee ?? item.asistente, 'Anonimo'),
  attendanceDate: asDate(item.attendanceDate ?? item.fechaAsistencia),
});

const mapResource = (item: Record<string, unknown>): ResourceRecord => ({
  personKey: buildPersonKey(asString(item.documentId ?? item.identificacion ?? item.userId, ''), asString(item.email, '')),
  faculty: asString(item.faculty ?? item.facultad, 'No definida'),
  userType: asString(item.userType ?? item.tipoUsuario, 'No definido'),
  resource: asString(item.resource ?? item.recurso, 'No definido'),
  sessions: asNumber(item.sessions ?? item.sesiones),
  searches: asNumber(item.searches ?? item.busquedas),
  downloads: asNumber(item.downloads ?? item.descargas),
  total: asNumber(item.total ?? item.totales),
});

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const DASHBOARD_ENDPOINT = (import.meta.env.VITE_API_DASHBOARD_ENDPOINT as string | undefined) ?? '/api/dashboard';

const buildUrl = (): string => {
  if (!BASE_URL) {
    return DASHBOARD_ENDPOINT;
  }

  const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const normalizedPath = DASHBOARD_ENDPOINT.startsWith('/') ? DASHBOARD_ENDPOINT : `/${DASHBOARD_ENDPOINT}`;
  return `${normalizedBase}${normalizedPath}`;
};

export class ApiDashboardRepository implements DashboardRepository {
  async getDataset(): Promise<DashboardDataset> {
    const response = await fetch(buildUrl(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API dashboard request failed (${response.status})`);
    }

    const payload = (await response.json()) as DashboardApiResponse;

    return {
      loans: (payload.loans ?? []).map(mapLoan),
      survey: (payload.survey ?? []).map(mapSurvey),
      clubs: (payload.clubs ?? []).map(mapClub),
      resources: (payload.resources ?? []).map(mapResource),
    };
  }
}
