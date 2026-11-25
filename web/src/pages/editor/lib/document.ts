import { parseBlockProps } from "@/utils/blocks/types"
import { parseProjectTheme, type ProjectTheme } from "./project-theme"
import { definitions, variantsByCategory, type BlockProps } from "@/utils/blocks"
export interface Block {
  id: string
  definitionId: string
  props: BlockProps
  [key: string]: unknown
}
export interface Page {
  id: string
  name: string
  slug: string
  parentPageId?: string
  blocks: Block[]
  templateOrigin?: PageTemplateOrigin
  composition?: PageComposition
  [key: string]: unknown
}
export interface PageTemplateOrigin {
  source: "BUNDLED" | "ORGANIZATION"
  templateId: string
  versionId: string
  version: number
}
export interface PageComposition {
  allowedDefinitionIds: string[]
}
export interface BuilderDocument {
  version: 1
  name: string
  activePageId: string
  pages: Page[]
  navbar?: Block
  footer?: Block
  regionOrigins?: Partial<Record<"navbar" | "footer", PageTemplateOrigin>>
  theme?: ProjectTheme
  [key: string]: unknown
}
export type Action =
  | { type: "add"; id: string; definitionId: string; index?: number }
  | { type: "move"; id: string; index: number }
  | { type: "remove" | "replace"; id: string }
  | { type: "update"; id: string; props: Partial<BlockProps> }
  | { type: "create"; id: string; name: string; blocks?: Block[]; navbar?: Block; parentPageId?: string; theme?: ProjectTheme; templateOrigin?: PageTemplateOrigin; composition?: PageComposition }
  | { type: "rename"; id: string; name: string }
  | { type: "delete" | "switch"; id: string }
  | { type: "clear" }
  | { type: "project-name"; name: string }
  | { type: "project-theme"; theme: ProjectTheme }
  | { type: "load"; document: BuilderDocument }
