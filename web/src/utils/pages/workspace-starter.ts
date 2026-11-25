import type { PageTemplate } from "./types"

export const WorkspaceStarterPage: PageTemplate = {
  order: 12,
  name: "Workspace Starter",
  blocks: [
    "dashboard-tabs",
    "notifications-inbox",
    "onboarding-checklist",
    "settings-preferences",
  ],
}
