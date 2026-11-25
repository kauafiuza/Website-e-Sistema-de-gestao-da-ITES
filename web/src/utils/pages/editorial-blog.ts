import type { PageTemplate } from "./types"
import { themePresets } from "@/pages/editor/lib/project-theme"

export const EditorialBlogPage: PageTemplate = {
  order: 26,
  name: "Blog",
  navbar: "navbar-editorial-dock",
  navbarItems: [
    { id: "editorial-blog-nav-home", title: "Início", description: "", href: "/", value: "home", features: [] },
    { id: "editorial-blog-nav-list", title: "Artigos", description: "", href: "#artigos", value: "blog", features: [] },
    { id: "editorial-blog-nav-contact", title: "Contato", description: "", href: "#contato", value: "contact", features: [] },
  ],
  blocks: ["editorial-blog-index", "institutional-contact"],
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
