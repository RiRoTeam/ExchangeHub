import type { ProgramType } from "../../../shared/types/program";
import type { ProgramDraft } from "../../../shared/types/submission";
import { readFieldErrors, toFriendlyApiError } from "../../../shared/api/problem";

export type ProgramDraftFormValues = {
  title: string;
  description: string;
  country: string;
  type: ProgramType | "";
  deadline: string;
  url: string;
};

export type ProgramDraftFieldErrors = Partial<Record<keyof ProgramDraftFormValues, string>>;

export const emptyProgramDraft: ProgramDraftFormValues = {
  title: "",
  description: "",
  country: "",
  type: "",
  deadline: "",
  url: ""
};

export const programTypeOptions: Array<{ value: ProgramType; label: string }> = [
  { value: "EXCHANGE", label: "Exchange" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "SCHOLARSHIP", label: "Scholarship" },
  { value: "OTHER", label: "Other" }
];

const TITLE_MAX = 255;
const DESCRIPTION_MAX = 5000;
const COUNTRY_MAX = 100;
const URL_MAX = 500;

function isFutureDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsed.getTime() > today.getTime();
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Клиентская валидация, зеркалящая аннотации SubmissionRequest / ProgramRequest.
 * Бэк всё равно проверит сам — это только чтобы не гонять заведомо битые запросы.
 */
export function validateProgramDraft(values: ProgramDraftFormValues): ProgramDraftFieldErrors {
  const errors: ProgramDraftFieldErrors = {};

  if (!values.title.trim()) {
    errors.title = "Enter the program title.";
  } else if (values.title.trim().length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  }

  if (!values.description.trim()) {
    errors.description = "Add a short description of the program.";
  } else if (values.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }

  if (!values.country.trim()) {
    errors.country = "Enter the country.";
  } else if (values.country.trim().length > COUNTRY_MAX) {
    errors.country = `Country must be ${COUNTRY_MAX} characters or fewer.`;
  }

  if (!values.type) {
    errors.type = "Choose a program type.";
  }

  if (values.deadline && !isFutureDate(values.deadline)) {
    errors.deadline = "The deadline must be a future date.";
  }

  if (values.url.trim()) {
    if (!isHttpUrl(values.url.trim())) {
      errors.url = "Enter a full link, for example https://example.com/program.";
    } else if (values.url.trim().length > URL_MAX) {
      errors.url = `Link must be ${URL_MAX} characters or fewer.`;
    }
  }

  return errors;
}

/** Форма → тело запроса. Пустые необязательные поля уходят как null. */
export function toProgramDraft(values: ProgramDraftFormValues): ProgramDraft {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    country: values.country.trim(),
    type: values.type as Exclude<ProgramDraftFormValues["type"], "">,
    deadline: values.deadline || null,
    url: values.url.trim() || null
  };
}

const serverFieldMessages: Record<string, string> = {
  "must not be blank": "This field is required.",
  "must be a future date": "The deadline must be a future date.",
  "must be a valid URL": "Enter a full link, for example https://example.com/program.",
  "must not be null": "This field is required."
};

function toFieldMessage(message: string) {
  if (serverFieldMessages[message]) {
    return serverFieldMessages[message];
  }

  const sizeMatch = /size must be between \d+ and (\d+)/.exec(message);

  if (sizeMatch) {
    return `Must be ${sizeMatch[1]} characters or fewer.`;
  }

  return message;
}

/** Ошибки валидации с бэка (ProblemDetail.errors) → ошибки полей формы. */
export function readServerFieldErrors(error: unknown): ProgramDraftFieldErrors {
  const rawErrors = readFieldErrors(error);
  const fieldErrors: ProgramDraftFieldErrors = {};

  for (const [field, message] of Object.entries(rawErrors)) {
    if (field in emptyProgramDraft) {
      fieldErrors[field as keyof ProgramDraftFormValues] = toFieldMessage(message);
    }
  }

  return fieldErrors;
}

export function toFriendlySubmitError(error: unknown) {
  return toFriendlyApiError(error, "We couldn’t send this program. Please try again.");
}
