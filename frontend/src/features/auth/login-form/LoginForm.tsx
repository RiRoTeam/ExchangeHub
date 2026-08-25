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
  return (
    <div className="auth-form-fields">
      <label className="auth-form-fields__label">
        <span>Email</span>
        <input
          autoComplete="email"
          className="text-input"
          name="email"
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
      </label>
      <label className="auth-form-fields__label">
        <span>Password</span>
        <input
          autoComplete="current-password"
          className="text-input"
          name="password"
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Enter your password"
          type="password"
          value={password}
        />
      </label>

      <button
        className="primary-button"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Working..." : submitLabel}
      </button>
    </div>
  );
}
