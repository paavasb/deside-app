import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { ErrorAlert, Splash } from '@/components/Feedback';
import { Header } from '@/components/Header';
import { useViewerProfile } from '@/hooks/useProfile';
import { AddQuestionPage } from '@/pages/AddQuestionPage';
import { HelpPage } from '@/pages/HelpPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PublicProfilePage } from '@/pages/PublicProfilePage';
import { QuestionsPage } from '@/pages/QuestionsPage';
import { YourQuestionsPage } from '@/pages/YourQuestionsPage';

/**
 * Routes render off auth state rather than imperative navigation.
 *
 * v1 pushed history from inside the auth callback, which raced the router on reload
 * and could bounce a signed-in user back to the login screen. Here `status` decides
 * what renders, so a refresh on any deep link resolves correctly.
 */
export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/" element={<LoginPage />} />
      </Route>

      <Route element={<Protected />}>
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/add" element={<AddQuestionPage />} />
        <Route path="/yourquestions" element={<YourQuestionsPage />} />
        <Route path="/user" element={<ProfilePage />} />
        <Route path="/u/:handle" element={<PublicProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function PublicOnly() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Splash />;
  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/questions'} replace />;
  }
  return <Outlet />;
}

function Protected() {
  const { status } = useAuth();
  const location = useLocation();
  const profile = useViewerProfile();

  if (status === 'loading') return <Splash />;

  if (status === 'signedOut') {
    // Remember where they were headed so sign-in returns them there.
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  // The profile bootstrap (which also atomically claims a handle for brand-new
  // accounts) has to finish before the shell renders anything that reads a handle.
  if (profile.isPending) return <Splash label="Setting up your profile…" />;

  if (profile.isError) {
    return (
      <div className="app-shell">
        <Header />
        <main className="page">
          <ErrorAlert error={profile.error} onRetry={() => void profile.refetch()} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <Outlet />
    </div>
  );
}
