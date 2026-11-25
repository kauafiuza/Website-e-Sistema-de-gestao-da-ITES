import type { ProjectTheme } from "@/pages/editor/lib/project-theme"

export function ThemePaletteThumb({ theme }: { theme: ProjectTheme }) {
  const colors = theme[theme.mode]

  return (
    <span
      className="flex h-10 overflow-hidden rounded-md border border-border"
      style={{ backgroundColor: colors.background }}
      aria-hidden="true"
    >
      <span
        className="m-1.5 w-2 rounded-sm"
        style={{ backgroundColor: colors.primary }}
      />
      <span
        className="my-1.5 mr-1.5 flex-1 rounded-sm border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      />
      <span
        className="my-1.5 mr-1.5 w-5 rounded-sm"
        style={{ backgroundColor: colors.accent }}
      />
    </span>
  )
}
