import { definitions } from "@/utils/blocks"
import type { BuilderDocument, Page } from "./document"
import {
  defaultProjectTheme,
  projectFontPackage,
  themeCss,
} from "./project-theme"

export type ProjectLanguage = "tsx" | "ts" | "css" | "json" | "md" | "html"

export interface GeneratedProjectFile {
  path: string
  content: string
  language: ProjectLanguage
}

export interface GeneratedProject {
  name: string
  files: GeneratedProjectFile[]
  shadcnComponents: string[]
  externalDependencies: string[]
}

export interface ProjectSources {
  blocks: Record<string, string>
  assets?: Record<string, string>
  portableMotionSources?: Record<string, string>
  portableReuiSources?: Record<string, string>
  types: string
  urls: string
  blockStyles: string
  blockFrame?: string
  formFields?: string
}

function safeStem(name: string, fallback: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  let stem = normalized
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")
  if (!stem) stem = fallback
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem))
    stem = `Page${stem}`
  return stem
}

function uniqueStems(names: string[]) {
  const used = new Set<string>()
  return names.map((name, index) => {
    const base = safeStem(name, `Page${index + 1}`)
    let candidate = base
    let suffix = 2
    while (used.has(candidate.toLocaleLowerCase())) {
      candidate = `${base}-${suffix}`
      suffix += 1
    }
    used.add(candidate.toLocaleLowerCase())
    return candidate
  })
}

function safeProjectName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "studio-project"
}

function collectBlockSource(source: string, assets: Record<string, string> = {}) {
  const imports = new Map<string, Set<string>>()
  source = source.replace(
    /import\s+(\w+)\s+from\s+["']([^"']+\.(?:png|jpe?g|webp|svg))["'];?/g,
    (match, name: string, module: string) => assets[module]
      ? `const ${name} = ${JSON.stringify(assets[module])};`
      : match
  )
  const body = source.replace(
    /import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g,
    (_match, importType: string | undefined, bindings: string, originalModule: string) => {
      let module = originalModule
      if (module === "@/utils/blocks/shared/inline-editing")
        module = "@/components/blocks/runtime"
      else if (module === "@/utils/blocks/shared/urls") module = "@/lib/urls"
      else if (module === "@/utils/blocks/shared/FormFields") module = "@/components/blocks/FormFields"
      else if (module === "@/utils/blocks/types")
        module = "@/components/blocks/types"
      const names = imports.get(module) ?? new Set<string>()
      bindings
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => names.add(importType ? `type ${name}` : name))
      imports.set(module, names)
      return ""
    }
  )
  const importSource = [...imports]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([module, names]) => {
      const bindings = [...names].sort().join(", ")
      return `import { ${bindings} } from ${JSON.stringify(module)};`
    })
    .join("\n")
  return `${importSource}\n${body
    .replaceAll("bg-brand-amber", "bg-[#ffb110]")
    .replaceAll("bg-brand-coral", "bg-[#f64932]")
    .replaceAll("bg-brand-sky", "bg-[#62aef0]")}`
}

function formatPropValue(value: unknown, indent: number): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    const padding = " ".repeat(indent)
    const entries = value.map((item) => `${" ".repeat(indent + 2)}${formatPropValue(item, indent + 2)}`)
    return `[\n${entries.join(",\n")}\n${padding}]`
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined)
    if (entries.length === 0) return "{}"
    const padding = " ".repeat(indent)
    const fields = entries.map(([key, item]) => {
      const property = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
      return `${" ".repeat(indent + 2)}${property}: ${formatPropValue(item, indent + 2)}`
    })
    return `{\n${fields.join(",\n")}\n${padding}}`
  }
  return JSON.stringify(value)
}

function routePath(page: Page, pages: Page[]) {
  const segments: string[] = []
  const visited = new Set<string>()
  let current: Page | undefined = page
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    segments.unshift(current.slug)
    current = current.parentPageId ? pages.find((candidate) => candidate.id === current?.parentPageId) : undefined
  }
  return segments.join("/")
}

