import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAuthBridge, unregisterAuthBridge, type AuthBridge } from "../../shared/api/authBridge";
import { createSubmission, listMySubmissions, reviewSubmission } from "./api";
import type { ProgramDraft } from "../../shared/types/submission";

const draft: ProgramDraft = {
  title: "Summer research exchange",
  description: "Six weeks in a lab.",
  country: "Estonia",
  type: "EXCHANGE",
  deadline: "2030-05-01",
  url: null
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("entities/submission/api", () => {
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

  it("createSubmission шлёт POST /api/submissions с телом и токеном", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, ...draft, status: "PENDING" }, 201));

    await createSubmission(draft);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/submissions");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-1");
    expect(JSON.parse(init.body as string)).toEqual(draft);
  });

  it("listMySubmissions ходит в /api/submissions/my", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await listMySubmissions();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/submissions/my");
  });

  it("reviewSubmission шлёт PATCH с нормализованным комментарием", async () => {
    // mockImplementation, а не mockResolvedValue: Response читается один раз.
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ id: 4 })));

    await reviewSubmission(4, "REJECTED", "  duplicate  ");
    let init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/submissions/4");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      status: "REJECTED",
      comment: "duplicate"
    });

    await reviewSubmission(5, "APPROVED");
    init = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ status: "APPROVED", comment: null });
  });
});
