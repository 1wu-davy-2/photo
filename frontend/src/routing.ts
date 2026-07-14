export type AppRoute = "home" | "users" | "manage";

export function readRoute(): AppRoute {
  const path = window.location.hash.replace(/^#\/?/, "");
  if (path === "users") return "users";
  if (path === "manage") return "manage";
  return "home";
}

export function routeHref(route: AppRoute): string {
  return route === "home" ? "#/" : `#/${route}`;
}

export function navigate(route: AppRoute): void {
  window.location.hash = routeHref(route);
}
