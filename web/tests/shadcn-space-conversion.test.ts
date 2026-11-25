import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import * as typescript from "typescript"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const blockDir = resolve(root, "src/utils/blocks/sections/hero-space-03")
const metadata = JSON.parse(
  readFileSync(resolve(blockDir, "hero-space-03.json"), "utf8"),
)
const source = readFileSync(resolve(blockDir, "hero-space-03.tsx"), "utf8")

test("Shadcn Space Hero 03 metadata matches its Builder source contract", () => {
  assert.equal(metadata.id, "hero-space-03")
  assert.equal(metadata.category, "hero-space")
  assert.equal(metadata.export.componentName, "HeroSpace03Block")
  assert.equal(
    metadata.export.sourceFile,
    "sections/hero-space-03/hero-space-03.tsx",
  )
  assert.equal(metadata.export.tailwindVersion, 4)
  assert.ok(metadata.order > 0)
  assert.deepEqual(metadata.defaults.items.map((item: { id: string }) => item.id), [
    "inicio",
    "trabalho",
    "sobre",
    "contato",
  ])
  for (const key of ["title", "description", "button", "href", "eyebrow"]) {
    assert.equal(typeof metadata.defaults[key], "string")
  }
})

test("Shadcn Space Hero 03 uses safe, editable content and export dependencies", () => {
  assert.match(source, /className="builder-block/)
  assert.match(source, /InlineText/)
  assert.match(source, /InlineImage/)
  assert.match(source, /safeHref\(item\.href\)/)
  assert.match(source, /safeImageUrl\(props\.imageUrl/)
  assert.match(source, /from "motion\/react"/)
  assert.ok(metadata.export.dependencies.includes("motion"))
  assert.ok(metadata.export.dependencies.includes("lucide-react"))

  const result = typescript.transpileModule(source, {
    compilerOptions: {
      jsx: typescript.JsxEmit.ReactJSX,
      target: typescript.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  })
  assert.deepEqual(result.diagnostics, [])
})
