import type { PageTemplate } from "./types"

export const ProjectManagementPage: PageTemplate = {
  order: 23,
  name: "Project Management",
  navbar: "navbar-actions",
  blocks: [
    "application-shell",
    "dashboard-classic",
    "issue-list",
    "calendar-interactive",
    "activity-feed",
  ],
}
