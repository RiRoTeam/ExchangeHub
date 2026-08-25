import { apiBaseUrl } from "../config/env";
import { getAuthBridge } from "./authBridge";

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function resolveUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${apiBaseUrl}${path}`;
  }

  return `${apiBaseUrl}/${path}`;
}

async function readPayload(response: Response) {
  const rawText = await response.text();

  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return rawText;
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveUrl(path), init);
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status, payload);
  }

  return payload as T;
}

function withAuthHeader(init: RequestInit | undefined, accessToken: string): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return { ...init, headers };
}

/**
 * Запрос от имени текущего пользователя.
 *
 * Сам подставляет Authorization, а при 401 один раз пробует обновить
 * access-токен через refresh и повторить запрос. Если обновление не удалось —
 * сессия сбрасывается и наверх летит исходная ApiError(401).
 */
export async function authorizedRequestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const bridge = getAuthBridge();

  if (!bridge) {
    throw new ApiError("No active session", 401, null);
  }

  const accessToken = bridge.getAccessToken();

  if (!accessToken) {
    throw new ApiError("No active session", 401, null);
  }

  try {
    return await requestJson<T>(path, withAuthHeader(init, accessToken));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    // Запрос уже отменён — повторять бессмысленно.
    if (init?.signal?.aborted) {
      throw error;
    }

    const refreshedToken = await bridge.refreshAccessToken();

    if (!refreshedToken) {
      bridge.onSessionExpired();
      throw error;
    }

    return requestJson<T>(path, withAuthHeader(init, refreshedToken));
  }
}

type JsonMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/** Сахар для авторизованных запросов с JSON-телом. */
export function authorizedJsonBody<T>(method: JsonMethod, path: string, body?: unknown, init?: RequestInit) {
  return authorizedRequestJson<T>(path, {
    ...init,
    method,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined)
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
