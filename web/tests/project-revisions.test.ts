import assert from "node:assert/strict"
import test from "node:test"
import {
  listProjectRevisions,
  ProjectError,
  restoreProjectRevision,
} from "../src/services/projects/project.service"

test("consulta histórico paginado e restaura pela identidade da versão", async () => {
  const originalFetch = globalThis.fetch
  const requests: { url: string; method: string; authorization: string | null }[] = []
  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers)
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      authorization: headers.get("Authorization"),
    })
    if (init?.method === "POST") {
      return new Response(JSON.stringify({ id: "project-1", revision: 4 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
    return new Response(JSON.stringify({
      items: [{ id: "revision-id-2", revision: 2, createdAt: "2030-01-02T00:00:00Z" }],
      page: 1,
      size: 1,
      totalElements: 2,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    }), { status: 200, headers: { "Content-Type": "application/json" } })
  }

  try {
    const history = await listProjectRevisions("access-token", "project/1", 1, 1)
    assert.equal(history.items[0]?.id, "revision-id-2")
    assert.equal(history.hasPrevious, true)
    const restored = await restoreProjectRevision("access-token", "project/1", "revision-id-2")
    assert.equal(restored.revision, 4)
    assert.deepEqual(requests, [
      {
        url: "/api/projects/project%2F1/revisions?page=1&size=1",
        method: "GET",
        authorization: "Bearer access-token",
      },
      {
        url: "/api/projects/project%2F1/revisions/revision-id-2/restore",
        method: "POST",
        authorization: "Bearer access-token",
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("preserva a negação de permissão ao restaurar uma versão", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(null, { status: 403 })
  try {
    await assert.rejects(restoreProjectRevision("access-token", "project-1", "revision-id-1"),
      (error: unknown) => error instanceof ProjectError && error.status === 403)
  } finally {
    globalThis.fetch = originalFetch
  }
})
