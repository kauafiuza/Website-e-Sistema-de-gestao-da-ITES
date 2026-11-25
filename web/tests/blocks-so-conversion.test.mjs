import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const blockRoot = new URL("../src/utils/blocks/", import.meta.url)
const ids = [
  "blocks-so-dialog-01",
  "blocks-so-dialog-02",
  "blocks-so-dialog-03",
  "blocks-so-dialog-04",
  "blocks-so-dialog-06",
]

test("Blocks.so dialog metadata resolves to native editable sources", () => {
  const orders = new Set()
  for (const id of ids) {
    const directory = new URL(`applications/${id}/`, blockRoot)
    const metadata = JSON.parse(
      readFileSync(new URL(`${id}.json`, directory), "utf8"),
    )
    const source = new URL(metadata.export.sourceFile, blockRoot)
    const sourceText = readFileSync(source, "utf8")

    assert.equal(metadata.id, id)
    assert.ok(metadata.order > 0)
    assert.equal(orders.has(metadata.order), false)
    orders.add(metadata.order)
    assert.equal(metadata.export.tailwindVersion, 4)
    assert.ok(existsSync(source))
    assert.match(sourceText, new RegExp(`export function ${metadata.export.componentName}`))
    assert.match(sourceText, /className="builder-block/)
    assert.ok(metadata.editableProperties.includes("title"))
    assert.ok(metadata.editableProperties.includes("description"))
    assert.ok(metadata.editableProperties.includes("button"))
  }
})

test("Blocks.so dialog variants are registered in the generated catalog", () => {
  const catalog = readFileSync(
    new URL("../src/utils/blocks/catalog.generated.ts", import.meta.url),
    "utf8",
  )
  for (const id of ids) assert.ok(catalog.includes(id), `${id} is not registered`)
})
