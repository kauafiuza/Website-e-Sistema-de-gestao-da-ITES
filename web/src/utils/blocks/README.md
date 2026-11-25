# Blocos do builder

Cada variante usada no catálogo tem uma pasta em `sections/`, `navbars/`,
`footers/`, `forms/` ou `applications/`. Ela contém o componente `.tsx` e
seus metadados `.json`. O script
`scripts/generate-catalog.mjs` associa o ID estável ao componente e gera
`index.ts`, `catalog.generated.ts` e `sources.generated.ts`. Por exemplo,
`navbars/navbar-classic/navbar-classic.tsx` corresponde a
`navbars/navbar-classic/navbar-classic.json`.

Caminhos neste guia são relativos a `web/`, salvo indicação contrária.

## Converter um componente existente

Trabalhe a partir do componente recebido: preserve textos, imagens, ordem dos
itens, estrutura visual e interações. Adapte apenas o necessário para o contrato
do builder, acessibilidade, segurança dos URLs e espaçamento compartilhado.
Antes de editar, consulte `git status --short` e preserve alterações locais já
feitas pelo usuário.

1. **Escolha o grupo e o ID.** Seção de página em `sections/`; interface de
   aplicativo em `applications/`; use os demais grupos conforme o recurso.
   Crie `<grupo>/<id>/<id>.tsx` e `<grupo>/<id>/<id>.json`. O ID deve ser
   estável. A pasta não pode conter outro `.tsx`; funções auxiliares podem ficar
   no mesmo arquivo e peças reutilizadas por vários blocos em `shared/`.
2. **Separe dados de apresentação.** Passe o conteúdo inicial do componente
   recebido para `defaults` no JSON. O `.tsx` lê `props: BlockProps`; não deixe
   arrays de exemplo fixos no renderizador se precisam ser editáveis. Mantenha
   valores padrão para `title`, `description`, `button`, `href` e `eyebrow`,
   mesmo quando algum não aparece no layout.
   **Escreva os textos de exemplo em português sempre que possível.** Use
   conteúdo genérico e reutilizável em nomes, títulos, descrições, chamadas,
   itens, textos alternativos e rótulos visíveis. Evite marcas, pessoas ou
   afirmações específicas que pareçam dados reais. Preserve IDs, URLs, nomes de
   propriedades, enums e outros valores técnicos exigidos pela lógica; quando
   eles forem exibidos, traduza o rótulo na apresentação sem alterar o valor
   persistido.
3. **Mapeie o conteúdo repetido.** Use `items: ContentItem[]` para cards,
   eventos, posts ou registros. Cada item exige `id`, `title`, `description`,
   `href`, `value` e `features`; use strings vazias e `[]` para campos sem valor.
   Preserve os IDs ao reordenar. A plataforma aceita até 50 itens, 30 entradas
   em `features`, 20.000 caracteres em cada campo de texto e 2.000 por entrada
   de `features`.
4. **Declare o que é editável.** Liste em `editableProperties` somente chaves
   usadas no visual ou no comportamento. Para `items`, configure a categoria
   em `item-schemas.ts`; o `PropertyEditor` cria os controles a partir dessa
   combinação. `features` oferece um campo com uma linha por entrada;
   `featureLabels` cria campos separados por posição no array.
5. **Conecte a edição no canvas.** Use `InlineText` para texto visível e
   `InlineImage` para toda imagem que o usuário precise substituir. Para uma
   imagem principal, use `imageUrl`/`imageAlt` do bloco. Para imagens em itens,
   informe o alvo que guarda a URL: `target={{ kind: "item", id: item.id,
key: "value" }}` (ou `href`) e um `altTarget` quando o texto alternativo
   estiver em outro campo. Imagens em `features` usam
   `target={{ kind: "item-feature", id: item.id, index: 0 }}`. Confira o
   `item-schemas.ts`: alvos inline só funcionam se a propriedade estiver
   declarada no esquema. A edição deve atualizar o mesmo campo persistido e
   manter o alt acessível. Dentro de links, use `focusable={false}` no texto
   editável.
