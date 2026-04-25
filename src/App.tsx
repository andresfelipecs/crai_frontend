import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bell,
  BookOpen,
  ChartBar,
  Database,
  Download,
  Filter,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { MetricCard } from './components/MetricCard';
import { Panel } from './components/Panel';
import { useDashboardData } from './hooks/useDashboardData';
import { exportReportCsv } from './lib/reportExport';
import type { MetricItem } from './types/dashboard';

type SectionId = 'summary' | 'loans' | 'resources' | 'survey' | 'clubs';
type CrossTooltipPayload = {
  payload: {
    student: string;
    loans: number;
    digitalUsage: number;
  };
};

const RESOURCE_COLORS = ['#A20E2D', '#C61A38', '#E72845', '#FF3B56', '#7E1636', '#223A64', '#7B0F29', '#5E2846'];
const CLUB_COLORS = ['#A20E2D', '#FF3B56', '#223A64', '#7E1636', '#C61A38', '#5E2846'];
const SURVEY_COLORS = ['#A20E2D', '#FF3B56', '#223A64', '#D6425C', '#6A1B3A', '#374A70'];

const SECTION_CONFIG: Array<{
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
  hint: string;
}> = [
  { id: 'summary', label: 'General', icon: LayoutDashboard, hint: 'Dashboard principal' },
  { id: 'loans', label: 'Prestamos', icon: BookOpen, hint: 'Uso de biblioteca' },
  { id: 'resources', label: 'Recursos', icon: Database, hint: 'Elogim y digitales' },
  { id: 'survey', label: 'Encuestas', icon: Users, hint: 'Satisfaccion' },
  { id: 'clubs', label: 'Clubes', icon: ChartBar, hint: 'Lectura y cine' },
];

const makeTooltipFormatter = (value: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);

const formatDecimal = (value: number, digits = 1) =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

const EmptyPanelBody = ({ message }: { message: string }) => (
  <div className="empty-panel">
    <p>{message}</p>
  </div>
);

const LoanResourceTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: CrossTooltipPayload[];
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{point.student}</p>
      <p>Prestamos: {formatNumber(point.loans)}</p>
      <p>Uso digital: {formatNumber(point.digitalUsage)}</p>
    </div>
  );
};

