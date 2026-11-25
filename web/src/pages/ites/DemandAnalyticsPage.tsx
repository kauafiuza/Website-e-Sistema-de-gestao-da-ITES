import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useAuth } from "@/context/auth/auth.context"
import "./ites.css"

type DemandRow = { id: string; code: string; service: string; description: string; urgency: string; status: string; created_at: string; first_name: string; last_name: string; organization_name: string | null }
type Group = { label: string; value: number }
type Analytics = { summary: Record<string, number>; byStatus: Group[]; byUrgency: Group[]; byService: Group[]; byOrganizationSector: Group[]; byMonth: Group[]; demands: DemandRow[] }
type Report = { demand: Record<string, unknown>; history: Record<string, unknown>[] }
type DashboardBlock = { id: string; title: string; dataSource: "summary" | "byStatus" | "byUrgency" | "byService" | "byOrganizationSector" | "byMonth"; visualization: "indicator" | "bar" | "line" | "donut" | "table"; metric: "total" | "pending" | "accepted" | "rejected" | "high_urgency" }
type OrganizationRow = { id: string; name: string; economic_sector: string | null; demand_count: number; member_count: number }
type Dashboard = { kind: "demand-dashboard"; title: string; blocks: DashboardBlock[] }
const COLORS = ["#16805d", "#df8b27", "#bd4d4d", "#426aa6", "#8b5bb0", "#4b9292"]
const defaultDashboard: Dashboard = { kind: "demand-dashboard", title: "Indicadores de demandas", blocks: [
  { id: "status", title: "Demandas por situação", dataSource: "byStatus", visualization: "bar", metric: "total" },
  { id: "urgency", title: "Distribuição por urgência", dataSource: "byUrgency", visualization: "donut", metric: "total" },
  { id: "monthly", title: "Entradas por mês", dataSource: "byMonth", visualization: "line", metric: "total" },
  { id: "services", title: "Serviços solicitados", dataSource: "byService", visualization: "table", metric: "total" },
] }

