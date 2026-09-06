import { readFieldErrors, toFriendlyApiError } from "../../../shared/api/problem";
import type { UpdateProfileRequest } from "../../../entities/user/api";

export type ProfileFormValues = {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ProfileFieldErrors = Partial<Record<keyof ProfileFormValues, string>>;

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
    errors.name = "Enter your name.";
  } else if (name.length < NAME_MIN || name.length > NAME_MAX) {
    errors.name = `Name must be between ${NAME_MIN} and ${NAME_MAX} characters.`;
  }

  if (values.newPassword) {
    if (values.newPassword.length < PASSWORD_MIN || values.newPassword.length > PASSWORD_MAX) {
      errors.newPassword = `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`;
    }

    if (!values.currentPassword) {
      errors.currentPassword = "Enter your current password to set a new one.";
    }

    if (values.confirmPassword !== values.newPassword) {
      errors.confirmPassword = "The two passwords don’t match.";
    }

    if (values.newPassword === values.currentPassword && values.currentPassword) {
      errors.newPassword = "The new password must differ from the current one.";
    }
  }

  if (!values.newPassword && values.currentPassword) {
    errors.newPassword = "Enter the new password you want to use.";
  }

  if (!errors.name && !hasChanges(values, currentName)) {
    errors.name = "Change your name or your password before saving.";
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

const serverFieldMessages: Record<string, string> = {
  "must not be blank": "This field is required."
};

function toFieldMessage(message: string) {
  if (serverFieldMessages[message]) {
    return serverFieldMessages[message];
  }

  const sizeMatch = /size must be between (\d+) and (\d+)/.exec(message);

  if (sizeMatch) {
    return `Must be between ${sizeMatch[1]} and ${sizeMatch[2]} characters.`;
  }

  return message;
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

export function toFriendlyProfileError(error: unknown) {
  // Неверный текущий пароль бэк отдаёт как 400 "Wrong current password".
  return toFriendlyApiError(error, "We couldn’t save your profile. Please try again.");
}
