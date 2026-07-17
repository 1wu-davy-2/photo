import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPhotoWall, downloadPhoto, fetchPhotoBlobUrl, uploadPhoto } from "./client";

describe("photo content authentication", () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:test-photo") });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Blob(["image"]), { status: 200, headers: { "Content-Type": "image/png" } })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["thumbnail", "width=300"],
    ["preview", "width=1920"],
    ["original", "original=true"],
  ] as const)("requests the %s image variant with an explicit token", async (variant, query) => {
    await fetchPhotoBlobUrl("photo-1", variant, undefined, "login-token");

    const calls = vi.mocked(fetch).mock.calls;
    const [url, init] = calls[calls.length - 1];
    expect(String(url)).toContain(`/api/photos/photo-1/content?${query}`);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer login-token");
  });

  it("downloads from the original-only download endpoint", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await downloadPhoto("photo-1", "original.png", "login-token");

    const calls = vi.mocked(fetch).mock.calls;
    const [url, init] = calls[calls.length - 1];
    expect(String(url)).toContain("/api/photos/photo-1/download");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer login-token");
    expect(click).toHaveBeenCalledOnce();
  });

  it("includes the selected folder when uploading a file", async () => {
    class FakeXHR {
      static instance: FakeXHR;
      upload = { addEventListener: vi.fn() };
      responseType = "";
      response = { id: "photo-1" };
      status = 201;
      headers: Record<string, string> = {};
      body: FormData | null = null;
      listeners: Record<string, () => void> = {};
      open = vi.fn();
      setRequestHeader = (name: string, value: string) => { this.headers[name] = value; };
      addEventListener = (name: string, listener: () => void) => { this.listeners[name] = listener; };
      send = (body: FormData) => { this.body = body; this.listeners.load?.(); };
      constructor() { FakeXHR.instance = this; }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXHR);

    await uploadPhoto(new File(["image"], "photo.png", { type: "image/png" }), () => undefined, "login-token", "folder-1");

    expect(FakeXHR.instance.headers.Authorization).toBe("Bearer login-token");
    expect(FakeXHR.instance.body?.get("folder_id")).toBe("folder-1");
  });

  it("creates a photo wall with the authenticated request helper", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "wall-1" }), { status: 201 })));

    await createPhotoWall({ name: "Summer wall", background_color: "#F6FAFF" }, "login-token");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer login-token");
  });
});
