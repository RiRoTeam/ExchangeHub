import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerAuthBridge,
  unregisterAuthBridge,
  type AuthBridge
} from "../../shared/api/authBridge";
import { getAdminAnalytics } from "./api";

describe("entities/analytics/api", () => {
  let bridge: AuthBridge;

  beforeEach(() => {
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

  it("loads analytics from the protected admin endpoint", async () => {
    const payload = {
      users: 10,
      programs: 4,
      submissions: 2,
      favorites: 7,
      views: 42,
      clicks: 5,
      topPrograms: [],
      dailyEngagement: []
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAdminAnalytics()).resolves.toEqual(payload);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/analytics");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe(
      "Bearer admin-token"
    );
  });
});
