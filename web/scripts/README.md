# Scripts do projeto

## Adicionar um grupo de blocos

O catálogo descobre variantes dentro dos grupos declarados em
`blockDirs`, em [`generate-catalog.mjs`](./generate-catalog.mjs). Essa lista é
intencionalmente explícita: criar uma pasta nova sem atualizar o script deixa
seus componentes fora da descoberta.

Para adicionar, por exemplo, `src/utils/blocks/sliders/`:

1. Crie a pasta `src/utils/blocks/sliders/`.
2. Abra `generate-catalog.mjs` e acrescente `"sliders"` à constante `blockDirs`,
   junto dos grupos já existentes.
3. Crie cada variante em uma subpasta com o `.tsx` e o `.json` usando o mesmo
   ID no nome. Exemplo: `sliders/slider-classic/slider-classic.tsx` e
   `sliders/slider-classic/slider-classic.json`.
4. No JSON, defina `category` e `categoryName` para a categoria que aparecerá
   no catálogo. O nome do grupo (`sliders`) e a categoria exibida são campos
   separados.
5. Preencha `export.componentName`, `export.sourceFile`, propriedades,
   valores iniciais e um `order` único.
6. Execute `npm run catalog:generate`. Isso regenera o catálogo tipado, os
   imports de componentes e as fontes usadas na exportação.

Exemplo da alteração na lista:

```js
const blockDirs = [
  "sections",
  "navbars",
  "footers",
  "forms",
  "applications",
  "sliders",
]
```

O script valida os arquivos, IDs, ordens, fontes exportáveis e IDs de blocos
referenciados por páginas prontas. Use `npm run catalog:check` para confirmar
que os arquivos gerados estão atualizados. `npm run dev` e `npm run build`
executam a geração automaticamente.

Veja também o guia de [blocos](../src/utils/blocks/README.md) para o formato dos
componentes e metadados.

## Remover blocos ou páginas prontas

Remova a pasta da variante em `src/utils/blocks/<grupo>/` ou o arquivo da
página em `src/utils/pages/` e execute `npm run catalog:generate`. Os arquivos
gerados são reconstruídos a partir do que existe no disco. A geração falha se
uma página pronta ainda referenciar o ID de um bloco removido; corrija essa
referência ou remova também o template. Projetos já salvos que contenham o
bloco removido precisam de atenção: o editor ignora definições ausentes ao
carregar e deixa de preservá-las quando o documento é salvo novamente.

Remover um template só o retira do catálogo de páginas prontas; não remove
páginas que já foram criadas dentro de projetos do editor.
