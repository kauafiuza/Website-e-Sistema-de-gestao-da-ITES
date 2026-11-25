import type { ThemeMode } from "@/pages/editor/lib/project-theme"

export type PublishedThemePreference = ThemeMode | "system"

export function publishedThemeStorageKey(key: string) {
  return `published-site:${key}:theme`
}

export function parsePublishedThemePreference(value: string | null): PublishedThemePreference {
  return value === "light" || value === "dark" ? value : "system"
}

export function resolvePublishedThemeMode(preference: PublishedThemePreference, systemDark: boolean): ThemeMode {
  return preference === "system" ? systemDark ? "dark" : "light" : preference
}
