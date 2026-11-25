import { useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { generateProject, generateProjectZip } from "../lib/export"
import type { BuilderDocument } from "../lib/document"
import type { GeneratedProjectFile } from "../lib/project-generator"

interface FileNode {
  name: string
  path: string
  file?: GeneratedProjectFile
  children?: FileNode[]
}

function createTree(files: GeneratedProjectFile[]) {
  const root: FileNode = { name: "", path: "", children: [] }
  for (const file of files) {
    let current = root
    const parts = file.path.split("/")
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/")
      current.children ??= []
      let child = current.children.find((node) => node.name === part)
      if (!child) {
        child = {
          name: part,
          path,
          children: index === parts.length - 1 ? undefined : [],
        }
        current.children.push(child)
      }
      if (index === parts.length - 1) child.file = file
      else current = child
    })
  }
  const sort = (nodes: FileNode[]) => {
    nodes.sort((left, right) => {
      if (!!left.children !== !!right.children) return left.children ? -1 : 1
      return left.name.localeCompare(right.name)
    })
    nodes.forEach((node) => node.children && sort(node.children))
  }
  sort(root.children ?? [])
  return root.children ?? []
}

function FileIcon({ file }: { file: GeneratedProjectFile }) {
  const className = "size-3.5 shrink-0"
  if (file.language === "json")
    return <FileJson className={className} aria-hidden="true" />
  if (file.language === "md")
    return <FileText className={className} aria-hidden="true" />
  return <FileCode2 className={className} aria-hidden="true" />
}

