import { getApiErrorMessage } from '@/utils/api-error';

interface QueryErrorPanelProps {
  error: unknown;
  fallback: string;
  onRetry: () => void;
}

export function QueryErrorPanel({ error, fallback, onRetry }: QueryErrorPanelProps) {
  return (
    <div
      className="rounded-lg border px-4 py-6 text-center"
      style={{ borderColor: 'var(--dhara-danger, #ef4444)' }}
    >
      <p className="text-sm" style={{ color: 'var(--dhara-danger, #ef4444)' }}>
        {getApiErrorMessage(error, fallback)}
      </p>
      <button type="button" className="btn-secondary mt-3" onClick={() => void onRetry()}>
        Retry
      </button>
    </div>
  );
}

export function isEnabledQueryLoading(
  enabled: boolean,
  query: { isLoading: boolean },
): boolean {
  return enabled && query.isLoading;
}
