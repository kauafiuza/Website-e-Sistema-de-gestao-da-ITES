import { test } from "node:test"
import assert from "node:assert/strict"
import {
  initialDocument,
  reduceDocument,
  parseDocument,
  uid,
  builderDraftStorageKey,
  projectDraftStorageKey,
  builderPreviewStorageKey,
} from "../src/pages/editor/lib/document"
import { registry } from "../src/utils/blocks"
import { parseBlockProps } from "../src/utils/blocks/types"
import { copyTemplateBlocks, organizationTemplateOrigin } from "../src/pages/editor/lib/templates"

test("local editor drafts and previews are isolated by account and organization", () => {
  const userId = "user-one"
  const organizationId = "organization-one"
  assert.notEqual(builderDraftStorageKey(userId, organizationId), builderDraftStorageKey(userId, "organization-two"))
  assert.notEqual(builderDraftStorageKey(userId, organizationId), builderDraftStorageKey("user-two", organizationId))
  assert.notEqual(projectDraftStorageKey(userId, "project-one"),
    projectDraftStorageKey("user-two", "project-one"))
  assert.notEqual(projectDraftStorageKey(userId, "project-one"),
    projectDraftStorageKey(userId, "project-two"))
  assert.notEqual(builderPreviewStorageKey(userId, organizationId, "preview-one"),
    builderPreviewStorageKey(userId, "organization-two", "preview-one"))
})

test("page and block operations preserve identity, configuration and unrelated pages", () => {
  let doc = initialDocument()
  const first = doc.activePageId
  for (const definitionId of [
    "hero-classic",
    "features-classic",
    "faq-classic",
  ])
    doc = reduceDocument(doc, { type: "add", id: uid(), definitionId })
  const id = doc.pages[0].blocks[0].id
  doc = reduceDocument(doc, {
    type: "update",
    id,
    props: { title: "Custom title" },
  })
  doc = reduceDocument(doc, { type: "move", id, index: 2 })
  doc = reduceDocument(doc, { type: "replace", id })
  assert.equal(doc.pages[0].blocks[2].id, id)
  assert.equal(doc.pages[0].blocks[2].definitionId, "hero-split")
  assert.equal(doc.pages[0].blocks[2].props.title, "Custom title")
  doc = reduceDocument(doc, { type: "create", id: uid(), name: "Second" })
  const second = doc.activePageId
  doc = reduceDocument(doc, {
    type: "add",
    id: uid(),
    definitionId: "faq-classic",
  })
  doc = reduceDocument(doc, { type: "rename", id: second, name: "Questions" })
  doc = reduceDocument(doc, { type: "switch", id: first })
  doc = reduceDocument(doc, { type: "clear" })
  assert.equal(doc.pages[0].blocks.length, 0)
  assert.equal(doc.pages[1].blocks.length, 1)
  assert.deepEqual(parseDocument(JSON.stringify(doc)), doc)
  doc = reduceDocument(doc, { type: "delete", id: first })
  assert.equal(doc.activePageId, second)
  assert.deepEqual(reduceDocument(doc, { type: "delete", id: second }), doc)
})
test("persistence rejects corruption and future versions", () => {
  for (const raw of ["{", "{}", "null", '{"version":2,"pages":[]}'])
    assert.equal(parseDocument(raw), null)
  const doc = initialDocument()
  doc.pages[0].blocks = [
    {
      id: doc.pages[0].id,
      definitionId: registry[0].id,
      props: registry[0].defaults,
    },
  ]
  assert.equal(parseDocument(JSON.stringify(doc)), null)
})

test("document contract rejects invalid page composition and known block properties", () => {
  const document = initialDocument()
  const duplicateRoute = structuredClone(document)
  duplicateRoute.pages.push({
    id: "second-page",
    name: "Second",
    slug: duplicateRoute.pages[0].slug,
    blocks: [],
  })
  assert.equal(parseDocument(JSON.stringify(duplicateRoute)), null)

  const invalidParent = structuredClone(document)
  invalidParent.pages[0].parentPageId = "missing-page"
  assert.equal(parseDocument(JSON.stringify(invalidParent)), null)

  const invalidName = structuredClone(document)
  invalidName.pages[0].name = "   "
  assert.equal(parseDocument(JSON.stringify(invalidName)), null)

  const invalidBlock = structuredClone(document)
  invalidBlock.pages[0].blocks = [{
    id: "known-block",
    definitionId: "hero-classic",
    props: { ...registry.find((definition) => definition.id === "hero-classic")!.defaults, layoutWidth: "unsupported" },
  }]
  assert.equal(parseDocument(JSON.stringify(invalidBlock)), null)
})

