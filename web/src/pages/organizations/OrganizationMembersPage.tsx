import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/auth/auth.context"
import { useOrganization } from "@/context/organization/organization.context"
import { AppHeader, MainLayout } from "@/layout/MainLayout"
import { AppSidebar } from "@/layout/PlatformSidebar"
import { PlatformBreadcrumb } from "@/layout/PlatformBreadcrumb"
import { WorkAreaPageHeader } from "@/layout/WorkAreaPageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/motion/input"
import { Checkbox } from "@/components/motion/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/motion/select"
import {
  createOrganizationGrant,
  inviteOrganizationMember,
  listOrganizationGrants,
  listOrganizationInvitations,
  listOrganizationMembers,
  OrganizationRequestError,
  revokeOrganizationGrant,
  revokeOrganizationInvitation,
  revokeOrganizationMember,
  type CreatePermissionGrant,
  type GrantScopeType,
  type OrganizationInvitation,
  type OrganizationMember,
  type PermissionAction,
  type PermissionGrant,
} from "@/services/organizations/organization.service"
import { delegableGrantParents, exportAuthorityGrants, exportValidityAllowedByAuthority, scopesAllowedBy, validityAllowedByParent } from "@/services/organizations/organization-permissions"

type GrantDraft = {
  parentGrantId: string
  scopeType: GrantScopeType
  scopeId: string
  validUntil: string
  canDelegate: boolean
}

const actionLabels: Record<PermissionAction, string> = {
  PROJECT_READ: "Ler projetos",
  PROJECT_CREATE: "Criar projetos",
  PROJECT_UPDATE: "Editar projetos",
  PROJECT_DELETE: "Excluir projetos",
  THEME_READ: "Ler temas",
  THEME_CREATE: "Criar temas",
  THEME_UPDATE: "Editar temas",
  THEME_DELETE: "Excluir temas",
  PUBLICATION_READ: "Ler publicações",
  PUBLICATION_MANAGE: "Publicar e gerenciar publicações",
  PUBLICATION_APPROVE: "Aprovar publicações",
  PUBLICATION_ANALYTICS_READ: "Ler métricas",
  PUBLICATION_SUBMISSIONS_READ: "Ler respostas",
  PUBLICATION_SUBMISSIONS_EXPORT: "Exportar respostas",
  PUBLICATION_ACTIVITY_READ: "Ler atividade",
  ORGANIZATION_GRANTS_READ: "Ler permissões",
  ORGANIZATION_GRANTS_MANAGE: "Administrar membros e permissões",
  ORGANIZATION_AUDIT_READ: "Ler trilha de auditoria",
}

const scopeLabels: Record<GrantScopeType, string> = {
  ORGANIZATION: "Toda a organização",
  PROJECT: "Projeto",
  THEME: "Tema",
}

const invitationStateLabels: Record<OrganizationInvitation["state"], string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceito",
  EXPIRED: "Expirado",
  REVOKED: "Revogado",
}

function grantState(grant: PermissionGrant) {
  return grant.state === "REVOKED" ? "Revogado" : "Ativo"
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "Sem expiração"
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação."
}

