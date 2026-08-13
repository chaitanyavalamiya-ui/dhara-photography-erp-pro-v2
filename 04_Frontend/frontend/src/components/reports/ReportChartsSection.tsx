import type { CSSProperties, ReactNode } from 'react';
import {
  Area,
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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ReportsCharts } from '@/services/reports-service';
import { formatCurrency } from '@/utils/booking-form';
import { useDharaTheme } from '@/theme/ThemeProvider';

const CHART_COLORS = [
  'var(--dhara-accent)',
  'var(--dhara-danger)',
  'var(--dhara-success)',
  'var(--dhara-warning)',
  'var(--dhara-accent-soft)',
  'var(--dhara-text-secondary)',
];

function formatTooltipValue(value: unknown): string {
  return formatCurrency(Number(value ?? 0));
}

const tooltipStyle: CSSProperties = {
  background: 'var(--dhara-surface)',
  border: '1px solid var(--dhara-border)',
  borderRadius: 12,
  color: 'var(--dhara-text-primary)',
  boxShadow: 'var(--dhara-glass-shadow)',
};

const axisTick = { fill: 'var(--dhara-text-secondary)', fontSize: 11 };

interface ReportChartsSectionProps {
  charts?: ReportsCharts;
  loading?: boolean;
}

export function ReportChartsSection({ charts, loading }: ReportChartsSectionProps) {
  const { theme } = useDharaTheme();

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-72 animate-pulse bg-surface-elevated" />
        ))}
      </div>
    );
  }

  if (!charts) return null;

  return (
    <div key={theme} className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Revenue Overview">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={charts.monthlyIncomeExpense}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dhara-border)" />
            <XAxis dataKey="label" tick={axisTick} />
            <YAxis tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Area type="monotone" dataKey="income" stroke="none" fill="var(--dhara-glow)" />
            <Line
              type="monotone"
              dataKey="income"
              name="Revenue"
              stroke="var(--dhara-accent)"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Income vs Expenses">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={charts.monthlyIncomeExpense} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dhara-border)" />
            <XAxis type="number" tick={axisTick} />
            <YAxis type="category" dataKey="label" width={72} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="var(--dhara-success)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="var(--dhara-danger)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Monthly Profit / Loss">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={charts.monthlyIncomeExpense}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dhara-border)" />
            <XAxis dataKey="label" tick={axisTick} />
            <YAxis tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Line type="monotone" dataKey="profit" name="Profit" stroke="var(--dhara-accent)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Income by Payment Method">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={charts.incomeByPaymentMethod}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(props) => {
                const name = String(props.name ?? '');
                const pct = ((props.percent ?? 0) * 100).toFixed(0);
                return `${name} (${pct}%)`;
              }}
            >
              {charts.incomeByPaymentMethod.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Expenses by Category">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={charts.expensesByCategory} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dhara-border)" />
            <XAxis type="number" tick={axisTick} />
            <YAxis type="category" dataKey="label" width={100} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Bar dataKey="value" fill="var(--dhara-danger)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {charts.bookingRevenueByType.length > 0 && (
        <ChartCard title="Booking Revenue by Event Type" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.bookingRevenueByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dhara-border)" />
              <XAxis dataKey="label" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
              <Bar dataKey="value" name="Revenue" fill="var(--dhara-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card border-gold/10 p-4 ${className}`}>
      <h3 className="mb-3 font-display text-lg font-semibold" style={{ color: 'var(--dhara-accent)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
