import { FormEvent, useEffect, useState } from "react";

type AuthMode = "user-login" | "user-register" | "admin-login";

type Session = {
  token: string;
  email: string;
  mode: AuthMode;
  createdAt: string;
};

type ApiErrorPayload = {
  detail?: string;
  title?: string;
  errors?: Record<string, string>;
};

const SESSION_KEY = "exchangehub-auth-session";

const modeMeta: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    action: string;
    endpoint: "/api/auth/login" | "/api/auth/register";
    accent: string;
  }
> = {
  "user-login": {
    title: "User login",
    subtitle: "Sign in as a regular platform user and grab a fresh JWT for API checks.",
    action: "Login as user",
    endpoint: "/api/auth/login",
    accent: "field-user"
  },
  "user-register": {
    title: "User registration",
    subtitle: "Create a new user in the backend database and receive a token instantly.",
    action: "Create user",
    endpoint: "/api/auth/register",
    accent: "field-register"
  },
  "admin-login": {
    title: "Admin login",
    subtitle: "Use an existing admin account from the database and verify privileged access flows.",
    action: "Login as admin",
    endpoint: "/api/auth/login",
    accent: "field-admin"
  }
};

const featureNotes = [
  "Separate user and admin entry points for backend smoke testing.",
  "Registration stays on the web for now, mobile can plug into the same endpoints later.",
  "Token is stored locally so teammates can hit protected APIs right after login."
];

function parseApiError(payload: ApiErrorPayload) {
  if (payload.errors) {
    const firstFieldError = Object.values(payload.errors)[0];
    if (firstFieldError) {
      return firstFieldError;
    }
  }

  return payload.detail || payload.title || "Request failed";
}

export default function App() {
  const [mode, setMode] = useState<AuthMode>("user-login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const rawSession = window.localStorage.getItem(SESSION_KEY);

    if (!rawSession) {
      return;
    }

    try {
      const storedSession = JSON.parse(rawSession) as Session;
      setSession(storedSession);
      setEmail(storedSession.email);
      setMode(storedSession.mode);
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const currentMeta = modeMeta[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch(currentMeta.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
        throw new Error(parseApiError(payload));
      }

      const payload = (await response.json()) as { token: string };
      const nextSession: Session = {
        token: payload.token,
        email,
        mode,
        createdAt: new Date().toISOString()
      };

      window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setSuccess(
        mode === "user-register"
          ? "User created in the backend and token saved locally."
          : "Login successful. Token saved locally for backend testing."
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyToken() {
    if (!session) {
      return;
    }

    try {
      await navigator.clipboard.writeText(session.token);
      setSuccess("JWT copied to clipboard.");
      setError("");
    } catch {
      setError("Could not copy token to clipboard.");
    }
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setSuccess("Local session cleared.");
    setError("");
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <p className="eyebrow">ExchangeHub / Web Auth Console</p>
        <h1>Frontend auth surface for backend database testing</h1>
        <p className="lead">
          A compact web client for registering users, logging in as user or admin,
          and handing backend teammates a ready-to-use JWT without touching mobile yet.
        </p>

        <div className="notes">
          {featureNotes.map((note) => (
            <div className="note-pill" key={note}>
              {note}
            </div>
          ))}
        </div>
      </section>

      <section className="workspace">
        <div className="panel form-panel">
          <div className="mode-switcher" role="tablist" aria-label="Authentication modes">
            {(
              Object.keys(modeMeta) as AuthMode[]
            ).map((option) => (
              <button
                key={option}
                className={`mode-chip ${mode === option ? "active" : ""}`}
                onClick={() => {
                  setMode(option);
                  setError("");
                  setSuccess("");
                }}
                type="button"
              >
                {modeMeta[option].title}
              </button>
            ))}
          </div>

          <div className={`panel-heading ${currentMeta.accent}`}>
            <h2>{currentMeta.title}</h2>
            <p>{currentMeta.subtitle}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="team@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                autoComplete={mode === "user-register" ? "new-password" : "current-password"}
                minLength={6}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
                type="password"
                value={password}
              />
            </label>

            <button className="submit-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Working..." : currentMeta.action}
            </button>
          </form>

          <div className="status-stack" aria-live="polite">
            {error ? <div className="status-card error">{error}</div> : null}
            {success ? <div className="status-card success">{success}</div> : null}
          </div>
        </div>

        <div className="panel session-panel">
          <div className="panel-heading">
            <h2>Current local session</h2>
            <p>
              This part is intentionally practical: it shows what the frontend has
              on hand right now for backend checks.
            </p>
          </div>

          {session ? (
            <div className="session-card">
              <div className="session-row">
                <span>Identity</span>
                <strong>{session.email}</strong>
              </div>
              <div className="session-row">
                <span>Entry point</span>
                <strong>{modeMeta[session.mode].title}</strong>
              </div>
              <div className="session-row">
                <span>Saved at</span>
                <strong>{new Date(session.createdAt).toLocaleString()}</strong>
              </div>

              <div className="token-block">
                <span>JWT token</span>
                <textarea readOnly value={session.token} />
              </div>

              <div className="action-row">
                <button className="ghost-button" onClick={copyToken} type="button">
                  Copy token
                </button>
                <button className="ghost-button danger" onClick={logout} type="button">
                  Clear local session
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No local session yet.</p>
              <span>
                Use the form to register a user or log in with an existing account from
                the backend database.
              </span>
            </div>
          )}

          <div className="helper-card">
            <h3>Backend expectations</h3>
            <p>`User registration` calls `/api/auth/register`.</p>
            <p>`User login` and `Admin login` both call `/api/auth/login`.</p>
            <p>
              For admin sign-in, the account needs to exist in the database already,
              because this frontend does not create admin users on its own.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
