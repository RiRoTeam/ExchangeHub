type RegisterFormProps = {
  title?: string;
  submitLabel?: string;
};

export function RegisterForm({
  title = "Register form",
  submitLabel = "Create account"
}: RegisterFormProps) {
  return (
    <form>
      <h2>{title}</h2>
      <label>
        <span>Email</span>
        <input autoComplete="email" name="email" type="email" />
      </label>
      <label>
        <span>Name</span>
        <input autoComplete="name" name="name" type="text" />
      </label>
      <label>
        <span>Password</span>
        <input autoComplete="new-password" name="password" type="password" />
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