export function builderDraftStorageKey(userId: string, organizationId: string) {
  return `studio-builder-document-v2:${userId}:${organizationId}`
}
export function projectDraftStorageKey(userId: string, projectId: string) {
  // O UUID global do projeto já delimita o tenant; a API valida acesso antes do draft ser lido.
  return `studio-builder-draft-v1:${userId}:${projectId}`
}
export function builderPreviewStorageKey(userId: string, organizationId: string, previewId: string) {
  return `studio-builder-preview-v2:${userId}:${organizationId}:${previewId}`
}
export const uid = () => crypto.randomUUID()
export function initialDocument(): BuilderDocument {
  const id = uid()
  return {
    version: 1,
    name: "Untitled",
    activePageId: id,
    pages: [{ id, name: "Home", slug: "home", blocks: [] }],
  }
}
export function reduceDocument(
  document: BuilderDocument,
  action: Action
): BuilderDocument {
  if (action.type === "load") return action.document
  if (action.type === "project-theme") return { ...document, theme: action.theme }
  if (action.type === "project-name")
    return { ...document, name: action.name.trim() || document.name }
  if (action.type === "add") {
    const definition = definitions.get(action.definitionId)
    if (!definition) return document
    const activePage = document.pages.find((page) => page.id === document.activePageId)
    if (activePage?.composition && definition.category !== "navbar" && definition.category !== "footer"
      && !activePage.composition.allowedDefinitionIds.includes(definition.id)) return document
    if (
      definition.category === "navbar" &&
      document.navbar &&
      (!definitions.has(document.navbar.definitionId) || !!document.regionOrigins?.navbar)
    )
      return document
    if (definition.category === "footer" && document.footer && document.regionOrigins?.footer)
      return document
    const block = { id: action.id, definitionId: definition.id, props: structuredClone(definition.defaults) }
    if (definition.category === "navbar") {
      block.props.items = document.pages.slice(0, 50).map((page) => ({
        id: page.id,
        title: page.name,
        description: "",
        href: `page:${page.id}`,
        value: "",
        features: page.parentPageId ? [page.parentPageId] : [],
      }))
      return { ...document, navbar: block }
    }
    if (definition.category === "footer") return { ...document, footer: block }
  }
  if (action.type === "remove" && document.navbar?.id === action.id && document.regionOrigins?.navbar)
    return document
  if (action.type === "remove" && document.navbar?.id === action.id)
    return { ...document, navbar: undefined, regionOrigins: { ...document.regionOrigins, navbar: undefined } }
  if (action.type === "update" && document.navbar?.id === action.id) {
    if (document.regionOrigins?.navbar) return document
    if (!definitions.has(document.navbar.definitionId)) return document
    const props = parseBlockProps({ ...document.navbar.props, ...action.props }, document.navbar.props)
    return props ? { ...document, navbar: { ...document.navbar, props } } : document
  }
  if (action.type === "replace" && document.navbar?.id === action.id) {
    if (document.regionOrigins?.navbar) return document
    const current = definitions.get(document.navbar.definitionId)
    const variants =
      variantsByCategory.get(current?.category ?? "") ?? []
    const next = variants[(variants.findIndex((item) => item.id === document.navbar?.definitionId) + 1) % variants.length]
    return next ? {
      ...document,
      navbar: {
        ...document.navbar,
        definitionId: next.id,
        props: { ...next.defaults, ...document.navbar.props },
      },
    } : document
  }
  if (action.type === "remove" && document.footer?.id === action.id && document.regionOrigins?.footer)
    return document
  if (action.type === "remove" && document.footer?.id === action.id)
    return { ...document, footer: undefined, regionOrigins: { ...document.regionOrigins, footer: undefined } }
  if (action.type === "update" && document.footer?.id === action.id) {
    if (document.regionOrigins?.footer) return document
    if (!definitions.has(document.footer.definitionId)) return document
    const props = parseBlockProps({ ...document.footer.props, ...action.props }, document.footer.props)
    return props ? { ...document, footer: { ...document.footer, props } } : document
  }
  if (action.type === "replace" && document.footer?.id === action.id) {
    if (document.regionOrigins?.footer) return document
    const current = definitions.get(document.footer.definitionId)
    const variants = variantsByCategory.get(current?.category ?? "") ?? []
    const next = variants[(variants.findIndex((item) => item.id === document.footer?.definitionId) + 1) % variants.length]
    return next ? { ...document, footer: { ...document.footer, definitionId: next.id, props: { ...next.defaults, ...document.footer.props } } } : document
  }
  if (action.type === "create") {
    const baseSlug = slugify(action.name.trim() || "Untitled")
    const usedSlugs = new Set(document.pages.map((item) => item.slug))
    let slug = baseSlug
    let suffix = 2
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`
    const page = {
      id: action.id,
      name: action.name.trim() || "Untitled",
      slug,
      ...(action.parentPageId ? { parentPageId: action.parentPageId } : {}),
      blocks: action.blocks ?? [],
      ...(action.templateOrigin ? { templateOrigin: action.templateOrigin } : {}),
      ...(action.composition ? { composition: structuredClone(action.composition) } : {}),
    }
    const navbar = document.navbar ?? action.navbar
    const navbarDefinition = navbar
      ? definitions.get(navbar.definitionId)
      : undefined
    const navbarWithPages =
      navbar && navbarDefinition?.category === "navbar"
        ? {
            ...navbar,
            props: {
              ...navbar.props,
              items: document.navbar
                ? [
                    ...(navbar.props.items ?? []),
                    {
                      id: page.id,
                      title: page.name,
                      description: "",
                      href: `page:${page.id}`,
                      value: "",
                      features: page.parentPageId ? [page.parentPageId] : [],
                    },
                  ].slice(0, 50)
                : [...document.pages, page].slice(0, 50).map((item) => ({
                    id: item.id,
                    title: item.name,
                    description: "",
                    href: `page:${item.id}`,
                    value: "",
                    features: item.parentPageId ? [item.parentPageId] : [],
                  })),
            },
          }
        : document.navbar
    return {
      ...document,
      activePageId: page.id,
      pages: [...document.pages, page],
      ...(action.theme ? { theme: action.theme } : {}),
      ...(navbarWithPages ? { navbar: navbarWithPages } : {}),
    }
  }
  if (action.type === "switch")
    return document.pages.some((p) => p.id === action.id)
      ? { ...document, activePageId: action.id }
      : document
  if (action.type === "rename")
    return {
      ...document,
      pages: document.pages.map((p) =>
        p.id === action.id ? { ...p, name: action.name.trim() || p.name } : p
      ),
      ...(document.navbar && definitions.has(document.navbar.definitionId)
        ? {
            navbar: {
              ...document.navbar,
              props: {
                ...document.navbar.props,
                items: (document.navbar.props.items ?? []).map((item) =>
                  item.id === action.id
                    ? { ...item, title: action.name.trim() || item.title }
                    : item
                ),
              },
            },
          }
        : {}),
    }
  if (action.type === "delete") {
    if (document.pages.length === 1) return document
    const pages = document.pages.filter((p) => p.id !== action.id).map((page) =>
      page.parentPageId === action.id ? { ...page, parentPageId: undefined } : page
    )
    const customNavigationItems = (document.navbar?.props.items ?? [])
      .filter((item) => !item.href.startsWith("page:"))
    const navbar = document.navbar && definitions.has(document.navbar.definitionId)
      ? {
          ...document.navbar,
          props: {
            ...document.navbar.props,
            items: [
              ...customNavigationItems,
              ...pages.slice(0, Math.max(0, 50 - customNavigationItems.length)).map((page) => ({
                id: page.id,
                title: page.name,
                description: "",
                href: `page:${page.id}`,
                value: "",
                features: page.parentPageId ? [page.parentPageId] : [],
              })),
            ],
          },
        }
      : document.navbar
    return {
      ...document,
      pages,
      ...(navbar ? { navbar } : {}),
      activePageId:
        document.activePageId === action.id
          ? pages[0].id
          : document.activePageId,
    }
  }
  return {
    ...document,
    pages: document.pages.map((page) => {
      if (page.id !== document.activePageId) return page
      let blocks = page.blocks
      switch (action.type) {
        case "clear":
          blocks = blocks.filter((block) => !definitions.has(block.definitionId))
          break
        case "add": {
          const definition = definitions.get(action.definitionId)
          if (!definition) return page
          blocks = [...blocks]
          blocks.splice(action.index ?? blocks.length, 0, {
            id: action.id,
            definitionId: definition.id,
            props: structuredClone(definition.defaults),
          })
          break
        }
        case "remove":
          blocks = blocks.filter((b) => b.id !== action.id)
          break
        case "move": {
          const block = blocks.find((b) => b.id === action.id)
          if (!block) return page
          blocks = blocks.filter((b) => b.id !== block.id)
          blocks.splice(
            Math.max(0, Math.min(action.index, blocks.length)),
            0,
            block
          )
          break
        }
        case "update":
          blocks = blocks.map((b) => {
            if (b.id !== action.id) return b
            if (!definitions.has(b.definitionId)) return b
            const props = parseBlockProps(
              { ...b.props, ...action.props },
              b.props
            )
            return props ? { ...b, props } : b
          })
          break
        case "replace":
          blocks = blocks.map((b) => {
            if (b.id !== action.id) return b
            const current = definitions.get(b.definitionId)
            const variants = (variantsByCategory.get(current?.category ?? "") ?? [])
              .filter((variant) => !page.composition
                || page.composition.allowedDefinitionIds.includes(variant.id))
            const currentIndex = variants.findIndex((variant) => variant.id === b.definitionId)
            const next = variants.length === 0
              ? undefined
              : variants[currentIndex < 0 ? 0 : (currentIndex + 1) % variants.length]
            if (!next || next.id === b.definitionId) return b
            return next
              ? {
                  ...b,
                  definitionId: next.id,
                  props: { ...next.defaults, ...b.props },
                }
              : b
          })
          break
      }
      return { ...page, blocks }
    }),
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
export function parseDocument(raw: string): BuilderDocument | null {
  try {
    if (raw.length > 10000000) return null
    const data: unknown = JSON.parse(raw)
    if (
      !isRecord(data) ||
      data.version !== 1 ||
      !Array.isArray(data.pages) ||
      !data.pages.length ||
      data.pages.length > 100 ||
      typeof data.activePageId !== "string"
    )
      return null
    const ids = new Set<string>()
    const pages: Page[] = []
    let legacyNavbar: Block | undefined
    for (const page of data.pages) {
      if (
        !isRecord(page) ||
        typeof page.id !== "string" ||
        !page.id.trim() ||
        ids.has(page.id) ||
        typeof page.name !== "string" ||
        !page.name.trim() ||
        !Array.isArray(page.blocks) ||
        page.blocks.length > 1000
      )
        return null
      ids.add(page.id)
      const blocks: Block[] = []
      if (page.composition !== undefined) {
        if (!isRecord(page.composition) || !Array.isArray(page.composition.allowedDefinitionIds)
          || page.composition.allowedDefinitionIds.length > 1000
          || page.composition.allowedDefinitionIds.some((id) => typeof id !== "string" || !id.trim())) return null
        if (new Set(page.composition.allowedDefinitionIds).size !== page.composition.allowedDefinitionIds.length) return null
      }
      for (const block of page.blocks) {
        if (
          !isRecord(block) ||
          typeof block.id !== "string" ||
          !block.id.trim() ||
          ids.has(block.id) ||
          typeof block.definitionId !== "string" ||
          !block.definitionId.trim() ||
          !isRecord(block.props)
        )
          return null
        ids.add(block.id)
        const def = definitions.get(block.definitionId)
        if (!def) {
          blocks.push({
            ...block,
            id: block.id,
            definitionId: block.definitionId,
            props: block.props as unknown as BlockProps,
          } as Block)
          continue
        }
        const props = parseBlockProps(block.props, def.defaults)
        if (!props) return null
        if (def.category === "navbar") {
          legacyNavbar ??= { ...block, id: block.id, definitionId: def.id, props } as Block
          continue
        }
        blocks.push({ ...block, id: block.id, definitionId: def.id, props } as Block)
      }
      const slug = typeof page.slug === "string" ? page.slug : slugify(page.name)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
      pages.push({ ...page, id: page.id, name: page.name, slug,
        ...(typeof page.parentPageId === "string" ? { parentPageId: page.parentPageId } : {}), blocks } as Page)
    }
    const pageIds = new Set(pages.map((page) => page.id))
    for (const page of pages) {
      if (page.parentPageId && (!pageIds.has(page.parentPageId) || page.parentPageId === page.id)) return null
      const visited = new Set<string>([page.id])
      let parentId = page.parentPageId
      while (parentId) {
        if (visited.has(parentId)) return null
        visited.add(parentId)
        parentId = pages.find((candidate) => candidate.id === parentId)?.parentPageId
      }
    }
    const paths = new Set<string>()
    for (const page of pages) {
      const segments = [page.slug]
      let parentId = page.parentPageId
      while (parentId) {
        const parent = pages.find((candidate) => candidate.id === parentId)
        if (!parent) return null
        segments.unshift(parent.slug)
        parentId = parent.parentPageId
      }
      const path = segments.join("/")
      if (paths.has(path)) return null
      paths.add(path)
    }
    let persistedNavbar: Block | undefined
    if (data.navbar !== undefined) {
      if (
        !isRecord(data.navbar) ||
        typeof data.navbar.id !== "string" ||
        !data.navbar.id.trim() ||
        typeof data.navbar.definitionId !== "string" ||
        !data.navbar.definitionId.trim() ||
        !isRecord(data.navbar.props)
      )
        return null
      if (ids.has(data.navbar.id)) return null
      const def = definitions.get(data.navbar.definitionId)
      if (def) {
        if (def.category !== "navbar") return null
        const props = parseBlockProps(data.navbar.props, def.defaults)
        if (!props) return null
        persistedNavbar = { ...data.navbar, id: data.navbar.id, definitionId: def.id, props }
      } else {
        persistedNavbar = { ...data.navbar, props: data.navbar.props as unknown as BlockProps } as Block
      }
    }
    let persistedFooter: Block | undefined
    if (data.footer !== undefined) {
      if (!isRecord(data.footer) || typeof data.footer.id !== "string" || !data.footer.id.trim()
        || ids.has(data.footer.id) || typeof data.footer.definitionId !== "string"
        || !data.footer.definitionId.trim() || !isRecord(data.footer.props)) return null
      ids.add(data.footer.id)
      const def = definitions.get(data.footer.definitionId)
      if (def) {
        if (def.category !== "footer") return null
        const props = parseBlockProps(data.footer.props, def.defaults)
        if (!props) return null
        persistedFooter = { ...data.footer, id: data.footer.id, definitionId: def.id, props }
      } else {
        persistedFooter = { ...data.footer, props: data.footer.props as unknown as BlockProps } as Block
      }
    }
    if (data.regionOrigins !== undefined && !isRecord(data.regionOrigins)) return null
    const name = typeof data.name === "string" && data.name.trim()
      ? data.name
      : "Untitled"
    if (name.trim() !== name || name.length > 150) return null
    const theme = parseProjectTheme(data.theme)
    const metadata = { ...data }
    delete metadata.theme
    return {
      ...metadata,
      version: 1,
      name,
      pages,
      ...(persistedNavbar ?? legacyNavbar ? { navbar: persistedNavbar ?? legacyNavbar } : {}),
      ...(persistedFooter ? { footer: persistedFooter } : {}),
      ...(theme ? { theme } : {}),
      activePageId: pages.some((p) => p.id === data.activePageId)
        ? data.activePageId
        : pages[0].id,
    }
  } catch {
    return null
  }
}
function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pagina"
}
