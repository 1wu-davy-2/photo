import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { saveSession } from "./auth/session";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const submitLogin = () => {
  fireEvent.submit(screen.getByLabelText(/password/i).closest("form")!);
};

describe("Photo Gallery dashboard", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("logs in before rendering the empty gallery state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input) => {
      if (String(input).includes("/api/auth/login")) {
        return Promise.resolve(jsonResponse({ access_token: "token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
      }
      if (String(input).includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 48 }));
    }));
    render(<App />);

    expect(screen.getByRole("heading")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "admin@123" } });
    submitLogin();

    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("opens a photo preview when a photo card is selected", async () => {
    const photo = {
      id: "photo-1",
      original_name: "morning-light.jpg",
      mime_type: "image/jpeg",
      size_bytes: 2048,
      width: 1200,
      height: 800,
      created_at: "2026-07-14T08:00:00Z",
      updated_at: "2026-07-14T08:00:00Z",
    };
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input) => {
      if (String(input).includes("/api/auth/login")) {
        return Promise.resolve(jsonResponse({ access_token: "token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
      }
      if (String(input).includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      if (String(input).includes("/api/photos?")) return Promise.resolve(jsonResponse({ items: [photo], total: 1, page: 1, page_size: 48 }));
      return Promise.resolve(new Response(new Blob(["image"]), { status: 200, headers: { "Content-Type": "image/jpeg" } }));
    }));

    render(<App />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "admin@123" } });
    submitLogin();
    const card = await screen.findByRole("button", { name: /open morning-light/i });
    fireEvent.click(card);

    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: /morning-light/i })).toBeInTheDocument(),
    );
  });

  it("waits for login before loading protected photos and sends the login token", async () => {
    const photo = {
      id: "photo-auth-order",
      original_name: "protected.jpg",
      mime_type: "image/jpeg",
      size_bytes: 2048,
      width: 1200,
      height: 800,
      created_at: "2026-07-14T08:00:00Z",
      updated_at: "2026-07-14T08:00:00Z",
    };
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let resolveLogin: (response: Response) => void = () => undefined;
    const loginResponse = new Promise<Response>((resolve) => { resolveLogin = resolve; });

    vi.stubGlobal("fetch", vi.fn().mockImplementation((input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("/api/auth/login")) return loginResponse;
      if (url.includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      if (url.includes("/api/photos?")) return Promise.resolve(jsonResponse({ items: [photo], total: 1, page: 1, page_size: 24 }));
      if (url.includes("/api/photos/photo-auth-order/content")) return Promise.resolve(new Response(new Blob(["image"]), { status: 200, headers: { "Content-Type": "image/jpeg" } }));
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    }));
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:protected-photo") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });

    render(<StrictMode><App /></StrictMode>);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "admin@123" } });
    submitLogin();

    await waitFor(() => expect(calls.some(({ url }) => url.includes("/api/auth/login"))).toBe(true));
    expect(calls.some(({ url }) => url.includes("/api/photos?"))).toBe(false);

    resolveLogin(jsonResponse({ access_token: "login-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
    await screen.findByRole("button", { name: /open protected/i });
    await waitFor(() => expect(calls.some(({ url }) => url.includes("/api/photos/photo-auth-order/content"))).toBe(true));
    expect(calls.filter(({ url }) => url.includes("/api/photos/photo-auth-order/content"))).toHaveLength(1);

    const authHeader = (call: { init?: RequestInit }) => new Headers(call.init?.headers).get("Authorization");
    const listCall = calls.find(({ url }) => url.includes("/api/photos?"));
    const contentCall = calls.find(({ url }) => url.includes("/api/photos/photo-auth-order/content"));
    expect(listCall).toBeDefined();
    expect(contentCall).toBeDefined();
    expect(authHeader(listCall!)).toBe("Bearer login-token");
    expect(authHeader(contentCall!)).toBe("Bearer login-token");
    expect(calls.findIndex(({ url }) => url.includes("/api/auth/login"))).toBeLessThan(calls.findIndex(({ url }) => url.includes("/api/photos?")));
  });

  it("renews the access token at half-life and saves the replacement", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T04:00:00Z"));
    saveSession({
      accessToken: "old-token",
      expiresAt: Date.now() + 2_000,
      refreshAt: Date.now() + 1_000,
      user: { username: "admin", role: "admin" },
    });
    const fetchMock = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) return Promise.resolve(jsonResponse({ access_token: "renewed-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
      if (url.includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 24 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/auth/refresh"))).toBe(true);
    expect(sessionStorage.getItem("lumen.archive.session")).toContain("renewed-token");
  });

  it("restores an expired access session from the refresh cookie", async () => {
    saveSession({
      accessToken: "expired-token",
      expiresAt: Date.now() - 1,
      refreshAt: Date.now() - 1_800_000,
      user: { username: "admin", role: "admin" },
    });
    const fetchMock = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) return Promise.resolve(jsonResponse({ access_token: "restored-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
      if (url.includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 24 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/auth/refresh"))).toBe(true);
    expect(sessionStorage.getItem("lumen.archive.session")).toContain("restored-token");
  });

  it("does not allow a new login while cookie restoration is pending", async () => {
    saveSession({
      accessToken: "expired-token",
      expiresAt: Date.now() - 1,
      refreshAt: Date.now() - 1_800_000,
      user: { username: "admin", role: "admin" },
    });
    let resolveRefresh: (response: Response) => void = () => undefined;
    const pendingRefresh = new Promise<Response>((resolve) => { resolveRefresh = resolve; });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) return pendingRefresh;
      if (url.includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 24 }));
    }));

    render(<App />);

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();

    await act(async () => {
      resolveRefresh(jsonResponse({ access_token: "restored-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
      await pendingRefresh;
    });
    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
  });

  it("refreshes an overdue session when the window regains focus", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T04:00:00Z"));
    saveSession({
      accessToken: "sleeping-token",
      expiresAt: Date.now() + 3_600_000,
      refreshAt: Date.now() + 1_800_000,
      user: { username: "admin", role: "admin" },
    });
    const fetchMock = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) return Promise.resolve(jsonResponse({ access_token: "wake-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
      if (url.includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 24 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    vi.setSystemTime(new Date("2026-07-19T04:31:00Z"));
    await act(async () => { window.dispatchEvent(new Event("focus")); await Promise.resolve(); });

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/auth/refresh"))).toBe(true);
    expect(sessionStorage.getItem("lumen.archive.session")).toContain("wake-token");
  });

  it("does not restore a late refresh response after logout", async () => {
    saveSession({
      accessToken: "old-token",
      expiresAt: Date.now() + 3_600_000,
      refreshAt: Date.now() - 1,
      user: { username: "admin", role: "admin" },
    });
    let resolveRefresh: (response: Response) => void = () => undefined;
    const pendingRefresh = new Promise<Response>((resolve) => { resolveRefresh = resolve; });
    const fetchMock = vi.fn().mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) return pendingRefresh;
      if (url.includes("/api/auth/logout")) return Promise.resolve(new Response(null, { status: 204 }));
      if (url.includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 24 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/auth/refresh"))).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: /退出登录|sign out/i }));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/auth/logout"))).toBe(false);

    await act(async () => {
      resolveRefresh(jsonResponse({ access_token: "late-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
      await pendingRefresh;
    });

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/auth/logout"))).toBe(true));
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(sessionStorage.getItem("lumen.archive.session")).toBeNull();
  });
});
