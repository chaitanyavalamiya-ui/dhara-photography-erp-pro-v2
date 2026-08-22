import { CalendarDays } from 'lucide-react';

export function DashboardEmpty({ message }: { message: string }) {
  return (
    <div className="dhara-dash-empty">
      <CalendarDays className="mx-auto mb-2 h-5 w-5" style={{ color: 'var(--dhara-accent)' }} />
      <p>{message}</p>
    </div>
  );
}

export function DashboardSkeleton({ className = '' }: { className?: string }) {
  return <div className={`dhara-dash-skeleton ${className}`} aria-hidden />;
}
