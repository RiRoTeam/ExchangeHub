import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProgramDraft } from "../../../shared/types/submission";
import { useApiErrorText } from "../../../shared/i18n/useApiErrorText";
import type { Message } from "../../../shared/i18n/message";
import {
  emptyProgramDraft,
  programTypeOptions,
  readServerFieldErrors,
  toProgramDraft,
  validateProgramDraft,
  type ProgramDraftFieldErrors,
  type ProgramDraftFormValues
} from "./validation";

type SuggestProgramFormProps = {
  /** Что делать с заполненной формой: POST /submissions, /admin/programs или PUT. */
  onSubmit: (draft: ProgramDraft) => Promise<unknown>;
  heading?: string;
  submitLabel?: string;
  successMessage?: string;
  /** Заполненные поля для режима редактирования. */
  initialValues?: ProgramDraftFormValues;
  /** При редактировании форму чистить нельзя — значения остаются на экране. */
  resetAfterSubmit?: boolean;
  onCancel?: () => void;
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

function useFieldError() {
  const { t } = useTranslation();

  return (error?: Message) => (error ? t(error.key as never, error.params) : undefined);
}

export function SuggestProgramForm({
  onSubmit,
  heading,
  submitLabel,
  successMessage,
  initialValues,
  resetAfterSubmit = true,
  onCancel
}: SuggestProgramFormProps) {
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const renderError = useFieldError();

  // Бэк принимает сегодняшний дедлайн (@FutureOrPresent), поэтому и календарь
  // не должен давать выбрать прошлое.
  const now = new Date();
  const minimumDeadline = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
  const [values, setValues] = useState<ProgramDraftFormValues>(
    initialValues ?? emptyProgramDraft
  );
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

      if (resetAfterSubmit) {
        setValues(emptyProgramDraft);
      }

      setSuccessText(successMessage ?? t("submissions.submitSuccess"));
    } catch (submitError) {
      const serverFieldErrors = readServerFieldErrors(submitError);

      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
        setFormError(t("validation.fixFields"));
      } else {
        setFormError(toErrorText(submitError, t("errors.submissionSend")));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="placeholder-form" noValidate onSubmit={handleSubmit}>
      <h2>{heading ?? t("submissions.formHeading")}</h2>

      <Field id="title" label={t("submissions.title")} error={renderError(fieldErrors.title)}>
        {(fieldId, isInvalid) => (
          <input
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            name="title"
            onChange={(event) => updateField("title", event.target.value)}
            placeholder={t("submissions.titlePlaceholder")}
            type="text"
            value={values.title}
          />
        )}
      </Field>

      <Field id="country" label={t("programs.country")} error={renderError(fieldErrors.country)}>
        {(fieldId, isInvalid) => (
          <input
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            name="country"
            onChange={(event) => updateField("country", event.target.value)}
            placeholder={t("submissions.countryPlaceholder")}
            type="text"
            value={values.country}
          />
        )}
      </Field>

      <Field id="type" label={t("programs.type")} error={renderError(fieldErrors.type)}>
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
            <option value="">{t("submissions.chooseType")}</option>
            {programTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(`programType.${option.value}`)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id="deadline"
        label={t("programs.deadline")}
        error={renderError(fieldErrors.deadline)}
        hint={t("submissions.deadlineHint")}
      >
        {(fieldId, isInvalid) => (
          <input
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            min={minimumDeadline}
            name="deadline"
            onChange={(event) => updateField("deadline", event.target.value)}
            type="date"
            value={values.deadline}
          />
        )}
      </Field>

      <Field id="url" label={t("submissions.urlLabel")} error={renderError(fieldErrors.url)} hint={t("submissions.optional")}>
        {(fieldId, isInvalid) => (
          <input
            aria-invalid={isInvalid}
            className="text-input"
            disabled={isSubmitting}
            id={fieldId}
            name="url"
            onChange={(event) => updateField("url", event.target.value)}
            placeholder={t("submissions.urlPlaceholder")}
            type="url"
            value={values.url}
          />
        )}
      </Field>

      <Field id="description" label={t("submissions.description")} error={renderError(fieldErrors.description)}>
        {(fieldId, isInvalid) => (
          <textarea
            aria-invalid={isInvalid}
            className="text-input text-input--textarea"
            disabled={isSubmitting}
            id={fieldId}
            name="description"
            onChange={(event) => updateField("description", event.target.value)}
            placeholder={t("submissions.descriptionPlaceholder")}
            value={values.description}
          />
        )}
      </Field>

      <div aria-live="polite" className="form-feedback">
        {formError ? <p className="form-feedback__error">{formError}</p> : null}
        {successText ? <p className="form-feedback__success">{successText}</p> : null}
      </div>

      <div className="action-strip">
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("common.saving") : submitLabel ?? t("submissions.submit")}
        </button>
        {onCancel ? (
          <button
            className="secondary-button"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            {t("common.cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
