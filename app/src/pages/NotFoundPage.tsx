import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="page">
      <div className="empty">
        <p className="empty__title">Page not found</p>
        <p className="text-s">That page doesn’t exist — or it may have been removed.</p>
        <p style={{ marginTop: 'var(--space-s)' }}>
          <Link className="button" to="/questions">
            Back to questions
          </Link>
        </p>
      </div>
    </main>
  );
}
