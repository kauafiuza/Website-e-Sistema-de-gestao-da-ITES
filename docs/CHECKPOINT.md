# Estado atual da plataforma

A plataforma está organizada em `web/`, `server/` e `database/`. O portal público, a área de solicitantes, a administração de demandas e permissões e o editor de páginas institucionais compartilham autenticação, autorização e persistência.

## Implementado

- Portal público com áreas institucionais e acesso ao fluxo de demandas.
- Login e sessão; o cadastro público por e-mail é opcional e administradores podem provisionar solicitantes sem envio de mensagens.
- Administrador inicial configurável por ambiente e preparado apenas quando a conta ainda não existe.
- Cadastro de organizações e associação por demanda.
- Envio e acompanhamento persistente de demandas com código e histórico.
- Administração com classificação, filtros, decisões justificadas e permissões explícitas.
- Editor de páginas com catálogo controlado, rascunhos, prévia, publicação e retirada do ar.
- Compose com frontend, API, PostgreSQL, proxy interno e volume persistente.
- Pipeline de integração contínua para validação automatizada de pull requests.

## Estado de validação registrado

A última execução completa documentada validou build e testes do frontend, suíte integrada do backend em PostgreSQL, criação limpa do banco acadêmico, execução de consultas e rotinas SQL e inicialização local dos serviços Docker. Ainda são necessários testes de navegador ponta a ponta e validação em VPS/Dokploy com os segredos e domínio do ambiente real.

## Pendências

- Executar a pipeline no GitHub e configurar a proteção da branch com o job agregado obrigatório.
- Harmonizar os artefatos acadêmicos de banco com o esquema operacional.
- Separar credenciais de migração e runtime antes da produção.
- Validar acessibilidade, navegação ponta a ponta e persistência em recriação no ambiente de implantação.
- Configurar e-mail, domínio, TLS, backups e recuperação no ambiente Dokploy.
- Adaptar a documentação técnica ao modelo de documento do professor, quando for disponibilizado.
