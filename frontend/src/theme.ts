export type ColorTheme = "blue" | "pink";

const STORAGE_KEY = "lumen.archive.theme";

export function loadTheme(): ColorTheme {
  return localStorage.getItem(STORAGE_KEY) === "pink" ? "pink" : "blue";
}

export function saveTheme(theme: ColorTheme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}
