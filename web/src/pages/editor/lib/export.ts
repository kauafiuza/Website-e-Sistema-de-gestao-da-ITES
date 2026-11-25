import { zipSync, strToU8 } from "fflate"
import { blockSources } from "@/utils/blocks/sources.generated"
import { portableMotionSources } from "@/utils/blocks/motion-sources"
import { portableReuiSources } from "@/utils/blocks/reui-sources"
import { blockAssetsForExport } from "@/utils/blocks/assets"
import propsSource from "@/utils/blocks/types.ts?raw"
import formFieldsSource from "@/utils/blocks/shared/FormFields.tsx?raw"
import urlsSource from "@/utils/blocks/shared/urls.ts?raw"
import stylesSource from "../block-styles.css?raw"
import blockFrameSource from "@/utils/blocks/shared/BlockFrame.tsx?raw"
import blockFrameCss from "@/utils/blocks/shared/block-frame.css?raw"
import { definitions } from "@/utils/blocks"
import type { Block, Page, BuilderDocument } from "./document"
import {
  generateProjectFiles,
  type GeneratedProject,
} from "./project-generator"
/** Compose block sources with isolated local helpers and shared imports. */
export function generatePage(page: Page, navbarBlock?: Block, footerBlock?: Block) {
  const navbarDefinition = navbarBlock
    ? definitions.get(navbarBlock.definitionId)
    : undefined
  const components = new Set(
    page.blocks
      .map((block) => definitions.get(block.definitionId)?.export.componentName)
      .filter((name) => name !== undefined)
  )
  if (navbarDefinition) components.add(navbarDefinition.export.componentName)
  const footerDefinition = footerBlock ? definitions.get(footerBlock.definitionId) : undefined
  if (footerDefinition) components.add(footerDefinition.export.componentName)
  const imports = new Map<string, Set<string>>()
  const frameSource = blockFrameSource
    .replace(/import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_match, importType: string | undefined, bindings: string, module: string) => {
      if (module.startsWith("@/utils/blocks/")) return ""
      const names = imports.get(module) ?? new Set<string>()
      bindings.split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => names.add(importType ? `type ${name}` : name))
      imports.set(module, names)
      return ""
    })
    .replace(/\bexport\s+(?=(?:function|const|class|type|interface)\b)/g, "")
  const source = [...components]
    .map((name) => {
      const raw = blockSources.get(name)
      if (!raw) throw new Error(`Fonte do bloco ausente: ${name}`)
      const body = raw
        .replace(
          /import\s+(\w+)\s+from\s+["']([^"']+\.(?:png|jpe?g|webp|svg))["'];?/g,
          (match, name: string, module: string) => blockAssetsForExport[module]
            ? `const ${name} = ${JSON.stringify(blockAssetsForExport[module])};`
            : match
        )
        .replace(
          /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g,
          (_match, bindings: string, module: string) => {
            if (module.startsWith("@/utils/blocks/")) return ""
            const names = imports.get(module) ?? new Set<string>()
            bindings.split(",").map((binding) => binding.trim()).filter(Boolean)
              .forEach((binding) => names.add(binding))
            imports.set(module, names)
            return ""
          }
        )
        .replace(/\bexport\s+(?=(?:function|const|class|type|interface)\b)/g, "")
        .replaceAll("bg-brand-amber", "bg-[#ffb110]")
        .replaceAll("bg-brand-coral", "bg-[#f64932]")
        .replaceAll("bg-brand-sky", "bg-[#62aef0]")
      return `const ${name} = (() => {\n${body}\nreturn ${name}\n})()`
    })
    .join("\n")
  const usesForms = page.blocks.some((block) => ["form-classic", "contact-classic", "contact-panel", "waitlist-classic", "demo-request"].includes(block.definitionId))
  const formFieldsInline = usesForms ? formFieldsSource
    .replace(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/g, (_match, bindings: string, module: string) => {
      if (module.startsWith("@/utils/blocks/")) return ""
      const names = imports.get(module) ?? new Set<string>()
      bindings.split(",").map((binding) => binding.trim()).filter(Boolean).forEach((binding) => names.add(binding))
      imports.set(module, names)
      return ""
    }).replace(/\bexport\s+(?=(?:function|const|class|type|interface)\b)/g, "") : ""
  const importSource = [...imports]
    .map(
      ([module, names]) =>
        `import { ${[...names].join(", ")} } from ${JSON.stringify(module)};`
    )
    .join("\n")
  const propertyTypes = propsSource.slice(
    0,
    propsSource.indexOf("export const textPropertyKeys")
  )
  const inlineHelpers = `type InlineEditor = object\ntype InlineTarget = object\nfunction InlineText({ value }: { value: string; editor?: InlineEditor; target?: InlineTarget; label?: string; as?: string; multiline?: boolean; className?: string; focusable?: boolean }) { return value }\nfunction InlineImage({ children }: { children: import("react").ReactNode; editor?: InlineEditor; url: string; alt: string }) { return children }`
  const seen = new Set<string>()
  const navbar = navbarDefinition && navbarBlock
    ? (() => {
        const navbarProps = {
          ...navbarBlock.props,
          items: (navbarBlock.props.items ?? []).map((item) =>
            item.href.startsWith("page:") ? { ...item, href: "#" } : item
          ),
        }
        return `      <BlockFrame props={${JSON.stringify(navbarProps)}} dataBlockId=${JSON.stringify(navbarBlock.id)} className="@container"><div data-project-navbar="true"><${navbarDefinition.export.componentName} props={${JSON.stringify(navbarProps)}} /></div></BlockFrame>`
      })()
    : ""
  const footer = footerDefinition && footerBlock
    ? `      <BlockFrame props={${JSON.stringify(footerBlock.props)}} dataBlockId=${JSON.stringify(footerBlock.id)} className="@container"><div data-project-footer="true"><${footerDefinition.export.componentName} props={${JSON.stringify(footerBlock.props)}} /></div></BlockFrame>`
    : ""
  const blocks = page.blocks
    .map((block) => {
      const definition = definitions.get(block.definitionId)
      if (!definition) return ""
      const anchor = seen.has(definition.category)
        ? ""
        : ` id=${JSON.stringify(definition.category)}`
      seen.add(definition.category)
      return `      <BlockFrame props={${JSON.stringify(block.props)}}${anchor} dataBlockId=${JSON.stringify(block.id)} className="@container"><${definition.export.componentName} props={${JSON.stringify(block.props)}} /></BlockFrame>`
    })
    .join("\n")
  return `// ${page.name.replace(/[\r\n]/g, " ")} — Generated by Studio Builder\n// React 19 + Tailwind CSS 4. Install the shadcn components listed in the imports.\n"use client";\n${importSource}\n${propertyTypes}\n${inlineHelpers}\n${urlsSource}\n${formFieldsInline}\n${frameSource}\n${source}\n\nexport default function GeneratedPage() {\n  return (\n    <main>\n      <style>{${JSON.stringify(`${stylesSource}\n${blockFrameCss}`)}}</style>\n${navbar}${navbar ? "\n" : ""}${blocks}${blocks && footer ? "\n" : ""}${footer}\n    </main>\n  )\n}\n`
}
export function componentSetupCommand(page: Page) {
  const components = [
    ...generatePage(page).matchAll(/from "@\/components\/ui\/([^"\n]+)"/g),
  ].map((match) => match[1])
  return components.length
    ? `npx shadcn@latest add ${components.join(" ")}`
    : null
}
export function exportRequirements(page: Page) {
  const code = generatePage(page)
  const components = [
    ...code.matchAll(/from "@\/components\/ui\/([^"\n]+)"/g),
  ].map((match) => match[1])
  return `# ${page.name.replace(/[\r\n]/g, " ")} — React page\n\nUse the TSX in an existing React 19 + TypeScript project with Tailwind CSS 4. Configure @/ to point to src/.\n\nRequired existing shadcn/ui components (Base UI APIs): ${components.join(", ") || "none"}. Add these official components with your project's shadcn CLI; do not use the Studio proprietary registry. Official component setup in an already configured Base UI project: ${componentSetupCommand(page) ?? "No additional components required"}. Their transitive dependencies include @base-ui/react, lucide-react, cn and class-variance-authority.\n\nKeep your shadcn theme CSS and semantic tokens: background, foreground, card, card-foreground, primary, primary-foreground, secondary, muted, muted-foreground, border, input, ring, destructive. The generated page includes scoped DESIGN.md layout/radius/focus styles. The default project uses Inter, warm paper #f6f5f4, white cards, blue #0075de, 1px borders and no card shadows. Dark mode follows your theme tokens. Tailwind must scan generated page files, including container-query utilities.\n\nRepeated items, image settings and section appearance are serialized into JSX. Links allow HTTPS/HTTP, mailto/tel, anchors and root-relative paths; images allow HTTP(S) and root-relative paths. Resources with no URL download a real text file from their configured content. Provide actual files for custom resource links.\n\nForms validate locally; they do not authenticate, send email, process payment or save account settings to a server. Tabs, accordions, filters, pagination, notifications and checklists are interactive local UI. These interaction states reset on remount; builder configuration persists separately. Connect service actions to your own APIs.\n\nThe source bundle contains pages/*.tsx, this guide and the portable builder document. It extends a compatible existing project rather than inventing a framework/bootstrap or backend. Each page is independent. No paid block source or installation identifiers are included.\n`
}
export function generateProjectBundle(document: BuilderDocument) {
  const project = generateProject(document)
  return JSON.stringify(
    {
      format: "studio-project-files-v2",
      name: project.name,
      files: Object.fromEntries(project.files.map((file) => [file.path, file.content])),
    },
    null,
    2
  )
}
export function generateProject(document: BuilderDocument): GeneratedProject {
  return generateProjectFiles(document, {
    blocks: Object.fromEntries(blockSources),
    assets: blockAssetsForExport,
    portableMotionSources,
    portableReuiSources,
    types: propsSource,
    urls: urlsSource,
    blockStyles: `${stylesSource}\n${blockFrameCss}`,
    blockFrame: blockFrameSource,
    formFields: formFieldsSource,
  })
}

export function generateProjectZip(project: GeneratedProject) {
  const entries = Object.fromEntries(
    project.files.map((file) => [
      `${project.name}/${file.path}`,
      strToU8(file.content),
    ])
  )
  return zipSync(entries, { level: 6 })
}
