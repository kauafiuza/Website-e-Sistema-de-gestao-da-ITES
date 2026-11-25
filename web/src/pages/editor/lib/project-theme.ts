
import type { CSSProperties } from "react"

export const colorKeys = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "card",
  "border",
  "muted",
  "success",
  "destructive",
] as const

export type ColorKey = typeof colorKeys[number]
export type ThemeMode = "light" | "dark"
export type ThemePalette = Record<ColorKey, string>

export const projectFonts = [
  { label: "Inter", style: "Sans serif", family: "Inter Variable", packageName: "@fontsource-variable/inter" },
  { label: "Nunito Sans", style: "Sans serif", family: "Nunito Sans Variable", packageName: "@fontsource-variable/nunito-sans" },
  { label: "Roboto", style: "Sans serif", family: "Roboto Variable", packageName: "@fontsource-variable/roboto" },
  { label: "DM Sans", style: "Sans serif", family: "DM Sans Variable", packageName: "@fontsource-variable/dm-sans" },
  { label: "Montserrat", style: "Geométrica", family: "Montserrat Variable", packageName: "@fontsource-variable/montserrat" },
  { label: "Source Sans 3", style: "Sans serif", family: "Source Sans 3 Variable", packageName: "@fontsource-variable/source-sans-3" },
  { label: "Space Grotesk", style: "Geométrica", family: "Space Grotesk Variable", packageName: "@fontsource-variable/space-grotesk" },
  { label: "Manrope", style: "Sans moderna", family: "Manrope Variable", packageName: "@fontsource-variable/manrope" },
  { label: "Outfit", style: "Geométrica", family: "Outfit Variable", packageName: "@fontsource-variable/outfit" },
  { label: "Oswald", style: "Condensada", family: "Oswald Variable", packageName: "@fontsource-variable/oswald" },
  { label: "Archivo", style: "Sans serif", family: "Archivo Variable", packageName: "@fontsource-variable/archivo" },
  { label: "Lora", style: "Serifada", family: "Lora Variable", packageName: "@fontsource-variable/lora" },
  { label: "Playfair Display", style: "Serifada", family: "Playfair Display Variable", packageName: "@fontsource-variable/playfair-display" },
  { label: "Merriweather", style: "Serifada", family: "Merriweather Variable", packageName: "@fontsource-variable/merriweather" },
  { label: "Cormorant Garamond", style: "Serifada", family: "Cormorant Garamond Variable", packageName: "@fontsource-variable/cormorant-garamond" },
  { label: "Fira Code", style: "Monoespaçada", family: "Fira Code Variable", packageName: "@fontsource-variable/fira-code" },
  { label: "JetBrains Mono", style: "Monoespaçada", family: "JetBrains Mono Variable", packageName: "@fontsource-variable/jetbrains-mono" },
  { label: "Sistema", style: "Nativa do dispositivo", family: "system-ui", packageName: undefined },
] as const

const legacyFontNames: Record<string, string> = {
  Inter: "Inter Variable",
  "Nunito Sans": "Nunito Sans Variable",
  Roboto: "Roboto Variable",
}

export function normalizeProjectFont(value: unknown): string {
  if (typeof value !== "string") return "Inter Variable"
  const normalized = legacyFontNames[value] ?? value
  return projectFonts.some((font) => font.family === normalized)
    ? normalized
    : "Inter Variable"
}

export function projectFontPackage(value: unknown): string | undefined {
  const family = normalizeProjectFont(value)
  return projectFonts.find((font) => font.family === family)?.packageName
}

export interface ProjectTheme {
  presetId?: string
  preset: string
  mode: ThemeMode
  light: ThemePalette
  dark: ThemePalette
  headingFont: string
  bodyFont: string
  headingSize: number
  bodySize: number
  lineHeight: number
  letterSpacing: number
  radius: number
  shadow: number
}

const baseLight: ThemePalette = {
  primary: "#006dc8",
  secondary: "#f3f4f6",
  accent: "#cfe9fd",
  background: "#f3f4f6",
  foreground: "#111827",
  card: "#ffffff",
  border: "#e5e7eb",
  muted: "#5b6882",
  success: "#16803d",
  destructive: "#dc2626",
}

