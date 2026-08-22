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
import { cn } from '@/utils/cn';

const CHART_COLORS = ['#ffd45a', '#22d3ee', '#4ade80', '#ff9a3c', '#c084fc', '#fb7185'];

function formatTooltipValue(value: unknown): string {
  return formatCurrency(Number(value ?? 0));
}

const tooltipStyle: CSSProperties = {
  background: 'rgba(12, 6, 10, 0.94)',
  border: '1px solid rgba(255, 212, 90, 0.45)',
  borderRadius: 14,
  color: '#fff8ee',
  fontSize: 15,
  fontWeight: 700,
  boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
};

const tick = { fill: '#fff1c9', fontSize: 13, fontWeight: 700 };

function prefersReducedMotion() {
  return Boolean(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}

interface ReportChartsSectionProps {
  charts?: ReportsCharts;
  loading?: boolean;
}

export function ReportChartsSection({ charts, loading }: ReportChartsSectionProps) {
  const animate = !prefersReducedMotion();

  if (loading) {
    return (
      <div className="dhara-rpt-charts">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dhara-rpt-skeleton" style={{ minHeight: '20rem' }} />
        ))}
      </div>
    );
  }

  if (!charts) return null;

  return (
    <div className="dhara-rpt-charts">
      <ChartCard title="Revenue Overview">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={charts.monthlyIncomeExpense}>
            <defs>
              <linearGradient id="rptRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.38} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,212,90,0.12)" />
            <XAxis dataKey="label" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="none"
              fill="url(#rptRevenueFill)"
              isAnimationActive={animate}
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Revenue"
              stroke="#ffd45a"
              strokeWidth={2.8}
              dot={{ r: 4, fill: '#ffd45a', stroke: '#fff1c9', strokeWidth: 1.2 }}
              activeDot={{ r: 6, fill: '#22d3ee', stroke: '#fffdf8', strokeWidth: 1.4 }}
              isAnimationActive={animate}
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Income vs Expenses">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={charts.monthlyIncomeExpense} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,212,90,0.12)" />
            <XAxis type="number" tick={tick} />
            <YAxis type="category" dataKey="label" width={84} tick={tick} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Legend wrapperStyle={{ color: '#fff1c9', fontWeight: 800, fontSize: 14 }} />
            <Bar
              dataKey="income"
              name="Income"
              fill="#4ade80"
              radius={[0, 6, 6, 0]}
              isAnimationActive={animate}
              animationDuration={900}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="#fb7185"
              radius={[0, 6, 6, 0]}
              isAnimationActive={animate}
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Monthly Profit / Loss">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={charts.monthlyIncomeExpense}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,212,90,0.12)" />
            <XAxis dataKey="label" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Line
              type="monotone"
              dataKey="profit"
              name="Profit"
              stroke="#22d3ee"
              strokeWidth={2.8}
              dot={{ r: 4, fill: '#22d3ee', stroke: '#fffdf8', strokeWidth: 1.2 }}
              activeDot={{ r: 6, fill: '#ffd45a' }}
              isAnimationActive={animate}
              animationDuration={1100}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Income by Payment Method">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={charts.incomeByPaymentMethod}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={96}
              innerRadius={42}
              paddingAngle={2}
              isAnimationActive={animate}
              animationDuration={900}
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
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={charts.expensesByCategory} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,212,90,0.12)" />
            <XAxis type="number" tick={tick} />
            <YAxis type="category" dataKey="label" width={110} tick={tick} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Bar
              dataKey="value"
              fill="#ff9a3c"
              radius={[0, 6, 6, 0]}
              isAnimationActive={animate}
              animationDuration={900}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {charts.bookingRevenueByType.length > 0 && (
        <ChartCard title="Booking Revenue by Event Type" className="is-wide">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.bookingRevenueByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,212,90,0.12)" />
              <XAxis dataKey="label" tick={tick} />
              <YAxis tick={tick} />
              <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
              <Bar
                dataKey="value"
                name="Revenue"
                fill="#ffd45a"
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
                animationDuration={900}
              />
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
    <div className={cn('dhara-rpt-chart', className)}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
