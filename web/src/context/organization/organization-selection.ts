import type { OrganizationMembership } from "@/services/organizations/organization.service"

export function resolveOrganizationSelection(
  organizations: OrganizationMembership[],
  savedId: string | null,
) {
  const selected = organizations.find((organization) => organization.id === savedId)
    ?? organizations.find((organization) => organization.isDefault)
    ?? organizations[0]
    ?? null
  return {
    selected,
    invalidSavedPreference: savedId !== null && !organizations.some((organization) => organization.id === savedId),
  }
}