const baseDark: ThemePalette = {
  primary: "#009afc",
  secondary: "#282828",
  accent: "#303030",
  background: "#171717",
  foreground: "#f4f4f4",
  card: "#202020",
  border: "#383838",
  muted: "#b8b8b8",
  success: "#4ade80",
  destructive: "#f87171",
}

export const themePresets = {
  Base: {
    light: baseLight,
    dark: baseDark,
  },

  Slate: {
    light: {
      ...baseLight,
      primary: "#475569",
      accent: "#e2e8f0",
      background: "#f8fafc",
    },
    dark: {
      ...baseDark,
      primary: "#94a3b8",
      background: "#0f172a",
      card: "#1e293b",
    },
  },

  Arctic: {
    light: {
      ...baseLight,
      primary: "#0284c7",
      accent: "#e0f2fe",
      background: "#f0f9ff",
    },
    dark: {
      ...baseDark,
      primary: "#38bdf8",
      background: "#082f49",
      card: "#0c4a6e",
    },
  },

  Midnight: {
    light: {
      ...baseLight,
      primary: "#4338ca",
      accent: "#e0e7ff",
      background: "#eef2ff",
    },
    dark: {
      ...baseDark,
      primary: "#a5b4fc",
      background: "#111027",
      card: "#1e1b4b",
    },
  },

  Aurora: {
    light: {
      ...baseLight,
      primary: "#0d9488",
      accent: "#ccfbf1",
      background: "#f0fdfa",
    },
    dark: {
      ...baseDark,
      primary: "#5eead4",
      background: "#102522",
      card: "#163a34",
    },
  },

  "ITES Institucional": {
    light: {
      ...baseLight,
      primary: "#24724f",
      secondary: "#e8f1e9",
      accent: "#c78d26",
      background: "#f5f7ef",
      foreground: "#111827",
      card: "#ffffff",
      border: "#dbe5d9",
      muted: "#64748b",
    },
    dark: {
      ...baseDark,
      primary: "#24724f",
      secondary: "#173b2c",
      accent: "#c78d26",
      background: "#102018",
      foreground: "#f4f7f1",
      card: "#17271d",
      border: "#2d4936",
      muted: "#a8b9a6",
    },
  },
}

export function defaultProjectTheme(): ProjectTheme {
  return {
    preset: "Base",
    mode: "light",
    light: { ...baseLight },
    dark: { ...baseDark },
    headingFont: "Inter Variable",
    bodyFont: "Inter Variable",
    headingSize: 100,
    bodySize: 100,
    lineHeight: 1.5,
    letterSpacing: 0,
    radius: 8,
    shadow: 0,
  }
}

const hex = /^#[0-9a-fA-F]{6}$/
export function parseProjectTheme(
  value: unknown
): ProjectTheme | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const data = value as Record<string, unknown>

  const palette = (value: unknown): ThemePalette | null => {
    if (!value || typeof value !== "object") {
      return null
    }

    const colors = value as Record<string, unknown>

    return colorKeys.every(
      (key) =>
        typeof colors[key] === "string" &&
        hex.test(colors[key])
    )
      ? Object.fromEntries(
          colorKeys.map((key) => [key, colors[key]])
        ) as unknown as ThemePalette
      : null
  }

  const light = palette(data.light)
  const dark = palette(data.dark)

  if (!light || !dark) {
    return undefined
  }

  const base = defaultProjectTheme()

  return {
    ...base,
    light,
    dark,

    ...(typeof data.presetId === "string" &&
    /^[0-9a-fA-F-]{36}$/.test(data.presetId)
      ? { presetId: data.presetId }
      : {}),

    preset:
      typeof data.preset === "string" && data.preset.length < 40
        ? data.preset
        : "Custom",

    mode: data.mode === "dark" ? "dark" : "light",

    headingFont: normalizeProjectFont(data.headingFont),

    bodyFont: normalizeProjectFont(data.bodyFont),

    headingSize: numberIn(
      data.headingSize,
      75,
      150,
      base.headingSize
    ),

    bodySize: numberIn(
      data.bodySize,
      75,
      150,
      base.bodySize
    ),

    lineHeight: numberIn(
      data.lineHeight,
      1,
      2,
      base.lineHeight
    ),

    letterSpacing: numberIn(
      data.letterSpacing,
      -2,
      4,
      base.letterSpacing
    ),

    radius: numberIn(
      data.radius,
      0,
      32,
      base.radius
    ),

    shadow: numberIn(
      data.shadow,
      0,
      32,
      base.shadow
    ),
  }
}