export default function OrganizationMembersPage() {
  const { user, accessToken } = useAuth()
  const { selectedOrganization } = useOrganization()
  const organizationId = selectedOrganization?.id ?? ""
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [grants, setGrants] = useState<PermissionGrant[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState("")
  const [beneficiaryId, setBeneficiaryId] = useState("")
  const [parentGrantId, setParentGrantId] = useState("")
  const [grantDraft, setGrantDraft] = useState<GrantDraft | null>(null)
  const [exportAuthorityId, setExportAuthorityId] = useState("")
  const [exportScopeType, setExportScopeType] = useState<"ORGANIZATION" | "PROJECT">("ORGANIZATION")
  const [exportScopeId, setExportScopeId] = useState("")
  const [exportValidUntil, setExportValidUntil] = useState("")
  const [exportCanDelegate, setExportCanDelegate] = useState(false)
  const [approvalAuthorityId, setApprovalAuthorityId] = useState("")
  const [approvalScopeType, setApprovalScopeType] = useState<"ORGANIZATION" | "PROJECT">("ORGANIZATION")
  const [approvalScopeId, setApprovalScopeId] = useState("")
  const [approvalValidUntil, setApprovalValidUntil] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("builder-sidebar-collapsed") === "true")

  const delegableGrants = useMemo(() => user ? delegableGrantParents(grants, user.id) : [], [grants, user])
  const exportAuthorities = useMemo(() => user ? exportAuthorityGrants(grants, user.id) : [], [grants, user])
  const selectedExportAuthority = exportAuthorities.find((grant) => grant.id === exportAuthorityId) ?? exportAuthorities[0]
  const selectedApprovalAuthority = exportAuthorities.find((grant) => grant.id === approvalAuthorityId) ?? exportAuthorities[0]
  const selectedParent = delegableGrants.find((grant) => grant.id === parentGrantId) ?? delegableGrants[0]
  const activeMembers = useMemo(() => members.filter((member) => member.state === "ACTIVE"), [members])
  const selectedBeneficiaryId = activeMembers.some((member) => member.userId === beneficiaryId)
    ? beneficiaryId
    : activeMembers[0]?.userId ?? ""
  const currentGrantDraft: GrantDraft | null = selectedParent
    ? grantDraft?.parentGrantId === selectedParent.id ? grantDraft : {
      parentGrantId: selectedParent.id,
      scopeType: selectedParent.scopeType,
      scopeId: selectedParent.scopeType === "ORGANIZATION" ? organizationId : selectedParent.scopeId,
      validUntil: selectedParent.validUntil ? selectedParent.validUntil.slice(0, 16) : "",
      canDelegate: false,
    }
    : null

  const load = useCallback(async () => {
    if (!accessToken || !organizationId) return
    setLoading(true)
    const [memberResult, invitationResult, grantResult] = await Promise.allSettled([
      listOrganizationMembers(accessToken, organizationId),
      listOrganizationInvitations(accessToken, organizationId),
      listOrganizationGrants(accessToken, organizationId),
    ])
    setMembers(memberResult.status === "fulfilled" ? memberResult.value : [])
    setInvitations(invitationResult.status === "fulfilled" ? invitationResult.value : [])
    setGrants(grantResult.status === "fulfilled" ? grantResult.value.items : [])
    setErrors({
      ...(memberResult.status === "rejected" ? { members: messageFor(memberResult.reason) } : {}),
      ...(invitationResult.status === "rejected" ? { invitations: messageFor(invitationResult.reason) } : {}),
      ...(grantResult.status === "rejected" ? { grants: messageFor(grantResult.reason) } : {}),
    })
    setLoading(false)
  }, [accessToken, organizationId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  function updateGrantDraft(update: Partial<Omit<GrantDraft, "parentGrantId">>) {
    if (currentGrantDraft) setGrantDraft({ ...currentGrantDraft, ...update })
  }

  async function run(action: () => Promise<unknown>, successMessage: string) {
    if (busy) return
    setBusy(true)
    setErrors({})
    setNotice("")
    try {
      await action()
      setNotice(successMessage)
      await load()
    } catch (error) {
      const status = error instanceof OrganizationRequestError ? error.status : undefined
      const section = status === 401 ? "session" : status === 403 ? "authority" : "operation"
      setErrors({ [section]: messageFor(error) })
    } finally {
      setBusy(false)
    }
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !organizationId) return
    await run(() => inviteOrganizationMember(accessToken, organizationId, email.trim()), "Convite enviado por e-mail.")
    setEmail("")
  }

  async function submitGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !organizationId || !selectedParent || !selectedBeneficiaryId || !currentGrantDraft) return
    const normalizedValidity = currentGrantDraft.validUntil ? new Date(currentGrantDraft.validUntil).toISOString() : null
    if (!scopesAllowedBy(selectedParent).includes(currentGrantDraft.scopeType)) {
      setErrors({ operation: "A abrangência escolhida não está disponível nesta permissão." })
      return
    }
    if (!validityAllowedByParent(selectedParent, normalizedValidity)) {
      setErrors({ operation: "A permissão compartilhada não pode durar mais que a permissão de origem." })
      return
    }
    const grant: CreatePermissionGrant = {
      beneficiaryUserId: selectedBeneficiaryId,
      action: selectedParent.action,
      scopeType: currentGrantDraft.scopeType,
      scopeId: currentGrantDraft.scopeType === "ORGANIZATION" ? organizationId : currentGrantDraft.scopeId.trim(),
      validUntil: normalizedValidity,
      canDelegate: currentGrantDraft.canDelegate,
      parentGrantId: selectedParent.id,
    }
    await run(() => createOrganizationGrant(accessToken, organizationId, grant), "Permissão concedida.")
  }

  async function submitExportGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !organizationId || !selectedExportAuthority || !selectedBeneficiaryId) return
    const normalizedValidity = exportValidUntil ? new Date(exportValidUntil).toISOString() : null
    if (!exportValidityAllowedByAuthority(selectedExportAuthority, normalizedValidity)) {
      setErrors({ operation: "A permissão de exportação não pode durar mais que a permissão de gestão." })
      return
    }
    await run(() => createOrganizationGrant(accessToken, organizationId, {
      beneficiaryUserId: selectedBeneficiaryId,
      action: "PUBLICATION_SUBMISSIONS_EXPORT",
      scopeType: exportScopeType,
      scopeId: exportScopeType === "ORGANIZATION" ? organizationId : exportScopeId.trim(),
      validUntil: normalizedValidity,
      canDelegate: exportCanDelegate,
      authorityGrantId: selectedExportAuthority.id,
    }), "Permissão de exportação concedida.")
  }

  async function submitApprovalGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !organizationId || !selectedApprovalAuthority || !selectedBeneficiaryId) return
    const normalizedValidity = approvalValidUntil ? new Date(approvalValidUntil).toISOString() : null
    if (!exportValidityAllowedByAuthority(selectedApprovalAuthority, normalizedValidity)) {
      setErrors({ operation: "A autoridade de aprovação não pode durar mais que a autoridade de gestão." })
      return
    }
    await run(() => createOrganizationGrant(accessToken, organizationId, {
      beneficiaryUserId: selectedBeneficiaryId,
      action: "PUBLICATION_APPROVE",
      scopeType: approvalScopeType,
      scopeId: approvalScopeType === "ORGANIZATION" ? organizationId : approvalScopeId.trim(),
      validUntil: normalizedValidity,
      canDelegate: false,
      authorityGrantId: selectedApprovalAuthority.id,
    }), "Autoridade de aprovação concedida.")
    setApprovalScopeId("")
    setApprovalValidUntil("")
  }

  async function submitAuditGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !organizationId || !selectedApprovalAuthority || !selectedBeneficiaryId) return
    await run(() => createOrganizationGrant(accessToken, organizationId, {
      beneficiaryUserId: selectedBeneficiaryId,
      action: "ORGANIZATION_AUDIT_READ",
      scopeType: "ORGANIZATION",
      scopeId: organizationId,
      validUntil: selectedApprovalAuthority.validUntil,
      canDelegate: false,
      authorityGrantId: selectedApprovalAuthority.id,
    }), "Acesso à trilha de auditoria concedido.")
  }

  const requireConfirm = (label: string) => window.confirm(label)

  return <MainLayout
    sidebar={<AppSidebar collapsed={sidebarCollapsed} onClose={() => setMobileOpen(false)} />}
    mobileSidebar={<AppSidebar onClose={() => setMobileOpen(false)} />}
    header={<AppHeader onToggleSidebar={() => {
      if (window.innerWidth < 768) setMobileOpen((value) => !value)
      else setSidebarCollapsed((value) => { localStorage.setItem("builder-sidebar-collapsed", String(!value)); return !value })
    }} sidebarCollapsed={sidebarCollapsed} showPlatformThemeToggle><PlatformBreadcrumb current="Membros e permissões" /></AppHeader>}
    mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} sidebarLabel="Navegação principal" contentClassName="overflow-y-auto"
  >
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-5 py-8 sm:px-8">
      <WorkAreaPageHeader title="Membros e permissões" description={selectedOrganization?.name ?? "Organização ativa"} />
      {notice ? <p role="status" className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">{notice}</p> : null}
      {errors.session ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">{errors.session} <Link to="/entrar" className="underline">Entrar novamente</Link></p> : null}
      {errors.authority ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">{errors.authority}</p> : null}
      {errors.operation ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">{errors.operation}</p> : null}
      {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando membros e permissões…</p> : null}

      <section aria-labelledby="members-heading" className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="members-heading" className="text-lg font-semibold">Membros</h2><p className="mt-1 text-sm text-muted-foreground">Vínculos ativos e revogados nesta organização.</p></div>
          <span className="text-sm tabular-nums text-muted-foreground">{activeMembers.length} ativos</span>
        </div>
        {errors.members ? <p role="alert" className="mt-4 text-sm text-destructive">{errors.members}</p> : members.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Não há membros nesta organização.</p> : <ul className="mt-4 divide-y">
          {members.map((member) => <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="truncate font-medium">{member.firstName} {member.lastName}</p><p className="truncate text-sm text-muted-foreground">{member.email}</p></div>
            <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">{member.state === "ACTIVE" ? "Ativo" : "Revogado"} · {member.role === "OWNER" ? "Proprietário" : "Membro"}</span>{member.state === "ACTIVE" ? <Button variant="outline" size="sm" disabled={busy || member.userId === user?.id} onClick={() => requireConfirm(`Revogar o acesso de ${member.email}? As permissões compartilhadas por essa pessoa também serão revogadas.`) && accessToken && void run(() => revokeOrganizationMember(accessToken, organizationId, member.userId), "Acesso revogado.")}>Revogar</Button> : null}</div>
          </li>)}
        </ul>}
      </section>

      <section aria-labelledby="invite-heading" className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 id="invite-heading" className="text-lg font-semibold">Convidar pessoa</h2>
        <p className="mt-1 text-sm text-muted-foreground">A pessoa confirma o endereço de e-mail e entra na organização como membro. As permissões são concedidas separadamente.</p>
        <form onSubmit={(event) => void submitInvite(event)} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1"><Input label="E-mail" type="email" name="email" value={email} onChange={setEmail} required placeholder="nome@exemplo.com" /></div>
          <Button type="submit" disabled={busy || !email.trim()}>Enviar convite</Button>
        </form>
      </section>

      <section aria-labelledby="invitations-heading" className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 id="invitations-heading" className="text-lg font-semibold">Convites</h2><p className="mt-1 text-sm text-muted-foreground">Convites expiram após sete dias.</p></div><span className="text-sm text-muted-foreground">{invitations.filter((invite) => invite.state === "PENDING").length} pendentes</span></div>
        {errors.invitations ? <p role="alert" className="mt-4 text-sm text-destructive">{errors.invitations}</p> : invitations.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum convite registrado.</p> : <ul className="mt-4 divide-y">
          {invitations.map((invite) => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{invite.email}</p><p className="text-sm text-muted-foreground">{invitationStateLabels[invite.state]} · expira {formatDate(invite.expiresAt)}</p></div>{invite.state === "PENDING" ? <Button variant="outline" size="sm" disabled={busy} onClick={() => requireConfirm(`Revogar o convite para ${invite.email}?`) && accessToken && void run(() => revokeOrganizationInvitation(accessToken, organizationId, invite.id), "Convite revogado.")}>Revogar convite</Button> : null}</li>)}
        </ul>}
      </section>

      <section aria-labelledby="grants-heading" className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="grants-heading" className="text-lg font-semibold">Permissões</h2><p className="mt-1 text-sm text-muted-foreground">Compartilhe com membros apenas as permissões que você pode conceder.</p></div><span className="text-sm text-muted-foreground">{grants.length} permissões</span></div>
        {errors.grants ? <p role="alert" className="mt-4 text-sm text-destructive">{errors.grants}</p> : null}
        {delegableGrants.length > 0 && activeMembers.length > 0 ? <form onSubmit={(event) => void submitGrant(event)} className="mt-5 grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
          <div className="space-y-1"><label className="text-sm font-medium">Conceder a</label><Select value={selectedBeneficiaryId} onValueChange={setBeneficiaryId}><SelectTrigger className="w-full"><SelectValue placeholder="Escolha um membro" /></SelectTrigger><SelectContent>{activeMembers.map((member) => <SelectItem key={member.userId} value={member.userId}>{member.firstName} {member.lastName} · {member.email}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Permissão de origem</label><Select value={selectedParent?.id ?? ""} onValueChange={setParentGrantId}><SelectTrigger className="w-full"><SelectValue placeholder="Escolha uma permissão que possa compartilhar" /></SelectTrigger><SelectContent>{delegableGrants.map((grant) => <SelectItem key={grant.id} value={grant.id}>{actionLabels[grant.action]} · {scopeLabels[grant.scopeType]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Permissão</label><Input aria-label="Permissão" value={selectedParent ? actionLabels[selectedParent.action] : ""} readOnly /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Abrangência</label><Select value={currentGrantDraft?.scopeType ?? "ORGANIZATION"} onValueChange={(value) => updateGrantDraft({ scopeType: value as GrantScopeType, scopeId: value === "ORGANIZATION" ? organizationId : selectedParent?.scopeType === "ORGANIZATION" ? "" : selectedParent?.scopeId ?? "" })} disabled={scopesAllowedBy(selectedParent ?? null).length < 2}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{scopesAllowedBy(selectedParent ?? null).map((scope) => <SelectItem key={scope} value={scope}>{scopeLabels[scope]}</SelectItem>)}</SelectContent></Select></div>
          {currentGrantDraft?.scopeType !== "ORGANIZATION" ? <div className="space-y-1"><label className="text-sm font-medium" htmlFor="grant-scope-id">ID do {scopeLabels[currentGrantDraft?.scopeType ?? "PROJECT"].toLocaleLowerCase("pt-BR")}</label><Input id="grant-scope-id" value={currentGrantDraft?.scopeId ?? ""} onChange={(scopeId) => updateGrantDraft({ scopeId })} readOnly={selectedParent?.scopeType !== "ORGANIZATION"} required placeholder="UUID do recurso" /></div> : null}
          <div className="space-y-1"><label className="text-sm font-medium" htmlFor="grant-valid-until">Válido até (opcional)</label><Input id="grant-valid-until" type="datetime-local" value={currentGrantDraft?.validUntil ?? ""} max={selectedParent?.validUntil?.slice(0, 16)} onChange={(validUntil) => updateGrantDraft({ validUntil })} /></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={currentGrantDraft?.canDelegate ?? false} onCheckedChange={(checked) => updateGrantDraft({ canDelegate: checked === true })} disabled={!selectedParent?.canDelegate} /> Permitir que essa pessoa compartilhe a permissão</label>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2"><Button type="submit" disabled={busy || !selectedParent || !selectedBeneficiaryId || (currentGrantDraft?.scopeType !== "ORGANIZATION" && !currentGrantDraft?.scopeId.trim())}>Conceder permissão</Button></div>
        </form> : <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">{activeMembers.length === 0 ? "É necessário haver membros ativos para receber permissões." : "Você não tem permissões disponíveis para compartilhar."}</p>}
        {exportAuthorities.length > 0 && activeMembers.length > 0 ? <form onSubmit={(event) => void submitExportGrant(event)} className="mt-4 grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
          <div className="md:col-span-2"><h3 className="font-medium">Conceder exportação de respostas</h3><p className="text-sm text-muted-foreground">O acesso à exportação é separado da permissão para consultar respostas.</p></div>
          <div className="space-y-1"><label className="text-sm font-medium">Conceder a</label><Select value={selectedBeneficiaryId} onValueChange={setBeneficiaryId}><SelectTrigger className="w-full"><SelectValue placeholder="Escolha um membro" /></SelectTrigger><SelectContent>{activeMembers.map((member) => <SelectItem key={member.userId} value={member.userId}>{member.firstName} {member.lastName} · {member.email}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Permissão para gerenciar membros</label><Select value={selectedExportAuthority?.id ?? ""} onValueChange={setExportAuthorityId}><SelectTrigger className="w-full"><SelectValue placeholder="Escolha uma permissão de gestão" /></SelectTrigger><SelectContent>{exportAuthorities.map((grant) => <SelectItem key={grant.id} value={grant.id}>Organização · {grant.validUntil ? `até ${formatDate(grant.validUntil)}` : "sem expiração"}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Abrangência da exportação</label><Select value={exportScopeType} onValueChange={(value) => { setExportScopeType(value as "ORGANIZATION" | "PROJECT"); if (value === "ORGANIZATION") setExportScopeId("") }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ORGANIZATION">Toda a organização</SelectItem><SelectItem value="PROJECT">Projeto</SelectItem></SelectContent></Select></div>
          {exportScopeType === "PROJECT" ? <div className="space-y-1"><label className="text-sm font-medium" htmlFor="export-scope-id">ID do projeto</label><Input id="export-scope-id" value={exportScopeId} onChange={setExportScopeId} required placeholder="UUID do projeto" /></div> : null}
          <div className="space-y-1"><label className="text-sm font-medium" htmlFor="export-valid-until">Válido até</label><Input id="export-valid-until" type="datetime-local" value={exportValidUntil} max={selectedExportAuthority?.validUntil?.slice(0, 16)} onChange={setExportValidUntil} required={Boolean(selectedExportAuthority?.validUntil)} /></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={exportCanDelegate} onCheckedChange={(checked) => setExportCanDelegate(checked === true)} disabled={!selectedExportAuthority?.canDelegate} /> Permitir que essa pessoa conceda acesso à exportação</label>
          <div className="md:col-span-2"><Button type="submit" disabled={busy || !selectedExportAuthority || !selectedBeneficiaryId || (exportScopeType === "PROJECT" && !exportScopeId.trim()) || (Boolean(selectedExportAuthority?.validUntil) && !exportValidUntil)}>Conceder exportação</Button></div>
        </form> : null}
        {exportAuthorities.length > 0 && activeMembers.length > 0 ? <form onSubmit={(event) => void submitApprovalGrant(event)} className="mt-4 grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
          <div className="md:col-span-2"><h3 className="font-medium">Conceder autoridade para aprovar publicações</h3><p className="text-sm text-muted-foreground">A concessão exige uma autoridade de gestão ativa e fica limitada à organização, ao projeto escolhido e à validade dessa autoridade. A permissão não é incluída automaticamente no acesso de proprietários.</p></div>
          <div className="space-y-1"><label className="text-sm font-medium">Conceder a</label><Select value={selectedBeneficiaryId} onValueChange={setBeneficiaryId}><SelectTrigger className="w-full"><SelectValue placeholder="Escolha um membro" /></SelectTrigger><SelectContent>{activeMembers.map((member) => <SelectItem key={member.userId} value={member.userId}>{member.firstName} {member.lastName} · {member.email}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Autoridade de gestão</label><Select value={selectedApprovalAuthority?.id ?? ""} onValueChange={setApprovalAuthorityId}><SelectTrigger className="w-full"><SelectValue placeholder="Escolha uma autoridade" /></SelectTrigger><SelectContent>{exportAuthorities.map((grant) => <SelectItem key={grant.id} value={grant.id}>Organização · {grant.validUntil ? `até ${formatDate(grant.validUntil)}` : "sem expiração"}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Abrangência da aprovação</label><Select value={approvalScopeType} onValueChange={(value) => { setApprovalScopeType(value as "ORGANIZATION" | "PROJECT"); if (value === "ORGANIZATION") setApprovalScopeId("") }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ORGANIZATION">Toda a organização</SelectItem><SelectItem value="PROJECT">Projeto</SelectItem></SelectContent></Select></div>
          {approvalScopeType === "PROJECT" ? <div className="space-y-1"><label className="text-sm font-medium" htmlFor="approval-scope-id">ID do projeto</label><Input id="approval-scope-id" value={approvalScopeId} onChange={setApprovalScopeId} required placeholder="UUID do projeto" /></div> : null}
          <div className="space-y-1"><label className="text-sm font-medium" htmlFor="approval-valid-until">Válido até</label><Input id="approval-valid-until" type="datetime-local" value={approvalValidUntil} max={selectedApprovalAuthority?.validUntil?.slice(0, 16)} onChange={setApprovalValidUntil} required={Boolean(selectedApprovalAuthority?.validUntil)} /></div>
          <div className="md:col-span-2"><Button type="submit" disabled={busy || !selectedApprovalAuthority || !selectedBeneficiaryId || (approvalScopeType === "PROJECT" && !approvalScopeId.trim()) || (Boolean(selectedApprovalAuthority?.validUntil) && !approvalValidUntil)}>Conceder aprovação</Button></div>
        </form> : null}
        {exportAuthorities.length > 0 && activeMembers.length > 0 ? <form onSubmit={(event) => void submitAuditGrant(event)} className="mt-4 grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
          <div className="md:col-span-2"><h3 className="font-medium">Conceder leitura da trilha de auditoria</h3><p className="text-sm text-muted-foreground">O acesso exige concessão explícita, abrange a organização e não pode ser delegado. A permissão não é provisionada automaticamente.</p></div>
          <div className="space-y-1"><label className="text-sm font-medium">Conceder a</label><Select value={selectedBeneficiaryId} onValueChange={setBeneficiaryId}><SelectTrigger className="w-full"><SelectValue placeholder="Escolha um membro" /></SelectTrigger><SelectContent>{activeMembers.map((member) => <SelectItem key={member.userId} value={member.userId}>{member.firstName} {member.lastName} · {member.email}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Autoridade de gestão</label><Select value={selectedApprovalAuthority?.id ?? ""} onValueChange={setApprovalAuthorityId}><SelectTrigger className="w-full"><SelectValue placeholder="Escolha uma autoridade" /></SelectTrigger><SelectContent>{exportAuthorities.map((grant) => <SelectItem key={grant.id} value={grant.id}>Organização · {grant.validUntil ? `até ${formatDate(grant.validUntil)}` : "sem expiração"}</SelectItem>)}</SelectContent></Select></div>
          <p className="text-sm text-muted-foreground">Validade: {formatDate(selectedApprovalAuthority?.validUntil ?? null)}</p>
          <div className="md:col-span-2"><Button type="submit" disabled={busy || !selectedApprovalAuthority || !selectedBeneficiaryId}>Conceder leitura</Button></div>
        </form> : null}
        {grants.length > 0 ? <ul className="mt-5 divide-y">{grants.map((grant) => {
          const beneficiary = members.find((member) => member.userId === grant.beneficiaryUserId)
          return <li key={grant.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="font-medium">{actionLabels[grant.action]}</p><p className="text-sm text-muted-foreground">{beneficiary?.email ?? grant.beneficiaryUserId} · {scopeLabels[grant.scopeType]} · {grantState(grant)}</p><p className="text-xs text-muted-foreground">Validade: {formatDate(grant.validUntil)} · {grant.canDelegate ? "Pode compartilhar" : "Não pode compartilhar"}</p></div>{grant.state === "ACTIVE" ? <Button variant="outline" size="sm" disabled={busy} onClick={() => requireConfirm("Revogar esta permissão e todas as permissões compartilhadas a partir dela?") && accessToken && void run(() => revokeOrganizationGrant(accessToken, organizationId, grant.id), "Permissão e acessos compartilhados a partir dela revogados.")}>Revogar</Button> : null}</li>
        })}</ul> : null}
      </section>
    </main>
  </MainLayout>
}
