import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerAuthBridge,
  unregisterAuthBridge,
  type AuthBridge
} from "../../shared/api/authBridge";
import { changeUserRole, listAdminUsers } from "./adminApi";

describe("entities/user/adminApi", () => {
  let bridge: AuthBridge;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    bridge = {
      getAccessToken: () => "admin-token",
      refreshAccessToken: async () => null,
      onSessionExpired: () => {}
    };
    registerAuthBridge(bridge);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    unregisterAuthBridge(bridge);
    vi.unstubAllGlobals();
  });

  it("lists users and changes a role with the expected payload", async () => {
    const user = {
      id: 7,
      email: "user@example.com",
      name: "User",
      role: "USER" as const,
      createdAt: "2026-01-01T00:00:00Z"
    };
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(user), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    await listAdminUsers();
    await changeUserRole(user.id, "ADMIN");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/users");
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("/api/admin/users/7/role");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ role: "ADMIN" });
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer admin-token");
  });
});