6. **Adapte as interações.** Estado temporário como busca, filtro, aba e slide
   pode ficar em `useState`. Criação, edição, exclusão, reordenação ou arrastar
   itens deve atualizar `items` com `editor?.replaceItems?.(nextItems)` no
   canvas. Quando `editor` não existe, mantenha estado local para a interação
   funcionar na página exportada. Ao receber novos `props.items` do painel,
   sincronize a visualização para não mostrar dados antigos.
7. **Aplique o layout comum.** Use `builder-block` na raiz e um modificador de
   espaçamento quando necessário. Use consultas ao contêiner (`@md`, `@4xl`)
   para grades dentro do editor. Ajuste rolagem horizontal dentro do bloco,
   evitando cortar cards nas bordas da seção.
8. **Registre e confira.** Preencha os metadados descritos abaixo, rode o
   gerador e confira o bloco no catálogo, no canvas, no painel e na exportação.

Um renderizador pequeno segue esta forma:

```tsx
import {
  InlineText,
  type InlineEditor,
} from "@/utils/blocks/shared/inline-editing"
import type { BlockProps } from "@/utils/blocks/types"

export function ExampleCardsBlock({
  props: p,
  editor,
}: {
  props: BlockProps
  editor?: InlineEditor
}) {
  return (
    <section className="builder-block bg-background">
      <h2>
        <InlineText
          editor={editor}
          target={{ kind: "property", key: "title" }}
          value={p.title}
          label="título"
        />
      </h2>
      <div className="grid gap-6 @md:grid-cols-2">
        {(p.items ?? []).map((item) => (
          <article key={item.id}>
            <InlineText
              editor={editor}
              target={{ kind: "item", id: item.id, key: "title" }}
              value={item.title}
              label="título do item"
            />
          </article>
        ))}
      </div>
    </section>
  )
}
```

### Como escolher os campos de um item

`ContentItem` é o contrato persistido em `types.ts`. Mapeie os campos antes de
escrever JSX e documente posições de `features` em `item-schemas.ts`. Quando
dois blocos da mesma categoria precisam de significados diferentes, use outra
categoria ou defina um contrato compatível entre as variantes: o esquema do
painel é compartilhado por categoria. A ordem de `features` também faz parte
do contrato dos projetos salvos; não a altere sem migrar os dados existentes.

