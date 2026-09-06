import { useState } from "react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { updateProfile } from "../../../entities/user/api";
import {
  readServerFieldErrors,
  toFriendlyProfileError,
  toUpdateRequest,
  validateProfile,
  type ProfileFieldErrors,
  type ProfileFormValues
} from "./validation";

type FieldProps = {
  id: keyof ProfileFormValues;
  label: string;
  type?: "text" | "password";
  autoComplete?: string;
  hint?: string;
  error?: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  hint,
  error,
  value,
  disabled,
  onChange
}: FieldProps) {
  const fieldId = `profile-${id}`;

  return (
    <div className="form-field">
      <label className="auth-form-fields__label" htmlFor={fieldId}>
        <span>{label}</span>
        <input
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className="text-input"
          disabled={disabled}
          id={fieldId}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          value={value}
        />
      </label>
      {hint && !error ? <p className="form-field__hint">{hint}</p> : null}
      {error ? (
        <p className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function EditProfileForm() {
  const { session, applyUpdatedUser } = useAuth();
  const currentName = session?.user.name ?? "";

  const [values, setValues] = useState<ProfileFormValues>({
    name: currentName,
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof ProfileFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setSuccessText("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateProfile(values, currentName);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError("");
      setSuccessText("");
      return;
    }

    setFieldErrors({});
    setFormError("");
    setSuccessText("");
    setIsSubmitting(true);

    const changedPassword = values.newPassword.length > 0;

    try {
      const updatedUser = await updateProfile(toUpdateRequest(values, currentName));

      applyUpdatedUser(updatedUser);
      // Пароли из состояния убираем сразу, чтобы не висели в памяти формы.
      setValues({
        name: updatedUser.name,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setSuccessText(
        changedPassword ? "Profile and password updated." : "Profile updated."
      );
    } catch (submitError) {
      const serverFieldErrors = readServerFieldErrors(submitError);

      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
        setFormError("Some fields need attention before we can save this.");
      } else {
        setFormError(toFriendlyProfileError(submitError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="placeholder-form" noValidate onSubmit={handleSubmit}>
      <h2>Edit profile</h2>

      <Field
        autoComplete="name"
        disabled={isSubmitting}
        error={fieldErrors.name}
        id="name"
        label="Name"
        onChange={(value) => updateField("name", value)}
        value={values.name}
      />

      <Field
        autoComplete="current-password"
        disabled={isSubmitting}
        error={fieldErrors.currentPassword}
        hint="Only needed when you change your password."
        id="currentPassword"
        label="Current password"
        onChange={(value) => updateField("currentPassword", value)}
        type="password"
        value={values.currentPassword}
      />

      <Field
        autoComplete="new-password"
        disabled={isSubmitting}
        error={fieldErrors.newPassword}
        hint="Leave empty to keep your current password."
        id="newPassword"
        label="New password"
        onChange={(value) => updateField("newPassword", value)}
        type="password"
        value={values.newPassword}
      />

      <Field
        autoComplete="new-password"
        disabled={isSubmitting}
        error={fieldErrors.confirmPassword}
        id="confirmPassword"
        label="Repeat new password"
        onChange={(value) => updateField("confirmPassword", value)}
        type="password"
        value={values.confirmPassword}
      />

      <div aria-live="polite" className="form-feedback">
        {formError ? <p className="form-feedback__error">{formError}</p> : null}
        {successText ? <p className="form-feedback__success">{successText}</p> : null}
      </div>

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
