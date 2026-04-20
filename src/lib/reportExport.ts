import type { DashboardFilters, DashboardViewModel } from '../types/dashboard';

const escapeCsv = (value: string): string => {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
};

const buildRows = (model: DashboardViewModel, filters: DashboardFilters): string[][] => {
  const rows: string[][] = [];

  rows.push(['Reporte', 'CRAI Dashboard']);
  rows.push(['Generado en', new Date().toISOString()]);
  rows.push(['Filtro desde', filters.startDate || 'N/A']);
  rows.push(['Filtro hasta', filters.endDate || 'N/A']);
  rows.push(['Filtro facultad', filters.faculty]);
  rows.push(['Filtro tipo usuario', filters.userType]);
  rows.push([]);

  rows.push(['KPIs']);
  rows.push(['Indicador', 'Valor', 'Detalle']);
  model.metrics.forEach((metric) => {
    rows.push([metric.label, metric.value, metric.helper]);
  });
  rows.push([]);

  rows.push(['Top recursos digitales']);
  rows.push(['Recurso', 'Interacciones']);
  model.resourceUsage.forEach((item) => {
    rows.push([item.resource, String(item.total)]);
  });
  rows.push([]);

  rows.push(['Top programas por prestamo']);
  rows.push(['Programa', 'Prestamos']);
  model.topPrograms.forEach((item) => {
    rows.push([item.program, String(item.value)]);
  });

  return rows;
};

export const exportReportCsv = (model: DashboardViewModel, filters: DashboardFilters): void => {
  const rows = buildRows(model, filters);
  const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `crai_dashboard_report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};
