import { requestJson } from "../../shared/api/http";
import type {
  AuthMode,
  AuthResponse,
  LoginRequest,
  RegisterRequest
} from "../../shared/types/auth";
import type { UserProfile } from "../../shared/types/user";

type JsonBody = LoginRequest | RegisterRequest | { refreshToken: string };

function postJson<T>(path: string, body: JsonBody) {
  return requestJson<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

export function authenticate(
  mode: AuthMode,
  payload: { email: string; password: string; name?: string }
) {
  const email = payload.email.trim();

  if (mode === "user-register") {
    return postJson<AuthResponse>("/auth/register", {
      email,
      name: (payload.name || "").trim(),
      password: payload.password
    });
  }

  return postJson<AuthResponse>("/auth/login", {
    email,
    password: payload.password
  });
}

export function refreshAuthTokens(refreshToken: string) {
  return postJson<AuthResponse>("/auth/refresh", {
    refreshToken
  });
}

export function fetchCurrentUser(accessToken: string) {
  return requestJson<UserProfile>("/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}