test("known block extensions and valid optional properties survive parsing", () => {
  const document = initialDocument()
  const definition = registry.find((item) => item.id === "hero-classic")!
  const extension = { source: "newer-editor", nested: { enabled: true } }
  document.futureDocumentMetadata = extension
  document.pages[0].futurePageMetadata = extension
  document.pages[0].blocks = [{
    id: "known-block",
    definitionId: definition.id,
    futureMetadata: extension,
    props: {
      ...definition.defaults,
      accentColor: "#123abc",
      extensionPayload: extension,
    },
  }]

  const parsed = parseDocument(JSON.stringify(document))
  assert.deepEqual(parsed?.futureDocumentMetadata, extension)
  assert.deepEqual(parsed?.pages[0].futurePageMetadata, extension)
  assert.deepEqual(parsed?.pages[0].blocks[0].futureMetadata, extension)
  assert.deepEqual(parsed?.pages[0].blocks[0].props.extensionPayload, extension)
  assert.equal(parsed?.pages[0].blocks[0].props.accentColor, "#123abc")
  assert.deepEqual(parseDocument(JSON.stringify(parsed)), parsed)
})

test("every registered block manifest has defaults accepted by the property contract", () => {
  for (const definition of registry)
    assert.ok(parseBlockProps(definition.defaults, definition.defaults), definition.id)
})

test("unknown blocks and navbars retain opaque payloads through parse and save", () => {
  const document = initialDocument()
  const unknownBlock = {
    id: "future-block",
    definitionId: "hero-from-newer-catalog",
    props: { title: "Keep me", nested: { values: [1, false, null] } },
    futureMetadata: { source: "new-catalog" },
  }
  const unknownNavbar = {
    id: "future-navbar",
    definitionId: "navbar-from-newer-catalog",
    props: { links: [{ id: "docs", href: "/docs" }], config: { mode: "compact" } },
    futureMetadata: "preserve",
  }
  const source = {
    ...document,
    pages: [{ ...document.pages[0], blocks: [unknownBlock as never] }],
    navbar: unknownNavbar,
  }
  const parsed = parseDocument(JSON.stringify(source))
  assert.deepEqual(parsed?.pages[0].blocks[0], unknownBlock)
  assert.deepEqual(parsed?.navbar, unknownNavbar)
  assert.deepEqual(parseDocument(JSON.stringify(parsed)), parsed)
})

test("unknown block payloads survive unrelated editor actions; clear keeps them and remove is explicit", () => {
  let document = initialDocument()
  const unknown = {
    id: "future-block",
    definitionId: "hero-from-newer-catalog",
    props: { payload: ["opaque", { keep: true }] },
  }
  document.pages[0].blocks = [
    {
      id: "known-block",
      definitionId: "hero-classic",
      props: registry.find((item) => item.id === "hero-classic")!.defaults,
    },
    unknown as never,
  ]
  const unknownNavbar = {
    id: "future-navbar",
    definitionId: "navbar-from-newer-catalog",
    props: { links: [{ href: "/external" }] },
  }
  document.navbar = unknownNavbar as never

  const preserved = JSON.stringify(unknown)
  document = reduceDocument(document, {
    type: "update",
    id: unknown.id,
    props: { title: "changed" },
  })
  assert.equal(JSON.stringify(document.pages[0].blocks[1]), preserved)
  document = reduceDocument(document, { type: "move", id: unknown.id, index: 0 })
  assert.equal(JSON.stringify(document.pages[0].blocks[0]), preserved)
  document = reduceDocument(document, {
    type: "rename",
    id: document.pages[0].id,
    name: "Renamed",
  })
  document = reduceDocument(document, { type: "create", id: "second-page", name: "Second" })
  assert.deepEqual(document.navbar, unknownNavbar)
  document = reduceDocument(document, {
    type: "add",
    id: "new-navbar",
    definitionId: "navbar-classic",
  })
  assert.deepEqual(document.navbar, unknownNavbar)
  document = reduceDocument(document, { type: "switch", id: document.pages[0].id })
  document = reduceDocument(document, { type: "clear" })
  assert.deepEqual(document.pages[0].blocks, [unknown])
  assert.deepEqual(parseDocument(JSON.stringify(document))?.pages[0].blocks, [unknown])
  document = reduceDocument(document, { type: "remove", id: unknown.id })
  assert.deepEqual(document.pages[0].blocks, [])
  document = reduceDocument(document, {
    type: "remove",
    id: unknownNavbar.id,
  })
  assert.equal(document.navbar, undefined)
})

