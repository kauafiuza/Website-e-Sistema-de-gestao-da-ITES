import type { GrantScopeType, PermissionGrant } from "./organization.service"

export function delegableGrantParents(grants: PermissionGrant[], userId: string, now = Date.now()) {
  return grants.filter((grant) => grant.beneficiaryUserId === userId
    && grant.state === "ACTIVE"
    && grant.canDelegate
    && (!grant.validUntil || Date.parse(grant.validUntil) > now))
}

export function scopesAllowedBy(parent: Pick<PermissionGrant, "scopeType"> | null): GrantScopeType[] {
  if (!parent) return []
  return parent.scopeType === "ORGANIZATION"
    ? ["ORGANIZATION", "PROJECT", "THEME"]
    : [parent.scopeType]
}

export function validityAllowedByParent(parent: PermissionGrant, childUntil: string | null, now = Date.now()) {
  if (childUntil && Date.parse(childUntil) <= now) return false
  if (!parent.validUntil) return true
  return childUntil !== null && Date.parse(childUntil) <= Date.parse(parent.validUntil)
}

export function exportAuthorityGrants(grants: PermissionGrant[], userId: string, now = Date.now()) {
  return grants.filter((grant) => grant.beneficiaryUserId === userId
    && grant.action === "ORGANIZATION_GRANTS_MANAGE"
    && grant.scopeType === "ORGANIZATION"
    && grant.state === "ACTIVE"
    && grant.canDelegate
    && (!grant.validUntil || Date.parse(grant.validUntil) > now))
}

export function exportValidityAllowedByAuthority(authority: PermissionGrant, childUntil: string | null, now = Date.now()) {
  if (childUntil && Date.parse(childUntil) <= now) return false
  if (!authority.validUntil) return true
  return childUntil !== null && Date.parse(childUntil) <= Date.parse(authority.validUntil)
}
