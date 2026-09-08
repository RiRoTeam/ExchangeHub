import { describe, expect, it } from "vitest";
import { AUTH_LIMITS, validateAuthForm } from "./validation";

const valid = { email: "user@example.com", name: "Вика", password: "secret123" };

describe("entities/auth/validation", () => {
  it("пропускает заполненную форму регистрации", () => {
    expect(validateAuthForm("user-register", valid)).toBeNull();
  });

  it("не требует имя при входе", () => {
    expect(validateAuthForm("user-login", { ...valid, name: "" })).toBeNull();
  });

  it("сообщает про длину пароля границами пароля, а не имени", () => {
    // Ровно этот баг и был: страница подставляла границы имени во все ключи,
    // и короткий пароль объявлялся «от 2 до 100 символов».
    expect(validateAuthForm("user-register", { ...valid, password: "123" })).toEqual({
      key: "validation.passwordLength",
      params: { min: AUTH_LIMITS.passwordMin, max: AUTH_LIMITS.passwordMax }
    });
  });

  it("сообщает про длину имени границами имени", () => {
    expect(validateAuthForm("user-register", { ...valid, name: "В" })).toEqual({
      key: "validation.nameLength",
      params: { min: AUTH_LIMITS.nameMin, max: AUTH_LIMITS.nameMax }
    });
  });

  it("границы имени и пароля не совпадают, иначе тест выше ничего не проверяет", () => {
    expect(AUTH_LIMITS.passwordMin).not.toBe(AUTH_LIMITS.nameMin);
    expect(AUTH_LIMITS.passwordMax).not.toBe(AUTH_LIMITS.nameMax);
  });

  it("принимает пароль ровно минимальной длины", () => {
    const password = "x".repeat(AUTH_LIMITS.passwordMin);

    expect(validateAuthForm("user-register", { ...valid, password })).toBeNull();
  });

  it("отклоняет пароль на символ короче минимального", () => {
    const password = "x".repeat(AUTH_LIMITS.passwordMin - 1);

    expect(validateAuthForm("user-register", { ...valid, password })?.key).toBe(
      "validation.passwordLength"
    );
  });

  it("отклоняет пароль длиннее максимума", () => {
    const password = "x".repeat(AUTH_LIMITS.passwordMax + 1);

    expect(validateAuthForm("user-register", { ...valid, password })?.key).toBe(
      "validation.passwordLength"
    );
  });

  it("пустое поле важнее длины: просит ввести, а не удлинить", () => {
    expect(validateAuthForm("user-register", { ...valid, password: "" })).toEqual({
      key: "validation.enterPassword"
    });
    expect(validateAuthForm("user-register", { ...valid, name: "   " })).toEqual({
      key: "validation.enterName"
    });
  });

  it("проверяет почту раньше остального", () => {
    expect(validateAuthForm("user-register", { email: "abc", name: "", password: "" })).toEqual({
      key: "validation.invalidEmail"
    });
  });

  it("не считает пробелы вокруг имени его длиной", () => {
    expect(validateAuthForm("user-register", { ...valid, name: "  В  " })?.key).toBe(
      "validation.nameLength"
    );
  });
});
