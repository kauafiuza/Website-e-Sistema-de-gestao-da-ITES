# Peças compartilhadas

Esta pasta contém código pequeno usado por vários blocos. `urls.ts` valida
links e imagens; `inline-editing.tsx` oferece texto e imagem editáveis no
canvas. O conteúdo específico de uma variante permanece no `.tsx` da sua
própria pasta.

Ao acrescentar outra peça compartilhada, verifique também a exportação em
`src/pages/editor/lib/export.ts` e `project-generator.ts`: o projeto gerado
precisa receber a implementação ou uma substituição apropriada.
