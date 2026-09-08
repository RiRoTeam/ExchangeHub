import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { useRouter } from "../../app/router/RouterProvider";
import { getDefaultPathForRole } from "../../app/router/routes";
import { LoginForm } from "../../features/auth/login-form/LoginForm";
import { RegisterForm } from "../../features/auth/register-form/RegisterForm";
import type { AuthMode } from "../../shared/types/auth";

const authCopyKeys: Record<AuthMode, { title: string; subtitle: string; submit: string }> = {
  "user-register": {
    title: "auth.registerTitle",
    subtitle: "auth.registerSubtitle",
    submit: "auth.registerSubmit"
  },
  "user-login": {
    title: "auth.loginTitle",
    subtitle: "auth.loginSubtitle",
    submit: "auth.loginSubmit"
  },
  "admin-login": {
    title: "auth.adminTitle",
    subtitle: "auth.adminSubtitle",
    submit: "auth.adminSubmit"
  }
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Возвращает ключ перевода или пустую строку, если всё в порядке. */
function validateAuthForm(mode: AuthMode, email: string, name: string, password: string) {
  if (!email.trim()) {
    return "validation.enterEmail";
  }

  if (!isValidEmail(email)) {
    return "validation.invalidEmail";
  }

  if (mode === "user-register" && !name.trim()) {
    return "validation.enterName";
  }

  if (mode === "user-register" && (name.trim().length < 2 || name.trim().length > 100)) {
    return "validation.nameLength";
  }

  if (!password.trim()) {
    return "validation.enterPassword";
  }

  if (password.length < 6 || password.length > 72) {
    return "validation.passwordLength";
  }

  return "";
}

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const [mode, setMode] = useState<AuthMode>("user-login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice] = useState(() => {
    const value = window.sessionStorage.getItem("exchangehub-auth-notice") ?? "";
    window.sessionStorage.removeItem("exchangehub-auth-notice");
    return value;
  });

  const copyKeys = authCopyKeys[mode];

  async function handleSubmit() {
    const validationError = validateAuthForm(mode, email, name, password);

    if (validationError) {
      setError(t(validationError as never, { min: 2, max: 100 }));
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
      // AuthProvider кладёт в message ключ перевода.
      setError(
        submitError instanceof Error
          ? t(submitError.message as never, { min: 6, max: 72 })
          : t("errors.generic")
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
          <p className="auth-hero__eyebrow">{t("auth.eyebrow")}</p>
          <h1 className="auth-hero__title">
            {/* Trans сохраняет вёрстку внутри перевода: <1> — это span. */}
            <Trans i18nKey="auth.heroTitle">
              get started with <span>ExchangeHub</span>
            </Trans>
          </h1>
          <p className="auth-hero__description">{t("auth.heroDescription")}</p>
        </div>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card__header">
            <div className="auth-tabs" role="tablist" aria-label={t("auth.modesLabel")}>
              <button
                className={`auth-tabs__button ${mode === "user-register" ? "auth-tabs__button--active" : ""}`}
                onClick={() => switchMode("user-register")}
                role="tab"
                type="button"
              >
                {t("auth.tabRegister")}
              </button>
              <button
                className={`auth-tabs__button ${mode === "user-login" ? "auth-tabs__button--active" : ""}`}
                onClick={() => switchMode("user-login")}
                role="tab"
                type="button"
              >
                {t("auth.tabLogin")}
              </button>
            </div>

            <button
              className={`auth-admin-toggle ${mode === "admin-login" ? "auth-admin-toggle--active" : ""}`}
              onClick={() => switchMode("admin-login")}
              type="button"
            >
              {t("auth.adminAccess")}
            </button>
          </div>

          <div className="auth-card__body">
            <div className="auth-card__copy">
              <h2 id="auth-title">{t(copyKeys.title as never)}</h2>
              <p>{t(copyKeys.subtitle as never)}</p>
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
                  submitLabel={t(copyKeys.submit as never)}
                />
              ) : (
                <LoginForm
                  email={email}
                  isSubmitting={isSubmitting}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  password={password}
                  submitLabel={t(copyKeys.submit as never)}
                />
              )}
            </form>

            <div className="auth-feedback" aria-live="polite">
              {notice && !error ? <p className="form-feedback__success">{notice}</p> : null}
              {error ? <p className="auth-feedback__error">{error}</p> : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
