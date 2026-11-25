# Guia de blocos e páginas do builder

Este diretório reúne o conteúdo reutilizável do construtor. Use `blocks/` para
componentes que podem ser inseridos separadamente em uma página. Use `pages/`
para modelos de páginas que combinam esses blocos em uma ordem definida. O
editor mantém a interface de edição, o catálogo e a geração do projeto em
`src/pages/editor/`.

## Estrutura

```text
src/utils/
├── blocks/
│   ├── sections/          # Cada bloco em sua própria pasta
│   ├── navbars/           # Navegação
│   ├── footers/           # Rodapés
│   ├── forms/             # Formulários e fluxos de acesso
│   ├── applications/      # Telas e áreas de aplicações
│   ├── shared/            # URLs e edição inline reutilizadas entre blocos
│   ├── catalog.generated.ts # Catálogo tipado gerado
│   ├── sources.generated.ts # Fontes usadas na exportação
│   ├── types.ts           # Propriedades de conteúdo dos blocos
│   └── view-props.ts      # Contrato de renderização do builder
└── pages/
    ├── index.ts           # Lista gerada de páginas prontas
    ├── types.ts           # Contrato PageTemplate
    └── landing.ts         # Exemplo de composição
```

O nome da pasta e dos arquivos deve corresponder ao ID da variante. Por exemplo,
`blocks/sections/hero-classic/hero-classic.tsx` representa `hero-classic`. Use `.tsx` para
componentes React e `.ts` para páginas prontas que contêm apenas dados.

## Como um bloco chega ao builder

1. O componente da variante fica em uma pasta própria no grupo apropriado de `blocks/`.
2. Um arquivo `.json` na mesma pasta define nome, categoria, variante,
   descrição, ordem, valores iniciais, propriedades editáveis e exportação.
3. `npm run catalog:generate` descobre esses arquivos e produz o catálogo
   tipado, os imports e as fontes usadas na exportação.
4. Ao inserir o bloco, o editor copia seus valores
   iniciais para uma instância independente.

Consulte [blocks/README.md](./blocks/README.md) para as regras específicas dos
blocos. Mantenha o ID estável: projetos salvos e páginas prontas o usam para
encontrar a definição correspondente.

### Adicionar uma variante de um bloco existente

1. Crie `blocks/sections/hero-nova-variante/hero-nova-variante.tsx` com o JSX
   e o comportamento da variante. Exporte um componente que receba `props`.
2. Crie `hero-nova-variante.json` na mesma pasta, com o mesmo `id`, uma posição
   `order` ainda não usada e os demais metadados. Defina
   `export.componentName` com o nome do componente e `export.sourceFile` com o
   caminho do próprio `.tsx` a partir de `blocks/`.
3. Execute `npm run catalog:generate`.
4. Implemente o visual no arquivo da variante. Extraia para `blocks/shared/`
   apenas peças pequenas que tenham uso real em mais de um bloco.
5. Verifique a renderização no catálogo, no canvas e no projeto exportado.

Todos os blocos usam o `.tsx` local como fonte do catálogo e da exportação.
`error-classic`, `empty-start`, `navbar-classic`, `footer-classic` e
`waitlist-classic` são exemplos nos cinco grupos.

### Adicionar um tipo de bloco com renderer próprio

Além dos passos anteriores, informe o arquivo local em
`export.sourceFile` no JSON. O gerador o incluirá na exportação TSX e
no projeto ZIP. Inclua propriedades novas no
contrato `blocks/types.ts` somente quando o bloco precisar delas e apresente
essas propriedades no editor conforme necessário.

## Compor uma página pronta

Uma página pronta é uma lista ordenada de IDs de blocos. Ela não precisa copiar
o JSX ou os valores iniciais de cada bloco. Por exemplo:

```ts
import type { PageTemplate } from "./types"

export const ExamplePage: PageTemplate = {
  order: 14,
  name: "Exemplo",
  blocks: ["navbar-classic", "hero-classic", "footer-classic"],
}
```

Salve a página em `pages/exemplo.ts`, defina uma posição `order` não usada e
execute `npm run catalog:generate`.
O tipo `PageTemplate` aceita apenas IDs presentes em `blockComponents`. Ao
inserir o modelo, `templateBlocks` consulta o registro e cria uma instância
independente de cada bloco, com seus próprios valores iniciais.

Consulte [pages/README.md](./pages/README.md) e [pages/landing.ts](./pages/landing.ts)
para outros exemplos. Uma página pronta pode reutilizar um bloco já usado por
outras páginas; altere o bloco quando a mudança deve valer para todas as
instâncias e crie uma variante quando o visual ou o comportamento precisar ser
diferente.

## Conferência antes de concluir

- O ID do `.tsx` e do `.json` são iguais; `order` não se repete.
- A definição possui valores iniciais para o conteúdo que o renderer usa.
- A página pronta usa apenas IDs registrados e aparece no catálogo.
- O canvas, a exportação TSX e o projeto ZIP renderizam o bloco corretamente.
- `npm run typecheck`, `npm test` e `npm run build` passam.

`npm run dev` e `npm run build` regeneram o catálogo. `npm run typecheck`,
`npm test` e `npm run lint` verificam se os arquivos gerados estão atualizados.
