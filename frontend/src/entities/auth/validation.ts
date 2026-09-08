import { message, type Message } from "../../shared/i18n/message";
import type { AuthMode } from "../../shared/types/auth";

/**
 * Границы совпадают с @Size в RegisterRequest и UpdateProfileRequest на
 * бэкенде. Если там поменяются — менять здесь, иначе форма начнёт обещать
 * одно, а сервер требовать другое.
 */
export const AUTH_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  passwordMin: 6,
  passwordMax: 72
} as const;

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export type AuthFormValues = {
  email: string;
  name: string;
  password: string;
};

/**
 * Возвращает сообщение об ошибке вместе с подстановками либо null.
 *
 * Подстановки идут рядом с ключом намеренно: раньше страница подставляла одну
 * пару чисел во все ключи сразу, и ошибка про пароль показывала границы имени.
 */
export function validateAuthForm(mode: AuthMode, values: AuthFormValues): Message | null {
  const email = values.email.trim();
  const name = values.name.trim();
  const isRegistration = mode === "user-register";

  if (!email) {
    return message("validation.enterEmail");
  }

  if (!isValidEmail(email)) {
    return message("validation.invalidEmail");
  }

  if (isRegistration && !name) {
    return message("validation.enterName");
  }

  if (isRegistration && (name.length < AUTH_LIMITS.nameMin || name.length > AUTH_LIMITS.nameMax)) {
    return message("validation.nameLength", {
      min: AUTH_LIMITS.nameMin,
      max: AUTH_LIMITS.nameMax
    });
  }

  if (!values.password.trim()) {
    return message("validation.enterPassword");
  }

  if (
    values.password.length < AUTH_LIMITS.passwordMin ||
    values.password.length > AUTH_LIMITS.passwordMax
  ) {
    return message("validation.passwordLength", {
      min: AUTH_LIMITS.passwordMin,
      max: AUTH_LIMITS.passwordMax
    });
  }

  return null;
}
