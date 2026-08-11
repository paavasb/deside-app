import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Last-resort boundary.
 *
 * Query and mutation failures are handled inline where they happen; this only
 * catches render-time bugs, which would otherwise unmount the whole tree and leave
 * a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfaces in the browser console and, in production, in Cloud Logging via the
    // hosting integration.
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="page">
          <div className="empty">
            <p className="empty__title">Something broke on this page</p>
            <p className="text-s">
              This is a bug on our side, not something you did. Reloading usually helps.
            </p>
            <p style={{ marginTop: 'var(--space-s)' }}>
              <button type="button" className="button" onClick={() => window.location.reload()}>
                Reload DeSide
              </button>
            </p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
