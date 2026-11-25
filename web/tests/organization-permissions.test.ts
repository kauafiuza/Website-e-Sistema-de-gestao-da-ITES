import assert from "node:assert/strict"
import test from "node:test"
import {
  delegableGrantParents,
  exportAuthorityGrants,
  exportValidityAllowedByAuthority,
  scopesAllowedBy,
  validityAllowedByParent,
} from "../src/services/organizations/organization-permissions"
import {
  listOrganizationMembers,
  listOrganizationFeatures,
  OrganizationRequestError,
  type PermissionGrant,
} from "../src/services/organizations/organization.service"
import { exportFormSubmissions } from "../src/services/projects/publication.service"

const now = Date.parse("2030-01-01T00:00:00.000Z")

function grant(overrides: Partial<PermissionGrant> = {}): PermissionGrant {
  return {
    id: "grant-1",
    beneficiaryUserId: "actor",
    organizationId: "org-1",
    action: "PROJECT_READ",
    scopeType: "ORGANIZATION",
    scopeId: "org-1",
    issuerUserId: "owner",
    validUntil: null,
    state: "ACTIVE",
    canDelegate: true,
    parentGrantId: null,
    authorityGrantId: null,
    createdAt: "2029-01-01T00:00:00Z",
    revokedAt: null,
    ...overrides,
  }
}

test("disponibiliza somente grants ativos, próprios e delegáveis", () => {
  const eligible = grant()
  const result = delegableGrantParents([
    eligible,
    grant({ id: "other-user", beneficiaryUserId: "someone-else" }),
    grant({ id: "not-delegable", canDelegate: false }),
    grant({ id: "revoked", state: "REVOKED" }),
    grant({ id: "expired", validUntil: "2029-12-31T23:59:00Z" }),
  ], "actor", now)
  assert.deepEqual(result.map((item) => item.id), [eligible.id])
})

test("escopo de organização pode ser reduzido, recurso permanece no mesmo escopo", () => {
  assert.deepEqual(scopesAllowedBy(grant({ scopeType: "ORGANIZATION" })), ["ORGANIZATION", "PROJECT", "THEME"])
  assert.deepEqual(scopesAllowedBy(grant({ scopeType: "PROJECT" })), ["PROJECT"])
  assert.deepEqual(scopesAllowedBy(grant({ scopeType: "THEME" })), ["THEME"])
  assert.deepEqual(scopesAllowedBy(null), [])
})

test("validade do grant derivado não pode superar a validade do pai", () => {
  const parent = grant({ validUntil: "2030-01-02T00:00:00Z" })
  assert.equal(validityAllowedByParent(parent, "2030-01-01T12:00:00Z", now), true)
  assert.equal(validityAllowedByParent(parent, "2030-01-03T00:00:00Z", now), false)
  assert.equal(validityAllowedByParent(parent, null, now), false)
  assert.equal(validityAllowedByParent(grant(), null, now), true)
  assert.equal(validityAllowedByParent(grant(), "2029-12-31T23:59:00Z", now), false)
})

test("autoridade de exportação exige grant de gestão próprio, ativo, organizacional e delegável", () => {
  const eligible = grant({ action: "ORGANIZATION_GRANTS_MANAGE" })
  const result = exportAuthorityGrants([
    eligible,
    grant({ id: "other-action", action: "PROJECT_READ" }),
    grant({ id: "other-user", action: "ORGANIZATION_GRANTS_MANAGE", beneficiaryUserId: "other" }),
    grant({ id: "project-scope", action: "ORGANIZATION_GRANTS_MANAGE", scopeType: "PROJECT" }),
    grant({ id: "not-delegable", action: "ORGANIZATION_GRANTS_MANAGE", canDelegate: false }),
    grant({ id: "revoked", action: "ORGANIZATION_GRANTS_MANAGE", state: "REVOKED" }),
    grant({ id: "expired", action: "ORGANIZATION_GRANTS_MANAGE", validUntil: "2029-12-31T23:59:00Z" }),
  ], "actor", now)
  assert.deepEqual(result.map((item) => item.id), [eligible.id])
})

test("validade da exportação não pode ultrapassar a autoridade de gestão", () => {
  const authority = grant({ action: "ORGANIZATION_GRANTS_MANAGE", validUntil: "2030-01-02T00:00:00Z" })
  assert.equal(exportValidityAllowedByAuthority(authority, "2030-01-01T12:00:00Z", now), true)
  assert.equal(exportValidityAllowedByAuthority(authority, "2030-01-03T00:00:00Z", now), false)
  assert.equal(exportValidityAllowedByAuthority(authority, null, now), false)
  assert.equal(exportValidityAllowedByAuthority(grant({ action: "ORGANIZATION_GRANTS_MANAGE" }), null, now), true)
})

test("preserva status 401/403 e erro de validação nos serviços da organização", async () => {
  const originalFetch = globalThis.fetch
  for (const status of [401, 403, 400]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: "Erro de contrato" }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
    await assert.rejects(listOrganizationMembers("token", "org-1"), (error: unknown) => {
      assert.ok(error instanceof OrganizationRequestError)
      assert.equal(error.status, status)
      return true
    })
  }
  globalThis.fetch = originalFetch
})

test("consulta catálogo versionado da organização no contrato de disponibilidade", async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ""
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return new Response(JSON.stringify([{
      featureKey: "PROJECTS",
      version: 1,
      name: "Projetos",
      description: "Criação e leitura de projetos.",
      enabled: false,
    }]), { status: 200, headers: { "Content-Type": "application/json" } })
  }
  try {
    const result = await listOrganizationFeatures("token", "org/1")
    assert.equal(requestedUrl, "/api/organizations/org%2F1/features")
    assert.equal(result[0]?.version, 1)
    assert.equal(result[0]?.enabled, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("exportação de respostas comunica sessão, autoridade e validação", async () => {
  const originalFetch = globalThis.fetch
  for (const [status, expected] of [
    [401, "sessão expirou"],
    [403, "permissão para exportar"],
    [400, "Revise os dados"],
  ] as const) {
    globalThis.fetch = async () => new Response(null, { status })
    await assert.rejects(exportFormSubmissions("token", "project-1"), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.ok(error.message.includes(expected))
      return true
    })
  }
  globalThis.fetch = originalFetch
})
