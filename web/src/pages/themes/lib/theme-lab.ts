import {
  defaultProjectTheme,
  normalizeProjectFont,
  projectFonts,
  themePresets,
  type ColorKey,
  type ProjectTheme,
} from "@/pages/editor/lib/project-theme"
import type { SavedTheme } from "@/services/projects/theme.service"

export const themeColorLabels: Record<ColorKey, string> = {
  primary: "Primária",
  secondary: "Secundária",
  accent: "Destaque",
  background: "Fundo",
  foreground: "Texto",
  card: "Superfície",
  border: "Borda",
  muted: "Texto suavizado",
  success: "Sucesso",
  destructive: "Erro",
}

export const themeFonts = projectFonts

export type ThemePreviewKind = string

export function isThemeDirty(theme: ProjectTheme, savedTheme: ProjectTheme) {
  return JSON.stringify(theme) !== JSON.stringify(savedTheme)
}

export function presetTheme(theme: ProjectTheme, name: string): ProjectTheme {
  const preset = themePresets[name as keyof typeof themePresets]
  if (!preset) return theme

  return {
    ...theme,
    preset: name,
    presetId: undefined,
    light: { ...preset.light },
    dark: { ...preset.dark },
  }
}

export function savedThemeDraft(item: SavedTheme): ProjectTheme {
  const configuration = { ...item.configuration } as ProjectTheme & {
    linked?: unknown
  }
  delete configuration.linked
  return {
    ...configuration,
    headingFont: normalizeProjectFont(configuration.headingFont),
    bodyFont: normalizeProjectFont(configuration.bodyFont),
    preset: item.name,
    presetId: item.id,
  }
}

export function updateThemeColor(
  theme: ProjectTheme,
  key: ColorKey,
  value: string
): ProjectTheme {
  if (!/^#[\da-f]{6}$/i.test(value)) return theme

  const next: ProjectTheme = {
    ...theme,
    preset: theme.presetId ? theme.preset : "Custom",
    [theme.mode]: { ...theme[theme.mode], [key]: value },
  }
  return next
}

export function resetThemeDraft() {
  return defaultProjectTheme()
}