function buildPageSource(page: Page, stem: string, document: BuilderDocument) {
  const imports = new Map<string, string[]>()
  imports.set("BlockFrame", ["@/components/blocks/BlockFrame"])
  const navbar = document.navbar ? definitions.get(document.navbar.definitionId) : undefined
  const navbarElement = navbar ? (() => {
    const component = navbar.export.componentName
    imports.set(component, [`@/components/blocks/${navbar.export.sourceFile.replace(/\.tsx$/, "")}`])
    const props = {
      ...document.navbar!.props,
      items: (document.navbar!.props.items ?? []).map((item) => item.href.startsWith("page:")
        ? { ...item, href: (() => { const target = document.pages.find((candidate) => candidate.id === item.href.slice(5)); return target ? `/${routePath(target, document.pages)}` : "#" })() }
        : item),
    }
    const positioning = document.navbar!.props.scrollBehavior === "sticky" ? " sticky top-0 z-40" : ""
    return `      <BlockFrame props={${formatPropValue(props, 8)}} className="@container${positioning}" dataBlockId=${JSON.stringify(document.navbar!.id)}>\n        <div data-project-navbar="true"><${component} props={${formatPropValue(props, 10)}} /></div>\n      </BlockFrame>`
  })() : ""
  const footer = document.footer ? definitions.get(document.footer.definitionId) : undefined
  const footerElement = footer ? (() => {
    const component = footer.export.componentName
    imports.set(component, [`@/components/blocks/${footer.export.sourceFile.replace(/\.tsx$/, "")}`])
    return `      <BlockFrame props={${formatPropValue(document.footer!.props, 8)}} dataBlockId=${JSON.stringify(document.footer!.id)} className="@container"><div data-project-footer="true"><${component} props={${formatPropValue(document.footer!.props, 10)}} /></div></BlockFrame>`
  })() : ""
  const elements = page.blocks.flatMap((block) => {
    const definition = definitions.get(block.definitionId)
    if (!definition) return []
    const name = definition.export.componentName
    const sourcePath = definition.export.sourceFile.replace(/\.tsx$/, "")
    imports.set(name, [`@/components/blocks/${sourcePath}`])
    return [
      `      <BlockFrame props={${formatPropValue(block.props, 8)}}${elementsSeen(page, block, definition.category) ? "" : ` id=${JSON.stringify(definition.category)}`} dataBlockId=${JSON.stringify(block.id)} className="@container">\n        <${name} props={${formatPropValue(block.props, 10)}} />\n      </BlockFrame>`,
    ]
  })
  const importLines = [...imports]
    .map(([name, [path]]) => `import { ${name} } from ${JSON.stringify(path)};`)
    .join("\n")
  return `${importLines}\n\nexport default function ${`Page${stem.replace(/[^a-zA-Z0-9]/g, "")}`}() {\n  return (\n    <main>\n${navbarElement}${elements.length ? "\n" : ""}${elements.join("\n")}${elements.length && footerElement ? "\n" : ""}${footerElement}\n    </main>\n  );\n}\n`
}

function elementsSeen(page: Page, block: Page["blocks"][number], category: string) {
  return page.blocks
    .slice(0, page.blocks.indexOf(block))
    .some((previous) => definitions.get(previous.definitionId)?.category === category)
}

function buildApp(pages: Page[], stems: string[], smoothScroll: boolean) {
  const imports = pages
    .map((_, index) => `import Page${stems[index].replace(/[^a-zA-Z0-9]/g, "")} from "@/pages/${stems[index]}";`)
    .join("\n")
  const routes = pages
    .map((_, index) => {
      const component = `Page${stems[index].replace(/[^a-zA-Z0-9]/g, "")}`
      const path = routePath(pages[index], pages)
      return `      <Route path="/${path}" element={<${component} />} />`
    })
    .join("\n")
  const firstPath = routePath(pages[0], pages)
  const motionImport = smoothScroll ? `import { SmoothScroll } from "@/components/motion/smooth-scroll";\n` : ""
  const routeTree = `      <Routes>\n        <Route path="/" element={<Navigate to="/${firstPath}" replace />} />\n${routes}\n        <Route path="*" element={<Navigate to="/${firstPath}" replace />} />\n      </Routes>`
  return `${imports}\nimport { useEffect } from "react";\nimport { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";\n${motionImport}\nexport default function App() {\n  useEffect(() => {\n    const toggleTheme = () => document.documentElement.classList.toggle("dark");\n    window.addEventListener("builder:toggle-theme", toggleTheme);\n    return () => window.removeEventListener("builder:toggle-theme", toggleTheme);\n  }, []);\n  return (\n    <BrowserRouter>\n${smoothScroll ? `      <SmoothScroll>\n${routeTree}\n      </SmoothScroll>` : routeTree}\n    </BrowserRouter>\n  );\n}\n`
}

function getImports(source: string) {
  const imports = new Set<string>()
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g))
    imports.add(match[1])
  return imports
}

