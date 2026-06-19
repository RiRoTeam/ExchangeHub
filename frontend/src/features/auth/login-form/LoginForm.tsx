type LoginFormProps = {
  title?: string;
  submitLabel?: string;
};

export function LoginForm({
  title = "Login form",
  submitLabel = "Continue"
}: LoginFormProps) {
  return (
    <form>
      <h2>{title}</h2>
      <label>
        <span>Email</span>
        <input autoComplete="email" name="email" type="email" />
      </label>
      <label>
        <span>Password</span>
        <input autoComplete="current-password" name="password" type="password" />
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
