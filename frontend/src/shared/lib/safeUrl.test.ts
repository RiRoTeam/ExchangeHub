import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./safeUrl";

describe("safeExternalUrl", () => {
  it("пропускает http и https", () => {
    expect(safeExternalUrl("https://example.com/program")).toBe("https://example.com/program");
    expect(safeExternalUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("отбивает javascript:", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("JavaScript:alert(1)")).toBeNull();
    expect(safeExternalUrl("  javascript:alert(1)  ")).toBeNull();
  });

  it("отбивает data: и другие схемы", () => {
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeExternalUrl("file:///etc/passwd")).toBeNull();
  });

  it("отбивает относительные и битые ссылки", () => {
    expect(safeExternalUrl("/programs/1")).toBeNull();
    expect(safeExternalUrl("example.com")).toBeNull();
    expect(safeExternalUrl("не ссылка")).toBeNull();
  });

  it("пустое и отсутствующее значение — null", () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl("   ")).toBeNull();
  });
});
