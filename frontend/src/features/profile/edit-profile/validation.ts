import { readFieldErrors } from "../../../shared/api/problem";
import { message, type Message } from "../../../shared/i18n/message";
import type { UpdateProfileRequest } from "../../../entities/user/api";

export type ProfileFormValues = {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ProfileFieldErrors = Partial<Record<keyof ProfileFormValues, Message>>;

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;

/** Что реально изменилось — пустые поля на бэк не отправляем. */
export function hasChanges(values: ProfileFormValues, currentName: string) {
  return values.name.trim() !== currentName || values.newPassword.length > 0;
}

/**
 * Зеркалит UpdateProfileRequest и проверки UserService на бэке:
 * имя 2–100, новый пароль 6–72, текущий пароль обязателен при смене.
 */
export function validateProfile(
  values: ProfileFormValues,
  currentName: string
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const name = values.name.trim();

  if (!name) {
    errors.name = message("validation.enterName");
  } else if (name.length < NAME_MIN || name.length > NAME_MAX) {
    errors.name = message("validation.nameLength", { min: NAME_MIN, max: NAME_MAX });
  }

  if (values.newPassword) {
    if (values.newPassword.length < PASSWORD_MIN || values.newPassword.length > PASSWORD_MAX) {
      errors.newPassword = message("validation.passwordLength", { min: PASSWORD_MIN, max: PASSWORD_MAX });
    }

    if (!values.currentPassword) {
      errors.currentPassword = message("validation.currentPasswordRequired");
    }

    if (values.confirmPassword !== values.newPassword) {
      errors.confirmPassword = message("validation.passwordsDoNotMatch");
    }

    if (values.newPassword === values.currentPassword && values.currentPassword) {
      errors.newPassword = message("validation.passwordMustDiffer");
    }
  }

  if (!values.newPassword && values.currentPassword) {
    errors.newPassword = message("validation.newPasswordRequired");
  }

  if (!errors.name && !hasChanges(values, currentName)) {
    errors.name = message("validation.nothingToSave");
  }

  return errors;
}

/** Тело запроса: только изменившиеся поля. */
export function toUpdateRequest(
  values: ProfileFormValues,
  currentName: string
): UpdateProfileRequest {
  const request: UpdateProfileRequest = {};
  const name = values.name.trim();

  if (name !== currentName) {
    request.name = name;
  }

  if (values.newPassword) {
    request.currentPassword = values.currentPassword;
    request.newPassword = values.newPassword;
  }

  return request;
}

function toFieldMessage(serverText: string): Message {
  if (serverText === "must not be blank") {
    return message("validation.required");
  }

  const sizeMatch = /size must be between (\d+) and (\d+)/.exec(serverText);

  if (sizeMatch) {
    return message("validation.betweenLength", {
      min: Number(sizeMatch[1]),
      max: Number(sizeMatch[2])
    });
  }

  return message(serverText);
}

export function readServerFieldErrors(error: unknown): ProfileFieldErrors {
  const rawErrors = readFieldErrors(error);
  const fieldErrors: ProfileFieldErrors = {};

  for (const [field, message] of Object.entries(rawErrors)) {
    if (field === "name" || field === "currentPassword" || field === "newPassword") {
      fieldErrors[field] = toFieldMessage(message);
    }
  }

  return fieldErrors;
}


