import type { LucideIcon } from 'lucide-react';
import { DashboardSparkline } from './DashboardSparkline';

interface DashboardKpiCardProps {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  tone?: 'violet' | 'green' | 'gold' | 'blue';
  meter?: number;
  sparkline?: number[];
  roboTarget?: string;
}

export function DashboardKpiCard({
  label,
  value,
  trend,
  icon: Icon,
  tone = 'gold',
  meter,
  sparkline,
  roboTarget,
}: DashboardKpiCardProps) {
  const bounded = meter !== undefined ? Math.min(1, Math.max(0, meter)) : undefined;

  return (
    <article className={`dhara-dash-kpi is-${tone}`} data-robo-target={roboTarget}>
      <div className="dhara-dash-kpi-top">
        <h3>{label}</h3>
        <span className="dhara-dash-kpi-icon">
          <Icon />
        </span>
      </div>
      <strong>{value}</strong>
      <p className="dhara-dash-kpi-trend">{trend}</p>
      <div className="dhara-dash-meter" aria-hidden>
        <i style={{ width: `${(bounded ?? 0.42) * 100}%` }} />
      </div>
      {sparkline && sparkline.length > 1 ? <DashboardSparkline values={sparkline} /> : null}
    </article>
  );
}
