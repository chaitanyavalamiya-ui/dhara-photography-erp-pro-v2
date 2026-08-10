import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const CHART_COLORS = ['#b8860b', '#6b1d3a', '#2d6a4f', '#4a5568', '#c05621', '#805ad5'];

function formatTooltipValue(value: unknown): string {
  return formatCurrency(Number(value ?? 0));
}

interface ReportChartsSectionProps {
  charts?: ReportsCharts;
  loading?: boolean;
}

export function ReportChartsSection({ charts, loading }: ReportChartsSectionProps) {
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
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Monthly Income vs Expense">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={charts.monthlyIncomeExpense}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
              formatter={formatTooltipValue}
            />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#6b1d3a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Monthly Profit / Loss">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={charts.monthlyIncomeExpense}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
              formatter={formatTooltipValue}
            />
            <Line type="monotone" dataKey="profit" name="Profit" stroke="#b8860b" strokeWidth={2} />
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
            <Tooltip formatter={formatTooltipValue} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Expenses by Category">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={charts.expensesByCategory} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="value" fill="#6b1d3a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {charts.bookingRevenueByType.length > 0 && (
        <ChartCard title="Booking Revenue by Event Type" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.bookingRevenueByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip formatter={formatTooltipValue} />
              <Bar dataKey="value" name="Revenue" fill="#b8860b" radius={[4, 4, 0, 0]} />
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
      <h3 className="mb-3 font-display text-sm font-semibold text-gold">{title}</h3>
      {children}
    </div>
  );
}
