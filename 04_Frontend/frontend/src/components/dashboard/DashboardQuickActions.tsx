import { Link } from 'react-router-dom';
import { CalendarPlus, Receipt, UserPlus, Wallet } from 'lucide-react';

interface QuickAction {
  label: string;
  description: string;
  to: string;
  icon: typeof CalendarPlus;
}

interface DashboardQuickActionsProps {
  actions: QuickAction[];
}

export function DashboardQuickActions({ actions }: DashboardQuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <section className="dhara-dash-panel">
      <div className="dhara-dash-panel-head">
        <h3>Quick Actions</h3>
      </div>
      <div className="dhara-dash-actions">
        {actions.map((action) => (
          <Link key={action.label} to={action.to} className="dhara-dash-action">
            <span className="dhara-dash-action-icon">
              <action.icon />
            </span>
            <span>
              {action.label}
              <small>{action.description}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export const DASHBOARD_QUICK_ACTION_ICONS = {
  booking: CalendarPlus,
  client: UserPlus,
  invoice: Receipt,
  expense: Wallet,
};