function normalizePortableModule(module: string, from?: string) {
  const withoutExtension = module.replace(/\.tsx?$/, "")
  if (withoutExtension.startsWith("@/")) return withoutExtension
  if (!withoutExtension.startsWith(".") || !from) return undefined
  const parts = from.slice(2).split("/")
  parts.pop()
  for (const segment of withoutExtension.split("/")) {
    if (!segment || segment === ".") continue
    if (segment === "..") parts.pop()
    else parts.push(segment)
  }
  return `@/${parts.join("/")}`
}

function collectPortableSources(
  source: string,
  available: Record<string, string> = {}
) {
  const pending = [...getImports(source)]
    .map((module) => normalizePortableModule(module))
    .filter((module): module is string => Boolean(module))
  const collected = new Map<string, string>()
  while (pending.length) {
    const module = pending.pop()!
    if (collected.has(module)) continue
    const componentSource = available[module]
    if (!componentSource) continue
    collected.set(module, componentSource)
    for (const importedModule of getImports(componentSource)) {
      const normalized = normalizePortableModule(importedModule, module)
      if (normalized && available[normalized] && !collected.has(normalized)) pending.push(normalized)
    }
  }
  return collected
}

function portableSourcePath(module: string) {
  const relativePath = module.slice(2)
  return `src/${relativePath}.${relativePath.startsWith("lib/") && !relativePath.endsWith("presence-gate") ? "ts" : "tsx"}`
}

function language(path: string): ProjectLanguage {
  const extension = path.split(".").pop()
  if (extension === "tsx" || extension === "ts" || extension === "css" || extension === "json" || extension === "html")
    return extension
  return "md"
}

