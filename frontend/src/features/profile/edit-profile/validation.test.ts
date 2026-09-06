import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/http";
import {
  hasChanges,
  readServerFieldErrors,
  toUpdateRequest,
  validateProfile,
  type ProfileFormValues
} from "./validation";

const CURRENT_NAME = "Vika";

function form(overrides: Partial<ProfileFormValues> = {}): ProfileFormValues {
  return {
    name: CURRENT_NAME,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    ...overrides
  };
}

describe("validateProfile", () => {
  it("смена только имени проходит", () => {
    expect(validateProfile(form({ name: "Viktoria" }), CURRENT_NAME)).toEqual({});
  });

  it("без изменений сохранять нечего", () => {
    expect(validateProfile(form(), CURRENT_NAME).name).toBeTruthy();
  });

  it("пустое имя не пропускается", () => {
    expect(validateProfile(form({ name: "   " }), CURRENT_NAME).name).toBeTruthy();
  });

  it("границы длины имени как в UpdateProfileRequest", () => {
    expect(validateProfile(form({ name: "a" }), CURRENT_NAME).name).toBeTruthy();
    expect(validateProfile(form({ name: "a".repeat(101) }), CURRENT_NAME).name).toBeTruthy();
    expect(validateProfile(form({ name: "a".repeat(100) }), CURRENT_NAME).name).toBeUndefined();
  });

  it("новый пароль требует текущий", () => {
    const errors = validateProfile(
      form({ newPassword: "newpass123", confirmPassword: "newpass123" }),
      CURRENT_NAME
    );

    expect(errors.currentPassword).toBeTruthy();
  });

  it("подтверждение должно совпадать", () => {
    const errors = validateProfile(
      form({ currentPassword: "old", newPassword: "newpass123", confirmPassword: "newpass124" }),
      CURRENT_NAME
    );

    expect(errors.confirmPassword).toBeTruthy();
  });

  it("новый пароль не может совпадать с текущим", () => {
    const errors = validateProfile(
      form({ currentPassword: "samepass", newPassword: "samepass", confirmPassword: "samepass" }),
      CURRENT_NAME
    );

    expect(errors.newPassword).toBeTruthy();
  });

  it("границы длины пароля", () => {
    const short = validateProfile(
      form({ currentPassword: "old", newPassword: "12345", confirmPassword: "12345" }),
      CURRENT_NAME
    );
    expect(short.newPassword).toBeTruthy();

    const ok = validateProfile(
      form({ currentPassword: "old", newPassword: "123456", confirmPassword: "123456" }),
      CURRENT_NAME
    );
    expect(ok.newPassword).toBeUndefined();
  });

  it("текущий пароль без нового — подсказываем, чего не хватает", () => {
    expect(validateProfile(form({ currentPassword: "old" }), CURRENT_NAME).newPassword).toBeTruthy();
  });

  it("корректная смена пароля проходит", () => {
    expect(
      validateProfile(
        form({ currentPassword: "oldpass", newPassword: "newpass123", confirmPassword: "newpass123" }),
        CURRENT_NAME
      )
    ).toEqual({});
  });
});

describe("toUpdateRequest", () => {
  it("отправляет только изменившееся имя", () => {
    expect(toUpdateRequest(form({ name: "  Viktoria  " }), CURRENT_NAME)).toEqual({
      name: "Viktoria"
    });
  });

  it("неизменённое имя в тело не попадает", () => {
    expect(
      toUpdateRequest(
        form({ currentPassword: "old", newPassword: "newpass123", confirmPassword: "newpass123" }),
        CURRENT_NAME
      )
    ).toEqual({ currentPassword: "old", newPassword: "newpass123" });
  });

  it("подтверждение пароля на сервер не уходит", () => {
    const request = toUpdateRequest(
      form({ currentPassword: "old", newPassword: "newpass123", confirmPassword: "newpass123" }),
      CURRENT_NAME
    );

    expect(request).not.toHaveProperty("confirmPassword");
  });
});

describe("hasChanges", () => {
  it("различает пустую форму и правку", () => {
    expect(hasChanges(form(), CURRENT_NAME)).toBe(false);
    expect(hasChanges(form({ name: "Other" }), CURRENT_NAME)).toBe(true);
    expect(hasChanges(form({ newPassword: "x" }), CURRENT_NAME)).toBe(true);
  });
});

describe("readServerFieldErrors", () => {
  it("раскладывает ошибки валидации по полям", () => {
    const error = new ApiError("Bad Request", 400, {
      errors: { name: "size must be between 2 and 100" }
    });

    expect(readServerFieldErrors(error)).toEqual({
      name: "Must be between 2 and 100 characters."
    });
  });

  it("«Wrong current password» приходит без errors и остаётся общей ошибкой", () => {
    const error = new ApiError("Bad Request", 400, {
      status: 400,
      detail: "Wrong current password"
    });

    expect(readServerFieldErrors(error)).toEqual({});
  });
});
