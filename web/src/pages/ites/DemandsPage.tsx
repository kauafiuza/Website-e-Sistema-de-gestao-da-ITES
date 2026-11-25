import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/auth/auth.context"
import "./ites.css"

type Organization = { id: string; name: string; economic_sector: string }
type Demand = { id: string; code: string; description: string; status: string; service: string; decision_justification?: string | null }

export default function DemandsPage() {
  const { accessToken, logout } = useAuth()
  const [demands, setDemands] = useState<Demand[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationId, setOrganizationId] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [economicSector, setEconomicSector] = useState("")
  const [message, setMessage] = useState("")
  const [capacity, setCapacity] = useState("GROUP")
  const [capacityOther, setCapacityOther] = useState("")
  const [service, setService] = useState("Formação")
  const [urgency, setUrgency] = useState("MEDIUM")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!accessToken) return
    fetch("/api/ites/organizations", { headers: { Authorization: `Bearer ${accessToken}` } }).then(response => response.json() as Promise<Organization[]>).then(setOrganizations).catch(() => setOrganizations([]))
    fetch("/api/ites/me/permissions", { headers: { Authorization: `Bearer ${accessToken}` } }).then(response => response.json() as Promise<string[]>).then(setPermissions).catch(() => setPermissions([]))
    fetch("/api/ites/demands", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(response => response.ok ? response.json() as Promise<Demand[]> : Promise.reject())
      .then(setDemands).catch(() => setMessage("Não foi possível carregar as demandas."))
  }, [accessToken])

  async function createOrganization() {
    const response = await fetch("/api/ites/organizations", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: organizationName, economicSector }) })
    if (!response.ok) { setMessage("Não foi possível cadastrar a organização."); return }
    const organization = await response.json() as Organization
    setOrganizations(current => [...current, organization]); setOrganizationId(organization.id); setOrganizationName(""); setEconomicSector("")
    setMessage("Organização cadastrada.")
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const response = await fetch("/api/ites/demands", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ capacity, capacityOther, service, urgency, description, organizationId: organizationId || null }) })
    if (!response.ok) { setMessage("Confira os dados e tente novamente."); return }
    const demand = await response.json() as Demand
    setDemands(current => [demand, ...current])
    setDescription("")
    setMessage(`Demanda registrada: ${demand.code}`)
  }

  return <main className="ites-page"><header className="ites-header"><Link to="/">ITES · IFRJ Niterói</Link><nav>{permissions.includes("demands.read") && <Link to="/administracao/demandas">Gestão</Link>}{permissions.includes("analytics.view") && <Link to="/administracao/indicadores">Indicadores</Link>}{permissions.includes("roles.manage") && <Link to="/administracao/permissoes">Permissões</Link>}{permissions.includes("builder.access") && <Link to="/projects">Editor</Link>}<button onClick={() => void logout()}>Sair</button></nav></header>
    <h1>Minhas demandas</h1><p>Registre sua solicitação e acompanhe a análise da ITES.</p>
    <section className="ites-card"><h2>Organização</h2><p>Cadastre uma organização quando representar um grupo ou instituição.</p><div className="ites-form"><label>Nome<input value={organizationName} onChange={event => setOrganizationName(event.target.value)} /></label><label>Setor econômico<input value={economicSector} onChange={event => setEconomicSector(event.target.value)} /></label><button type="button" onClick={() => void createOrganization()}>Cadastrar organização</button></div></section>
    <form className="ites-form" onSubmit={event => void submit(event)}>
      <label>Organização associada<select value={organizationId} onChange={event => setOrganizationId(event.target.value)}><option value="">Sem organização</option>{organizations.map(organization => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
      <label>Condição da solicitação<select value={capacity} onChange={event => setCapacity(event.target.value)}><option value="GROUP">Representante de grupo ou coletivo</option><option value="FORUM">Integrante de fórum</option><option value="PARTNER">Instituição parceira</option><option value="OTHER">Outra</option></select></label>
      {capacity === "OTHER" && <label>Descreva sua condição<input required value={capacityOther} onChange={event => setCapacityOther(event.target.value)} /></label>}
      <label>Serviço solicitado<select value={service} onChange={event => setService(event.target.value)}><option>Formação</option><option>Comunicação</option><option>Apoio administrativo</option><option>Comercialização</option><option>Eventos</option><option>Parceria</option><option>Outro</option></select></label>
      <label>Urgência<select value={urgency} onChange={event => setUrgency(event.target.value)}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></label>
      <label>Descrição da necessidade<textarea required minLength={10} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <button className="ites-button" type="submit">Enviar demanda</button>
    </form>
    {message && <p role="status">{message}</p>}
    <h2>Solicitações enviadas</h2>{demands.map(demand => <article className="ites-card" key={demand.id}><h3>{demand.code}</h3><p>{demand.description}</p><p>Situação: {demand.status}</p>{demand.decision_justification && <p>Decisão: {demand.decision_justification}</p>}</article>)}
  </main>
}
