import { useState } from "react";
import type { ProgramDraft } from "../../../shared/types/submission";
import {
  emptyProgramDraft,
  programTypeOptions,
  readServerFieldErrors,
  toFriendlySubmitError,
  toProgramDraft,
  validateProgramDraft,
  type ProgramDraftFieldErrors,
  type ProgramDraftFormValues
} from "./validation";

type SuggestProgramFormProps = {
  /** Что делать с заполненной формой: POST /submissions или POST /admin/programs. */
  onSubmit: (draft: ProgramDraft) => Promise<unknown>;
  heading?: string;
  submitLabel?: string;
  successMessage?: string;
};

type FieldProps = {
  id: keyof ProgramDraftFormValues;
  label: string;
  error?: string;
  hint?: string;
  children: (fieldId: string, isInvalid: boolean) => React.ReactNode;
};

function Field({ id, label, error, hint, children }: FieldProps) {
  const fieldId = `program-form-${id}`;
  const errorId = `${fieldId}-error`;

  return (
    <div className="form-field">
      <label className="auth-form-fields__label" htmlFor={fieldId}>
        <span>{label}</span>
        {children(fieldId, Boolean(error))}
      </label>
      {hint && !error ? <p className="form-field__hint">{hint}</p> : null}
      {error ? (
        <p className="form-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SuggestProgramForm({
  onSubmit,
  heading = "Program form",
  submitLabel = "Send program for review",
  successMessage = "Thanks! Your program is now in the moderation queue."
}: SuggestProgramFormProps) {
  const [values, setValues] = useState<ProgramDraftFormValues>(emptyProgramDraft);
  const [fieldErrors, setFieldErrors] = useState<ProgramDraftFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof ProgramDraftFormValues>(
    field: K,
    value: ProgramDraftFormValues[K]
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    // Ошибку поля гасим сразу, как только пользователь начал его править.
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

    const validationErrors = validateProgramDraft(values);

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

    try {
      await onSubmit(toProgramDraft(values));
      setValues(emptyProgramDraft);
      setSuccessText(successMessage);
    } catch (submitError) {
      const serverFieldErrors = readServerFieldErrors(submitError);

      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
        setFormError("Some fields need attention before we can send this.");
      } else {
        setFormError(toFriendlySubmitError(submitError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="placeholder-form" noValidate onSubmit={handleSubmit}>
      <h2>{heading}</h2>

      <Field id="title" label="Title" error={fieldErrors.title}>
        {(fieldId, isInvalid) => (
          <input
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            name="title"
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Summer research exchange in Tartu"
            type="text"
            value={values.title}
          />
        )}
      </Field>

      <Field id="country" label="Country" error={fieldErrors.country}>
        {(fieldId, isInvalid) => (
          <input
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            name="country"
            onChange={(event) => updateField("country", event.target.value)}
            placeholder="Estonia"
            type="text"
            value={values.country}
          />
        )}
      </Field>

      <Field id="type" label="Type" error={fieldErrors.type}>
        {(fieldId, isInvalid) => (
          <select
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            name="type"
            onChange={(event) =>
              updateField("type", event.target.value as ProgramDraftFormValues["type"])
            }
            value={values.type}
          >
            <option value="">Choose a type</option>
            {programTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id="deadline"
        label="Deadline"
        error={fieldErrors.deadline}
        hint="Optional. Must be a future date."
      >
        {(fieldId, isInvalid) => (
          <input
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            name="deadline"
            onChange={(event) => updateField("deadline", event.target.value)}
            type="date"
            value={values.deadline}
          />
        )}
      </Field>

      <Field id="url" label="Source URL" error={fieldErrors.url} hint="Optional.">
        {(fieldId, isInvalid) => (
          <input
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            name="url"
            onChange={(event) => updateField("url", event.target.value)}
            placeholder="https://example.com/program"
            type="url"
            value={values.url}
          />
        )}
      </Field>

      <Field id="description" label="Description" error={fieldErrors.description}>
        {(fieldId, isInvalid) => (
          <textarea
            aria-invalid={isInvalid}
            className="text-input text-input--textarea"
            disabled={isSubmitting}
            id={fieldId}
            name="description"
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Who it's for, what's covered, how to apply."
            value={values.description}
          />
        )}
      </Field>

      <div aria-live="polite" className="form-feedback">
        {formError ? <p className="form-feedback__error">{formError}</p> : null}
        {successText ? <p className="form-feedback__success">{successText}</p> : null}
      </div>

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending..." : submitLabel}
      </button>
    </form>
  );
}
