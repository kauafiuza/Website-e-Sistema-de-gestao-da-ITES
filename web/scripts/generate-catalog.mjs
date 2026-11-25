
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs"
import { resolve, relative, basename, join } from "node:path"
import ts from "typescript"

const root = resolve(import.meta.dirname, "..")
const blocksRoot = resolve(root, "src/utils/blocks")
const pagesRoot = resolve(root, "src/utils/pages")
const catalogGroups = JSON.parse(
  readFileSync(resolve(blocksRoot, "catalog-groups.json"), "utf8")
)
const groupByCategory = new Map()
for (const group of catalogGroups) {
  for (const category of group.categories) {
    if (groupByCategory.has(category)) {
      throw new Error(`Catálogo: categoria ${category} está em mais de um grupo visual`)
    }
    groupByCategory.set(category, group.id)
  }
}

const check = process.argv.includes("--check")

const fail = (message) => {
  throw new Error(`Catálogo: ${message}`)
}

const read = (path) => readFileSync(path, "utf8")

const write = (path, value) => {
  if (check) {
    if (!existsSync(path) || read(path) !== value) {
      fail(
        `${relative(root, path)} está desatualizado; execute npm run catalog:generate`
      )
    }
  } else if (!existsSync(path) || read(path) !== value) {
    writeFileSync(path, value)
  }
}

const sourceFile = (path) =>
  ts.createSourceFile(
    path,
    read(path),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )

const exportedName = (path) => {
  const ast = sourceFile(path)

  for (const node of ast.statements) {
    if (
      !node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      )
    ) {
      continue
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text
    }

    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0]

      if (declaration && ts.isIdentifier(declaration.name)) {
        return declaration.name.text
      }
    }
  }

  fail(`${relative(root, path)} precisa exportar um componente ou uma página`)
}

/**
 * Top-level folders scanned for blocks. The generator does not discover new
 * group folders by itself: when adding one, append its exact directory name
 * here. Follow the full checklist in `scripts/README.md` and
 * `src/utils/blocks/README.md` so the block group and its catalog category are
 * both configured.
 *
 * @example
 * // Adding src/utils/blocks/sliders/ requires:
 * const blockDirs = ["sections", "navbars", "footers", "forms", "applications", "sliders"]
 *
 * Keep this list aligned with the block folders under src/utils/blocks.
 */
const blockDirs = [
  "sections", 
  "navbars", 
  "footers", 
  "forms", 
  "applications",
  "motion",
  "reui",
]

const blocks = []
const ids = new Set()
const blockCategories = new Map()
const blockOrders = new Set()
const sourceByRenderer = new Map()

