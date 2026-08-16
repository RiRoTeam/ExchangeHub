import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, authorizedJsonBody, authorizedRequestJson, requestJson } from "./http";
import { registerAuthBridge, unregisterAuthBridge, type AuthBridge } from "./authBridge";
import type { ProgramStatus } from "../types/program";

// ── Проверка синхронизации типов с бэком ──────────────────────────────────────
// Если кто-то поменяет ProgramStatus и разъедется с com.temka.app.entity.ProgramStatus,
// упадёт tsc, а не рантайм в проде.
type BackendProgramStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
type Expect<T extends true> = T;
type Equals<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
  ? true
  : false;
export type ProgramStatusMatchesBackend = Expect<Equals<ProgramStatus, BackendProgramStatus>>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function authHeaderOf(call: unknown[]) {
  const init = call[1] as RequestInit | undefined;
  return new Headers(init?.headers).get("Authorization");
}

describe("authorizedRequestJson", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let bridge: AuthBridge;
  let accessToken: string | null;

  beforeEach(() => {
    accessToken = "token-1";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    bridge = {
      getAccessToken: () => accessToken,
      refreshAccessToken: vi.fn(async () => {
        accessToken = "token-2";
        return accessToken;
      }),
      onSessionExpired: vi.fn()
    };

    registerAuthBridge(bridge);
  });

  afterEach(() => {
    unregisterAuthBridge(bridge);
    vi.unstubAllGlobals();
  });

  it("подставляет Authorization из моста", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1 }));

    const result = await authorizedRequestJson<{ id: number }>("/submissions/my");

    expect(result).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer token-1");
  });

  it("на 401 обновляет токен и повторяет запрос ровно один раз", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await authorizedRequestJson<{ ok: boolean }>("/submissions/my");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe("Bearer token-1");
    expect(authHeaderOf(fetchMock.mock.calls[1])).toBe("Bearer token-2");
    expect(bridge.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("не зацикливается: если после refresh снова 401 — бросает ошибку", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401));

    await expect(authorizedRequestJson("/submissions/my")).rejects.toMatchObject({
      name: "ApiError",
      status: 401
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("если refresh не удался — сбрасывает сессию и пробрасывает 401", async () => {
    bridge.refreshAccessToken = vi.fn(async () => null);
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));

    await expect(authorizedRequestJson("/submissions/my")).rejects.toBeInstanceOf(ApiError);
    expect(bridge.onSessionExpired).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ошибки кроме 401 не трогают refresh", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Forbidden" }, 403));

    await expect(authorizedRequestJson("/admin/submissions")).rejects.toMatchObject({
      status: 403
    });
    expect(bridge.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("без токена не ходит в сеть", async () => {
    accessToken = null;

    await expect(authorizedRequestJson("/submissions/my")).rejects.toMatchObject({
      status: 401
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("без зарегистрированного моста не ходит в сеть", async () => {
    unregisterAuthBridge(bridge);

    await expect(authorizedRequestJson("/submissions/my")).rejects.toMatchObject({
      status: 401
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("authorizedJsonBody шлёт метод, Content-Type и тело", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 7 }, 201));

    await authorizedJsonBody("POST", "/submissions", { title: "Test" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ title: "Test" }));
  });
});

describe("requestJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("публичные запросы ходят без Authorization даже при активной сессии", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const bridge: AuthBridge = {
      getAccessToken: () => "token-1",
      refreshAccessToken: async () => null,
      onSessionExpired: () => {}
    };
    registerAuthBridge(bridge);

    await requestJson("/programs");

    expect(authHeaderOf(fetchMock.mock.calls[0])).toBeNull();
    unregisterAuthBridge(bridge);
  });
});
