import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Link } from "react-router-dom"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useRef, useState, useId, type Dispatch } from "react"
import {
  BookOpenText,
  ChevronDown,
  Download,
  FilePlus2,
  Folder,
  FolderOpen,
  Pencil,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  initialDocument,
  parseDocument,
  builderDraftStorageKey,
  type Action,
  type BuilderDocument,
} from "../lib/document"
import { useAuth } from "@/context/auth/auth.context"
import { useOrganization } from "@/context/organization/organization.context"

export function ProjectMenu({
  document,
  dispatch,
  onNotice,
  persisted,
}: {
  document: BuilderDocument
  dispatch: Dispatch<Action>
  onNotice: (message: string) => void
  persisted: boolean
}) {
  const { user } = useAuth()
  const { selectedOrganization } = useOrganization()
  const nameId = useId()
  const file = useRef<HTMLInputElement>(null)
  const [replacement, setReplacement] = useState<BuilderDocument | null>(null)
  const [rename, setRename] = useState(false)
  const [name, setName] = useState("")
  function save() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(document, null, 2)], {
        type: "application/json",
      })
    )
    const link = window.document.createElement("a")
    link.href = url
    link.download = `${document.name.replace(/[^a-z0-9]/gi, "-") || "project"}.builder.json`
    link.click()
    URL.revokeObjectURL(url)
    onNotice("Projeto baixado. Abra o arquivo para continuar a edição.")
  }
  function startLocal(next: BuilderDocument) {
    if (persisted) {
      try {
        if (!user || !selectedOrganization) throw new Error("Organização indisponível")
        localStorage.setItem(builderDraftStorageKey(user.id, selectedOrganization.id), JSON.stringify(next))
        window.location.assign("/editor")
      } catch { onNotice("Não foi possível abrir o projeto local. Baixe uma cópia antes de continuar.") }
    } else dispatch({ type: "load", document: next })
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              aria-label="Ações do projeto"
              title="Ações do projeto"
            />
          }
        >
          <Folder />
          <span className="hidden lg:inline">Projeto</span>
          <ChevronDown className="hidden lg:inline" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="builder-ui glass-frosted min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setReplacement(initialDocument())}>
              <FilePlus2 />
              Novo projeto
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setName(document.name)
                setRename(true)
              }}
            >
              <Pencil />
              Renomear projeto
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link to="/projects" />}><Folder />Meus projetos</DropdownMenuItem>
            <DropdownMenuItem onClick={save}>
              <Save />
              Baixar arquivo do projeto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => file.current?.click()}>
              <FolderOpen />
              Abrir arquivo do projeto
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hidden"
              onClick={async () => {
                const { generateProjectBundle } = await import("../lib/export")
                const url = URL.createObjectURL(
                  new Blob([generateProjectBundle(document)], {
                    type: "application/json",
                  })
                )
                const link = window.document.createElement("a")
                link.href = url
                link.download = "project.sources.json"
                link.click()
                URL.revokeObjectURL(url)
                onNotice(
                  "Pacote de código baixado com todas as páginas, dependências e o documento do editor."
                )
              }}
            >
              <Download />
              Baixar pacote de código
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              render={
                <a
                  href="https://ui.shadcn.com/docs/components"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <BookOpenText />
              Ajuda e documentação
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={file}
        hidden
        type="file"
        accept=".json"
        aria-label="Arquivo do projeto"
        onChange={async (event) => {
          const selected = event.target.files?.[0]
          event.target.value = ""
          if (!selected) return
          try {
            const restored = parseDocument(await selected.text())
            if (restored) setReplacement(restored)
            else
              onNotice(
                "Arquivo de projeto inválido ou incompatível. Escolha um JSON válido; o projeto atual foi mantido."
              )
          } catch {
            onNotice(
              "Não foi possível ler o arquivo. Tente outro; o projeto atual foi mantido."
            )
          }
        }}
      />
      <AlertDialog
        open={replacement !== null}
        onOpenChange={(open) => {
          if (!open) setReplacement(null)
        }}
      >
        <AlertDialogContent className="builder-ui glass-elevated">
          <AlertDialogTitle>Substituir o projeto atual?</AlertDialogTitle>
          <AlertDialogDescription>
            Baixe o arquivo do projeto antes para manter uma cópia. Desfazer
            pode recuperar o projeto anterior durante esta sessão.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReplacement(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (replacement) startLocal(replacement)
                setReplacement(null)
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={rename} onOpenChange={setRename}>
        <DialogContent className="builder-ui glass-elevated">
          <DialogTitle>Renomear projeto</DialogTitle>
          <DialogDescription>Escolha um nome para o projeto.</DialogDescription>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              dispatch({ type: "project-name", name })
              setRename(false)
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={nameId}>Nome do projeto</FieldLabel>
                <Input
                  id={nameId}
                  aria-label="Nome do projeto"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={80}
                />
              </Field>
              <Button type="submit">Salvar nome do projeto</Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