test("malformed unknown payloads and duplicate unknown IDs are rejected", () => {
  const document = initialDocument()
  const invalidProps = structuredClone(document)
  invalidProps.pages[0].blocks = [{ id: "future", definitionId: "unknown", props: [] }] as never
  assert.equal(parseDocument(JSON.stringify(invalidProps)), null)

  const invalidNavbar = { ...document, navbar: { id: "future-nav", definitionId: "unknown-navbar", props: null } }
  assert.equal(parseDocument(JSON.stringify(invalidNavbar)), null)

  const duplicateNavbarId = {
    ...document,
    pages: [{ ...document.pages[0], blocks: [{ id: "same", definitionId: "unknown-block", props: {} }] }],
    navbar: { id: "same", definitionId: "unknown-navbar", props: {} },
  }
  assert.equal(parseDocument(JSON.stringify(duplicateNavbarId)), null)
})
test("300 instances remain unique through repeated moves and restore", () => {
  let doc = initialDocument()
  const pageDefinitions = registry.filter(
    (definition) => definition.category !== "navbar" && definition.category !== "footer"
  )
  for (let i = 0; i < 300; i++)
    doc = reduceDocument(doc, {
      type: "add",
      id: uid(),
      definitionId: pageDefinitions[i % pageDefinitions.length].id,
    })
  const navbar = registry.find((definition) => definition.category === "navbar")
  if (navbar) {
    const navbarId = uid()
    doc = reduceDocument(doc, {
      type: "add",
      id: navbarId,
      definitionId: navbar.id,
    })
    assert.equal(doc.navbar?.id, navbarId)
  }
  const footer = registry.find((definition) => definition.category === "footer")
  if (footer) {
    const footerId = uid()
    doc = reduceDocument(doc, {
      type: "add",
      id: footerId,
      definitionId: footer.id,
    })
    assert.equal(doc.footer?.id, footerId)
  }
  for (let i = 0; i < 100; i++)
    doc = reduceDocument(doc, {
      type: "move",
      id: doc.pages[0].blocks[0].id,
      index: 299,
    })
  assert.equal(new Set(doc.pages[0].blocks.map((b) => b.id)).size, 300)
  assert.deepEqual(parseDocument(JSON.stringify(doc)), doc)
})

test("legacy projects, portable documents and templates retain independent identities", () => {
  const document = initialDocument()
  const legacy = {
    version: document.version,
    activePageId: document.activePageId,
    pages: document.pages,
  }
  assert.equal(parseDocument(JSON.stringify(legacy))?.name, "Untitled")
  const renamed = reduceDocument(document, {
    type: "project-name",
    name: "Example project",
  })
  assert.equal(parseDocument(JSON.stringify(renamed))?.name, "Example project")
  const loaded = reduceDocument(document, { type: "load", document: renamed })
  assert.deepEqual(loaded, renamed)
})

