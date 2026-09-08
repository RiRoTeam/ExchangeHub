import { useTranslation } from "react-i18next";

type RegisterFormProps = {
  email: string;
  name: string;
  password: string;
  isSubmitting: boolean;
  submitLabel: string;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export function RegisterForm({
  email,
  name,
  password,
  isSubmitting,
  submitLabel,
  onEmailChange,
  onNameChange,
  onPasswordChange
}: RegisterFormProps) {
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
        <span>{t("auth.name")}</span>
        <input
          autoComplete="name"
          className="text-input"
          name="name"
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t("auth.namePlaceholder")}
          type="text"
          value={name}
        />
      </label>
      <label className="auth-form-fields__label">
        <span>{t("auth.password")}</span>
        <input
          autoComplete="new-password"
          className="text-input"
          name="password"
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder={t("auth.newPasswordPlaceholder")}
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
