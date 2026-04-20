import Papa from 'papaparse';

type RowRecord = Record<string, string>;

export const normalizeText = (value: string): string =>
  value
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const cleanCell = (value: unknown): string =>
  String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();

const parseCsvText = <T>(text: string, config: Papa.ParseConfig<T>): Promise<Papa.ParseResult<T>> =>
  new Promise((resolve, reject) => {
    Papa.parse<T>(text, {
      ...config,
      complete: (result) => resolve(result),
      error: (error: Error) => reject(error),
    });
  });

const fetchText = async (path: string): Promise<string> => {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return response.text();
};

export const loadCsvWithHeaders = async (path: string): Promise<RowRecord[]> => {
  const text = await fetchText(path);

  const result = await parseCsvText<RowRecord>(text, {
    header: true,
    delimiter: ';',
    skipEmptyLines: 'greedy',
  });

  return result.data.map((row) => {
    const cleanRow: RowRecord = {};

    Object.entries(row).forEach(([key, value]) => {
      cleanRow[cleanCell(key)] = cleanCell(value);
    });

    return cleanRow;
  });
};

export const loadCsvRows = async (path: string): Promise<string[][]> => {
  const text = await fetchText(path);

  const result = await parseCsvText<string[]>(text, {
    header: false,
    delimiter: ';',
    skipEmptyLines: 'greedy',
  });

  return result.data.map((row) => row.map((value) => cleanCell(value)));
};

export const loadCsvWithHeaderAfterRows = async (
  path: string,
  skipRows: number,
): Promise<RowRecord[]> => {
  const text = await fetchText(path);
  const lines = text.split(/\r?\n/).slice(skipRows).join('\n');

  const result = await parseCsvText<RowRecord>(lines, {
    header: true,
    delimiter: ';',
    skipEmptyLines: 'greedy',
  });

  return result.data.map((row) => {
    const cleanRow: RowRecord = {};

    Object.entries(row).forEach(([key, value]) => {
      cleanRow[cleanCell(key)] = cleanCell(value);
    });

    return cleanRow;
  });
};

export const pickField = (row: RowRecord, hints: string[]): string => {
  const normalizedEntries = Object.entries(row).map(([key, value]) => ({
    key,
    normalizedKey: normalizeText(key),
    value: cleanCell(value),
  }));

  for (const hint of hints) {
    const normalizedHint = normalizeText(hint);
    const match = normalizedEntries.find((entry) => entry.normalizedKey.includes(normalizedHint));

    if (match && match.value.length > 0) {
      return match.value;
    }
  }

  return '';
};

export const parseFlexibleDate = (value: string): Date | null => {
  const cleaned = cleanCell(value);

  if (!cleaned) {
    return null;
  }

  const localPattern = cleaned.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (localPattern) {
    const day = Number(localPattern[1]);
    const month = Number(localPattern[2]);
    const year = Number(localPattern[3]);
    const hour = Number(localPattern[4] ?? 0);
    const minute = Number(localPattern[5] ?? 0);
    const second = Number(localPattern[6] ?? 0);

    return new Date(year, month - 1, day, hour, minute, second);
  }

  const isoCandidate = cleaned.replace(' ', 'T');
  const parsed = new Date(isoCandidate);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const parseNumber = (value: string): number => {
  const cleaned = cleanCell(value);

  if (!cleaned) {
    return 0;
  }

  const normalized = cleaned
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeLabel = (value: string, fallback = 'Sin dato'): string => {
  const cleaned = cleanCell(value);
  return cleaned.length > 0 ? cleaned : fallback;
};

export const toDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const monthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

export const monthLabel = (key: string): string => {
  const [year, month] = key.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[(month ?? 1) - 1] ?? 'Jan'} ${year ?? ''}`.trim();
};

export const createMonthRange = (start: Date, end: Date): string[] => {
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const final = new Date(end.getFullYear(), end.getMonth(), 1);
  const keys: string[] = [];

  while (current <= final) {
    keys.push(monthKey(current));
    current.setMonth(current.getMonth() + 1);
  }

  return keys;
};
