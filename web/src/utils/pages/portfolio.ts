import type { PageTemplate } from "./types"

export const PortfolioPage: PageTemplate = {
  order: 18,
  name: "Portfolio",
  navbar: "navbar-classic",
  blocks: [
    "projects-grid",
    "project-showcase",
    "testimonials-editorial",
    "cta-split",
    "footer-classic",
  ],
}
