import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/auth/auth.context"
import "./ites.css"

type Demand = { id: string; code: string; description: string; status: string; urgency: string; first_name: string; last_name: string; organization_name: string | null; review_notes: string | null }
const statuses = ["", "Pendente", "Aceita para atendimento", "Em atendimento", "Concluída", "Recusada", "Cancelada"]
export default function AdminDemandsPage() {
  const { accessToken } = useAuth()
  const [status, setStatus] = useState("")
  const [demands, setDemands] = useState<Demand[]>([])
  const [message, setMessage] = useState("")
  const [reason, setReason] = useState("")
  const [completion, setCompletion] = useState("")
  const [notes, setNotes] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  async function refreshDemands() {
    const response = await fetch(`/api/ites/demands/review${status ? `?status=${encodeURIComponent(status)}` : ""}`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!response.ok) { setMessage("Você não tem permissão para consultar demandas."); return }
    setDemands(await response.json() as Demand[])
  }
  useEffect(() => {
    if (!accessToken) return
    let active = true
    fetch(`/api/ites/demands/review${status ? `?status=${encodeURIComponent(status)}` : ""}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async response => {
        if (!response.ok) throw new Error()
        return await response.json() as Demand[]
      })
      .then(rows => { if (active) setDemands(rows) })
      .catch(() => { if (active) setMessage("Você não tem permissão para consultar demandas.") })
    return () => { active = false }
  }, [accessToken, status])
  async function classify(demandId: string) {
    const response = await fetch(`/api/ites/demands/${demandId}/classification`, { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ notes }) })
    setMessage(response.ok ? "Classificação salva." : "Não foi possível classificar a demanda.")
    if (response.ok) await refreshDemands()
  }
  async function decide(demandId: string, nextStatus: string) {
    const response = await fetch(`/api/ites/demands/${demandId}/decision`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, justification: reason, completionNote: completion || null }) })
    if (!response.ok) { setMessage("Decisão recusada. Confira permissão, situação e justificativa."); return }
    setReason(""); setCompletion(""); setSelected(null); setMessage("Decisão registrada."); await refreshDemands()
  }
  return <main className="ites-page"><header className="ites-header"><Link to="/">ITES · IFRJ Niterói</Link><nav><Link to="/demandas">Minhas demandas</Link><Link to="/administracao/indicadores">Indicadores e respostas</Link><Link to="/projects">Editor</Link></nav></header><h1>Gestão de demandas</h1>
    <label>Filtrar por situação <select value={status} onChange={event => setStatus(event.target.value)}>{statuses.map(value => <option key={value} value={value}>{value || "Todas"}</option>)}</select></label>
    {message && <p role="status">{message}</p>}
    {demands.map(demand => <article className="ites-card" key={demand.id}><h2>{demand.code}</h2><p>{demand.description}</p><p>Solicitante: {demand.first_name} {demand.last_name}</p><p>Organização: {demand.organization_name || "Não informada"}</p><p>Urgência: {demand.urgency} · Situação: {demand.status}</p>{demand.review_notes && <p>Classificação: {demand.review_notes}</p>}<button onClick={() => setSelected(demand.id)}>Analisar</button>
      {selected === demand.id && <div className="ites-form"><label>Classificação<input value={notes} onChange={event => setNotes(event.target.value)} /></label><button onClick={() => void classify(demand.id)}>Salvar classificação</button><label>Justificativa<textarea required value={reason} onChange={event => setReason(event.target.value)} /></label><label>Informação de conclusão<input value={completion} onChange={event => setCompletion(event.target.value)} /></label><div className="ites-toolbar">{(demand.status === "Pendente" ? ["Aceita para atendimento", "Recusada", "Cancelada"] : demand.status === "Aceita para atendimento" ? ["Em atendimento", "Cancelada"] : demand.status === "Em atendimento" ? ["Concluída", "Cancelada"] : []).map(next => <button key={next} onClick={() => void decide(demand.id,next)}>{next}</button>)}</div></div>}</article>)}
  </main>
}
