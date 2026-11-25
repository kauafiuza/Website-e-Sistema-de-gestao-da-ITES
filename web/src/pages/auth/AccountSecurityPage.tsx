import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Bell,
  Check,
  Copy,
  Link2,
  LockKeyhole,
  Mail,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react"
import { Input } from "@/components/motion/input"
import { OTPInput } from "@/components/motion/otp-input"
import { Button } from "@/components/ui/button"
import { useInfinitePage } from "@/hooks/use-infinite-page"
import InfiniteScroll from "react-infinite-scroll-component"
import { useAuth } from "@/context/auth/auth.context"
import { webPaths } from "@/router/helpers/route-paths"
import { authApi } from "@/services/auth/auth.service"
import type {
  AuthSession,
  BrowserAccount,
  RecoveryCodes,
  TwoFactorSetup,
  TwoFactorStatus,
} from "@/types/auth/auth.types"
import { AccountLayout } from "@/layout/AccountLayout"
import { PasswordInput } from "./components/PasswordInput"
import { SubmitButton } from "./components/SubmitButton"
import { errorMessage, passwordError, validEmail } from "./lib/validation"

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
})

export default function AccountSecurityPage() {
  const navigate = useNavigate()
  const {
    user,
    accessToken,
    acceptGrant,
    switchAccount,
    logoutAll,
    clearSession,
  } = useAuth()
  const sessionPages = useInfinitePage<AuthSession>(10)
  const { loadFirst: loadFirstSessionPage, loadMore: loadMoreSessionPage } = sessionPages
  const sessions = sessionPages.items
  const [accounts, setAccounts] = useState<BrowserAccount[]>([])
  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus | null>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [recovery, setRecovery] = useState<RecoveryCodes | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [passwordCurrent, setPasswordCurrent] = useState("")
  const [emailCurrent, setEmailCurrent] = useState("")
  const [factorPassword, setFactorPassword] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [passwordCode, setPasswordCode] = useState("")
  const [emailCode, setEmailCode] = useState("")
  const [factorCode, setFactorCode] = useState("")
  const [deleteCode, setDeleteCode] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [section, setSection] = useState<
    "security" | "account" | "connected" | "notifications" | "preferences"
  >("security")

  const loadSessions = useCallback(
    (page: number, size: number) => {
      if (!accessToken) return Promise.reject(new Error("Sessão indisponível"))
      return authApi.sessions(accessToken, page, size)
    },
    [accessToken],
  )

  useEffect(() => {
    if (!accessToken) return
    let active = true
    Promise.all([
      loadFirstSessionPage(loadSessions),
      authApi.twoFactorStatus(accessToken),
      authApi.accounts(),
    ])
      .then(([, factor, accountList]) => {
        if (active) {
          setTwoFactor(factor)
          setAccounts(accountList)
        }
      })
      .catch((cause) => {
        if (active)
          setError(
            errorMessage(
              cause,
              "Não foi possível carregar os dados da conta. Atualize a página."
            )
          )
      })
    return () => {
      active = false
    }
  }, [accessToken, loadFirstSessionPage, loadSessions])

  async function loadMoreSessions() {
    try {
      await loadMoreSessionPage(loadSessions)
    } catch {
      setError("Não foi possível carregar mais sessões.")
    }
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await action()
      setNotice(success)
    } catch (cause) {
      setError(
        errorMessage(
          cause,
          "Não foi possível concluir a ação. Tente novamente."
        )
      )
    } finally {
      setBusy(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !user) return
    const invalid = passwordError(newPassword, user.email, [
      user.firstName,
      user.lastName,
    ])
    if (invalid) return setError(invalid)
    await run(async () => {
      const grant = await authApi.changePassword(accessToken, {
        currentPassword: passwordCurrent,
        newPassword,
        ...(passwordCode ? { code: passwordCode } : {}),
      })
      await acceptGrant(grant)
      setPasswordCurrent("")
      setNewPassword("")
      setPasswordCode("")
    }, "Senha alterada. As outras sessões foram encerradas.")
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    if (!validEmail(newEmail)) return setError("Informe um novo e-mail válido.")
    await run(async () => {
      await authApi.changeEmail(accessToken, {
        newEmail: newEmail.trim(),
        currentPassword: emailCurrent,
        ...(emailCode ? { code: emailCode } : {}),
      })
      setNewEmail("")
      setEmailCurrent("")
      setEmailCode("")
    }, "Enviamos um link de confirmação para o novo e-mail.")
  }

  async function startTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken) return
    await run(async () => {
      setSetup(await authApi.twoFactorStart(accessToken, factorPassword))
      setFactorPassword("")
    }, "Adicione a chave no aplicativo autenticador e confirme o código.")
  }

  async function confirmTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !/^\d{6}$/.test(factorCode))
      return setError("Digite os 6 dígitos do aplicativo.")
    await run(async () => {
      const result = await authApi.twoFactorConfirm(accessToken, factorCode)
      setRecovery(result)
      setSetup(null)
      setFactorCode("")
      setTwoFactor(await authApi.twoFactorStatus(accessToken))
    }, "Verificação em duas etapas ativada. Guarde seus códigos de recuperação.")
  }

  async function regenerate() {
    if (!accessToken) return
    await run(async () => {
      setRecovery(
        await authApi.twoFactorRegenerate(
          accessToken,
          factorPassword,
          factorCode
        )
      )
      setFactorPassword("")
      setFactorCode("")
      setTwoFactor(await authApi.twoFactorStatus(accessToken))
    }, "Novos códigos gerados. Os anteriores não funcionam mais.")
  }

  async function disable() {
    if (!accessToken) return
    await run(async () => {
      await authApi.twoFactorDisable(accessToken, factorPassword, factorCode)
      setTwoFactor(await authApi.twoFactorStatus(accessToken))
      setFactorPassword("")
      setFactorCode("")
      setRecovery(null)
    }, "Verificação em duas etapas desativada.")
  }

  async function revokeSession(session: AuthSession) {
    if (!accessToken) return
    await run(async () => {
      await authApi.revokeSession(accessToken, session.id)
      if (session.current) {
        clearSession()
        navigate(webPaths.login, { replace: true })
      } else {
        await loadFirstSessionPage(loadSessions)
      }
    }, "Sessão encerrada.")
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || deleteConfirm !== "EXCLUIR") return
    await run(async () => {
      await authApi.deleteAccount(accessToken, {
        password: deletePassword,
        ...(deleteCode ? { code: deleteCode } : {}),
      })
      clearSession()
      navigate(webPaths.login, { replace: true })
    }, "Conta excluída.")
  }

  return (
    <AccountLayout
      title="Configurações"
      description="Gerencie suas informações, segurança e preferências da conta."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <nav
          aria-label="Configurações da conta"
          className="rounded-xl border border-border bg-card p-2"
        >
          {(
            [
              ["security", "Segurança", "Senha, e-mail e sessões", ShieldCheck],
              ["account", "Conta", "Dados e exclusão", UserRound],
              [
                "connected",
                "Contas conectadas",
                "Alternar entre contas",
                Link2,
              ],
              ["notifications", "Notificações", "Comunicações da conta", Bell],
              [
                "preferences",
                "Preferências",
                "Experiência no editor",
                Settings2,
              ],
            ] as const
          ).map(([key, label, detail, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              aria-current={section === key ? "page" : undefined}
              className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${section === key ? "bg-accent" : ""}`}
            >
              {section === key ? (
                <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary" />
              ) : null}
              <Icon
                className={`size-5 shrink-0 ${section === key ? "text-primary" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {detail}
                </span>
              </span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-5">
          <div>
            <h2 className="text-xl font-semibold">
              {section === "security"
                ? "Configurações"
                : section === "account"
                  ? "Conta"
                  : section === "connected"
                    ? "Contas conectadas"
                    : section === "notifications"
                      ? "Notificações"
                      : "Preferências"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {section === "security"
                ? "Gerencie senha, endereço de e-mail, sessões e recursos de proteção da conta."
                : section === "account"
                  ? "Consulte os dados do perfil e gerencie sua conta."
                  : section === "connected"
                    ? "Gerencie as contas vinculadas neste navegador."
                    : "Esta categoria ainda não possui configurações disponíveis."}
            </p>
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p
              role="status"
              className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground"
            >
              {notice}
            </p>
          ) : null}

          {section === "security" ? (
            <section
              aria-labelledby="password-heading"
              className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <h2
                id="password-heading"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <LockKeyhole
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />{" "}
                Senha
              </h2>
              <p className="text-sm text-muted-foreground">
                Atualize sua senha para manter sua conta protegida.
              </p>
              <form onSubmit={changePassword} className="space-y-3">
                <PasswordInput
                  label="Senha atual"
                  name="current-password"
                  autoComplete="current-password"
                  value={passwordCurrent}
                  onChange={setPasswordCurrent}
                />
                <PasswordInput
                  label="Nova senha"
                  name="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={setNewPassword}
                />
                {twoFactor?.enabled ? (
                  <Input
                    label="Código do aplicativo"
                    name="password-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    spellCheck={false}
                    value={passwordCode}
                    onChange={setPasswordCode}
                  />
                ) : null}
                <SubmitButton pending={busy}>Atualizar senha</SubmitButton>
              </form>
            </section>
          ) : null}

          {section === "security" ? (
            <section
              aria-labelledby="email-heading"
              className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <h2
                id="email-heading"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <Mail
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />{" "}
                E-mail principal
              </h2>
              <p className="text-sm text-muted-foreground">
                Altere o endereço usado para acessar sua conta.
              </p>
              <form onSubmit={changeEmail} className="space-y-3">
                <Input
                  label="Novo e-mail"
                  name="new-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={newEmail}
                  onChange={setNewEmail}
                />
                <PasswordInput
                  label="Senha atual"
                  name="email-password"
                  autoComplete="current-password"
                  value={emailCurrent}
                  onChange={setEmailCurrent}
                />
                {twoFactor?.enabled ? (
                  <Input
                    label="Código do aplicativo"
                    name="email-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    spellCheck={false}
                    value={emailCode}
                    onChange={setEmailCode}
                  />
                ) : null}
                <SubmitButton pending={busy}>Atualizar e-mail</SubmitButton>
              </form>
            </section>
          ) : null}

          {section === "security" || section === "connected" ? (
            <section
              aria-labelledby="accounts-heading"
              className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <h2
                id="accounts-heading"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                Contas conectadas
              </h2>
              {accounts.length ? (
                <ul className="space-y-2">
                  {accounts.map((account) => (
                    <li
                      key={account.userId}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <span className="min-w-0 truncate text-sm">
                        {account.firstName} {account.lastName}
                        <span className="block truncate text-xs text-muted-foreground">
                          {account.email}
                        </span>
                      </span>
                      {account.active ? (
                        <span className="text-xs font-semibold text-primary">
                          Atual
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await switchAccount(account.userId)
                              setAccounts(await authApi.accounts())
                            }, "Conta trocada.")
                          }
                        >
                          Trocar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Apenas esta conta está conectada.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`${webPaths.login}?addAccount=1`}
                  className="text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Plus className="mr-1 inline size-4" aria-hidden="true" />{" "}
                  Adicionar conta
                </Link>
                <Button
                  type="button"
                  variant="link"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await logoutAll()
                      navigate(webPaths.login, { replace: true })
                    }, "Sessões encerradas.")
                  }
                  className="text-sm font-semibold text-destructive hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Sair de todas
                </Button>
              </div>
            </section>
          ) : null}

          {section === "security" ? (
            <section
              aria-labelledby="two-factor-heading"
              className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <h2
                id="two-factor-heading"
                className="flex items-center gap-2 text-lg font-bold"
              >
                <ShieldCheck className="size-5" aria-hidden="true" />{" "}
                Verificação em duas etapas
              </h2>
              <p className="text-sm text-muted-foreground">
                {twoFactor?.enabled
                  ? `Ativa. ${twoFactor.recoveryCodesRemaining} códigos de recuperação restantes.`
                  : "Adicione uma confirmação no aplicativo autenticador ao entrar."}
              </p>
              {!twoFactor?.enabled && !setup ? (
                <form onSubmit={startTwoFactor} className="space-y-3">
                  <PasswordInput
                    label="Senha atual"
                    name="setup-password"
                    autoComplete="current-password"
                    value={factorPassword}
                    onChange={setFactorPassword}
                  />
                  <SubmitButton pending={busy}>
                    Começar configuração
                  </SubmitButton>
                </form>
              ) : null}
              {setup ? (
                <form onSubmit={confirmTwoFactor} className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Adicione esta chave no seu aplicativo autenticador:
                  </p>
                  <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background p-3">
                    <code className="min-w-0 flex-1 text-sm break-all">
                      {setup.secret}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Copiar chave"
                      onClick={() =>
                        void navigator.clipboard.writeText(setup.secret)
                      }
                    >
                      <Copy aria-hidden="true" />
                    </Button>
                  </div>
                  <a
                    href={setup.uri}
                    className="inline-block text-sm font-semibold text-primary hover:underline"
                  >
                    Abrir no aplicativo
                  </a>
                  <OTPInput
                    label="Código de confirmação"
                    value={factorCode}
                    onChange={setFactorCode}
                    length={6}
                    className="max-w-full overflow-x-auto [&_fieldset>div>div]:w-9 sm:[&_fieldset>div>div]:w-12"
                    aria-label="Código de confirmação"
                  />
                  <SubmitButton pending={busy}>Ativar verificação</SubmitButton>
                </form>
              ) : null}
              {twoFactor?.enabled ? (
                <div className="space-y-3">
                  <PasswordInput
                    label="Senha atual"
                    name="two-factor-password"
                    autoComplete="current-password"
                    value={factorPassword}
                    onChange={setFactorPassword}
                  />
                  <Input
                    label="Código do aplicativo"
                    name="two-factor-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    spellCheck={false}
                    value={factorCode}
                    onChange={setFactorCode}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void regenerate()}
                    >
                      Gerar novos códigos
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void disable()}
                    >
                      Desativar 2FA
                    </Button>
                  </div>
                </div>
              ) : null}
              {recovery ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Check className="size-4" aria-hidden="true" /> Guarde os
                    códigos agora
                  </p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Cada código funciona uma vez. Eles não aparecerão novamente.
                  </p>
                  <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {recovery.codes.map((value) => (
                      <li key={value}>{value}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() =>
                      void navigator.clipboard.writeText(
                        recovery.codes.join("\n")
                      )
                    }
                  >
                    <Copy aria-hidden="true" /> Copiar códigos
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {section === "security" ? (
            <section
              aria-labelledby="sessions-heading"
              className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <h2
                id="sessions-heading"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                Sessões
              </h2>
              {sessions.length ? (
                <InfiniteScroll dataLength={sessions.length} next={() => void loadMoreSessions()} hasMore={sessionPages.hasMore} loader={sessionPages.loadingMore ? <p className="py-3 text-center text-xs text-muted-foreground">Carregando sessões…</p> : null} scrollableTarget="account-layout-scroll">
                <ul className="space-y-2">
                  {sessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <span className="min-w-0 text-sm">
                        <span className="block truncate">
                          {session.userAgent || "Navegador desconhecido"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {session.current ? "Esta sessão · " : ""}Último uso:{" "}
                          {dateTime.format(new Date(session.lastSeenAt))}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void revokeSession(session)}
                      >
                        Encerrar
                      </Button>
                    </li>
                  ))}
                </ul>
                </InfiniteScroll>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma sessão encontrada.
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={busy || sessionPages.totalElements < 2}
                onClick={() =>
                  accessToken &&
                  void run(async () => {
                    await authApi.revokeOtherSessions(accessToken)
                    await loadFirstSessionPage(loadSessions)
                  }, "Outras sessões encerradas.")
                }
              >
                Encerrar outras sessões
              </Button>
            </section>
          ) : null}

          {section === "account" ? (
            <section className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
              <h3 className="text-lg font-semibold">Informações da conta</h3>
              <p className="text-sm break-all text-muted-foreground">
                {user?.email}
              </p>
            </section>
          ) : null}
          {section === "account" ? (
            <section
              aria-labelledby="delete-heading"
              className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <h2
                id="delete-heading"
                className="flex items-center gap-2 text-lg font-bold text-destructive"
              >
                <Trash2 className="size-5" aria-hidden="true" /> Excluir conta
              </h2>
              <p className="text-sm text-muted-foreground">
                A exclusão remove sua conta e todos os projetos vinculados a
                ela.
              </p>
              {!deleteOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                >
                  Revisar exclusão
                </Button>
              ) : (
                <form
                  onSubmit={deleteAccount}
                  className="space-y-3 rounded-xl border border-destructive/30 p-4"
                >
                  <p className="text-sm font-medium">
                    Digite EXCLUIR e confirme com sua senha.
                  </p>
                  <Input
                    label="Confirmação"
                    name="delete-confirm"
                    autoComplete="off"
                    value={deleteConfirm}
                    onChange={setDeleteConfirm}
                  />
                  <PasswordInput
                    label="Senha atual"
                    name="delete-password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={setDeletePassword}
                  />
                  {twoFactor?.enabled ? (
                    <Input
                      label="Código do aplicativo"
                      name="delete-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      spellCheck={false}
                      value={deleteCode}
                      onChange={setDeleteCode}
                    />
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDeleteOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={busy || deleteConfirm !== "EXCLUIR"}
                    >
                      Excluir conta e projetos
                    </Button>
                  </div>
                </form>
              )}
            </section>
          ) : null}
          {section === "notifications" || section === "preferences" ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Nenhuma configuração disponível nesta categoria no momento.
            </div>
          ) : null}
        </div>
      </div>
    </AccountLayout>
  )
}
