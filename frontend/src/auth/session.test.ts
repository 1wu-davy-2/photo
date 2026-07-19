import { beforeEach, describe, expect, it } from "vitest";

import { clearSession, forgetSession, hasRefreshSession, isRefreshDue, loadSession, saveSession, sessionFromTokenResponse } from "./session";

describe("access session refresh timing", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("schedules refresh when half of the access-token lifetime remains", () => {
    const receivedAt = 1_000_000;
    const session = sessionFromTokenResponse({
      access_token: "access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: receivedAt / 1000 + 3600,
      user: { username: "admin", role: "admin" },
    }, receivedAt);

    expect(session.expiresAt).toBe(receivedAt + 3_600_000);
    expect(session.refreshAt).toBe(receivedAt + 1_800_000);
    expect(isRefreshDue(session, session.refreshAt - 1)).toBe(false);
    expect(isRefreshDue(session, session.refreshAt)).toBe(true);
  });

  it("uses the received lifetime when the client clock differs from the server", () => {
    const receivedAt = 10_000_000;
    const session = sessionFromTokenResponse({
      access_token: "access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: 3600,
      user: { username: "admin", role: "admin" },
    }, receivedAt);

    expect(session.refreshAt).toBe(receivedAt + 1_800_000);
  });

  it("treats a legacy stored session without refresh metadata as immediately due", () => {
    sessionStorage.setItem("lumen.archive.session", JSON.stringify({
      accessToken: "legacy-token",
      expiresAt: Date.now() + 60_000,
      user: { username: "admin", role: "admin" },
    }));

    const session = loadSession();

    expect(session?.refreshAt).toBeLessThanOrEqual(Date.now());
  });

  it("persists only access-session metadata", () => {
    const session = {
      accessToken: "access-token",
      expiresAt: Date.now() + 3_600_000,
      refreshAt: Date.now() + 1_800_000,
      user: { username: "admin", role: "admin" },
    };

    saveSession(session);

    const stored = sessionStorage.getItem("lumen.archive.session") ?? "";
    expect(stored).toContain("access-token");
    expect(stored).not.toContain("refresh_token");
    expect(stored).not.toContain("lumen_refresh_token");
  });

  it("keeps a refresh hint after access expiry but removes it on explicit logout", () => {
    saveSession({
      accessToken: "access-token",
      expiresAt: Date.now() + 3_600_000,
      refreshAt: Date.now() + 1_800_000,
      user: { username: "admin", role: "admin" },
    });

    sessionStorage.clear();
    expect(hasRefreshSession()).toBe(true);

    forgetSession();
    expect(hasRefreshSession()).toBe(false);
  });
});
