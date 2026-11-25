import assert from "node:assert/strict"
import test from "node:test"
import { resolveOrganizationSelection } from "../src/context/organization/organization-selection"
import type { OrganizationMembership } from "../src/services/organizations/organization.service"
import { organizationViewState } from "../src/context/organization/organization-view-state"
import { organizationRequestHeaders, ORGANIZATION_PREFERENCE_KEY } from "../src/services/organizations/organization.service"

const organizations: OrganizationMembership[] = [
  { id: "org-default", name: "Pessoal", role: "OWNER", isDefault: true },
  { id: "org-team", name: "Equipe", role: "MEMBER", isDefault: false },
]

test("mantém preferência salva quando ainda há membership", () => {
  const result = resolveOrganizationSelection(organizations, "org-team")
  assert.equal(result.selected?.id, "org-team")
  assert.equal(result.invalidSavedPreference, false)
})

test("usa a organização padrão quando a preferência salva é inválida", () => {
  const result = resolveOrganizationSelection(organizations, "org-revoked")
  assert.equal(result.selected?.id, "org-default")
  assert.equal(result.invalidSavedPreference, true)
})

test("representa a conta sem organizações", () => {
  const result = resolveOrganizationSelection([], null)
  assert.equal(result.selected, null)
  assert.equal(result.invalidSavedPreference, false)
})

test("mapeia os estados de carregamento, erro, vazio e sucesso da interface", () => {
  assert.equal(organizationViewState("loading", []), "loading")
  assert.equal(organizationViewState("error", []), "error")
  assert.equal(organizationViewState("ready", []), "empty")
  assert.equal(organizationViewState("ready", organizations), "ready")
})

test("envia como cabeçalho o contexto escolhido na preferência local", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => key === ORGANIZATION_PREFERENCE_KEY ? "org-team" : null },
  })
  try {
    assert.deepEqual(organizationRequestHeaders(), { "X-Organization-Id": "org-team" })
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original)
    else Reflect.deleteProperty(globalThis, "localStorage")
  }
})
