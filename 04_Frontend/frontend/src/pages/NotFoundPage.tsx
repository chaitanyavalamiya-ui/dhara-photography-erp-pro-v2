import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-lg text-center">
      <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Error 404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-gold">Page not found</h1>
      <p className="mt-3 text-sm text-gray-400">
        This URL is not part of Dhara Photography ERP. Check the address or return to the dashboard.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
        Back to dashboard
      </Link>
    </div>
  );
}
