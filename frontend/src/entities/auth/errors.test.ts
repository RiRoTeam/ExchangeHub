import { describe, expect, it } from "vitest";
import { AdminAccessRequiredError, toAuthErrorMessage } from "./errors";
import { ApiError } from "../../shared/api/http";

function validationError(errors: Record<string, string>) {
  return new ApiError("Bad Request", 400, { detail: "Validation failed", errors });
}

describe("entities/auth/errors", () => {
  it("берёт границы пароля из ответа сервера", () => {
    const error = validationError({ password: "size must be between 6 and 72" });

    expect(toAuthErrorMessage(error, "user-register")).toEqual({
      key: "validation.passwordLength",
      params: { min: 6, max: 72 }
    });
  });

  it("берёт границы имени из ответа сервера", () => {
    const error = validationError({ name: "size must be between 2 and 100" });

    expect(toAuthErrorMessage(error, "user-register")).toEqual({
      key: "validation.nameLength",
      params: { min: 2, max: 100 }
    });
  });

  it("не подставляет границы имени в сообщение про пароль", () => {
    // Сервер может вернуть обе ошибки сразу, и порядок ключей не гарантирован.
    const error = validationError({
      name: "size must be between 2 and 100",
      password: "size must be between 6 and 72"
    });

    const result = toAuthErrorMessage(error, "user-register");

    if (result.key === "validation.passwordLength") {
      expect(result.params).toEqual({ min: 6, max: 72 });
    } else {
      expect(result.params).toEqual({ min: 2, max: 100 });
    }
  });

  it("открытую сверху границу показывает как минимальную длину", () => {
    const error = validationError({ password: "size must be between 6 and 2147483647" });

    expect(toAuthErrorMessage(error, "user-register")).toEqual({
      key: "validation.passwordMin",
      params: { min: 6 }
    });
  });

  it("пустые поля различает по имени поля", () => {
    expect(toAuthErrorMessage(validationError({ email: "must not be blank" }), "user-login")).toEqual({
      key: "validation.enterEmail"
    });
    expect(toAuthErrorMessage(validationError({ name: "must not be blank" }), "user-register")).toEqual({
      key: "validation.enterName"
    });
    expect(
      toAuthErrorMessage(validationError({ password: "must not be blank" }), "user-login")
    ).toEqual({ key: "validation.enterPassword" });
  });

  it("пропускает поля, для которых нет понятного текста", () => {
    const error = validationError({
      somethingElse: "must match the pattern",
      password: "size must be between 6 and 72"
    });

    expect(toAuthErrorMessage(error, "user-register").key).toBe("validation.passwordLength");
  });

  it("на неизвестную ошибку валидации отвечает общим текстом", () => {
    const error = validationError({ somethingElse: "must match the pattern" });

    expect(toAuthErrorMessage(error, "user-register")).toEqual({ key: "validation.fixFields" });
  });

  it("различает обычный вход и вход администратора при 401", () => {
    const error = new ApiError("Unauthorized", 401, null);

    expect(toAuthErrorMessage(error, "user-login")).toEqual({ key: "errors.badCredentials" });
    expect(toAuthErrorMessage(error, "admin-login")).toEqual({ key: "errors.badAdminCredentials" });
  });

  it("занятый адрес, лимит запросов и ошибку сервера разводит по разным текстам", () => {
    expect(toAuthErrorMessage(new ApiError("Conflict", 409, null), "user-register")).toEqual({
      key: "errors.emailTaken"
    });
    expect(toAuthErrorMessage(new ApiError("Too Many", 429, null), "user-login")).toEqual({
      key: "errors.tooManyRequests"
    });
    expect(toAuthErrorMessage(new ApiError("Server", 500, null), "user-login")).toEqual({
      key: "errors.server"
    });
  });

  it("нехватку прав администратора показывает отдельно", () => {
    expect(toAuthErrorMessage(new AdminAccessRequiredError(), "admin-login")).toEqual({
      key: "errors.adminRequired"
    });
  });

  it("обрыв сети отличает от ответа сервера", () => {
    expect(toAuthErrorMessage(new TypeError("Failed to fetch"), "user-login")).toEqual({
      key: "errors.network"
    });
  });
});
