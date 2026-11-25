import type { OrganizationMembership } from "@/services/organizations/organization.service"

export function organizationViewState(
  requestState: "loading" | "ready" | "error",
  organizations: OrganizationMembership[],
) {
  if (requestState === "loading") return "loading"
  if (requestState === "error") return "error"
  return organizations.length === 0 ? "empty" : "ready"
}
