import { useTranslation } from "react-i18next";

type LoginFormProps = {
  email: string;
  password: string;
  isSubmitting: boolean;
  submitLabel: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export function LoginForm({
  email,
  password,
  isSubmitting,
  submitLabel,
  onEmailChange,
  onPasswordChange
}: LoginFormProps) {
  const { t } = useTranslation();

  return (
    <div className="auth-form-fields">
      <label className="auth-form-fields__label">
        <span>{t("auth.email")}</span>
        <input
          autoComplete="email"
          className="text-input"
          name="email"
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          type="email"
          value={email}
        />
      </label>
      <label className="auth-form-fields__label">
        <span>{t("auth.password")}</span>
        <input
          autoComplete="current-password"
          className="text-input"
          name="password"
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
          type="password"
          value={password}
        />
      </label>

      <button
        className="primary-button"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? t("auth.working") : submitLabel}
      </button>
    </div>
  );
}
