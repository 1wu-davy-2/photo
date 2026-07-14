export type AppRoute = "home" | "users" | "manage" | "walls" | "walls-editor" | "share";

export function readRoute(): AppRoute {
  const path = window.location.hash.replace(/^#\/?/, "");
  if (path === "users") return "users";
  if (path === "manage") return "manage";
  if (path === "walls") return "walls";
  if (path === "walls/new" || path.startsWith("walls/")) return "walls-editor";
  if (path.startsWith("share/walls/")) return "share";
  return "home";
}

export function readWallId(): string | null {
  const path = window.location.hash.replace(/^#\/?/, "");
  if (!path.startsWith("walls/")) return null;
  const value = path.slice("walls/".length).split("/")[0];
  if (!value || value === "new") return null;
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return null;
  }
}

export function readShareToken(): string | null {
  const path = window.location.hash.replace(/^#\/?/, "");
  if (!path.startsWith("share/walls/")) return null;
  try {
    return decodeURIComponent(path.slice("share/walls/".length)) || null;
  } catch {
    return null;
  }
}

export function routeHref(route: AppRoute): string {
  return route === "home" ? "#/" : `#/${route}`;
}

export function wallEditorHref(wallId: string | null): string {
  return wallId ? `#/walls/${encodeURIComponent(wallId)}` : "#/walls/new";
}

export function navigateToWallEditor(wallId: string | null): void {
  window.location.hash = wallEditorHref(wallId);
}

export function navigate(route: AppRoute): void {
  window.location.hash = routeHref(route);
}