function App() {
  const { loading, error, filters, setFilters, model, dataSourceDetail } = useDashboardData();
  const [activeSection, setActiveSection] = useState<SectionId>('summary');

  const section = SECTION_CONFIG.find((item) => item.id === activeSection) ?? SECTION_CONFIG[0];

  const summaryInsight =
    model.resourceUsage.length > 0
      ? `Mayor traccion digital: ${model.resourceUsage[0].resource}. ${formatNumber(
          model.crossTotals.loanResourceMatches,
        )} estudiantes enlazan prestamos con recursos electronicos.`
      : 'Ajusta filtros para descubrir relaciones entre prestamos, clubes, encuestas y recursos.';

  const sectionInsight = useMemo(() => {
    if (activeSection === 'loans') {
      const topProgram = model.topPrograms[0]?.program ?? 'Sin dato';
      return `Programa con mayor prestamo: ${topProgram}.`;
    }

    if (activeSection === 'resources') {
      const topResource = model.resourceUsage[0]?.resource ?? 'Sin dato';
      return `Recurso mas consultado: ${topResource}.`;
    }

    if (activeSection === 'survey') {
      return `Satisfaccion promedio actual: ${formatDecimal(model.surveyTotals.averageSatisfaction)}/5.`;
    }

    if (activeSection === 'clubs') {
      const topClub = model.clubDistribution[0]?.label ?? 'Sin dato';
      return `Club con mayor asistencia: ${topClub}.`;
    }

    return summaryInsight;
  }, [activeSection, model, summaryInsight]);

  const summaryMetrics = model.metrics;

  const loanMetrics: MetricItem[] = [
    {
      label: 'Prestamos filtrados',
      value: formatNumber(model.loanTotals.total),
      helper: `${formatNumber(model.loanTotals.uniquePrograms)} programas impactados`,
    },
    {
      label: 'Colecciones activas',
      value: formatNumber(model.loanTotals.uniqueCollections),
      helper: 'Colecciones con movimiento en el periodo',
    },
    {
      label: 'Facultades activas',
      value: formatNumber(model.loanTotals.uniqueFaculties),
      helper: 'Facultades con al menos un prestamo',
    },
    {
      label: 'Promedio mensual',
      value: formatDecimal(
        model.timeSeries.length === 0
          ? 0
          : model.timeSeries.reduce((sum, item) => sum + item.loans, 0) / model.timeSeries.length,
      ),
      helper: 'Prestamos por mes en el rango',
    },
  ];

  const resourceMetrics: MetricItem[] = [
    {
      label: 'Interacciones digitales',
      value: formatNumber(model.resourceTotals.interactions),
      helper: `${formatNumber(model.resourceTotals.rows)} registros analizados`,
    },
    {
      label: 'Recursos unicos',
      value: formatNumber(model.resourceTotals.uniqueResources),
      helper: 'Recursos con consumo en el filtro activo',
    },
    {
      label: 'Sesiones',
      value: formatNumber(model.resourceTotals.sessions),
      helper: 'Total de sesiones registradas',
    },
    {
      label: 'Descargas',
      value: formatNumber(model.resourceTotals.downloads),
      helper: 'Volumen de descargas en recursos',
    },
  ];

  const surveyMetrics: MetricItem[] = [
    {
      label: 'Respuestas de encuesta',
      value: formatNumber(model.surveyTotals.responses),
      helper: 'Registros validos en el rango',
    },
    {
      label: 'Satisfaccion promedio',
      value: `${formatDecimal(model.surveyTotals.averageSatisfaction)}/5`,
      helper: 'Puntaje consolidado de satisfaccion',
    },
    {
      label: 'Satisfechos (>=4)',
      value: `${formatDecimal(model.surveyTotals.satisfiedRate)}%`,
      helper: 'Proporcion de respuestas positivas',
    },
    {
      label: 'Tipos de usuario',
      value: formatNumber(model.surveyUserTypes.length),
      helper: 'Diversidad de perfiles encuestados',
    },
  ];

  const clubMetrics: MetricItem[] = [
    {
      label: 'Asistencia total',
      value: formatNumber(model.clubTotals.attendance),
      helper: 'Participaciones registradas',
    },
    {
      label: 'Clubes activos',
      value: formatNumber(model.clubTotals.uniqueClubs),
      helper: 'Clubes con actividad',
    },
    {
      label: 'Programas participantes',
      value: formatNumber(model.clubTotals.uniquePrograms),
      helper: 'Programas representados',
    },
    {
      label: 'Promedio mensual',
      value: formatDecimal(
        model.timeSeries.length === 0
          ? 0
          : model.timeSeries.reduce((sum, item) => sum + item.clubs, 0) / model.timeSeries.length,
      ),
      helper: 'Asistencias por mes en el rango',
    },
  ];

  const crossMetrics: MetricItem[] = [
    {
      label: 'Clubes + prestamos',
      value: formatNumber(model.crossTotals.clubLoanOverlap),
      helper: 'Estudiantes que aparecen en ambos servicios',
    },
    {
      label: 'Prestamos + atencion',
      value: formatNumber(model.crossTotals.loanAttentionMatches),
      helper: `Atencion promedio: ${formatDecimal(model.crossTotals.averageAttentionScore)}/5`,
    },
    {
      label: 'Prestamos + recursos',
      value: formatNumber(model.crossTotals.loanResourceMatches),
      helper: 'Estudiantes enlazados con uso digital',
    },
    {
      label: 'Cobertura digital',
      value: `${formatDecimal(model.crossTotals.resourceCoverageRate)}%`,
      helper: 'Prestatarios que tambien usan recursos electronicos',
    },
  ];

  const mainDashboardMetrics: MetricItem[] = [...summaryMetrics, ...crossMetrics];

  const currentMetrics =
    activeSection === 'summary'
      ? mainDashboardMetrics
      : activeSection === 'loans'
        ? loanMetrics
        : activeSection === 'resources'
          ? resourceMetrics
          : activeSection === 'survey'
            ? surveyMetrics
            : clubMetrics;

  const handleDownloadReport = () => {
    exportReportCsv(model, filters);
  };

  const activitySeriesAvailable = model.timeSeries.some(
    (point) => point.loans > 0 || point.survey > 0 || point.clubs > 0,
  );

  const renderSummary = () => (
    <>
      <Panel title="Tendencia mensual integral" subtitle="Prestamos, encuestas y asistencia a clubes">
        {activitySeriesAvailable ? (
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={model.timeSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis dataKey="label" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Legend />
              <Line type="monotone" dataKey="loans" name="Prestamos" stroke="#A20E2D" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="survey" name="Encuestas" stroke="#223A64" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="clubs" name="Clubes" stroke="#FF3B56" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay actividad para el rango seleccionado." />
        )}
      </Panel>

      <Panel title="Satisfaccion del servicio" subtitle="Distribucion de respuestas en encuesta">
        {model.satisfactionDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.satisfactionDistribution} margin={{ top: 8, right: 10, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis
                dataKey="label"
                angle={-10}
                textAnchor="end"
                interval={0}
                height={74}
                tick={{ fill: '#5C2030', fontSize: 11 }}
              />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" fill="#223A64" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay respuestas de encuesta para el filtro actual." />
        )}
      </Panel>

      <Panel title="Top recursos digitales" subtitle="Mayores interacciones en Elogim / APIs internas">
        {model.resourceUsage.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.resourceUsage} layout="vertical" margin={{ top: 8, right: 12, left: 18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis type="number" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis type="category" dataKey="resource" width={170} tick={{ fill: '#5C2030', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="total" radius={[0, 10, 10, 0]}>
                {model.resourceUsage.map((entry, index) => (
                  <Cell key={`${entry.resource}-${index}`} fill={RESOURCE_COLORS[index % RESOURCE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay consumo de recursos digitales con estos filtros." />
        )}
      </Panel>

      <Panel title="Asistencia por club" subtitle="Distribucion de participacion en clubes">
        {model.clubDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Legend />
              <Pie
                data={model.clubDistribution}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={88}
                innerRadius={46}
                paddingAngle={3}
              >
                {model.clubDistribution.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={CLUB_COLORS[index % CLUB_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay registros de asistencia en clubes para este filtro." />
        )}
      </Panel>

      {renderCross()}
    </>
  );

  const renderLoans = () => (
    <>
      <Panel title="Evolucion mensual de prestamos" subtitle="Comportamiento del servicio de prestamo por mes">
        {model.timeSeries.some((point) => point.loans > 0) ? (
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={model.timeSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis dataKey="label" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Line type="monotone" dataKey="loans" name="Prestamos" stroke="#A20E2D" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay prestamos en el rango seleccionado." />
        )}
      </Panel>

      <Panel title="Colecciones mas prestadas" subtitle="Concentracion por tipo de coleccion">
        {model.loanCollections.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.loanCollections} layout="vertical" margin={{ top: 8, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis type="number" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={150} tick={{ fill: '#5C2030', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" fill="#C61A38" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="Sin colecciones con prestamos para este filtro." />
        )}
      </Panel>

      <Panel title="Top programas por prestamo" subtitle="Programas con mayor volumen de prestamos">
        {model.topPrograms.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Prestamos</th>
                </tr>
              </thead>
              <tbody>
                {model.topPrograms.map((item) => (
                  <tr key={item.program}>
                    <td>{item.program}</td>
                    <td>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanelBody message="No hay programas con prestamos para este filtro." />
        )}
      </Panel>

      <Panel title="Prestamos por facultad" subtitle="Distribucion de carga academica en biblioteca">
        {model.loanFaculties.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.loanFaculties} margin={{ top: 8, right: 10, left: 0, bottom: 46 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis
                dataKey="faculty"
                angle={-13}
                textAnchor="end"
                interval={0}
                height={98}
                tick={{ fill: '#5C2030', fontSize: 11 }}
              />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" fill="#223A64" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay datos por facultad para el rango seleccionado." />
        )}
      </Panel>
    </>
  );

  const renderResources = () => (
    <>
      <Panel title="Top recursos consultados" subtitle="Recursos con mayor interaccion total">
        {model.resourceUsage.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.resourceUsage} layout="vertical" margin={{ top: 8, right: 12, left: 18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis type="number" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis type="category" dataKey="resource" width={170} tick={{ fill: '#5C2030', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="total" radius={[0, 10, 10, 0]}>
                {model.resourceUsage.map((entry, index) => (
                  <Cell key={`${entry.resource}-${index}`} fill={RESOURCE_COLORS[index % RESOURCE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay recursos con consumo en este filtro." />
        )}
      </Panel>

      <Panel title="Desglose de actividad" subtitle="Sesiones, busquedas y descargas">
        {model.resourceActions.some((item) => item.value > 0) ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.resourceActions} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis dataKey="label" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {model.resourceActions.map((item, index) => (
                  <Cell key={`${item.label}-${index}`} fill={RESOURCE_COLORS[index % RESOURCE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay actividad de recursos para este filtro." />
        )}
      </Panel>

      <Panel title="Consumo por facultad" subtitle="Interacciones de recursos por facultad">
        {model.resourceFacultyUsage.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.resourceFacultyUsage} margin={{ top: 8, right: 10, left: 0, bottom: 44 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis
                dataKey="faculty"
                angle={-13}
                textAnchor="end"
                interval={0}
                height={98}
                tick={{ fill: '#5C2030', fontSize: 11 }}
              />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" fill="#A20E2D" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay datos de facultad para recursos." />
        )}
      </Panel>

      <Panel title="Resumen operativo" subtitle="Indicadores de performance digital">
        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total interacciones</td>
                <td>{formatNumber(model.resourceTotals.interactions)}</td>
              </tr>
              <tr>
                <td>Total sesiones</td>
                <td>{formatNumber(model.resourceTotals.sessions)}</td>
              </tr>
              <tr>
                <td>Total busquedas</td>
                <td>{formatNumber(model.resourceTotals.searches)}</td>
              </tr>
              <tr>
                <td>Total descargas</td>
                <td>{formatNumber(model.resourceTotals.downloads)}</td>
              </tr>
              <tr>
                <td>Recursos unicos</td>
                <td>{formatNumber(model.resourceTotals.uniqueResources)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );

  const renderSurvey = () => (
    <>
      <Panel title="Satisfaccion general" subtitle="Como califican el servicio CRAI">
        {model.satisfactionDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.satisfactionDistribution} margin={{ top: 8, right: 10, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis
                dataKey="label"
                angle={-10}
                textAnchor="end"
                interval={0}
                height={72}
                tick={{ fill: '#5C2030', fontSize: 11 }}
              />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" fill="#A20E2D" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay respuestas de satisfaccion para este filtro." />
        )}
      </Panel>

      <Panel title="Frecuencia de uso del CRAI" subtitle="Habitos de consulta y uso de servicios">
        {model.surveyFrequencyDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.surveyFrequencyDistribution} layout="vertical" margin={{ top: 8, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis type="number" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={180} tick={{ fill: '#5C2030', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" fill="#223A64" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay datos de frecuencia para este filtro." />
        )}
      </Panel>

      <Panel title="Facilidad de uso digital" subtitle="Percepcion de acceso a recursos digitales">
        {model.surveyDigitalEaseDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Legend />
              <Pie
                data={model.surveyDigitalEaseDistribution}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={92}
                innerRadius={44}
                paddingAngle={2}
              >
                {model.surveyDigitalEaseDistribution.map((item, index) => (
                  <Cell key={`${item.label}-${index}`} fill={SURVEY_COLORS[index % SURVEY_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay respuestas sobre facilidad digital en este filtro." />
        )}
      </Panel>

      <Panel title="Participacion por tipo de usuario" subtitle="Distribucion de los encuestados">
        {model.surveyUserTypes.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.surveyUserTypes} margin={{ top: 8, right: 10, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis
                dataKey="label"
                angle={-10}
                textAnchor="end"
                interval={0}
                height={70}
                tick={{ fill: '#5C2030', fontSize: 11 }}
              />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" fill="#FF3B56" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay tipos de usuario en encuesta para este filtro." />
        )}
      </Panel>
    </>
  );

  const renderClubs = () => (
    <>
      <Panel title="Evolucion mensual de asistencia" subtitle="Asistencia a clubes por mes">
        {model.timeSeries.some((point) => point.clubs > 0) ? (
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={model.timeSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis dataKey="label" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Line type="monotone" dataKey="clubs" name="Asistencia" stroke="#A20E2D" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay asistencia registrada en clubes para este rango." />
        )}
      </Panel>

      <Panel title="Participacion por club" subtitle="Cine foro y clubes de lectura">
        {model.clubDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Legend />
              <Pie
                data={model.clubDistribution}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={46}
                paddingAngle={3}
              >
                {model.clubDistribution.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={CLUB_COLORS[index % CLUB_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay datos de club en el periodo seleccionado." />
        )}
      </Panel>

      <Panel title="Asistencia por tipo de usuario" subtitle="Perfiles de participacion en clubes">
        {model.clubUserTypes.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.clubUserTypes} margin={{ top: 8, right: 10, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis
                dataKey="label"
                angle={-10}
                textAnchor="end"
                interval={0}
                height={70}
                tick={{ fill: '#5C2030', fontSize: 11 }}
              />
              <YAxis tick={{ fill: '#5C2030', fontSize: 12 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Bar dataKey="value" fill="#223A64" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay tipos de usuario en clubes para este filtro." />
        )}
      </Panel>

      <Panel title="Programas con mayor asistencia" subtitle="Top programas participantes en clubes">
        {model.clubPrograms.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Asistencias</th>
                </tr>
              </thead>
              <tbody>
                {model.clubPrograms.map((item) => (
                  <tr key={item.program}>
                    <td>{item.program}</td>
                    <td>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanelBody message="No hay programas con asistencia registrada en este filtro." />
        )}
      </Panel>
    </>
  );

  const renderCross = () => (
    <>
      <Panel
        title="Estudiantes que asisten a clubes y prestan libros"
        subtitle="Cruce individual entre asistencias a clubes y prestamos de libros"
        rightSlot={<span className="panel-badge">Documento o correo</span>}
      >
        {model.clubLoanStudents.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={model.clubLoanStudents} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis type="number" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis type="category" dataKey="student" width={112} tick={{ fill: '#5C2030', fontSize: 11 }} />
              <Tooltip formatter={(value: number) => makeTooltipFormatter(value)} />
              <Legend />
              <Bar dataKey="loans" name="Prestamos" fill="#A20E2D" radius={[0, 10, 10, 0]} />
              <Bar dataKey="clubs" name="Asistencias a clubes" fill="#223A64" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay estudiantes enlazados entre clubes y prestamos con el filtro actual." />
        )}
      </Panel>

      <Panel
        title="Prestamos vs satisfaccion con la atencion"
        subtitle='Cruce con la pregunta "Atencion" de la encuesta CRAI'
        rightSlot={<span className="panel-badge">Escala 1 a 5</span>}
      >
        {model.loanAttentionStudents.length > 0 ? (
          <ResponsiveContainer width="100%" height={290}>
            <ComposedChart data={model.loanAttentionStudents} margin={{ top: 8, right: 16, left: 0, bottom: 42 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis
                dataKey="student"
                angle={-10}
                textAnchor="end"
                interval={0}
                height={68}
                tick={{ fill: '#5C2030', fontSize: 11 }}
              />
              <YAxis yAxisId="left" tick={{ fill: '#5C2030', fontSize: 12 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fill: '#5C2030', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'Satisfaccion atencion' ? `${formatDecimal(value)}/5` : makeTooltipFormatter(value)
                }
              />
              <Legend />
              <Bar yAxisId="left" dataKey="loans" name="Prestamos" fill="#FF3B56" radius={[8, 8, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="attentionScore"
                name="Satisfaccion atencion"
                stroke="#223A64"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay estudiantes con prestamos y respuesta de atencion en el filtro actual." />
        )}
      </Panel>

      <Panel
        className="panel-wide"
        title="Relacion prestamos vs usos de recursos electronicos"
        subtitle="Cada punto representa un estudiante enlazado entre prestamos y recursos digitales"
        rightSlot={<span className="panel-badge">Estudiantes enlazados</span>}
      >
        {model.loanResourceStudents.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 8, right: 12, left: 2, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0CBD4" />
              <XAxis
                type="number"
                dataKey="loans"
                name="Prestamos"
                allowDecimals={false}
                tick={{ fill: '#5C2030', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="digitalUsage"
                name="Uso digital"
                allowDecimals={false}
                tick={{ fill: '#5C2030', fontSize: 12 }}
              />
              <Tooltip content={<LoanResourceTooltip />} cursor={{ stroke: '#A20E2D', strokeDasharray: '4 4' }} />
              <Scatter data={model.loanResourceStudents} fill="#A20E2D" fillOpacity={0.28} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanelBody message="No hay estudiantes con prestamos y uso de recursos electronicos en este filtro." />
        )}
      </Panel>
    </>
  );

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">uao</div>
          <div>
            <h1>CRAI Data Dashboard</h1>
          </div>
        </div>

        <nav className="menu">
          {SECTION_CONFIG.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeSection;

            return (
              <button
                key={item.id}
                className={`menu-item ${isActive ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div>
            <p className="overline">Plataforma CRAI · Analitica de servicios</p>
            <h2>Centro de Recursos para el Aprendizaje y la Investigacion</h2>
            <p className="subtitle">
              Interfaz temporal sobre CSV para validar UX y lectura de negocio mientras el backend ETL termina APIs.
            </p>
            <div className="source-pill">
              <span>Fuente activa:</span>
              <strong>{dataSourceDetail}</strong>
            </div>
          </div>

          <div className="top-actions">
            <button className="icon-action" type="button" onClick={handleDownloadReport} disabled={loading}>
              <Download size={16} /> Descargar reporte
            </button>
            <button className="circle-action" type="button" aria-label="Notificaciones">
              <Bell size={16} />
            </button>
          </div>
        </header>

        <section className="filters-row">
          <div className="filter-group">
            <label htmlFor="start-date">Desde</label>
            <input
              id="start-date"
              type="date"
              value={filters.startDate}
              min={model.dateBounds.min}
              max={filters.endDate || model.dateBounds.max}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
            />
          </div>

          <div className="filter-group">
            <label htmlFor="end-date">Hasta</label>
            <input
              id="end-date"
              type="date"
              value={filters.endDate}
              min={filters.startDate || model.dateBounds.min}
              max={model.dateBounds.max}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
            />
          </div>

          <div className="filter-group wide">
            <label htmlFor="faculty">Facultad</label>
            <select
              id="faculty"
              value={filters.faculty}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  faculty: event.target.value,
                }))
              }
            >
              <option value="Todas">Todas</option>
              {model.availableFaculties.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group wide">
            <label htmlFor="user-type">Tipo de usuario</label>
            <select
              id="user-type"
              value={filters.userType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  userType: event.target.value,
                }))
              }
            >
              <option value="Todos">Todos</option>
              {model.availableUserTypes.map((userType) => (
                <option key={userType} value={userType}>
                  {userType}
                </option>
              ))}
            </select>
          </div>

          <div className="chip">
            <Filter size={14} />
            <span>Filtros activos</span>
          </div>
        </section>

        {loading ? (
          <section className="loading-card">Cargando datasets y construyendo visualizaciones...</section>
        ) : null}

        {error ? <section className="error-card">No fue posible cargar la data: {error}</section> : null}

        <section className="section-headline">
          <h3>{section.label}</h3>
          <p>{section.hint}</p>
        </section>

        <section className="metrics-grid">
          {currentMetrics.map((metric) => (
            <MetricCard key={`${activeSection}-${metric.label}`} metric={metric} />
          ))}
        </section>

        <section className="insight-strip">
          <p>{sectionInsight}</p>
        </section>

        <section className="chart-grid">
          {activeSection === 'summary'
            ? renderSummary()
            : activeSection === 'loans'
              ? renderLoans()
              : activeSection === 'resources'
                ? renderResources()
                : activeSection === 'survey'
                  ? renderSurvey()
                  : renderClubs()}
        </section>
      </main>
    </div>
  );
}

export default App;
