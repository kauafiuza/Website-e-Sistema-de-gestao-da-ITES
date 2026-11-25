import type { PageTemplate } from "./types"

export const AboutPage: PageTemplate = {
  order: 4,
  name: "About",
  navbar: "navbar-classic",
  blocks: [
    "about-classic",
    "team-classic",
    "timeline-classic",
    "footer-split",
  ],
}