test("registered categories and templates contain real renderable definitions", async () => {
  const { categories } = await import("../src/utils/blocks")
  const { blockComponents } = await import("../src/utils/blocks")
  const { templates, templateBlocks } =
    await import("../src/pages/editor/lib/templates")
  const { createElement } = await import("react")
  const { renderToStaticMarkup } = await import("react-dom/server")
  assert.equal(
    new Set(registry.map((definition) => definition.id)).size,
    registry.length
  )
  for (const category of categories)
    assert.ok(
      registry.some((definition) => definition.group === category.id),
      category.name
    )
  for (const definition of registry) {
    assert.equal(
      definition.component,
      blockComponents[definition.id as keyof typeof blockComponents],
      definition.id
    )
    const html = renderToStaticMarkup(
      createElement(definition.component, {
        category: definition.category,
        variant: definition.variant,
        props: definition.defaults,
      })
    )
    assert.ok(html.trim().length > 0, definition.id)
  }
  for (const template of templates) {
    const first = templateBlocks(template.blocks),
      second = templateBlocks(template.blocks)
    assert.equal(first.length, template.blocks.length)
    assert.equal(
      new Set([...first, ...second].map((block) => block.id)).size,
      first.length * 2
    )
  }
})

test("every block group supports a component with its own export source", async () => {
  const { definitions } = await import("../src/utils/blocks")
  for (const [group, id] of [
    ["sections", "error-classic"],
    ["navbars", "navbar-classic"],
    ["forms", "waitlist-classic"],
    ["footers", "footer-classic"],
    ["applications", "empty-start"],
  ]) {
    const definition = definitions.get(id)
    assert.equal(definition?.export.sourceFile, `${group}/${id}/${id}.tsx`)
    assert.equal(definition?.export.componentName, definition?.component.name)
  }
})

test("typed repeated items and optional properties survive variants, reordering and legacy restore", () => {
  let doc = initialDocument()
  doc = reduceDocument(doc, {
    type: "add",
    id: "faq-instance",
    definitionId: "faq-classic",
  })
  const original = doc.pages[0].blocks[0].props.items!
  const originalTitle = original[1].title
  const items = [
    {
      ...original[1],
      title: "Can we configure this?",
      description: "Yes, including exported content.",
    },
    original[0],
  ]
  doc = reduceDocument(doc, {
    type: "update",
    id: "faq-instance",
    props: { items, alignment: "left", appearance: "tinted" },
  })
  doc = reduceDocument(doc, { type: "replace", id: "faq-instance" })
  assert.equal(doc.pages[0].blocks[0].definitionId, "faq-support")
  assert.deepEqual(doc.pages[0].blocks[0].props.items, items)
  assert.deepEqual(parseDocument(JSON.stringify(doc)), doc)
  assert.equal(original[1].title, originalTitle)
  const malformed = structuredClone(doc)
  malformed.pages[0].blocks[0].props.items![1].id = items[0].id
  assert.equal(parseDocument(JSON.stringify(malformed)), null)
  const invalid = JSON.parse(JSON.stringify(doc))
  invalid.pages[0].blocks[0].props.items[0].features = [42]
  assert.equal(parseDocument(JSON.stringify(invalid)), null)
  const legacy = structuredClone(doc)
  delete legacy.pages[0].blocks[0].props.items
  assert.ok(
    parseDocument(JSON.stringify(legacy))?.pages[0].blocks[0].props.items
      ?.length
  )
})

test("configured form fields retain identities and reject duplicate options", () => {
  let doc = initialDocument()
  doc = reduceDocument(doc, { type: "add", id: "form-one", definitionId: "form-classic" })
  const fields = [
    { id: "email", label: "Seu e-mail", type: "email" as const, required: true },
    { id: "interest", label: "Interesse", type: "select" as const, required: true, options: [{ id: "alpha", label: "Opção A" }, { id: "beta", label: "Opção B" }] },
  ]
  doc = reduceDocument(doc, { type: "update", id: "form-one", props: { formFields: fields } })
  assert.deepEqual(parseDocument(JSON.stringify(doc))?.pages[0].blocks[0].props.formFields, fields)
  const invalid = structuredClone(doc)
  invalid.pages[0].blocks[0].props.formFields![1].options![1].id = "alpha"
  assert.equal(parseDocument(JSON.stringify(invalid)), null)
})

