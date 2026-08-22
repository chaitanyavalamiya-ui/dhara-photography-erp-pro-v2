import { useMemo } from 'react';
import type { MonthlyFinancialRow } from '@/services/accounts-service';
import { formatCurrency } from '@/utils/booking-form';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function AccountsMonthlyChart({ rows }: { rows: MonthlyFinancialRow[] }) {
  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  return (
    <div className="dhara-acc-chart">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={rows} margin={{ top: 12, right: 14, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="accRecvFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="accExpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4ec8" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#ff4ec8" stopOpacity={0.02} />
            </linearGradient>
            <filter id="accLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke="rgba(255,212,90,0.14)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#fff6d6', fontSize: 13, fontWeight: 700 }} />
          <YAxis
            tick={{ fill: '#fff6d6', fontSize: 13, fontWeight: 700 }}
            tickFormatter={(value: number) =>
              value >= 100000 ? `${Math.round(value / 1000)}k` : String(value)
            }
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(16,7,11,0.96)',
              border: '1px solid rgba(255,212,90,0.45)',
              borderRadius: 14,
              color: '#fffdf8',
              fontWeight: 800,
              boxShadow: '0 0 24px rgba(255,212,90,0.18)',
            }}
            formatter={(value) => formatCurrency(Number(value ?? 0))}
          />
          <Legend wrapperStyle={{ color: '#fff1c9', fontWeight: 800, fontSize: 13 }} />
          <Area
            type="monotone"
            dataKey="cashReceived"
            name="Cash Received"
            stroke="#4ade80"
            fill="url(#accRecvFill)"
            strokeWidth={2.8}
            filter="url(#accLineGlow)"
            isAnimationActive={!reduceMotion}
            animationDuration={900}
            activeDot={{ r: 6, stroke: '#fffdf8', strokeWidth: 1.5, fill: '#4ade80' }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#ff4ec8"
            fill="url(#accExpFill)"
            strokeWidth={2.8}
            filter="url(#accLineGlow)"
            isAnimationActive={!reduceMotion}
            animationDuration={980}
            activeDot={{ r: 6, stroke: '#fffdf8', strokeWidth: 1.5, fill: '#ff4ec8' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