for (const folder of blockDirs) {
  for (const entry of readdirSync(join(blocksRoot, folder), {
    withFileTypes: true,
  }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) {
      fail(`${folder}/${entry.name} deve ser uma pasta de bloco`)
    }

    const id = entry.name
    const blockDir = join(blocksRoot, folder, id)
    const path = join(blockDir, `${id}.tsx`)
    const metaPath = join(blockDir, `${id}.json`)

    if (!existsSync(path) || !existsSync(metaPath)) {
      fail(`${folder}/${id} precisa de ${id}.tsx e ${id}.json`)
    }

    const extras = readdirSync(blockDir).filter(
      (file) => file.endsWith(".tsx") && file !== `${id}.tsx`
    )

    if (extras.length) {
      fail(`${folder}/${id} contém outros .tsx; mova auxiliares para shared/`)
    }

    const meta = JSON.parse(read(metaPath))
    const group = groupByCategory.get(meta.category)
    if (!group) fail(`${meta.category} ainda não pertence a um grupo visual`)
    meta.group = group

    if (ids.has(id)) {
      fail(`ID duplicado: ${id}`)
    }

    if (meta.id !== id) {
      fail(`${folder}/${id}.json deve declarar id ${id}`)
    }

    if (
      !Number.isInteger(meta.order) ||
      meta.order < 1 ||
      blockOrders.has(meta.order)
    ) {
      fail(`order ausente ou duplicada em ${id}`)
    }

    blockOrders.add(meta.order)

    if (
      !meta.name ||
      !meta.category ||
      !meta.categoryName ||
      !meta.variant ||
      !meta.description
    ) {
      fail(`metadados incompletos em ${id}`)
    }

    if (!meta.defaults || !Array.isArray(meta.editableProperties)) {
      fail(`defaults ou editableProperties inválidos em ${id}`)
    }

    if (!meta.export?.componentName || !meta.export?.sourceFile) {
      fail(`export incompleto em ${id}`)
    }

    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(meta.export.componentName)) {
      fail(`componentName inválido em ${id}`)
    }

    const source = resolve(blocksRoot, meta.export.sourceFile)

    if (!source.startsWith(`${blocksRoot}/`) || !existsSync(source)) {
      fail(
        `fonte exportável ausente em ${id}: ${meta.export.sourceFile}`
      )
    }

    if (source !== path) {
      fail(
        `${id} deve exportar sua própria fonte: ${relative(blocksRoot, path)}`
      )
    }

    if (read(path).includes("@/utils/blocks/renderers/")) {
      fail(`${id} não deve importar renderers compartilhados`)
    }

    if (exportedName(source) !== meta.export.componentName) {
      fail(
        `${meta.export.sourceFile} deve exportar ${meta.export.componentName}`
      )
    }

    const previous = sourceByRenderer.get(meta.export.componentName)

    if (previous && previous !== meta.export.sourceFile) {
      fail(
        `renderer ${meta.export.componentName} aponta para fontes diferentes`
      )
    }

    sourceByRenderer.set(meta.export.componentName, meta.export.sourceFile)
    ids.add(id)
    blockCategories.set(id, meta.category)

    blocks.push({
      folder,
      id,
      name: exportedName(path),
      meta,
    })
  }
}

blocks.sort((a, b) => a.meta.order - b.meta.order)

const header =
  "// Gerado por scripts/generate-catalog.mjs. Não edite manualmente.\n"

const blockImports = blocks
  .map(
    ({ folder, id, name }, index) =>
      `import { ${name} as Block${index} } from "./${folder}/${id}/${id}"`
  )
  .join("\n")

const componentEntries = blocks
  .map(({ id }, index) => `  ${JSON.stringify(id)}: Block${index},`)
  .join("\n")

const definitions = blocks
  .map(({ meta }, index) => {
    const { categoryName, order, ...definition } = meta

    return `  { ...${JSON.stringify(definition, null, 2).replaceAll("\n", "\n  ")}, component: Block${index} },`
  })
  .join("\n")

const usedGroups = new Set(blocks.map(({ meta }) => meta.group))
const categoryEntries = catalogGroups
  .filter(({ id }) => usedGroups.has(id))
  .map(
    ({ id, name }) =>
      `  { id: ${JSON.stringify(id)}, name: ${JSON.stringify(name)} },`
  )
  .join("\n")
const categoryIds = [...new Set(blocks.map(({ meta }) => meta.category))]
const categoryVariants = categoryIds
  .map(
    (category) =>
      `  [${JSON.stringify(category)}, registry.filter((definition) => definition.category === ${JSON.stringify(category)})],`
  )
  .join("\n")
const groupBlocks = [...usedGroups]
  .map(
    (group) =>
      `  [${JSON.stringify(group)}, registry.filter((definition) => definition.group === ${JSON.stringify(group)})],`
  )
  .join("\n")

write(
  join(blocksRoot, "catalog.generated.ts"),
  `${header}import type { Definition } from "./catalog-types"\n${blockImports}\n\nexport const blockComponents = {\n${componentEntries}\n} as const\n\nexport const registry: Definition[] = [\n${definitions}\n]\n\nexport const categories = [\n${categoryEntries}\n]\n\nexport const definitions = new Map(registry.map((definition) => [definition.id, definition]))\nexport const variantsByCategory = new Map([\n${categoryVariants}\n])\nexport const blocksByGroup = new Map([\n${groupBlocks}\n])\n`
)

