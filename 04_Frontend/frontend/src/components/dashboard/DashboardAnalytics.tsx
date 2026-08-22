import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';
import { Link } from 'react-router-dom';
import type { ReportsCharts } from '@/services/reports-service';
import { formatCurrency } from '@/utils/booking-form';
import { DashboardEmpty, DashboardSkeleton } from './DashboardEmpty';
import { QueryErrorPanel } from './QueryErrorPanel';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

interface DashboardAnalyticsProps {
  charts?: ReportsCharts;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export function DashboardAnalytics({ charts, loading, error, onRetry }: DashboardAnalyticsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const tick = { fill: '#f3e6c8', fontSize: 14, fontWeight: 600 };
  const tooltipStyle = {
    background: 'rgba(12, 6, 10, 0.94)',
    border: '1px solid rgba(232, 197, 71, 0.45)',
    borderRadius: 14,
    color: '#fff8ee',
    fontSize: 15,
    boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
  };

  const totals = useMemo(() => {
    const rows = charts?.monthlyIncomeExpense ?? [];
    return rows.reduce(
      (acc, row) => ({
        income: acc.income + row.income,
        expenses: acc.expenses + row.expenses,
        profit: acc.profit + row.profit,
      }),
      { income: 0, expenses: 0, profit: 0 },
    );
  }, [charts]);

  if (loading) {
    return (
      <>
        <DashboardSkeleton className="h-80" />
        <DashboardSkeleton className="h-80" />
      </>
    );
  }

  if (error) {
    return <QueryErrorPanel error={error} fallback="Failed to load charts." onRetry={onRetry} />;
  }

  if (!charts || charts.monthlyIncomeExpense.length === 0) {
    return <DashboardEmpty message="Revenue analytics will appear once studio billing data is available." />;
  }

  const donut = [
    { name: 'Income', value: totals.income },
    { name: 'Expenses', value: totals.expenses },
  ].filter((item) => item.value > 0);
  const margin = totals.income > 0 ? (totals.profit / totals.income) * 100 : null;

  return (
    <>
      <section className="dhara-dash-panel dhara-dash-chart-panel">
        <div className="dhara-dash-panel-head">
          <h3>Revenue Overview</h3>
          <Link to="/reports" className="dhara-dash-link">
            Full reports →
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={charts.monthlyIncomeExpense}>
            <defs>
              <linearGradient id="dharaDashRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd45a" stopOpacity={0.42} />
                <stop offset="55%" stopColor="#c084fc" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.12)" />
            <XAxis dataKey="label" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="none"
              fill="url(#dharaDashRevenueFill)"
              isAnimationActive={!reducedMotion}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#ffd45a"
              strokeWidth={3.2}
              dot={{ r: 4, fill: '#ffd45a', stroke: '#fff4c8', strokeWidth: 1 }}
              isAnimationActive={!reducedMotion}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="dhara-dash-totals">
          <div>
            <p>Total Revenue</p>
            <strong>{formatCurrency(totals.income)}</strong>
          </div>
          <div>
            <p>Total Expenses</p>
            <strong>{formatCurrency(totals.expenses)}</strong>
          </div>
          <div>
            <p>Net Profit</p>
            <strong>{formatCurrency(totals.profit)}</strong>
          </div>
        </div>
      </section>

      <section className="dhara-dash-panel dhara-dash-chart-panel">
        <div className="dhara-dash-panel-head">
          <h3>Income vs Expenses</h3>
        </div>
        {donut.length === 0 ? (
          <DashboardEmpty message="Income and expense totals will appear once billing data is available." />
        ) : (
          <>
            <div className="dhara-dash-donut-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={92}
                    paddingAngle={3}
                    isAnimationActive={!reducedMotion}
                  >
                    <Cell fill="#ffd45a" />
                    <Cell fill="#7c3aed" />
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 14, color: '#ead9c2' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="dhara-dash-donut-center">
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#e2c9a4' }}>TOTAL</p>
                <strong style={{ fontSize: '1.25rem' }}>{formatCurrency(totals.income + totals.expenses)}</strong>
              </div>
            </div>
            {margin !== null ? (
              <div className="dhara-dash-totals" style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <p>Profit Margin</p>
                  <strong>{margin.toFixed(1)}%</strong>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
