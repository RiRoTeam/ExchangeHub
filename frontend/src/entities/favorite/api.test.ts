import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerAuthBridge,
  unregisterAuthBridge,
  type AuthBridge
} from "../../shared/api/authBridge";
import { addFavorite, listFavorites, removeFavorite } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("entities/favorite/api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let bridge: AuthBridge;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    bridge = {
      getAccessToken: () => "token-1",
      refreshAccessToken: async () => null,
      onSessionExpired: () => {}
    };
    registerAuthBridge(bridge);
  });

  afterEach(() => {
    unregisterAuthBridge(bridge);
    vi.unstubAllGlobals();
  });

  it("listFavorites ходит в /api/users/me/favorites с токеном", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await listFavorites();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/users/me/favorites");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-1");
  });

  it("addFavorite шлёт POST и переваривает пустой 204", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204));

    await expect(addFavorite(42)).resolves.toBeNull();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/users/me/favorites/42");
    expect(init.method).toBe("POST");
  });

  it("removeFavorite шлёт DELETE", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, 204));

    await removeFavorite(42);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/users/me/favorites/42");
    expect(init.method).toBe("DELETE");
  });

  it("404 на несуществующей программе пробрасывается наверх", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: 404, detail: "Program not found: 99" }, 404)
    );

    await expect(addFavorite(99)).rejects.toMatchObject({ status: 404 });
  });
});
