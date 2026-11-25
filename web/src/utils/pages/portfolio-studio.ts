import type { PageTemplate } from "./types"
import { themePresets } from "@/pages/editor/lib/project-theme"

export const PortfolioStudioPage: PageTemplate = {
  order: 28,
  name: "Portfólio imersivo",
  navbar: "navbar-editorial-dock",
  blocks: ["profile-hero", "profile-about", "profile-experience", "profile-projects", "institutional-contact"],
  theme: {
    preset: "ITES Institucional",
    mode: "dark",
    light: { ...themePresets["ITES Institucional"].light },
    dark: { ...themePresets["ITES Institucional"].dark },
    headingFont: "Roboto Variable",
    bodyFont: "Nunito Sans Variable",
    headingSize: 100,
    bodySize: 100,
    lineHeight: 1.5,
    letterSpacing: 0,
    radius: 8,
    shadow: 10,
  },
}
