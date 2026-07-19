export interface AuthUser {
  username: string;
  role: string;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  refreshAt: number;
  user: AuthUser;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: AuthUser;
}

const STORAGE_KEY = "lumen.archive.session";
const REFRESH_HINT_KEY = "lumen.archive.refresh-session";

export function loadSession(): AuthSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.accessToken || session.expiresAt <= Date.now()) {
      clearSession();
      return null;
    }
    if (!Number.isFinite(session.refreshAt)) {
      session.refreshAt = Date.now();
      saveSession(session);
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function sessionFromTokenResponse(body: TokenResponse, receivedAt = Date.now()): AuthSession {
  const expiresAt = body.expires_at * 1000;
  return {
    accessToken: body.access_token,
    expiresAt,
    refreshAt: receivedAt + body.expires_in * 500,
    user: body.user,
  };
}

export function isRefreshDue(session: AuthSession, now = Date.now()): boolean {
  return now >= session.refreshAt;
}

export function saveSession(session: AuthSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem(REFRESH_HINT_KEY, "1");
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function forgetSession(): void {
  clearSession();
  localStorage.removeItem(REFRESH_HINT_KEY);
}

export function hasRefreshSession(): boolean {
  return localStorage.getItem(REFRESH_HINT_KEY) === "1";
}

export function getAccessToken(): string | null {
  return loadSession()?.accessToken ?? null;
}
