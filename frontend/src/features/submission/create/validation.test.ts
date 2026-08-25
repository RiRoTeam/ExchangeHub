import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/http";
import {
  emptyProgramDraft,
  readServerFieldErrors,
  toProgramDraft,
  validateProgramDraft,
  type ProgramDraftFormValues
} from "./validation";

function futureDate(daysAhead = 30) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function pastDate(daysBehind = 1) {
  const date = new Date();
  date.setDate(date.getDate() - daysBehind);
  return date.toISOString().slice(0, 10);
}

const validValues: ProgramDraftFormValues = {
  title: "Summer research exchange",
  description: "Six weeks in a lab, travel covered.",
  country: "Estonia",
  type: "EXCHANGE",
  deadline: futureDate(),
  url: "https://example.com/program"
};

describe("validateProgramDraft", () => {
  it("пропускает корректную форму", () => {
    expect(validateProgramDraft(validValues)).toEqual({});
  });

  it("требует обязательные поля", () => {
    const errors = validateProgramDraft(emptyProgramDraft);

    expect(Object.keys(errors).sort()).toEqual(["country", "description", "title", "type"]);
    // deadline и url необязательны на бэке — не должны попадать в ошибки пустыми
    expect(errors.deadline).toBeUndefined();
    expect(errors.url).toBeUndefined();
  });

  it("не считает пробелы заполненным полем", () => {
    const errors = validateProgramDraft({ ...validValues, title: "   " });
    expect(errors.title).toBeTruthy();
  });

  it("ловит прошедший дедлайн (зеркалит @Future)", () => {
    expect(validateProgramDraft({ ...validValues, deadline: pastDate() }).deadline).toBeTruthy();
  });

  it("сегодняшняя дата — уже не будущее", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(validateProgramDraft({ ...validValues, deadline: today }).deadline).toBeTruthy();
  });

  it("ловит невалидный URL и не пускает не-http схемы", () => {
    expect(validateProgramDraft({ ...validValues, url: "example.com" }).url).toBeTruthy();
    expect(validateProgramDraft({ ...validValues, url: "javascript:alert(1)" }).url).toBeTruthy();
    expect(validateProgramDraft({ ...validValues, url: "http://example.com" }).url).toBeUndefined();
  });

  it("следит за лимитами длины из SubmissionRequest", () => {
    expect(validateProgramDraft({ ...validValues, title: "a".repeat(256) }).title).toBeTruthy();
    expect(validateProgramDraft({ ...validValues, title: "a".repeat(255) }).title).toBeUndefined();
    expect(
      validateProgramDraft({ ...validValues, description: "a".repeat(5001) }).description
    ).toBeTruthy();
  });
});

describe("toProgramDraft", () => {
  it("тримит строки и отправляет null вместо пустых необязательных полей", () => {
    const draft = toProgramDraft({
      ...validValues,
      title: "  Spaced title  ",
      country: " Estonia ",
      deadline: "",
      url: "   "
    });

    expect(draft).toEqual({
      title: "Spaced title",
      description: "Six weeks in a lab, travel covered.",
      country: "Estonia",
      type: "EXCHANGE",
      deadline: null,
      url: null
    });
  });
});

describe("readServerFieldErrors", () => {
  it("раскладывает ProblemDetail.errors по полям формы", () => {
    const error = new ApiError("Bad Request", 400, {
      status: 400,
      detail: "Validation failed",
      errors: {
        title: "must not be blank",
        deadline: "must be a future date",
        url: "must be a valid URL",
        description: "size must be between 0 and 5000"
      }
    });

    expect(readServerFieldErrors(error)).toEqual({
      title: "This field is required.",
      deadline: "The deadline must be a future date.",
      url: "Enter a full link, for example https://example.com/program.",
      description: "Must be 5000 characters or fewer."
    });
  });

  it("игнорирует поля, которых нет в форме", () => {
    const error = new ApiError("Bad Request", 400, {
      errors: { somethingElse: "must not be blank" }
    });

    expect(readServerFieldErrors(error)).toEqual({});
  });

  it("на ошибке без errors возвращает пустой объект", () => {
    expect(readServerFieldErrors(new ApiError("Boom", 500, null))).toEqual({});
    expect(readServerFieldErrors(new TypeError("offline"))).toEqual({});
  });
});
