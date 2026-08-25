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
        <span>Name</span>
        <input
          autoComplete="name"
          className="text-input"
          name="name"
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Your name"
          type="text"
          value={name}
        />
      </label>
      <label className="auth-form-fields__label">
        <span>Password</span>
        <input
          autoComplete="new-password"
          className="text-input"
          name="password"
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Create a password"
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
