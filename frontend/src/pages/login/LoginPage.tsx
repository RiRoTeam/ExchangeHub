import { useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useRouter } from "../../app/router/RouterProvider";
import { getDefaultPathForRole } from "../../app/router/routes";
import { LoginForm } from "../../features/auth/login-form/LoginForm";
import { RegisterForm } from "../../features/auth/register-form/RegisterForm";
import type { AuthMode } from "../../shared/types/auth";

type AuthCopy = {
  title: string;
  subtitle: string;
  submitLabel: string;
};

const authCopy: Record<AuthMode, AuthCopy> = {
  "user-register": {
    title: "Create your account",
    subtitle: "Start saving programs, browsing opportunities, and suggesting new ones.",
    submitLabel: "Create account"
  },
  "user-login": {
    title: "Welcome back",
    subtitle: "Sign in to continue exploring programs and managing your saved picks.",
    submitLabel: "Log in"
  },
  "admin-login": {
    title: "Admin access",
    subtitle: "Use your approved admin account to review submissions and publish programs.",
    submitLabel: "Continue as admin"
  }
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateAuthForm(mode: AuthMode, email: string, name: string, password: string) {
  if (!email.trim()) {
    return "Enter your email address.";
  }

  if (!isValidEmail(email)) {
    return "Enter a valid email address.";
  }

  if (mode === "user-register" && !name.trim()) {
    return "Enter your name.";
  }

  if (mode === "user-register" && (name.trim().length < 2 || name.trim().length > 100)) {
    return "Name must be between 2 and 100 characters.";
  }

  if (!password.trim()) {
    return "Enter your password.";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  if (password.length > 72) {
    return "Password must be between 6 and 72 characters.";
  }

  return "";
}

export function LoginPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const [mode, setMode] = useState<AuthMode>("user-login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCopy = authCopy[mode];

  async function handleSubmit() {
    const validationError = validateAuthForm(mode, email, name, password);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const nextSession = await signIn({
        mode,
        email,
        name: mode === "user-register" ? name : undefined,
        password
      });

      navigate(getDefaultPathForRole(nextSession.user.role), {
        replace: true
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <div className="auth-hero">
          <p className="auth-hero__eyebrow">Get started</p>
          <h1 className="auth-hero__title">
            get started with <span>ExchangeHub</span>
          </h1>
          <p className="auth-hero__description">
            A calm, reliable place to browse exchange programs, save the ones you care
            about, and contribute new opportunities for review.
          </p>
        </div>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card__header">
            <div className="auth-tabs" role="tablist" aria-label="Authentication modes">
              <button
                className={`auth-tabs__button ${mode === "user-register" ? "auth-tabs__button--active" : ""}`}
                onClick={() => switchMode("user-register")}
                role="tab"
                type="button"
              >
                register
              </button>
              <button
                className={`auth-tabs__button ${mode === "user-login" ? "auth-tabs__button--active" : ""}`}
                onClick={() => switchMode("user-login")}
                role="tab"
                type="button"
              >
                log in
              </button>
            </div>

            <button
              className={`auth-admin-toggle ${mode === "admin-login" ? "auth-admin-toggle--active" : ""}`}
              onClick={() => switchMode("admin-login")}
              type="button"
            >
              admin access
            </button>
          </div>

          <div className="auth-card__body">
            <div className="auth-card__copy">
              <h2 id="auth-title">{currentCopy.title}</h2>
              <p>{currentCopy.subtitle}</p>
            </div>

            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              {mode === "user-register" ? (
                <RegisterForm
                  email={email}
                  isSubmitting={isSubmitting}
                  name={name}
                  onEmailChange={setEmail}
                  onNameChange={setName}
                  onPasswordChange={setPassword}
                  password={password}
                  submitLabel={currentCopy.submitLabel}
                />
              ) : (
                <LoginForm
                  email={email}
                  isSubmitting={isSubmitting}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  password={password}
                  submitLabel={currentCopy.submitLabel}
                />
              )}
            </form>

            <div className="auth-feedback" aria-live="polite">
              {error ? <p className="auth-feedback__error">{error}</p> : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