function numberIn(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : fallback
}

export function themeVariables(
  theme: ProjectTheme
): CSSProperties {
  const colors = theme[theme.mode]

  return {
    "--background": colors.background,
    "--foreground": colors.foreground,

    "--card": colors.card,
    "--card-foreground": colors.foreground,

    "--popover": colors.card,
    "--popover-foreground": colors.foreground,

    "--primary": colors.primary,
    "--primary-foreground":
      theme.mode === "dark" ? "#0b1420" : "#ffffff",

    "--secondary": colors.secondary,
    "--secondary-foreground": colors.foreground,

    "--accent": colors.accent,
    "--accent-foreground": colors.foreground,

    "--muted": colors.secondary,
    "--muted-foreground": colors.muted,

    "--border": colors.border,
    "--input": colors.border,
    "--ring": colors.primary,
    "--destructive": colors.destructive,

    "--builder-heading-font":
      `"${normalizeProjectFont(theme.headingFont)}", system-ui, sans-serif`,

    "--builder-body-font":
      `"${normalizeProjectFont(theme.bodyFont)}", system-ui, sans-serif`,

    "--builder-heading-scale": `${theme.headingSize / 100}`,
    "--builder-body-scale": `${theme.bodySize / 100}`,
    "--builder-line-height": `${theme.lineHeight}`,
    "--builder-letter-spacing": `${theme.letterSpacing}px`,
    "--builder-radius": `${theme.radius}px`,

    "--builder-shadow": theme.shadow
      ? `0 ${Math.round(theme.shadow / 2)}px ${theme.shadow * 2}px #00000025`
      : "none",

    colorScheme: theme.mode,
  } as CSSProperties
}

export function themeCss(theme: ProjectTheme) {
  const palette = (mode: ThemeMode) => {
    const colors = theme[mode]

    return [
      ...colorKeys.map(
        (key) => `  --${key}: ${colors[key]};`
      ),

      `  --card-foreground: ${colors.foreground};`,
      `  --popover: ${colors.card};`,
      `  --popover-foreground: ${colors.foreground};`,

      `  --primary-foreground: ${mode === "dark" ? "#0b1420" : "#ffffff"};`,

      `  --secondary-foreground: ${colors.foreground};`,
      `  --accent-foreground: ${colors.foreground};`,

      `  --muted: ${colors.secondary};`,
      `  --muted-foreground: ${colors.muted};`,

      `  --input: ${colors.border};`,
      `  --ring: ${colors.primary};`,

      `  color-scheme: ${mode};`,
    ].join("\n")
  }

  return `:root {\n${palette(theme.mode)}\n  --radius: ${theme.radius}px;\n  --builder-shadow: ${theme.shadow ? `0 ${Math.round(theme.shadow / 2)}px ${theme.shadow * 2}px #00000025` : "none"};\n  --builder-heading-font: "${normalizeProjectFont(theme.headingFont)}", system-ui, sans-serif;\n  --builder-body-font: "${normalizeProjectFont(theme.bodyFont)}", system-ui, sans-serif;\n  --builder-heading-scale: ${theme.headingSize / 100};\n  --builder-body-scale: ${theme.bodySize / 100};\n  --builder-line-height: ${theme.lineHeight};\n  --builder-letter-spacing: ${theme.letterSpacing}px;\n}\n.dark {\n${palette("dark")}\n}`
}
