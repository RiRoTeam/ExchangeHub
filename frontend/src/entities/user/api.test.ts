import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerAuthBridge,
  unregisterAuthBridge,
  type AuthBridge
} from "../../shared/api/authBridge";
import { changeUserRole, listAdminUsers } from "./adminApi";
import { updateProfile } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("entities/user/api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let bridge: AuthBridge;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    bridge = {
      getAccessToken: () => "admin-token",
      refreshAccessToken: async () => null,
      onSessionExpired: () => {}
    };
    registerAuthBridge(bridge);
  });

  afterEach(() => {
    unregisterAuthBridge(bridge);
    vi.unstubAllGlobals();
  });

  it("listAdminUsers ходит в /api/admin/users с токеном", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await listAdminUsers();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/users");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer admin-token");
  });

  it("changeUserRole шлёт PATCH с ролью в теле", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 5, role: "ADMIN" }));

    await changeUserRole(5, "ADMIN");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/users/5/role");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ role: "ADMIN" });
  });

  it("409 на последнем администраторе пробрасывается наверх", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: 409, detail: "Cannot demote the last administrator" }, 409)
    );

    await expect(changeUserRole(1, "USER")).rejects.toMatchObject({ status: 409 });
  });

  it("updateProfile шлёт только переданные поля", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, name: "New" }));

    await updateProfile({ name: "New" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/users/me");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "New" });
  });
});
