import type { Program, ProgramType } from "../../../shared/types/program";
import type { ProgramDraft } from "../../../shared/types/submission";
import { readFieldErrors } from "../../../shared/api/problem";
import { message, type Message } from "../../../shared/i18n/message";

export type ProgramDraftFormValues = {
  title: string;
  description: string;
  country: string;
  type: ProgramType | "";
  deadline: string;
  url: string;
};

export type ProgramDraftFieldErrors = Partial<Record<keyof ProgramDraftFormValues, Message>>;

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

function isTodayOrFutureDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsed.getTime() >= today.getTime();
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
    errors.title = message("validation.enterTitle");
  } else if (values.title.trim().length > TITLE_MAX) {
    errors.title = message("validation.maxLength", { max: TITLE_MAX });
  }

  if (!values.description.trim()) {
    errors.description = message("validation.enterDescription");
  } else if (values.description.trim().length > DESCRIPTION_MAX) {
    errors.description = message("validation.maxLength", { max: DESCRIPTION_MAX });
  }

  if (!values.country.trim()) {
    errors.country = message("validation.enterCountry");
  } else if (values.country.trim().length > COUNTRY_MAX) {
    errors.country = message("validation.maxLength", { max: COUNTRY_MAX });
  }

  if (!values.type) {
    errors.type = message("validation.chooseType");
  }

  if (values.deadline && !isTodayOrFutureDate(values.deadline)) {
    errors.deadline = message("validation.futureDeadline");
  }

  if (values.url.trim()) {
    if (!isHttpUrl(values.url.trim())) {
      errors.url = message("validation.validUrl");
    } else if (values.url.trim().length > URL_MAX) {
      errors.url = message("validation.maxLength", { max: URL_MAX });
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

const serverMessageKeys: Record<string, string> = {
  "must not be blank": "validation.required",
  "must not be null": "validation.required",
  "must be a future date": "validation.futureDeadline",
  "must be a date in the present or in the future": "validation.futureDeadline",
  "must be a valid URL": "validation.validUrl"
};

function toFieldMessage(serverText: string): Message {
  if (serverMessageKeys[serverText]) {
    return message(serverMessageKeys[serverText]);
  }

  const sizeMatch = /size must be between \d+ and (\d+)/.exec(serverText);

  if (sizeMatch) {
    return message("validation.maxLength", { max: Number(sizeMatch[1]) });
  }

  // Незнакомое сообщение бэка показываем как есть — лучше английский текст,
  // чем пустое место.
  return message(serverText);
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



/** Программа из API → значения формы для режима редактирования. */
export function toFormValues(program: Program): ProgramDraftFormValues {
  return {
    title: program.title,
    description: program.description,
    country: program.country,
    type: program.type,
    // input[type=date] понимает только YYYY-MM-DD.
    deadline: program.deadline ? program.deadline.slice(0, 10) : "",
    url: program.url ?? ""
  };
}