| Bloco                                 | `href`                                     | `value`                                 | `features`                                                                                       |
| ------------------------------------- | ------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `gallery-carousel`                    | Link do card                               | URL da imagem                           | Vazio                                                                                            |
| `calendar-interactive`                | Data ISO                                   | Calendário                              | Início, fim                                                                                      |
| `blog-card-grid`                      | Link do artigo                             | URL da imagem                           | Texto alternativo, categoria, data, leitura, autor, avatar, texto alternativo do avatar, chamada |
| `issue-list`                          | Código                                     | Status                                  | Prioridade, responsável, avatar, data inicial, data alvo                                         |
| `testimonials-classic`                | Não usado                                  | Cargo e empresa                         | Vazio; título é o autor e descrição é a citação                                                  |
| `case-studies`                        | URL do retrato                             | Cargo                                   | URL e alt do logo, dois conjuntos de indicador (valor, nome e detalhe) e alt do retrato           |
| `navbar-mega-menu`                    | URL do link                                | Tipo do item (`nav`, `login`, `signup`) | ID do pai e nome do ícone para submenus                                                          |
| `team-avatar-grid`                    | URL do avatar                              | Cargo                                   | Vazio; título é o nome da pessoa                                                                 |
| `investors-logo-grid`                 | URL do logo                                | Vazio                                   | Texto alternativo do logo em `description`; título é a empresa                                   |
| `careers-intro`                       | Não usado                                  | Não usado                               | Título do motivo e descrição; até três motivos são exibidos                                      |
| `company-benefits`                    | URL da imagem/avatar/logo                  | Cargo ou nota                           | Tipo do registro (`photo`, `testimonial`, `rating`) e empresa opcional do autor                  |
| `blog-classic`                        | Link do artigo                             | URL da imagem                           | Mesmo esquema de artigo do `blog-card-grid`                                                      |
| `gallery-classic`                     | Link do item                               | URL da imagem                           | Vazio                                                                                            |
| `portfolio-classic`                   | URL do projeto                             | Não usado                               | URL e texto alternativo da imagem; descrição guarda categoria e data                             |
| `profile-experience`                        | Não usado                                  | Tipo de experiência                     | Texto longo editável com função, período e detalhes                                              |
| `profile-projects`                           | Link de detalhes ou repositório             | Categoria do projeto                    | Tecnologias, uma por entrada; fonte API opcional via `itemsApiUrl`, `itemsApiPath` e mapeamento dos campos JSON `itemsApi*Key` (HTTPS, GET público)
| `editorial-blog-index`                         | Link do artigo                              | URL da imagem de capa                    | Data de publicação, categoria e texto alternativo da imagem                                        |
| `institutional-contact`                            | Link do canal                               | Ícone (`github`, `linkedin`, `mail`)     | Vazio                                                                                            |
| `navbar-editorial-dock`                        | Âncora ou URL                               | Ícone (`home`, `about`, `experience`, `projects`, `contact`, `blog`) | Vazio                                      |
| `team-classic`                        | URL do avatar                              | Cargo                                   | Vazio; título é o nome da pessoa                                                                 |
| `features-classic` e `features-split` | Não usado                                  | Não usado                               | Título e descrição do recurso                                                                    |
| `customer-details`                    | Email                                      | Status (`active`, `vip`, `at-risk`)     | Nome e sobrenome, telefone e empresa; observações em `description`                               |
| `about-editorial`                     | URL da imagem                              | Rótulo da seção                         | Tipo (`photo`, `section`) e texto alternativo da imagem                                          |
| `hero-social-proof`                   | URL do link ou avatar                      | Tipo ou nota                            | Tipo de item e contagem de avaliações ou alt do avatar                                           |
| `hero-feature-slider`                 | URL do link ou imagem clara                | Ícone ou rótulo                         | Tipo (`feature`, `image`), ícone/imagem escura e alt                                             |
| `logos-static-row`                    | URL do link                                | URL do logo                             | URL do logo escuro e tamanho                                                                     |
| `awards-table`                        | URL do prêmio                              | Ano                                     | Não usado; título e descrição do prêmio                                                          |
| `careers-openings`                    | URL da vaga                                | Tipo (`category`, `job`)                | ID da categoria para vagas                                                                       |
| `blog-post-article`                   | URL da imagem de conteúdo ou link do autor | Tipo do segmento                        | Perfil do autor, imagem, cabeçalhos, parágrafos, listas, citação, código, tabela, figura e nota  |

No `navbar-mega-menu`, itens de navegação ficam em uma lista plana. Um item
filho usa `features[0]` com o ID do item pai e `features[1]` com um dos ícones
permitidos (`book`, `trees`, `sunset`, `zap`). Itens sem pai aparecem no nível
principal; os valores `login` e `signup` identificam as ações de conta.

`href` é apenas uma string persistida: nos blocos acima ele também guarda data
ou código. Passe-o a `safeHref` **somente** quando for de fato um link. Passe
URLs de imagens a `safeImageUrl`. Valide valores de enumeração e datas ao ler
itens do painel, pois o editor permite texto livre.

Para ações que mudam a coleção dentro do bloco, mantenha uma cópia local e
envie o novo array ao editor. Compare a referência de `p.items` para que uma
edição no painel substitua a cópia local quando chegar:

```tsx
const [local, setLocal] = useState(() => ({
  source: p.items,
  items: p.items ?? [],
}))
const items = local.source === p.items ? local.items : (p.items ?? [])

function saveItems(nextItems: ContentItem[]) {
  setLocal({ source: p.items, items: nextItems })
  editor?.replaceItems?.(nextItems)
}
```

Use `saveItems` para criar, excluir, editar ou arrastar; o painel usa o array
persistido e a página exportada usa o estado local enquanto estiver aberta.

### Controles que funcionam no editor

O canvas desabilita eventos de ponteiro no conteúdo comum para permitir
seleção e organização dos blocos. Botões, buscas, filtros, alvos de arrastar e
outros controles interativos precisam de `pointer-events-auto` e
`data-inline-editor-control=""`. O segundo atributo também permite que o
clique atravesse o filtro de eventos do canvas. Marque o controle ou sua área
interativa específica, não toda a seção.

