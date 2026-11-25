# Roteiro de implementação e plano de validação

A proposta do banco foi aprovada pelo responsável do projeto. O roteiro abaixo registra critérios de validação por etapa; a implementação ITES de autenticação, demandas e páginas já está integrada e coberta por testes, enquanto os entregáveis acadêmicos e a implantação de produção continuam pendentes.

| Etapa | Objetivo e entrega | Aceite / validação | Risco |
|---|---|---|---|
| 1 | Base do banco: Flyway e schema | migração limpa; testes de chaves estrangeiras e restrições | divergência entre schema e documentação |
| 2 | Autenticação e permissões: cadastro e papéis | login/logout, erro 403, revogação | escalada de privilégio |
| 3 | Portal: sete seções e conteúdo | só conteúdo publicado aparece ao público | rascunho exposto |
| 4 | Perfil do solicitante e organização | dados salvos e vinculados ao dono | cadastro duplicado |
| 5 | Envio de demanda | código gerado, situação Pendente, dados mantidos após novo login | perda de dados |
| 6 | Análise e decisão administrativa | filtros, justificativas, histórico | transição inválida |
| 7 | Acompanhamento pelo solicitante | só os próprios dados | acesso a dados de terceiros (IDOR) |
| 8 | Editor de páginas | salvar, recarregar, pré-visualizar, publicar | blocos inseguros |
| 9 | Automações no banco | 3 procedures, 3 functions e 3 triggers | regras conflitantes |
| 10 | Segurança do banco | papéis, privilégios e negações | burlar regras com comandos diretos nas tabelas |
| 11 | Testes de integração | fluxos completos de solicitante, administrador e editor | ambiente |
| 12 | Evidências finais e documentação | saídas reais e rastreabilidade | evidências incompletas |

## Validação

- **Banco de dados:** usar um PostgreSQL novo para aplicar as migrações e os dados de demonstração. Conferir pelo menos 20 registros em cada tabela; executar as 5 consultas simples, 3 com JOIN e 3 subconsultas; testar procedures, functions e triggers, incluindo os casos de erro; verificar os privilégios de cada papel; comparar o modelo lógico com o schema real.
- **Solicitante:** cadastro, login, envio de demanda, novo login e bloqueio de acesso à demanda de outra pessoa.
- **Administrador:** aceitar, recusar, mudar situação, histórico, e a decisão visível para o solicitante.
- **Editor de páginas:** bloqueio sem permissão, recarregar rascunho, publicar e exibição pública.
- **Aplicação:** verificação de tipos, lint, testes unitários, testes de integração do backend, build, inicialização e testes de ponta a ponta (Playwright), quando disponíveis.
- **Evidências:** guardar comandos, saídas e capturas de tela reais; nunca usar dados simulados nos testes finais de ponta a ponta.
- **Acessibilidade:** navegação por teclado, rótulos, contraste e telas responsivas.
