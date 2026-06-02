

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "bf-theme";

export const getStoredTheme = (): ThemeMode => {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
};

export const storeTheme = (theme: ThemeMode) => {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};