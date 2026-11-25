import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { definitions } from "@/utils/blocks"
import { BlockFrame } from "@/utils/blocks/shared/BlockFrame"
import "@/utils/blocks/shared/block-frame.css"
import { ProjectNavbarEditor } from "./Canvas"
import type { CSSProperties, Dispatch } from "react"
import type { Action, Block, BuilderDocument, Page } from "../lib/document"

export function resolveNavbarProps(navbar: Block, document: BuilderDocument, projectId?: string, routeSearch = "") {
  if (!definitions.has(navbar.definitionId)) return navbar.props
  return {
    ...navbar.props,
    items: (navbar.props.items ?? []).map((item) => {
      if (!item.href.startsWith("page:")) return item
      const target = document.pages.find((candidate) => candidate.id === item.href.slice(5))
      if (!target) return item
      const parts: string[] = []
      let current: Page | undefined = target
      while (current) {
        parts.unshift(current.slug)
        current = current.parentPageId ? document.pages.find((candidate) => candidate.id === current?.parentPageId) : undefined
      }
      return { ...item, href: `/${projectId ?? "preview"}/${parts.join("/")}${projectId === "preview" ? routeSearch : ""}` }
    }),
  }
}

export function NavbarLayer({ navbar, document, projectId, routeSearch, themeStyle }: {
  navbar: Block
  document: BuilderDocument
  projectId?: string
  routeSearch?: string
  themeStyle?: CSSProperties
}) {
  const navbarDefinition = navbar ? definitions.get(navbar.definitionId) : undefined
  const Navbar = navbarDefinition?.component
  const navbarProps = resolveNavbarProps(navbar, document, projectId, routeSearch)
  if (!Navbar) return null
  return (
    <BlockFrame
      props={navbar.props}
      className={`builder-authored-content @container relative ${navbar.props.scrollBehavior === "sticky" ? "sticky top-0 z-40" : ""}`}
      dataBlockId={navbar.id}
    >
      <div style={themeStyle} data-project-navbar="true">
        <Navbar props={navbarProps} />
      </div>
    </BlockFrame>
  )
}

function FooterLayer({ footer, themeStyle }: { footer: Block; themeStyle?: CSSProperties }) {
  const definition = definitions.get(footer.definitionId)
  const Footer = definition?.component
  if (!Footer) return null
  return (
    <BlockFrame props={footer.props} className="@container" dataBlockId={footer.id}>
      <div style={themeStyle} data-project-footer="true">
        <Footer props={footer.props} />
      </div>
    </BlockFrame>
  )
}

export function PageContent({ page, navbar, footer, projectId, routeSearch, document, editorMode = false, onEditNavbar, dispatch, themeStyle, selectedNavbar, onSelectNavbar, inlineSelection, inlineEditing, onInlineSelect, onInlineStart, onInlineCommit, onInlineCancel }: {
  page: Page
  navbar?: Block
  footer?: Block
  projectId?: string
  routeSearch?: string
  document?: BuilderDocument
  editorMode?: boolean
  onEditNavbar?: () => void
  dispatch?: Dispatch<Action>
  themeStyle?: CSSProperties
  selectedNavbar?: boolean
  onSelectNavbar?: () => void
  inlineSelection?: { blockId: string; target: import("@/utils/blocks/shared/inline-editing").InlineTarget } | null
  inlineEditing?: { blockId: string; target: import("@/utils/blocks/shared/inline-editing").InlineTarget } | null
  onInlineSelect?: (blockId: string, target: import("@/utils/blocks/shared/inline-editing").InlineTarget) => void
  onInlineStart?: (blockId: string, target: import("@/utils/blocks/shared/inline-editing").InlineTarget) => void
  onInlineCommit?: (blockId: string, target: import("@/utils/blocks/shared/inline-editing").InlineTarget, value: string) => void
  onInlineCancel?: () => void
}) {
  const seen = new Set<string>()
  return <>
    {navbar && document && editorMode && dispatch && onEditNavbar && <ProjectNavbarEditor block={{ ...navbar, props: resolveNavbarProps(navbar, document, projectId, routeSearch) }} dispatch={dispatch} onEdit={onEditNavbar} selected={!!selectedNavbar} onSelect={() => onSelectNavbar?.()} inlineSelection={inlineSelection ?? null} inlineEditing={inlineEditing ?? null} onInlineSelect={onInlineSelect ?? (() => {})} onInlineStart={onInlineStart ?? (() => {})} onInlineCommit={onInlineCommit ?? (() => {})} onInlineCancel={onInlineCancel ?? (() => {})} themeStyle={themeStyle} />}
    {navbar && document && !editorMode && <NavbarLayer navbar={navbar} document={document} projectId={projectId} routeSearch={routeSearch} themeStyle={themeStyle} />}
    {page.blocks.length ? (
    page.blocks.map((block) => {
      const definition = definitions.get(block.definitionId)
      if (!definition) return null
      const anchor = seen.has(definition.category)
        ? undefined
        : definition.category
      seen.add(definition.category)
      return (
        <BlockFrame
          key={block.id}
          props={block.props}
          id={anchor}
          dataBlockId={block.id}
          className="@container"
          animate={!editorMode}
        >
          <definition.component
            props={block.props}
          />
        </BlockFrame>
      )
    })
    ) : (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Esta página está vazia.</EmptyTitle>
        <EmptyDescription>
          Adicione seções no editor para criar uma prévia da página.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
    )}
    {footer && !editorMode && <FooterLayer footer={footer} themeStyle={themeStyle} />}
  </>
}