function TreeNodes({
  nodes,
  expanded,
  selectedPath,
  onToggle,
  onSelect,
}: {
  nodes: FileNode[]
  expanded: Set<string>
  selectedPath: string
  onToggle: (path: string) => void
  onSelect: (file: GeneratedProjectFile) => void
}) {
  return nodes.map((node) => {
    const isFolder = !!node.children
    if (isFolder) {
      const isExpanded = expanded.has(node.path)
      const FolderIcon = isExpanded ? FolderOpen : Folder
      return (
        <div key={node.path}>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-expanded={isExpanded}
            title={node.path}
            className="flex h-7 w-full items-center gap-1.5 rounded px-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => onToggle(node.path)}
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <FolderIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{node.name}</span>
          </Button>
          {isExpanded && node.children && (
            <div className="ml-3 border-l pl-1">
              <TreeNodes
                nodes={node.children}
                expanded={expanded}
                selectedPath={selectedPath}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            </div>
          )}
        </div>
      )
    }
    if (!node.file) return null
    return (
      <Button
        key={node.path}
        type="button"
        variant="ghost"
        size="xs"
        aria-current={selectedPath === node.path ? "page" : undefined}
        aria-label={node.path}
        title={node.path}
        className={`flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-ring ${selectedPath === node.path ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        onClick={() => onSelect(node.file!)}
      >
        <FileIcon file={node.file} />
        <span className="truncate">{node.name}</span>
      </Button>
    )
  })
}

function downloadFile(name: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = window.document.createElement("a")
  anchor.href = url
  anchor.download = name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function ExportDialog({
  document,
  setExportOpen,
}: {
  document: BuilderDocument
  setExportOpen: (open: boolean) => void
}) {
  const project = useMemo(() => generateProject(document), [document])
  const tree = useMemo(() => createTree(project.files), [project.files])
  const firstPage = project.files.find((file) =>
    file.path.startsWith("src/pages/")
  )
  const [selectedPath, setSelectedPath] = useState(
    firstPage?.path ?? project.files[0]?.path ?? ""
  )
  const [expanded, setExpanded] = useState(
    () =>
      new Set(["src", "src/pages", "src/components", "src/components/blocks"])
  )
  const [notice, setNotice] = useState("")
  const [mobileView, setMobileView] = useState("files")
  const selectedFile =
    project.files.find((file) => file.path === selectedPath) ?? project.files[0]

  async function copySelected() {
    if (!selectedFile) return
    try {
      await navigator.clipboard.writeText(selectedFile.content)
      setNotice(`${selectedFile.path} copiado`)
    } catch {
      setNotice(
        "Área de transferência indisponível. Selecione o código e copie manualmente."
      )
    }
  }

  function downloadProject() {
    const bytes = generateProjectZip(project)
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    const url = URL.createObjectURL(
      new Blob([buffer], { type: "application/zip" })
    )
    const anchor = window.document.createElement("a")
    anchor.href = url
    anchor.download = `${project.name}.zip`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    setNotice("Arquivo ZIP do projeto baixado")
  }

  return (
    <Dialog open onOpenChange={setExportOpen}>
      <DialogContent
        className="builder-ui glass-elevated flex h-[min(90dvh,860px)] max-h-[90dvh] min-h-[min(600px,90dvh)] flex-col gap-3 overflow-hidden p-4 sm:gap-4 sm:p-6"
        style={{ width: "94vw", maxWidth: "1200px", transition: "none" }}
      >
        <div className="shrink-0 pr-8">
          <DialogTitle>Exportar projeto</DialogTitle>
          <DialogDescription className="mt-1.5">
            Explore os arquivos gerados ou baixe o projeto React completo.
          </DialogDescription>
        </div>
        <div
          role="group"
          aria-label="Prévia da exportação"
          className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-muted p-1 md:hidden"
        >
          <Button
            type="button"
            size="sm"
            variant={mobileView === "files" ? "secondary" : "ghost"}
            aria-pressed={mobileView === "files"}
            onClick={() => setMobileView("files")}
          >
            Arquivos
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mobileView === "code" ? "secondary" : "ghost"}
            aria-pressed={mobileView === "code"}
            onClick={() => setMobileView("code")}
          >
            Código
          </Button>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-lg bg-muted/50 md:grid-cols-[260px_minmax(0,1fr)]">
          <section
            aria-label="Arquivos do projeto"
            className={`${mobileView === "files" ? "flex" : "hidden"} min-h-0 flex-col border-b md:flex md:border-r md:border-b-0`}
          >
            <h3 className="border-b px-3 py-2 text-xs font-medium">
              Arquivos do projeto
            </h3>
            <ScrollArea className="min-h-0 flex-1 p-2">
              <TreeNodes
                nodes={tree}
                expanded={expanded}
                selectedPath={selectedPath}
                onToggle={(path) =>
                  setExpanded((current) => {
                    const next = new Set(current)
                    if (next.has(path)) next.delete(path)
                    else next.add(path)
                    return next
                  })
                }
                onSelect={(file) => {
                  setSelectedPath(file.path)
                  setMobileView("code")
                }}
              />
            </ScrollArea>
          </section>
          <section
            aria-label="Prévia do código"
            className={`${mobileView === "code" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col md:flex`}
          >
            <div className="flex h-9 shrink-0 items-center border-b px-3 text-xs text-muted-foreground">
              <span className="truncate font-mono">
                {selectedFile?.path ?? "Nenhum arquivo gerado"}
              </span>
            </div>
            <ScrollArea className="min-h-0 min-w-0 flex-1">
              <pre className="min-h-full min-w-max p-4 text-xs leading-5">
                <code>{selectedFile?.content ?? ""}</code>
              </pre>
            </ScrollArea>
          </section>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="min-h-4 shrink-0 text-xs text-muted-foreground"
        >
          {notice}
        </p>
        <DialogFooter className="shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {project.files.length} arquivos · {document.pages.length} páginas
          </span>
          <div className="flex w-full flex-nowrap justify-end gap-1 sm:w-auto sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Copiar arquivo"
              disabled={!selectedFile}
              onClick={copySelected}
            >
              <Copy />
              <span className="hidden sm:inline">Copiar arquivo</span>
              <span className="sm:hidden">Copiar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!selectedFile}
              onClick={() =>
                selectedFile &&
                downloadFile(
                  selectedFile.path.split("/").pop() ?? "source.txt",
                  selectedFile.content,
                  selectedFile.language === "json"
                    ? "application/json"
                    : "text/plain"
                )
              }
            >
              <Download />
              <span className="hidden sm:inline">Baixar arquivo</span>
              <span className="sm:hidden">Arquivo</span>
            </Button>
            <Button
              size="sm"
              aria-label="Baixar projeto"
              onClick={downloadProject}
            >
              <Package />
              <span className="hidden sm:inline">Baixar projeto</span>
              <span className="sm:hidden">Projeto</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
