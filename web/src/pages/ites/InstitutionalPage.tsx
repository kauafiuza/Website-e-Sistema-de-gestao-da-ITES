import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageContent } from "@/pages/editor/components/PageContent"
import { definitions } from "@/utils/blocks"
import type { BuilderDocument } from "@/pages/editor/lib/document"
import "./ites.css"

export default function InstitutionalPage() {
  const { slug } = useParams()
  const [document, setDocument] = useState<BuilderDocument | null>(null)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  useEffect(() => {
    if (!slug) return
    fetch(`/api/ites/pages/${encodeURIComponent(slug)}`)
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ title: string; document: string }> })
      .then(result => { const raw = JSON.parse(result.document) as BuilderDocument; setDocument({ ...raw, pages: raw.pages.map(page => ({ ...page, blocks: page.blocks.map(block => ({ ...block, props: { ...definitions.get(block.definitionId)?.defaults, ...block.props } })) })) }); setTitle(result.title) })
      .catch(() => setMessage("Esta página ainda não foi publicada."))
  }, [slug])
  return <main className="ites-page"><header className="ites-header"><Link to="/">ITES · IFRJ Niterói</Link><Link to="/demandas">Enviar demanda</Link></header><h1>{title}</h1>{message && <p role="status">{message}</p>}{document?.pages[0] && <PageContent page={document.pages[0]} />}</main>
}
