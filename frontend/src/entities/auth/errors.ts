import { ApiError } from "../../shared/api/http";
import type { AuthMode } from "../../shared/types/auth";

type ProblemPayload = {
  detail?: string;
  title?: string;
  errors?: Record<string, string>;
};

export class AdminAccessRequiredError extends Error {
  constructor() {
    super("Admin access required");
    this.name = "AdminAccessRequiredError";
  }
}

function readProblem(error: ApiError) {
  return (error.payload ?? {}) as ProblemPayload;
}

function toFieldMessage(field: string, message: string) {
  if (message === "must not be blank" || message === "не должно быть пустым") {
    if (field === "email") {
      return "Enter your email address.";
    }

    if (field === "name") {
      return "Enter your name.";
    }

    return "Enter your password.";
  }

  if (field === "email" && message.toLowerCase().includes("email")) {
    return "Enter a valid email address.";
  }

  if (field === "name" && message.includes("size must be between 2 and 100")) {
    return "Name must be between 2 and 100 characters.";
  }

  if (field === "password" && message.includes("size must be between 6 and 72")) {
    return "Password must be between 6 and 72 characters.";
  }

  if (message === "size must be between 6 and 2147483647") {
    return "Password must be at least 6 characters.";
  }

  return message;
}

function defaultUnauthorizedMessage(mode: AuthMode) {
  if (mode === "admin-login") {
    return "We couldn’t sign you in as an admin with these details.";
  }

  return "We couldn’t sign you in with that email and password.";
}

export function toFriendlyAuthError(error: unknown, mode: AuthMode) {
  if (error instanceof AdminAccessRequiredError) {
    return "This account exists, but it doesn’t have admin access.";
  }

  if (error instanceof ApiError) {
    const problem = readProblem(error);

    if (problem.errors) {
      const firstError = Object.entries(problem.errors)[0];

      if (firstError) {
        const [field, message] = firstError;
        return toFieldMessage(field, message);
      }
    }

    if (error.status === 400) {
      return problem.detail || "Some fields need attention before we can continue.";
    }

    if (error.status === 401) {
      return problem.detail || defaultUnauthorizedMessage(mode);
    }

    if (error.status === 409) {
      return problem.detail || "An account with this email already exists.";
    }

    if (error.status === 429) {
      return "Too many attempts right now. Please wait a minute and try again.";
    }

    if (error.status >= 500) {
      return "The server is having trouble right now. Please try again in a moment.";
    }
  }

  if (error instanceof TypeError) {
    return "We couldn’t reach ExchangeHub. Check your connection and try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