```tsx
<Button
  type="button"
  className="pointer-events-auto"
  data-inline-editor-control=""
  onClick={advance}
>
  Próximo
</Button>
```

Em uma área rolável, aplique `pointer-events-auto` ao contêiner da rolagem e o
atributo aos alvos clicáveis. Teste cliques e arrastar **dentro do canvas**;
funcionar em uma página isolada não confirma o comportamento no editor. No
`Carousel` compartilhado, `CarouselContent` já usa margem negativa e
`CarouselItem` já tem espaçamento interno. Para outro intervalo entre slides,
ajuste os dois valores como par, sem somar margem lateral ao item.

## Metadados e catálogo

O JSON precisa declarar `id`, `name`, `category`, `categoryName`, `variant`,
`description`, `defaults`, `editableProperties`, `order` e `export`.
`order` deve ser um inteiro positivo ainda não utilizado. Defina
`export.componentName` com o nome exportado pelo `.tsx`,
`export.sourceFile` com o caminho relativo a esta pasta de blocos,
`export.dependencies` com as bibliotecas necessárias e `tailwindVersion: 4`.
O primeiro componente exportado no `.tsx` deve ser o nome declarado em
`export.componentName`.

Modelo mínimo para a pasta `sections/example-cards/` (troque o ID e escolha
uma `order` livre antes de usar):

```json
{
  "id": "example-cards",
  "name": "Exemplo — Cartões",
  "category": "exemplos",
  "categoryName": "Exemplos",
  "variant": "cards",
  "description": "Cartões com conteúdo editável.",
  "defaults": {
    "title": "Exemplo",
    "description": "",
    "button": "",
    "href": "#",
    "eyebrow": "",
    "items": [
      {
        "id": "item-1",
        "title": "Primeiro cartão",
        "description": "Detalhes",
        "href": "#",
        "value": "",
        "features": []
      }
    ]
  },
  "editableProperties": ["title", "items"],
  "export": {
    "componentName": "ExampleCardsBlock",
    "sourceFile": "sections/example-cards/example-cards.tsx",
    "dependencies": ["react"],
    "tailwindVersion": 4
  },
  "order": 71
}
```

Para esse exemplo, acrescente `examples: { title: "Card", description: "Detalhes" }`
em `item-schemas.ts`. Um bloco pode manter todos os itens em
`defaults.items` e mostrar apenas parte deles, como `blog-card-grid` faz com
seis posts; reordenar no painel decide quais aparecem primeiro.

O catálogo e o exportador usam `export.componentName` e `export.sourceFile` do
JSON. Execute `npm run catalog:generate` a partir de `web/` depois de criar ou
remover um bloco. O gerador valida nomes, IDs, ordens e arquivos e atualiza
`index.ts`, `catalog.generated.ts` e `sources.generated.ts`. Não edite esses
arquivos gerados à mão. Só adicione o ID a uma página em `src/utils/pages/`
quando essa página pronta realmente deva incluir o bloco.

## Adicionar um grupo de blocos

Um grupo é uma pasta diretamente dentro de `src/utils/blocks`, como
`sections/` ou `applications/`. Ele define onde os arquivos do bloco ficam.
`category` identifica o esquema de edição dos itens e também define quais
variantes podem ser trocadas entre si. Os grupos visuais do catálogo ficam em
`catalog-groups.json`: cada grupo reúne categorias relacionadas para facilitar
a navegação sem misturar seus campos de edição. `group` no registro gerado é
usado apenas para essa organização visual; a troca de variante continua limitada
à mesma `category`. Uma pasta nova não cria grupo visual automaticamente.

Para adicionar, por exemplo, o grupo `sliders/`:

1. Crie `src/utils/blocks/sliders/`.
2. Acrescente `"sliders"` à constante `blockDirs` em
   `scripts/generate-catalog.mjs`. O gerador só percorre os grupos dessa lista.
3. Crie uma pasta por variante, como
   `sliders/slider-classic/slider-classic.tsx` e
   `sliders/slider-classic/slider-classic.json`.
