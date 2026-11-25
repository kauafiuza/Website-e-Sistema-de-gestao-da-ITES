import { test } from "node:test"
import assert from "node:assert/strict"
import { unzipSync, zipSync, strFromU8 } from "fflate"
import * as typescript from "typescript"
import { generateProjectFiles, type ProjectSources } from "../src/pages/editor/lib/project-generator"
import type { BuilderDocument } from "../src/pages/editor/lib/document"

const sources: ProjectSources = {
  blocks: {
    HeroClassicBlock: `import type { BlockProps } from "@/utils/blocks/types";\nexport function HeroClassicBlock({ props }: { props: BlockProps }) { return <section>{props.title}</section>; }`,
    HeroSplitBlock: `import type { BlockProps } from "@/utils/blocks/types";\nexport function HeroSplitBlock({ props }: { props: BlockProps }) { return <section>{props.title}</section>; }`,
    ErrorClassicBlock: `import type { BlockProps } from "@/utils/blocks/types";\nexport function ErrorClassicBlock({ props }: { props: BlockProps }) { return <section>{props.title}</section>; }`,
    FormClassicBlock: `import { FormFields } from "@/utils/blocks/shared/FormFields";\nimport type { BlockProps } from "@/utils/blocks/types";\nexport function FormClassicBlock({ props }: { props: BlockProps }) { return <FormFields fields={props.formFields ?? []} />; }`,
  },
  types: `export interface BlockProps { title: string; description: string; button: string; href: string; eyebrow: string; }`,
  urls: `export function safeHref(value: string) { return value; }`,
  blockStyles: ".builder-block { overflow-wrap: anywhere; }",
  formFields: `import type { FormField } from "@/utils/blocks/types";\nexport function FormFields({ fields }: { fields: FormField[] }) { return <div>{fields.length}</div>; }`,
}

function makeDocument(): BuilderDocument {
  return {
    version: 1,
    name: "Launch Project",
    activePageId: "page-a",
    pages: [
      {
        id: "page-a",
        name: "Länding",
        slug: "landing",
        blocks: [
          { id: "a1", definitionId: "hero-classic", props: { title: "Configured heading", description: "Description", button: "Start", href: "#start", eyebrow: "INTRO", items: [{ id: "first", title: "First item", description: "Readable content", href: "#first", value: "1", features: ["Alpha", "Beta"] }] } },
          { id: "a2", definitionId: "hero-classic", props: { title: "Second instance", description: "Second description", button: "Continue", href: "#continue", eyebrow: "NEXT" } },
          { id: "a3", definitionId: "hero-split", props: { title: "Split variant", description: "Split description", button: "Explore", href: "#explore", eyebrow: "FEATURED" } },
        ],
      },
      {
        id: "page-b",
        name: "Landing",
        slug: "landing-2",
        blocks: [
          { id: "b1", definitionId: "hero-classic", props: { title: "About page", description: "About description", button: "Learn", href: "#learn", eyebrow: "ABOUT" } },
        ],
      },
      { id: "page-c", name: "CON", slug: "con", blocks: [] },
      { id: "page-d", name: "東京 ✨", slug: "page4", blocks: [] },
    ],
  }
}

test("project generator exports every page using safe, collision-free names", () => {
  const project = generateProjectFiles(makeDocument(), sources)
  const paths = project.files.map((file) => file.path)
  const pagePaths = paths.filter((path) => path.startsWith("src/pages/"))
  assert.deepEqual(pagePaths.sort(), [
    "src/pages/Landing-2.tsx",
    "src/pages/Landing.tsx",
    "src/pages/Page4.tsx",
    "src/pages/PageCON.tsx",
  ])
  assert.equal(new Set(pagePaths.map((path) => path.toLowerCase())).size, 4)
  assert.ok(paths.includes("src/App.tsx"))
  assert.equal(paths.filter((path) => path === "src/components/blocks/sections/hero-classic/hero-classic.tsx").length, 1)
  assert.ok(paths.includes("src/components/blocks/sections/hero-split/hero-split.tsx"))
})

test("page components preserve block order and separate props", () => {
  const project = generateProjectFiles(makeDocument(), sources)
  const landing = project.files.find((file) => file.path === "src/pages/Landing.tsx")!.content
  assert.ok(landing.indexOf("HeroClassicBlock") < landing.indexOf("HeroSplitBlock"))
  assert.equal((landing.match(/<HeroClassicBlock/g) ?? []).length, 2)
  assert.ok(landing.includes("Configured heading"))
  assert.ok(landing.includes("Second instance"))
  assert.ok(landing.includes('title: "Configured heading"'))
  assert.ok(landing.includes('props={{\n            title: "Configured heading"'))
  assert.ok(!landing.includes('props={{"title":'))
  assert.ok(landing.includes('items: [\n              {\n                id: "first"'))
  assert.ok(landing.includes('features: [\n                  "Alpha",\n                  "Beta"'))
  assert.ok(landing.includes("@/components/blocks/sections/hero-classic/hero-classic"))
  assert.ok(landing.includes("id=\"hero\""))
  const app = project.files.find((file) => file.path === "src/App.tsx")!.content
  assert.ok(app.includes('path="/landing-2"'))
  assert.ok(app.includes('path="/page4"'))
})

test("generated TSX parses and complete project ZIP preserves file paths and contents", () => {
  const project = generateProjectFiles(makeDocument(), sources)
  for (const file of project.files.filter((entry) => entry.path.endsWith(".tsx"))) {
    const result = typescript.transpileModule(file.content, {
      compilerOptions: { jsx: typescript.JsxEmit.ReactJSX, target: typescript.ScriptTarget.ES2022 },
      reportDiagnostics: true,
    })
    assert.deepEqual(result.diagnostics, [], file.path)
  }
  const packed = Object.fromEntries(project.files.map((file) => [`${project.name}/${file.path}`, Buffer.from(file.content)]))
  const archive = unzipSync(zipSync(packed))
  assert.ok(archive["launch-project/src/pages/Landing.tsx"])
  assert.ok(strFromU8(archive["launch-project/src/pages/Landing.tsx"]).includes("Configured heading"))
})

test("block with local source exports without a shared renderer", () => {
  const document = makeDocument()
  document.pages[0].blocks = [{
    id: "error-local",
    definitionId: "error-classic",
    props: { title: "Not found", description: "Missing page", button: "Home", href: "/", eyebrow: "404" },
  }]
  const project = generateProjectFiles(document, sources)
  const local = project.files.find((file) => file.path === "src/components/blocks/sections/error-classic/error-classic.tsx")
  assert.ok(local?.content.includes("export function ErrorClassicBlock"))
  assert.ok(!project.files.some((file) => file.path.includes("/renderers/")))
})

test("configured form export includes its field renderer", () => {
  const document = makeDocument()
  document.pages[0].blocks = [{ id: "form-one", definitionId: "form-classic", props: { title: "Form", description: "", button: "Send", href: "#", eyebrow: "", formFields: [{ id: "email", label: "Email", type: "email", required: true }] } }]
  const project = generateProjectFiles(document, sources)
  assert.ok(project.files.some((file) => file.path === "src/components/blocks/FormFields.tsx"))
  const form = project.files.find((file) => file.path.endsWith("forms/form-classic/form-classic.tsx"))!
  assert.ok(form.content.includes('from "@/components/blocks/FormFields"'))
})
