export type AppRoute = "home" | "users" | "manage" | "walls" | "share";

export function readRoute(): AppRoute {
  const path = window.location.hash.replace(/^#\/?/, "");
  if (path === "users") return "users";
  if (path === "manage") return "manage";
  if (path === "walls") return "walls";
  if (path.startsWith("share/walls/")) return "share";
  return "home";
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

export function navigate(route: AppRoute): void {
  window.location.hash = routeHref(route);
}
