import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const submitLogin = () => {
  fireEvent.submit(screen.getByLabelText(/password/i).closest("form")!);
};

describe("Photo Gallery dashboard", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("logs in before rendering the empty gallery state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input) => {
      if (String(input).includes("/api/auth/login")) {
        return Promise.resolve(jsonResponse({ access_token: "token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { username: "admin", role: "admin" } }));
      }
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
});
