# Páginas prontas

Cada arquivo descreve uma página pronta com uma navbar opcional e uma sequência
de IDs de seções de `src/utils/blocks`. A navbar é declarada na propriedade
`navbar` do template e armazenada na propriedade compartilhada `navbar` do
documento do projeto; nunca a inclua em `blocks` como uma seção comum. O gerador
cria `index.ts` para o catálogo.

Para criar outra página pronta, adicione um arquivo com `PageTemplate`, use
apenas IDs de seção presentes em `blockComponents`, escolha uma navbar entre os
IDs `navbar-*` quando a página precisar de navegação, defina uma posição `order`
ainda não usada e execute `npm run catalog:generate`. O editor cria instâncias
independentes das seções e, quando o projeto ainda não tem navbar, instala a
navbar do template como navegação compartilhada do projeto.

## Remover uma página pronta

Apague o arquivo `.ts` da página e execute `npm run catalog:generate`; ela será
removida de `index.ts` e do catálogo de páginas prontas. Isso não apaga páginas
já criadas em projetos do editor, pois elas são armazenadas no documento do
projeto, separadas dos templates. Se remover uma seção usada por um template,
atualize a lista `blocks` desse template. Se remover uma variante de navbar,
atualize a propriedade `navbar` dos templates que a usam. O gerador rejeita
referências a blocos ou navbars inexistentes e também rejeita navbars declaradas
como seções.
