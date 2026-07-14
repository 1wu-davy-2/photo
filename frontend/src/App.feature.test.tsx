import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("localized protected navigation", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    window.location.hash = "";
  });

  it("defaults to Chinese and switches to English", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input) => {
      if (String(input).includes("/api/auth/login")) {
        return Promise.resolve(jsonResponse({
          access_token: "token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { username: "admin", role: "admin" },
        }));
      }
      if (String(input).includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 24 }));
    }));

    render(<App />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "admin@123" } });
    fireEvent.click(screen.getByRole("button", { name: /进入图库|enter archive/i }));

    const navigation = await screen.findByRole("navigation");
    expect(within(navigation).getByRole("link", { name: /首页/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: /用户管理/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /English/i }));
    expect(within(await screen.findByRole("navigation")).getByRole("link", { name: /^Home$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "White-pink theme" }));
    expect(document.documentElement.dataset.theme).toBe("pink");
    fireEvent.click(screen.getByRole("button", { name: "White-blue theme" }));
    expect(document.documentElement.dataset.theme).toBe("blue");
  });

  it("navigates to the user management route for administrators", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input) => {
      if (String(input).includes("/api/auth/login")) {
        return Promise.resolve(jsonResponse({
          access_token: "token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { username: "admin", role: "admin" },
        }));
      }
      if (String(input).includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      if (String(input).includes("/api/users")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 24 }));
    }));

    render(<App />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "admin@123" } });
    fireEvent.click(screen.getByRole("button", { name: /进入图库|enter archive/i }));
    fireEvent.click(within(await screen.findByRole("navigation")).getByRole("link", { name: /用户管理/i }));

    await waitFor(() => expect(screen.getByRole("heading", { name: /用户管理/i, level: 1 })).toBeInTheDocument());
  });

  it("keeps the full-page drop surface available on management routes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input) => {
      if (String(input).includes("/api/auth/login")) {
        return Promise.resolve(jsonResponse({
          access_token: "token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { username: "admin", role: "admin" },
        }));
      }
      if (String(input).includes("/api/folders")) return Promise.resolve(jsonResponse([]));
      if (String(input).includes("/api/users")) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse({ items: [], total: 0, page: 1, page_size: 24 }));
    }));

    render(<App />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "admin@123" } });
    fireEvent.click(screen.getByRole("button", { name: /进入图库|enter archive/i }));
    await screen.findByRole("navigation");
    fireEvent.click(document.querySelector('a[href="#/manage"]')!);
    await waitFor(() => expect(document.querySelector(".folder-layout")).toBeInTheDocument());

    fireEvent.dragEnter(window, { dataTransfer: { types: ["Files"] } });

    expect(await screen.findByRole("status")).toBeInTheDocument();
  });
});
