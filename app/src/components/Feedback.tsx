import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '@/lib/appError';

/**
 * Errors are announced via `role="alert"` so a screen-reader user hears a failed
 * vote or a rejected form instead of it changing silently on screen.
 */
export function ErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="alert alert--error" role="alert">
      <span className="grow">{errorMessage(error)}</span>
      {onRetry && (
        <button type="button" className="button button--ghost" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function InfoAlert({ children }: { children: ReactNode }) {
  return (
    <p className="alert alert--info" role="status">
      {children}
    </p>
  );
}

export function SuccessAlert({ children }: { children: ReactNode }) {
  return (
    <p className="alert alert--success" role="status">
      {children}
    </p>
  );
}

export function EmptyState({
  title,
  children,
  actionLabel,
  actionTo,
}: {
  title: string;
  children?: ReactNode;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children && <p className="text-s">{children}</p>}
      {actionLabel && actionTo && (
        <p style={{ marginTop: 'var(--space-s)' }}>
          <Link className="button" to={actionTo}>
            {actionLabel}
          </Link>
        </p>
      )}
    </div>
  );
}

/**
 * Loading placeholders sized like the content they replace, so the page doesn't
 * jump when data arrives.
 */
export function QuestionSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="stack" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton skeleton--question" />
      ))}
    </div>
  );
}

export function LoadingRegion({ label }: { label: string }) {
  return (
    <p className="row muted text-s" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  );
}

/** Full-page splash used while the auth session resolves. */
export function Splash({ label = 'Loading DeSide…' }: { label?: string }) {
  return (
    <div className="splash">
      <div className="splash__box">
        <span className="spinner" aria-hidden="true" />
        <p className="splash__subtitle" role="status">
          {label}
        </p>
      </div>
    </div>
  );
}