4. No JSON, use `id: "slider-classic"`, configure `category` para o esquema,
   `categoryName` para o grupo visual e `group` apenas se precisar reutilizar
   um grupo já existente. Defina `export.sourceFile` como
   `sliders/slider-classic/slider-classic.tsx`.
5. Escolha um `order` numérico que ainda não esteja em uso.
6. Execute `npm run catalog:generate` e confira a categoria no catálogo.

O passo 2 e as regras do script estão detalhados em
[`scripts/README.md`](../../../scripts/README.md). Os arquivos gerados não
devem ser editados à mão.

## Espaçamento externo

Use `builder-block` no elemento raiz de cada bloco. O estilo compartilhado em
`src/pages/editor/block-styles.css` define 28 px de margem interna lateral,
48 px quando o contêiner atinge 448 px, e 56 px de margem interna vertical.
Não repita `px-*`, `py-*` ou `@md:px-*` no elemento raiz.

Se a composição pedir mais espaço vertical, use `builder-block--spacious`
(80 px). Para navbars, use `builder-block--compact` (20 px); para footers,
`builder-block--footer` (40 px). Esses modificadores mudam apenas a margem
interna vertical: todos os blocos continuam alinhados pela mesma lateral.
Espaçamentos internos, como distância entre cards e campos, continuam no
componente conforme sua composição.

## React, shadcn e exportação

Use primeiro os componentes instalados em `src/components/ui` e os tokens
semânticos (`bg-background`, `text-muted-foreground`, `border-border`, etc.).
Confira a API local: este projeto usa Base UI e Tailwind CSS 4. Um `Avatar`
precisa de `AvatarFallback`; `Dialog`, `Sheet` e `Drawer` precisam de título.
Use `FieldGroup` e `Field` para formulários, e nomes acessíveis em botões só
com ícone. Dados de exemplo devem estar nos `defaults`, não em serviços
externos fictícios.

A fonte local do bloco também é usada para gerar projetos. Imports de
`@/utils/blocks/types`, `shared/inline-editing` e `shared/urls` são tratados
pelos exportadores em `src/pages/editor/lib/export.ts` e
`project-generator.ts`. Se uma nova peça compartilhada ou um método de
`InlineEditor` for necessário, confira os dois exportadores e a definição de
`src/components/blocks/runtime.tsx` produzida pelo gerador. O tipo do runtime
precisa aceitar chamadas opcionais como `editor?.replaceItems?.(...)` também
quando o editor não está presente na página exportada. O campo
`export.dependencies` documenta dependências, mas **não** instala pacotes no
projeto exportado: para uma biblioteca nova, atualize também as dependências
montadas em `project-generator.ts` e confira o build do projeto gerado.
Componentes shadcn são descobertos pelos imports `@/components/ui/*`.
A configuração persistida vai para o projeto exportado; interações sem
`editor`, como filtros ou novos eventos, permanecem locais à sessão até que o
produto integre um serviço.

## Verificação antes de entregar

A partir de `web/`:

```bash
npm run catalog:generate
npm run typecheck
npm test
npm run build
```

Confira também no editor uma largura estreita e outra ampla, edição direta,
campos do painel, links e imagens, teclado, botões e arrastar quando houver.
Para mudanças de import, peça compartilhada ou comportamento persistido,
confira o código gerado na exportação. `npm run catalog:check` confirma que os
arquivos gerados correspondem aos metadados.

## Remover um bloco

Para retirar uma variante do catálogo, remova a pasta dela e execute
`npm run catalog:generate`. O gerador recria os índices e remove os imports e
metadados da variante. Se alguma página pronta ainda listar esse ID em
`blocks`, a geração falha indicando o arquivo e o ID ausente; atualize a página
ou remova-a antes de gerar novamente.

Considere também projetos já salvos no editor: eles guardam o `definitionId` do
bloco. Ao abrir um projeto, definições que já não existem no catálogo atual são
ignoradas e não serão preservadas se o projeto for salvo novamente. Para manter
projetos existentes compatíveis, mantenha o ID e a definição ou faça uma
migração dos documentos antes de remover o bloco.