test("template insertion clones blocks and preserves a stable source version", () => {
  const source = {
    id: "source-block",
    definitionId: "future-block",
    props: { title: "Conteúdo original", nested: { enabled: true } },
    futureMetadata: { preserved: true },
  }
  const copied = copyTemplateBlocks([source])[0]
  assert.notEqual(copied.id, source.id)
  assert.equal(copied.definitionId, source.definitionId)
  assert.deepEqual(copied.futureMetadata, source.futureMetadata)
  copied.props.title = "Cópia editada"
  assert.equal(source.props.title, "Conteúdo original")

  const origin = organizationTemplateOrigin({
    id: "template-1",
    name: "Modelo",
    versionId: "version-2",
    version: 2,
    content: { blocks: [source] },
    createdBy: "author-1",
    versionCreatedBy: "author-1",
    createdAt: "2026-01-01T00:00:00Z",
    versionCreatedAt: "2026-02-01T00:00:00Z",
  })
  const document = reduceDocument(initialDocument(), {
    type: "create",
    id: uid(),
    name: "Modelo",
    blocks: [copied],
    templateOrigin: origin,
  })
  assert.deepEqual(parseDocument(JSON.stringify(document)), document)
  assert.deepEqual(document.pages.at(-1)?.templateOrigin, {
    source: "ORGANIZATION",
    templateId: "template-1",
    versionId: "version-2",
    version: 2,
  })
})

test("template policy blocks disallowed additions and shared-region edits", () => {
  const document = initialDocument()
  document.pages[0].composition = { allowedDefinitionIds: ["hero-classic"] }
  const forbidden = reduceDocument(document, {
    type: "add",
    id: uid(),
    definitionId: "contact-classic",
  })
  assert.equal(forbidden, document)

  const navbarDefinition = registry.find((definition) => definition.category === "navbar")!
  const footerDefinition = registry.find((definition) => definition.category === "footer")!
  document.navbar = { id: uid(), definitionId: navbarDefinition.id, props: structuredClone(navbarDefinition.defaults) }
  document.footer = { id: uid(), definitionId: footerDefinition.id, props: structuredClone(footerDefinition.defaults) }
  const origin = { source: "ORGANIZATION" as const, templateId: "template", versionId: "version", version: 1 }
  document.regionOrigins = { navbar: origin, footer: origin }
  for (const region of [document.navbar, document.footer]) {
    assert.equal(reduceDocument(document, { type: "remove", id: region.id }), document)
    assert.equal(reduceDocument(document, { type: "replace", id: region.id }), document)
    assert.equal(reduceDocument(document, { type: "update", id: region.id, props: { title: "Alterado" } }), document)
  }
})

test("template policy limits block replacement to allowed variants", () => {
  const document = initialDocument()
  const block = { id: "hero", definitionId: "hero-classic", props: {} }
  document.pages[0].blocks = [block]
  document.pages[0].composition = { allowedDefinitionIds: ["hero-classic"] }
  const unchanged = reduceDocument(document, { type: "replace", id: block.id })
  assert.equal(unchanged.pages[0].blocks[0].definitionId, "hero-classic")

  document.pages[0].composition.allowedDefinitionIds.push("hero-split")
  const replaced = reduceDocument(document, { type: "replace", id: block.id })
  assert.equal(replaced.pages[0].blocks[0].definitionId, "hero-split")
  assert.ok(document.pages[0].composition.allowedDefinitionIds.includes(
    replaced.pages[0].blocks[0].definitionId
  ))
})

test("deleting a parent page refreshes protected navigation links", () => {
  let document = initialDocument()
  const parentId = document.activePageId
  const navbar = registry.find((definition) => definition.category === "navbar")!
  document = reduceDocument(document, { type: "add", id: uid(), definitionId: navbar.id })
  document = reduceDocument(document, {
    type: "create",
    id: "child-page",
    name: "Child",
    parentPageId: parentId,
  })
  assert.deepEqual(document.navbar?.props.items?.find((item) => item.id === "child-page")?.features, [parentId])

  document = reduceDocument(document, { type: "delete", id: parentId })
  assert.equal(document.pages[0].parentPageId, undefined)
  assert.deepEqual(document.navbar?.props.items?.find((item) => item.id === "child-page")?.features, [])
})
