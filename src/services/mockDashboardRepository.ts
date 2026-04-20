import {
  loadCsvRows,
  loadCsvWithHeaderAfterRows,
  loadCsvWithHeaders,
  normalizeLabel,
  normalizeText,
  parseFlexibleDate,
  parseNumber,
  pickField,
} from '../lib/parsing';
import type { ClubRecord, DashboardDataset, LoanRecord, ResourceRecord, SurveyRecord } from '../types/dashboard';
import type { DashboardRepository } from './dashboardRepository';

const scoreFromSatisfaction = (label: string): number => {
  const value = normalizeText(label);

  if (!value) {
    return 0;
  }

  if (value.includes('excelente') || value.includes('extremadamente satisfecho')) {
    return 5;
  }

  if (value.includes('satisfecho') || value.includes('bueno')) {
    return 4;
  }

  if (value.includes('regular') || value.includes('neutral') || value.includes('ni dificil ni facil')) {
    return 3;
  }

  if (value.includes('insatisfecho') || value.includes('dificil') || value.includes('malo')) {
    return 2;
  }

  if (value.includes('pesimo') || value.includes('extremadamente insatisfecho')) {
    return 1;
  }

  return 3;
};

const mapLoans = async (): Promise<LoanRecord[]> => {
  const rows = await loadCsvWithHeaders('/data/loans.csv');

  return rows
    .map((row) => {
      const loanDate = parseFlexibleDate(
        pickField(row, ['fecha y hora', 'fecha']) || pickField(row, ['ultimo mes de prestamo']),
      );

      if (!loanDate) {
        return null;
      }

      return {
        faculty: normalizeLabel(pickField(row, ['facultad']), 'No definida'),
        program: normalizeLabel(pickField(row, ['programa academico']), 'No definido'),
        userType: normalizeLabel(pickField(row, ['estado de usuario']), 'No definido'),
        collection: normalizeLabel(pickField(row, ['coleccion']), 'No definida'),
        loanDate,
      };
    })
    .filter((row): row is LoanRecord => Boolean(row));
};

const mapSurvey = async (): Promise<SurveyRecord[]> => {
  const rows = await loadCsvWithHeaders('/data/survey.csv');

  return rows
    .map((row) => {
      const submittedAt = parseFlexibleDate(pickField(row, ['hora de inicio']));

      if (!submittedAt) {
        return null;
      }

      const satisfactionLabel = normalizeLabel(
        pickField(row, ['tan satisfecho se encuentra con el servicio en general', 'satisfecho te encuentras']),
        'Sin respuesta',
      );

      return {
        faculty: normalizeLabel(pickField(row, ['selecciona tu facultad']), 'No definida'),
        program: normalizeLabel(pickField(row, ['selecciona tu programa']), 'No definido'),
        userType: normalizeLabel(pickField(row, ['eres un usuario', 'tipo de usuario']), 'No definido'),
        visitFrequency: normalizeLabel(pickField(row, ['con que frecuencia utiliza']), 'Sin respuesta'),
        satisfactionLabel,
        satisfactionScore: scoreFromSatisfaction(satisfactionLabel),
        digitalEaseLabel: normalizeLabel(
          pickField(row, ['que tan facil es acceder y usar los recursos digitales']),
          'Sin respuesta',
        ),
        submittedAt,
      };
    })
    .filter((row): row is SurveyRecord => Boolean(row));
};

const mapClubs = async (): Promise<ClubRecord[]> => {
  const rows = await loadCsvRows('/data/clubs.csv');

  return rows
    .map((row) => {
      const attendanceDate = parseFlexibleDate(row[1] ?? '');

      if (!attendanceDate) {
        return null;
      }

      return {
        club: normalizeLabel(row[14] ?? '', 'Club no especificado'),
        userType: normalizeLabel(row[21] ?? '', 'No definido'),
        program: normalizeLabel(row[30] ?? '', 'No definido'),
        attendee: normalizeLabel(row[24] ?? '', 'Anonimo'),
        attendanceDate,
      };
    })
    .filter((row): row is ClubRecord => Boolean(row));
};

const mapResources = async (): Promise<ResourceRecord[]> => {
  const rows = await loadCsvWithHeaderAfterRows('/data/resources.csv', 17);

  return rows
    .map((row) => ({
      faculty: normalizeLabel(pickField(row, ['facultad']), 'No definida'),
      userType: normalizeLabel(pickField(row, ['tipo de usuario']), 'No definido'),
      resource: normalizeLabel(pickField(row, ['recurso electronico']), 'No definido'),
      sessions: parseNumber(pickField(row, ['sesiones'])),
      searches: parseNumber(pickField(row, ['busquedas'])),
      downloads: parseNumber(pickField(row, ['descargas'])),
      total: parseNumber(pickField(row, ['totales'])),
    }))
    .filter((row) => row.resource !== 'No definido');
};

export class MockDashboardRepository implements DashboardRepository {
  async getDataset(): Promise<DashboardDataset> {
    const [loans, survey, clubs, resources] = await Promise.all([
      mapLoans(),
      mapSurvey(),
      mapClubs(),
      mapResources(),
    ]);

    return {
      loans,
      survey,
      clubs,
      resources,
    };
  }
}
