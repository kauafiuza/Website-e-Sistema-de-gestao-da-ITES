import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/auth/auth.context"
import "./ites.css"

type User = { id: string; first_name: string; last_name: string; email: string }
type Role = { id: string; code: string; name: string }
export default function GrantsPage() {
  const { accessToken } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selected, setSelected] = useState("")
  const [assigned, setAssigned] = useState<Role[]>([])
  const [message, setMessage] = useState("")
  const [canManageUsers, setCanManageUsers] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", password: "" })
  useEffect(() => {
    if (!accessToken) return
    const headers = { Authorization: `Bearer ${accessToken}` }
    Promise.all([fetch("/api/ites/users", { headers }), fetch("/api/ites/roles", { headers }), fetch("/api/ites/me/permissions", { headers })])
      .then(async ([u,r,p]) => { if (!u.ok || !r.ok || !p.ok) throw new Error(); setUsers(await u.json() as User[]); setRoles(await r.json() as Role[]); setCanManageUsers((await p.json() as string[]).includes("users.manage")) })
      .catch(() => setMessage("Você não tem permissão para gerenciar papéis."))
  }, [accessToken])
  useEffect(() => { if (!selected) return; fetch(`/api/ites/roles/users/${selected}`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json() as Promise<Role[]>).then(setAssigned).catch(() => setAssigned([])) }, [selected, accessToken])
  async function change(role: Role, grant: boolean) {
    const response = await fetch(`/api/ites/roles/users/${selected}/${role.id}`, { method: grant ? "POST" : "DELETE", headers: { Authorization: `Bearer ${accessToken}` } })
    if (!response.ok) { setMessage("Não foi possível alterar o papel."); return }
    setAssigned(current => grant ? [...current,role] : current.filter(item => item.id !== role.id))
    setMessage("Permissões atualizadas.")
  }
  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    setCreating(true)
    setMessage("")
    try {
      const response = await fetch("/api/ites/users", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      if (!response.ok) {
        setMessage(response.status === 409 ? "Já existe uma conta com este e-mail." : "Não foi possível criar a conta. Verifique os dados e sua permissão.")
        return
      }
      const created = await response.json() as { id: string; firstName: string; lastName: string; email: string }
      setUsers(current => [{ id: created.id, first_name: created.firstName, last_name: created.lastName, email: created.email }, ...current])
      setSelected(created.id)
      setNewUser({ firstName: "", lastName: "", email: "", password: "" })
      setMessage("Conta criada. Compartilhe as credenciais com a pessoa por um canal seguro.")
    } catch {
      setMessage("Não foi possível conectar à plataforma.")
    } finally {
      setCreating(false)
    }
  }
  return <main className="ites-page"><header className="ites-header"><Link to="/">ITES · IFRJ Niterói</Link><Link to="/administracao/demandas">Demandas</Link></header><h1>Permissões de usuários</h1>
    {canManageUsers && <section className="ites-card"><h2>Criar acesso de solicitante</h2><p>A conta fica ativa sem confirmação por e-mail. A senha não será enviada pelo sistema.</p><form className="ites-form" onSubmit={event => void createAccount(event)}>
      <label>Nome<input required maxLength={80} value={newUser.firstName} onChange={event => setNewUser({ ...newUser, firstName: event.target.value })} /></label>
      <label>Sobrenome<input required maxLength={80} value={newUser.lastName} onChange={event => setNewUser({ ...newUser, lastName: event.target.value })} /></label>
      <label>E-mail<input required type="email" maxLength={254} autoComplete="email" value={newUser.email} onChange={event => setNewUser({ ...newUser, email: event.target.value })} /></label>
      <label>Senha inicial<input required type="password" minLength={8} autoComplete="new-password" value={newUser.password} onChange={event => setNewUser({ ...newUser, password: event.target.value })} /></label>
      <button className="ites-button" type="submit" disabled={creating}>{creating ? "Criando…" : "Criar acesso"}</button>
    </form></section>}
    <label>Usuário <select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Selecione</option>{users.map(user => <option key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.email})</option>)}</select></label>
    {selected && roles.map(role => <div className="ites-card" key={role.id}><strong>{role.name}</strong> <span>({role.code})</span><button onClick={() => void change(role,!assigned.some(item => item.id === role.id))}>{assigned.some(item => item.id === role.id) ? "Revogar" : "Conceder"}</button></div>)}
    {message && <p role="status">{message}</p>}
  </main>
}
