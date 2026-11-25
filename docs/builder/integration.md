# Integração do editor visual ao ITES

## Projeto institucional raiz

O projeto `ITES` é provisionado em `projects` com `site_role = ROOT`. A migração V27 cria a restrição de unicidade; `RootProjectProvisioner` importa a versão institucional publicada mais recente e cria a publicação inicial na mesma transação. A carga só ocorre quando existe um administrador ativo e ainda não existe projeto raiz. Reiniciar a aplicação conserva o mesmo projeto e as revisões já salvas.

No portal público, **Editar página inicial** abre `/editor/{projectId}`. O projeto também aparece na lista principal de projetos. A rota anterior `/administracao/editor` redireciona para essa lista. As operações de edição antigas para `inicio` não são mais aceitas; as tabelas institucionais são mantidas para preservar o histórico anterior à migração.

## Edição e publicação

1. O administrador abre o projeto `ITES` no editor visual principal.
2. O documento do projeto é alterado com blocos do catálogo controlado e salvo com revisão concorrente.
3. A prévia usa o rascunho; a página pública continua usando `publication_versions`.
4. O administrador principal pode publicar diretamente o projeto raiz. A verificação é feita no serviço de publicação pelo papel persistido e pelo marcador `ROOT`.
5. A API `/ites/pages/inicio` devolve somente a versão publicada ativa do projeto raiz; `/` renderiza esse documento.
6. Alterações posteriores permanecem privadas até a próxima publicação.

Para os demais projetos, a aprovação por outra pessoa continua exigida. A publicação do projeto raiz não concede acesso a dados operacionais. O servidor valida o documento, os contratos dos blocos e os recursos associados. O projeto raiz não pode ser excluído pela API.

## Segurança e limites

O acesso ao editor e à publicação depende da autorização de projeto no backend. O endpoint `/ites/site/root` exige `builder.access` e `builder.pages.edit`; uma pessoa sem esses grants não recebe o identificador administrativo. A leitura pública usa uma consulta separada que não devolve rascunhos. Blocos não executam código enviado no documento.

A migração atual cobre a página inicial. O painel de indicadores, outras páginas institucionais e telas operacionais ainda usam representações próprias. A integração delas, a publicação `PUBLIC`/`PRIVATE` e a autorização por página estão descritas em [gestão de páginas](../architecture/unified-pages.md) como trabalho pendente.
