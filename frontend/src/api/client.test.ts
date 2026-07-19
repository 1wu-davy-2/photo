import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPhotoWall, downloadPhoto, fetchPhotoBlobUrl, logoutSession, refreshSession, uploadPhoto } from "./client";

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

describe("photo content authentication", () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:test-photo") });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Blob(["image"]), { status: 200, headers: { "Content-Type": "image/png" } })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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

  it("refreshes the access session using only the HttpOnly cookie", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: "renewed-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: expiresAt,
      user: { username: "admin", role: "admin" },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const session = await refreshSession();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/auth/refresh");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(session.accessToken).toBe("renewed-token");
    expect(session.refreshAt).toBeLessThan(session.expiresAt);
  });

  it("logs out through the cookie-scoped endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await logoutSession();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/auth/logout");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
  });

  it("retries once when another tab has just rotated the shared cookie", async () => {
    vi.useFakeTimers();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Refresh already rotated" }), {
        status: 409,
        headers: { "Content-Type": "application/json", "Retry-After": "1" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "cross-tab-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: expiresAt,
        user: { username: "admin", role: "admin" },
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const refresh = refreshSession();
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(refresh).resolves.toMatchObject({ accessToken: "cross-tab-token" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes once and retries an authenticated request that returns 401", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "Token expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({
        access_token: "replacement-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: expiresAt,
        user: { username: "admin", role: "admin" },
      }))
      .mockResolvedValueOnce(jsonResponse({ id: "wall-after-refresh" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    const wall = await createPhotoWall({ name: "Recovered wall", background_color: "#F6FAFF" }, "expired-token");

    expect(wall.id).toBe("wall-after-refresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [, retriedInit] = fetchMock.mock.calls[2];
    expect(new Headers(retriedInit?.headers).get("Authorization")).toBe("Bearer replacement-token");
  });

  it("refreshes and retries an upload that returns 401", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      access_token: "upload-replacement-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: expiresAt,
      user: { username: "admin", role: "admin" },
    })));
    class RetryXHR {
      static instances: RetryXHR[] = [];
      upload = { addEventListener: vi.fn() };
      responseType = "";
      response = { id: "uploaded-photo" };
      status: number;
      headers: Record<string, string> = {};
      listeners: Record<string, () => void> = {};
      open = vi.fn();
      setRequestHeader = (name: string, value: string) => { this.headers[name] = value; };
      addEventListener = (name: string, listener: () => void) => { this.listeners[name] = listener; };
      send = () => { this.listeners.load?.(); };
      constructor() {
        this.status = RetryXHR.instances.length === 0 ? 401 : 201;
        RetryXHR.instances.push(this);
      }
    }
    vi.stubGlobal("XMLHttpRequest", RetryXHR);

    const uploaded = await uploadPhoto(new File(["image"], "photo.png", { type: "image/png" }), () => undefined, "expired-token");

    expect(uploaded.id).toBe("uploaded-photo");
    expect(RetryXHR.instances).toHaveLength(2);
    expect(RetryXHR.instances[1].headers.Authorization).toBe("Bearer upload-replacement-token");
  });
});