write(
  join(blocksRoot, "index.ts"),
  `${header}export { blockComponents, registry, definitions, categories, variantsByCategory, blocksByGroup } from "./catalog.generated"\nexport type { Definition } from "./catalog-types"\nexport type { BlockProps } from "./types"\n`
)

const sources = [...sourceByRenderer.entries()].sort(([a], [b]) =>
  a.localeCompare(b)
)

write(
  join(blocksRoot, "sources.generated.ts"),
  `${header}${sources.map(([, file], index) => `import source${index} from "./${file}?raw"`).join("\n")}\n\nexport const blockSources = new Map<string, string>([\n${sources.map(([name], index) => `  [${JSON.stringify(name)}, source${index}],`).join("\n")}\n])\n`
)

const contractCatalog = JSON.stringify({
  version: 1,
  definitions: blocks.map(({ meta }) => ({
    id: meta.id,
    category: meta.category,
    defaults: meta.defaults,
    editableProperties: meta.editableProperties,
  })),
}, null, 2) + "\n"

const serverResourcesRoot = resolve(root, "../server/src/main/resources")
if (existsSync(serverResourcesRoot)) {
  write(join(serverResourcesRoot, "block-contracts.json"), contractCatalog)
}

const pages = []
const orders = new Set()

for (const file of readdirSync(pagesRoot)
  .filter(
    (name) =>
      name.endsWith(".ts") &&
      !["index.ts", "types.ts"].includes(name)
  )
  .sort()) {
  const path = join(pagesRoot, file)
  const ast = sourceFile(path)

  const declaration = ast.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((item) => item.type?.getText(ast) === "PageTemplate")

  if (
    !declaration ||
    !ts.isIdentifier(declaration.name) ||
    !declaration.initializer ||
    !ts.isObjectLiteralExpression(declaration.initializer)
  ) {
    fail(`${file} precisa exportar um PageTemplate`)
  }

  const property = (name) =>
    declaration.initializer.properties.find(
      (item) =>
        ts.isPropertyAssignment(item) &&
        item.name.getText(ast) === name
    )?.initializer

  const order = property("order")
  const name = property("name")
  const navbar = property("navbar")
  const list = property("blocks")

  if (
    !order ||
    !ts.isNumericLiteral(order) ||
    !name ||
    !ts.isStringLiteral(name) ||
    !list ||
    !ts.isArrayLiteralExpression(list)
  ) {
    fail(`${file} possui PageTemplate inválido`)
  }

  if (orders.has(Number(order.text))) {
    fail(`ordem duplicada de página: ${order.text}`)
  }

  orders.add(Number(order.text))

  if (
    navbar &&
    (!ts.isStringLiteral(navbar) || blockCategories.get(navbar.text) !== "navbar")
  ) {
    fail(`${file} deve apontar navbar para um bloco da categoria navbar`)
  }

  for (const item of list.elements) {
    if (!ts.isStringLiteral(item) || !ids.has(item.text)) {
      fail(
        `${file} referencia bloco inexistente: ${item.getText(ast)}`
      )
    }
    if (blockCategories.get(item.text) === "navbar") {
      fail(`${file} deve declarar ${item.text} na propriedade navbar, não em blocks`)
    }
  }

  pages.push({
    file: basename(file, ".ts"),
    symbol: declaration.name.text,
    order: Number(order.text),
  })
}

pages.sort((a, b) => a.order - b.order)

write(
  join(pagesRoot, "index.ts"),
  `${header}${pages.map(({ file, symbol }) => `import { ${symbol} } from "./${file}"`).join("\n")}\n\nexport const templates = [\n${pages.map(({ symbol }) => `  ${symbol},`).join("\n")}\n]\n`
)

console.log(
  `Catálogo ${check ? "verificado" : "gerado"}: ${blocks.length} blocos, ${pages.length} páginas`
)
