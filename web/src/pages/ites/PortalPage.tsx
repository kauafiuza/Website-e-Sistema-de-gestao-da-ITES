import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { PageContent } from "@/pages/editor/components/PageContent"
import { definitions } from "@/utils/blocks"
import type { BuilderDocument } from "@/pages/editor/lib/document"
import { useAuth } from "@/context/auth/auth.context"
import "./ites.css"

export default function PortalPage() {
  const { accessToken } = useAuth()
  const [published, setPublished] = useState<BuilderDocument | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [rootProject, setRootProject] = useState<{ token: string; id: string } | null>(null)
  useEffect(() => {
    fetch("/api/ites/pages/inicio")
      .then(response => response.ok ? response.json() : null)
      .then((result: { document: string } | null) => {
        if (!result) { setUnavailable(true); return }
        const raw = JSON.parse(result.document) as BuilderDocument
        setPublished({ ...raw, pages: raw.pages.map(page => ({ ...page, blocks: page.blocks.map(block => ({ ...block, props: { ...definitions.get(block.definitionId)?.defaults, ...block.props } })) })) })
      }).catch(() => { setPublished(null); setUnavailable(true) })
  }, [])
  useEffect(() => {
    if (!accessToken) return
    fetch("/api/ites/site/root", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(response => response.ok ? response.json() as Promise<{ projectId: string }> : null)
      .then(root => { if (root) setRootProject({ token: accessToken, id: root.projectId }) })
      .catch(() => {})
  }, [accessToken])
  const canEditPages = Boolean(accessToken && rootProject?.token === accessToken)
  return <main className="ites-page">
    <header className="ites-header"><strong>ITES · IFRJ Niterói</strong><nav>{canEditPages && <Link to={`/editor/${rootProject!.id}`}>Editar página inicial</Link>}<Link to="/entrar">Entrar</Link><Link to="/cadastro">Solicitar acesso</Link><Link to="/demandas">Minhas demandas</Link></nav></header>
    {published?.pages[0] ? <PageContent page={published.pages[0]} /> : <section className="ites-card" role="status"><h1>{unavailable ? "Portal temporariamente indisponível" : "Carregando portal institucional…"}</h1><p>{unavailable ? "A equipe responsável está verificando a publicação institucional." : ""}</p><Link to="/entrar">Acessar a plataforma</Link></section>}
  </main>
}
