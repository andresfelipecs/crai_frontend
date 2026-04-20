import type { MetricItem } from '../types/dashboard';

interface MetricCardProps {
  metric: MetricItem;
}

export const MetricCard = ({ metric }: MetricCardProps) => (
  <article className="metric-card">
    <p className="metric-label">{metric.label}</p>
    <h3 className="metric-value">{metric.value}</h3>
    <p className="metric-helper">{metric.helper}</p>
  </article>
);
