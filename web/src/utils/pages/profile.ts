import type { PageTemplate } from "./types"

export const ProfilePage: PageTemplate = {
  order: 13,
  name: "Profile",
  navbar: "navbar-actions",
  blocks: [
    "profile-tabs",
    "activity-feed",
    "footer-directory",
  ],
}
