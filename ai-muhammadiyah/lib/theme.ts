export type ThemePreference = "system" | "light" | "dark";

export const themeStorageKey = "ai-mu-theme";

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference;
}

/** Applies a theme preference to <html> and caches it so the next page load
 * (including logged-out routes, before any user data is fetched) can apply
 * the right theme without a flash. Safe to call from client code only. */
export function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.theme = resolveTheme(preference);
  try {
    window.localStorage.setItem(themeStorageKey, preference);
  } catch {
    // localStorage can throw in private-browsing/blocked-storage contexts;
    // the theme still applies for this page load, just isn't cached.
  }
}

/** Inline, pre-hydration bootstrap script (see app/layout.tsx) that reads the
 * cached preference and applies it before first paint, then keeps the theme
 * in sync if the OS-level color scheme changes while "system" is selected. */
export const themeBootstrapScript = `
(function () {
  try {
    var key = ${JSON.stringify(themeStorageKey)};
    var pref = localStorage.getItem(key) || "system";
    var mql = window.matchMedia("(prefers-color-scheme: dark)");
    var resolve = function (p) {
      return p === "system" ? (mql.matches ? "dark" : "light") : p;
    };
    document.documentElement.dataset.theme = resolve(pref);
    mql.addEventListener("change", function () {
      var current = localStorage.getItem(key) || "system";
      if (current === "system") {
        document.documentElement.dataset.theme = resolve(current);
      }
    });
  } catch (e) {}
})();
`;
