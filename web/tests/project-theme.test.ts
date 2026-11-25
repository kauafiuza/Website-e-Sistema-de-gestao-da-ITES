import assert from "node:assert/strict"
import { test } from "node:test"
import { defaultProjectTheme, themeCss } from "../src/pages/editor/lib/project-theme"
import { initialDocument, parseDocument, reduceDocument } from "../src/pages/editor/lib/document"
import { generateProjectFiles } from "../src/pages/editor/lib/project-generator"

test("project theme stays in the document and exported CSS", () => {
  const theme = defaultProjectTheme()
  theme.light.primary = "#123456"
  theme.dark.primary = "#abcdef"
  theme.mode = "dark"
  const document = reduceDocument(initialDocument(), { type: "project-theme", theme })
  const restored = parseDocument(JSON.stringify(document))
  assert.equal(restored?.theme?.light.primary, "#123456")
  assert.equal(restored?.theme?.dark.primary, "#abcdef")
  assert.match(themeCss(theme), /:root \{\n {2}--primary: #abcdef/)
  assert.match(themeCss(theme), /\.dark \{\n {2}--primary: #abcdef/)
  const project = generateProjectFiles(document, { renderers: {}, types: "", urls: "", blockStyles: "" })
  const css = project.files.find(file => file.path === "src/index.css")
  assert.match(css?.content ?? "", /--primary: #abcdef/)
  assert.doesNotMatch(project.files.find(file => file.path === "src/main.tsx")?.content ?? "", /project-theme\.css/)
  assert.equal(project.files.some(file => file.path === "src/styles/project-theme.css"), false)
})