export function generateProjectFiles(
  document: BuilderDocument,
  sources: ProjectSources
): GeneratedProject {
  const projectTheme = document.theme ?? defaultProjectTheme()
  const themeFontPackages = [...new Set([
    projectFontPackage(projectTheme.headingFont),
    projectFontPackage(projectTheme.bodyFont),
  ].filter((packageName): packageName is string => Boolean(packageName)))]
  const fontStylesheetImports = themeFontPackages
    .map((packageName) => `@import "${packageName}";`)
    .join("\n")
  const stems = uniqueStems(document.pages.map((page) => page.name))
  const definitionsUsed = new Map<string, NonNullable<ReturnType<typeof definitions.get>>>()
  for (const page of document.pages) {
    for (const block of page.blocks) {
      const definition = definitions.get(block.definitionId)
      if (!definition) continue
      definitionsUsed.set(definition.id, definition)
    }
  }
  if (document.navbar) {
    const definition = definitions.get(document.navbar.definitionId)
    if (definition) definitionsUsed.set(definition.id, definition)
  }
  if (document.footer) {
    const definition = definitions.get(document.footer.definitionId)
    if (definition) definitionsUsed.set(definition.id, definition)
  }

  const files: GeneratedProjectFile[] = []
  const add = (path: string, content: string) =>
    files.push({ path, content, language: language(path) })

  add("src/components/blocks/types.ts", sources.types)
  add("src/components/blocks/runtime.tsx", `import type { ReactNode } from "react";\n\nexport type InlineTarget = object;\nexport type InlineEditor = object;\nexport function InlineText({ value }: { value: string; editor?: InlineEditor; target?: InlineTarget; label?: string; as?: string; multiline?: boolean; className?: string; focusable?: boolean }) { return value; }\nexport function InlineImage({ children }: { children: ReactNode; editor?: InlineEditor; url: string; alt: string; target?: InlineTarget; altTarget?: InlineTarget; className?: string }) { return children; }\n`)
  const defaultFrameSource = `import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";\nimport type { BlockProps } from "@/utils/blocks/types";\nexport function blockFrameStyle(props: BlockProps): CSSProperties { const presets = { wide: 1440, standard: 1120, narrow: 760 }; const width = props.layoutWidth ?? "full"; const maxWidth = width === "custom" ? Math.min(2400, Math.max(320, props.layoutMaxWidth ?? 1120)) : width === "full" ? undefined : presets[width]; const gutter = Math.min(128, Math.max(0, props.layoutGutter ?? 0)); return { width: \`calc(100% - \${gutter * 2}px)\`, maxWidth: maxWidth ? \`\${maxWidth}px\` : "none", marginInline: "auto" }; }\nexport function BlockFrame({ props, children, className, id, dataBlockId, animate = true }: { props: BlockProps; children: ReactNode; className?: string; id?: string; dataBlockId?: string; animate?: boolean }) { const ref = useRef<HTMLDivElement>(null); const animation = animate ? props.blockAnimation ?? "none" : "none"; const [visible, setVisible] = useState(animation === "none"); useEffect(() => { const element = ref.current; if (!element || animation === "none") { setVisible(true); return; } if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { setVisible(true); return; } setVisible(false); const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) return; setVisible(true); observer.disconnect(); }, { threshold: 0.12 }); observer.observe(element); return () => observer.disconnect(); }, [animation]); return <div ref={ref} id={id} data-block-id={dataBlockId} data-block-animation={animation === "none" ? undefined : animation} data-visible={visible ? "true" : "false"} className={className} style={blockFrameStyle(props)}>{children}</div>; }\n`
  add("src/components/blocks/BlockFrame.tsx", collectBlockSource(sources.blockFrame ?? defaultFrameSource))
  add("src/lib/urls.ts", sources.urls)
  add("src/styles/blocks.css", sources.blockStyles)
  if (sources.formFields && [...definitionsUsed.keys()].some((id) => ["form-classic", "contact-classic", "contact-panel", "waitlist-classic", "demo-request"].includes(id))) {
    add("src/components/blocks/FormFields.tsx", collectBlockSource(sources.formFields))
  }

  for (const definition of definitionsUsed.values()) {
    const componentName = definition.export.componentName
    const source = sources.blocks[componentName]
    if (!source) throw new Error(`Fonte do bloco ausente: ${componentName}`)
    add(`src/components/blocks/${definition.export.sourceFile}`, collectBlockSource(source, sources.assets))
  }

  document.pages.forEach((page, index) =>
    add(`src/pages/${stems[index]}.tsx`, buildPageSource(page, stems[index], document))
  )
  const needsSmoothScroll = [...definitionsUsed.values()].some((definition) => sources.blocks[definition.export.componentName]?.includes("@/components/motion/smooth-scroll"))
  add("src/App.tsx", buildApp(document.pages, stems, needsSmoothScroll))
  add(
    "src/main.tsx",
    `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./index.css";\n\ncreateRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);\n`
  )
  add(
    "src/index.css",
    `@import "tailwindcss";\n@import "tw-animate-css";\n@import "./styles/blocks.css";\n${fontStylesheetImports}\n@custom-variant dark (&:is(.dark *));\n\n@theme inline {\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --color-card: var(--card);\n  --color-card-foreground: var(--card-foreground);\n  --color-popover: var(--popover);\n  --color-popover-foreground: var(--popover-foreground);\n  --color-primary: var(--primary);\n  --color-primary-foreground: var(--primary-foreground);\n  --color-secondary: var(--secondary);\n  --color-secondary-foreground: var(--secondary-foreground);\n  --color-muted: var(--muted);\n  --color-muted-foreground: var(--muted-foreground);\n  --color-accent: var(--accent);\n  --color-accent-foreground: var(--accent-foreground);\n  --color-border: var(--border);\n  --color-input: var(--border);\n  --color-ring: var(--ring);\n  --radius-lg: var(--radius);\n}\n:root { --background:#f3f4f6; --foreground:#111827; --card:#fff; --card-foreground:#111827; --popover:#fff; --popover-foreground:#111827; --primary:#006dc8; --primary-foreground:#fff; --secondary:#f3f4f6; --secondary-foreground:#111827; --muted:#f3f4f6; --muted-foreground:#5b6882; --accent:#cfe9fd; --accent-foreground:#111827; --border:#e5e7eb; --ring:#006dc8; --radius:0.75rem; color-scheme:light; }\n.dark { --background:#171717; --foreground:#f4f4f4; --card:#202020; --card-foreground:#f4f4f4; --popover:#252525; --popover-foreground:#f4f4f4; --primary:#009afc; --primary-foreground:#001018; --secondary:#282828; --secondary-foreground:#f4f4f4; --muted:#282828; --muted-foreground:#b8b8b8; --accent:#303030; --accent-foreground:#f4f4f4; --border:#383838; --ring:#009afc; color-scheme:dark; }\n${document.theme ? themeCss(document.theme) : ""}\n* { box-sizing:border-box; border-color:var(--border); }\nbody { margin:0; min-width:320px; background:var(--background); color:var(--foreground); font-family:var(--builder-body-font, "Inter Variable"),ui-sans-serif,system-ui,sans-serif; }\n`
  )
  add("index.html", `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${document.name.replace(/[<>&"']/g, "")}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`)
  add("vite.config.ts", `import { resolve } from "node:path";\nimport tailwindcss from "@tailwindcss/vite";\nimport react from "@vitejs/plugin-react";\nimport { defineConfig } from "vite";\n\nexport default defineConfig({ plugins:[react(),tailwindcss()], resolve:{ alias:{ "@":resolve(import.meta.dirname,"./src") } } });\n`)
  add("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2022", useDefineForClassFields: true, lib: ["ES2022", "DOM", "DOM.Iterable"], types: ["vite/client"], module: "ESNext", skipLibCheck: true, moduleResolution: "Bundler", allowImportingTsExtensions: true, verbatimModuleSyntax: true, moduleDetection: "force", noEmit: true, jsx: "react-jsx", strict: true, noUnusedLocals: true, noUnusedParameters: true, paths: { "@/*": ["./src/*"] } }, include: ["src", "vite.config.ts"] }, null, 2))
  add("components.json", JSON.stringify({ $schema: "https://ui.shadcn.com/schema.json", style: "base-rhea", rsc: false, tsx: true, tailwind: { config: "", css: "src/index.css", baseColor: "neutral", cssVariables: true, prefix: "" }, iconLibrary: "lucide", rtl: false, aliases: { components: "@/components", utils: "@/lib/utils", ui: "@/components/ui", lib: "@/lib", hooks: "@/hooks" } }, null, 2))

  const blockImports = [...definitionsUsed.values()]
    .map((definition) => sources.blocks[definition.export.componentName] ?? "")
    .map((source) => collectBlockSource(source, sources.assets))
    .join("\n")
  const portableSources = collectPortableSources(blockImports, {
    ...sources.portableMotionSources,
    ...sources.portableReuiSources,
  })
  for (const [module, source] of portableSources) add(portableSourcePath(module), source)
  const allImports = [...getImports(blockImports), ...[...portableSources.values()].flatMap((source) => [...getImports(source)])]
  const shadcnComponents = [...new Set(allImports)]
    .filter((module) => module.startsWith("@/components/ui/"))
    .map((module) => module.slice("@/components/ui/".length))
    .sort()
  const externalModules = [...new Set(allImports)]
    .filter((module) => !module.startsWith("@/") && !module.startsWith(".") && !module.startsWith("/"))
    .map((module) => module.startsWith("@") ? module.split("/").slice(0, 2).join("/") : module.split("/")[0])
  const externalDependencies = [...new Set([
    "@base-ui/react", "lucide-react", "react", "react-dom", "react-router-dom",
    ...externalModules,
    ...themeFontPackages,
  ])]
  const projectDependencies: Record<string, string> = {
    "@base-ui/react": "^1.8.0",
    "class-variance-authority": "^0.7.1",
    clsx: "^2.1.1",
    cn: "^0.4.0",
    "lucide-react": "^1.53.0",
    lenis: "^1.3.27",
    motion: "^14.3.0",
    "@paper-design/shaders-react": "^0.0.81",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "tailwind-merge": "^3.0.0",
  }
  for (const packageName of externalModules) {
    if (!(packageName in projectDependencies)) projectDependencies[packageName] = "latest"
  }
  for (const packageName of themeFontPackages) projectDependencies[packageName] = "^5.3.0"
  add("package.json", JSON.stringify({ name: safeProjectName(document.name), private: true, version: "1.0.0", type: "module", scripts: { dev: "vite", build: "tsc --noEmit && vite build", preview: "vite preview" }, dependencies: projectDependencies, devDependencies: { "@tailwindcss/vite": "^4.0.0", "@types/node": "^24.0.0", "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0", "@vitejs/plugin-react": "^6.0.0", shadcn: "^4.21.4", tailwindcss: "^4.0.0", "tw-animate-css": "^1.4.0", typescript: "^6.0.0", vite: "^8.0.0" } }, null, 2))
  const setup = shadcnComponents.length
    ? `npx shadcn@latest add ${shadcnComponents.join(" ")}`
    : "No shadcn components are required by this project."
  add("README.md", `# ${document.name || "Studio project"}\n\nA multi-page React, TypeScript, Vite and Tailwind CSS 4 project generated from Studio Builder. All Builder pages are available at their generated routes; the root redirects to the first page. Each block lives in its own folder under src/components/blocks and can be reused across pages.\n\n## Setup\n\n\`\`\`sh\nnpm install\n${setup}\nnpm run dev\n\`\`\`\n\nThe shadcn command uses the official shadcn registry and the included components.json configuration. No proprietary block registry IDs are used.\n\nRequired runtime libraries are listed in package.json. The generated UI primitives use the Base UI shadcn architecture.\n\nForms perform local validation only. They do not authenticate, send messages, process payments, or persist server data. Connect those actions to your services before production use.\n`)
  add("document.builder.json", JSON.stringify(document, null, 2))

  return {
    name: safeProjectName(document.name),
    files: files.sort((left, right) => left.path.localeCompare(right.path)),
    shadcnComponents,
    externalDependencies,
  }
}