export default function DemandAnalyticsPage() {
  const { accessToken } = useAuth()
  const [permissions, setPermissions] = useState<string[]>([])
  const [status, setStatus] = useState("")
  const [urgency, setUrgency] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [search, setSearch] = useState("")
  const [data, setData] = useState<Analytics | null>(null)
  const [message, setMessage] = useState("")
  const [report, setReport] = useState<Report | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard>(defaultDashboard)
  const [dashboardRevision, setDashboardRevision] = useState(0)
  const [editingDashboard, setEditingDashboard] = useState(false)
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([])
  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])

  const refresh = useCallback(async () => {
    const query = new URLSearchParams()
    if (status) query.set("status", status)
    if (urgency) query.set("urgency", urgency)
    if (from) query.set("from", from)
    if (to) query.set("to", to)
    if (search.trim()) query.set("search", search.trim())
    const response = await fetch(`/api/ites/analytics/demands?${query}`, { headers })
    if (!response.ok) throw new Error("Você não tem permissão para consultar estes indicadores.")
    setData(await response.json() as Analytics)
  }, [headers, status, urgency, from, to, search])

  useEffect(() => {
    if (!accessToken) return
    fetch("/api/ites/me/permissions", { headers: { Authorization: `Bearer ${accessToken}` } }).then(response => response.ok ? response.json() as Promise<string[]> : []).then(setPermissions)
    fetch("/api/ites/dashboards/demandas", { headers: { Authorization: `Bearer ${accessToken}` } }).then(async response => response.ok ? response.json() as Promise<{ revision: number | null; document: string | null }> : null).then(saved => {
      if (!saved) return
      setDashboardRevision(saved.revision ?? 0)
      if (saved.document) setDashboard(JSON.parse(saved.document) as Dashboard)
    }).catch(() => setMessage("Não foi possível recuperar o painel salvo."))
  }, [accessToken, headers])
  useEffect(() => {
    if (!accessToken || !permissions.includes("organizations.manage")) return
    fetch("/api/ites/organizations/admin", { headers }).then(response => response.ok ? response.json() as Promise<OrganizationRow[]> : Promise.reject()).then(setOrganizations).catch(() => setMessage("Não foi possível carregar a consulta de organizações."))
  }, [accessToken, headers, permissions])
  useEffect(() => {
    if (!accessToken) return
    void Promise.resolve().then(refresh).catch(error => setMessage(error instanceof Error ? error.message : "Falha ao carregar indicadores."))
  }, [accessToken, refresh])

  async function exportCsv() {
    const query = new URLSearchParams()
    if (status) query.set("status", status)
    if (urgency) query.set("urgency", urgency)
    if (from) query.set("from", from)
    if (to) query.set("to", to)
    if (search.trim()) query.set("search", search.trim())
    const response = await fetch(`/api/ites/reports/demands.csv?${query}`, { headers })
    if (!response.ok) { setMessage("Você não tem permissão para exportar este relatório."); return }
    const url = URL.createObjectURL(await response.blob())
    const link = Object.assign(document.createElement("a"), { href: url, download: "relatorio-demandas.csv" })
    link.click(); URL.revokeObjectURL(url)
  }

  async function openReport(id: string) {
    const response = await fetch(`/api/ites/reports/demands/${id}`, { headers })
    if (!response.ok) { setMessage("Você não tem permissão para gerar este relatório."); return }
    setReport(await response.json() as Report)
  }

  async function saveDashboard() {
    const response = await fetch("/api/ites/dashboards/demandas", { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ revision: dashboardRevision, document: dashboard }) })
    if (!response.ok) { setMessage(response.status === 409 ? "O painel foi alterado em outra sessão. Atualize a página." : "Não foi possível salvar o painel."); return }
    const saved = await response.json() as { versionId: string; revision: number }
    setDashboardRevision(saved.revision); setMessage("Painel salvo."); setEditingDashboard(false)
  }

  function addDashboardBlock() {
    setDashboard(current => ({ ...current, blocks: [...current.blocks, { id: crypto.randomUUID(), title: "Novo indicador", dataSource: "byStatus", visualization: "bar", metric: "total" }] }))
  }

  function updateDashboardBlock(id: string, patch: Partial<DashboardBlock>) {
    setDashboard(current => ({ ...current, blocks: current.blocks.map(item => {
      if (item.id !== id) return item
      const next = { ...item, ...patch }
      if (patch.dataSource) {
        if (next.dataSource === "summary") next.visualization = "indicator"
        else if (next.visualization === "indicator") next.visualization = next.dataSource === "byMonth" ? "line" : "bar"
        else if (next.visualization === "line" && next.dataSource !== "byMonth") next.visualization = "bar"
        else if (next.dataSource === "byMonth" && next.visualization === "donut") next.visualization = "line"
      } else if (patch.visualization) {
        if (next.visualization === "indicator") next.dataSource = "summary"
        else if (next.dataSource === "summary") next.dataSource = "byStatus"
        else if (next.visualization === "line") next.dataSource = "byMonth"
      }
      return next
    }) }))
  }

  function renderDashboardBlock(block: DashboardBlock) {
    if (!data) return null
    if (block.visualization === "indicator") return <article className="ites-card" key={block.id}><p>{block.title}</p><strong className="ites-metric">{data.summary[block.metric] ?? 0}</strong></article>
    const rows = data[block.dataSource] as Group[]
    if (rows.length === 0) return <article className="ites-card" key={block.id}><h2>{block.title}</h2><p>Sem registros para os filtros selecionados.</p></article>
    if (block.visualization === "table") return <article className="ites-card" key={block.id}><h2>{block.title}</h2><table className="ites-table"><thead><tr><th>Categoria</th><th>Quantidade</th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>)}</tbody></table></article>
    return <article className="ites-card" key={block.id}><h2>{block.title}</h2><ResponsiveContainer width="100%" height={260}>{block.visualization === "donut" ? <PieChart><Pie data={rows} dataKey="value" nameKey="label" innerRadius={48} outerRadius={88} label>{rows.map((entry,index) => <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart> : block.visualization === "line" ? <LineChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="value" stroke="#426aa6" strokeWidth={3} /></LineChart> : <BarChart data={rows} layout={block.dataSource === "byService" ? "vertical" : "horizontal"}><CartesianGrid strokeDasharray="3 3" /><XAxis type={block.dataSource === "byService" ? "number" : "category"} dataKey={block.dataSource === "byService" ? undefined : "label"} allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type={block.dataSource === "byService" ? "category" : "number"} dataKey={block.dataSource === "byService" ? "label" : undefined} width={110} allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#16805d" /></BarChart>}</ResponsiveContainer></article>
  }

  return <main className="ites-page">
    <header className="ites-header"><Link to="/">ITES · IFRJ Niterói</Link><nav><Link to="/administracao/demandas">Demandas</Link><Link to="/publications">Respostas de formulários</Link><Link to="/projects">Páginas institucionais</Link></nav></header>
    <div className="ites-toolbar"><div><p className="ites-eyebrow">Acompanhamento institucional</p><h1>{dashboard.title}</h1></div><div className="ites-toolbar">{permissions.includes("dashboards.manage") && <button onClick={() => setEditingDashboard(value => !value)}>{editingDashboard ? "Fechar configuração" : "Configurar painel"}</button>}{permissions.includes("reports.export") && permissions.includes("demands.read") && <button onClick={() => void exportCsv()}>Exportar CSV</button>}{permissions.includes("reports.generate") && <button onClick={() => window.print()}>Imprimir / salvar em PDF</button>}</div></div>
    <p>Indicadores calculados a partir das demandas registradas. As respostas de formulários de projetos permanecem disponíveis em suas páginas de publicação, respeitando o acesso da organização.</p>
    <section className="ites-card ites-form" aria-label="Filtros do relatório">
      <label>Buscar<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Código, descrição, solicitante ou organização" /></label>
      <label>Situação<select value={status} onChange={event => setStatus(event.target.value)}><option value="">Todas</option>{["Pendente","Aceita para atendimento","Em atendimento","Concluída","Recusada","Cancelada"].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Urgência<select value={urgency} onChange={event => setUrgency(event.target.value)}><option value="">Todas</option><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></label>
      <label>De<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Até<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
    </section>
    <section className="ites-print-filters" aria-label="Filtros aplicados"><strong>Filtros aplicados:</strong> {[status && `situação ${status}`, urgency && `urgência ${({ LOW: "baixa", MEDIUM: "média", HIGH: "alta" } as Record<string,string>)[urgency]}`, from && `de ${new Date(`${from}T12:00:00`).toLocaleDateString("pt-BR")}`, to && `até ${new Date(`${to}T12:00:00`).toLocaleDateString("pt-BR")}`, search.trim() && `busca “${search.trim()}”`].filter(Boolean).join(" · ") || "nenhum"}</section>
    {message && <p role="alert">{message}</p>}
    {data && <>
      <section className="ites-grid" aria-label="Indicadores resumidos">{[["Demandas no período",data.summary.total],["Pendentes",data.summary.pending],["Aceitas",data.summary.accepted],["Alta urgência",data.summary.high_urgency]].map(([label,value]) => <article className="ites-card" key={label}><p>{label}</p><strong className="ites-metric">{value}</strong></article>)}</section>
      {editingDashboard && permissions.includes("dashboards.manage") && <section className="ites-card ites-dashboard-editor"><h2>Configuração do painel</h2><label>Título<input value={dashboard.title} maxLength={180} onChange={event => setDashboard(current => ({ ...current, title: event.target.value }))} /></label>{dashboard.blocks.map((block,index) => <article className="ites-block-row" key={block.id}><div className="ites-dashboard-fields"><label>Nome<input value={block.title} maxLength={180} onChange={event => updateDashboardBlock(block.id,{ title: event.target.value })} /></label><label>Fonte de dados<select value={block.dataSource} onChange={event => updateDashboardBlock(block.id,{ dataSource: event.target.value as DashboardBlock["dataSource"] })}>{["summary","byStatus","byUrgency","byService","byOrganizationSector","byMonth"].map(value => <option key={value} value={value}>{({ summary: "Indicadores gerais", byStatus: "Demandas por situação", byUrgency: "Demandas por urgência", byService: "Serviços solicitados", byOrganizationSector: "Demandas por setor econômico", byMonth: "Entradas por mês" } as Record<string,string>)[value]}</option>)}</select></label><label>Visualização<select value={block.visualization} onChange={event => updateDashboardBlock(block.id,{ visualization: event.target.value as DashboardBlock["visualization"] })}>{["indicator","bar","line","donut","table"].filter(value => block.dataSource === "summary" ? value === "indicator" : value !== "indicator" && !(block.dataSource === "byMonth" && value === "donut") && !(value === "line" && block.dataSource !== "byMonth")).map(value => <option key={value} value={value}>{({ indicator: "Indicador", bar: "Barras", line: "Série temporal", donut: "Rosca", table: "Tabela" } as Record<string,string>)[value]}</option>)}</select></label>{block.visualization === "indicator" && <label>Métrica<select value={block.metric} onChange={event => updateDashboardBlock(block.id,{ metric: event.target.value as DashboardBlock["metric"] })}>{["total","pending","accepted","rejected","high_urgency"].map(value => <option key={value} value={value}>{({ total: "Total", pending: "Pendentes", accepted: "Aceitas", rejected: "Recusadas", high_urgency: "Alta urgência" } as Record<string,string>)[value]}</option>)}</select></label>}</div><div><button disabled={index===0} onClick={() => setDashboard(current => { const blocks=[...current.blocks]; [blocks[index-1],blocks[index]]=[blocks[index],blocks[index-1]]; return { ...current, blocks } })}>↑</button><button disabled={index===dashboard.blocks.length-1} onClick={() => setDashboard(current => { const blocks=[...current.blocks]; [blocks[index+1],blocks[index]]=[blocks[index],blocks[index+1]]; return { ...current, blocks } })}>↓</button><button onClick={() => setDashboard(current => ({ ...current, blocks: current.blocks.filter(item => item.id !== block.id) }))}>Remover</button></div></article>)}<div className="ites-toolbar"><button onClick={addDashboardBlock} disabled={dashboard.blocks.length>=20}>Adicionar bloco</button><button onClick={() => void saveDashboard()}>Salvar painel</button></div></section>}
      <section className="ites-grid ites-analytics-grid">{dashboard.blocks.map(renderDashboardBlock)}</section>
      {permissions.includes("demands.read") && <section className="ites-card"><h2>Demandas filtradas</h2>{data.demands.length ? <div className="ites-table-wrap"><table className="ites-table"><thead><tr><th>Código</th><th>Data</th><th>Solicitante / organização</th><th>Serviço</th><th>Urgência</th><th>Situação</th><th>Relatório</th></tr></thead><tbody>{data.demands.map(row => <tr key={row.id}><td>{row.code}</td><td>{new Date(row.created_at).toLocaleDateString("pt-BR")}</td><td>{row.first_name} {row.last_name}<br />{row.organization_name || "Sem organização"}</td><td>{row.service}</td><td>{row.urgency}</td><td>{row.status}</td><td>{permissions.includes("reports.generate") && <button onClick={() => void openReport(row.id)}>Abrir</button>}</td></tr>)}</tbody></table></div> : <p>Nenhuma demanda corresponde aos filtros.</p>}</section>}
      {permissions.includes("organizations.manage") && <section className="ites-card"><h2>Organizações e setores</h2><div className="ites-table-wrap"><table className="ites-table"><thead><tr><th>Organização</th><th>Setor econômico</th><th>Integrantes</th><th>Demandas</th></tr></thead><tbody>{organizations.map(organization => <tr key={organization.id}><td>{organization.name}</td><td>{organization.economic_sector || "Não informado"}</td><td>{organization.member_count}</td><td>{organization.demand_count}</td></tr>)}</tbody></table></div></section>}
    </>}
    {report && <div className="ites-report" role="dialog" aria-modal="true" aria-label="Relatório individual da demanda"><div className="ites-toolbar"><h2>Relatório de demanda</h2><div><button onClick={() => window.print()}>Imprimir / PDF</button><button onClick={() => setReport(null)}>Fechar</button></div></div><dl className="ites-report-grid">{Object.entries(report.demand).filter(([key]) => !["id","email"].includes(key)).map(([key,value]) => <div key={key}><dt>{key.replaceAll("_"," ")}</dt><dd>{value == null ? "Não informado" : String(value)}</dd></div>)}</dl><h3>Histórico e decisões</h3>{report.history.length ? report.history.map((event,index) => <article className="ites-card" key={index}><p>{String(event.old_status)} → {String(event.new_status)}</p><p>{String(event.justification)}</p><small>{String(event.first_name)} {String(event.last_name)} · {new Date(String(event.occurred_at)).toLocaleString("pt-BR")}</small></article>) : <p>Esta demanda ainda não possui mudanças de situação.</p>}</div>}
  </main>
}
