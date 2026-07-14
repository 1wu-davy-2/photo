import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPhotoBlobUrl } from "./client";

describe("photo content authentication", () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:test-photo") });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Blob(["image"]), { status: 200, headers: { "Content-Type": "image/png" } })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the login token explicitly passed to the content request", async () => {
    await fetchPhotoBlobUrl("photo-1", undefined, "login-token");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer login-token");
  });
});
