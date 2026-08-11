import { useAuth } from '@/auth/useAuth';

export function LoginPage() {
  const { signIn, signInError } = useAuth();

  return (
    <main className="splash">
      <div className="splash__box">
        <img src="/images/logo.png" alt="DeSide" width={72} height={72} />
        <h1 className="splash__title">DeSide</h1>
        <p className="splash__subtitle">Let the internet deside.</p>
        <p className="text-s muted">
          Ask a question, get real answers. Post publicly, to your followers only, or anonymously.
        </p>

        <button type="button" className="button button--login button--block" onClick={signIn}>
          <img src="/images/googleLogo.png" alt="" width={20} height={20} />
          Continue with Google
        </button>

        {signInError && (
          <p className="alert alert--error" role="alert">
            {signInError}
          </p>
        )}
      </div>
    </main>
  );
}
