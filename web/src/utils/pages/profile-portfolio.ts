import type { PageTemplate } from "./types"

export const ProfilePortfolioPage: PageTemplate = {
  order: 25,
  name: "Portfolio",
  navbar: "navbar-dock",
  blocks: [
    "portfolio-hero",
    "portfolio-about",
    "portfolio-experience",
    "portfolio-projects",
    "blog-index",
    "footer-classic",
    "back-to-top",
  ],
}
