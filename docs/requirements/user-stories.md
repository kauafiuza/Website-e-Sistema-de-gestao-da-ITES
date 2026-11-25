# Especificação detalhada — histórias de usuário e casos de uso

**Projeto:** Portal institucional e sistema de gestão de demandas da ITES  
**Versão:** 1.0 — 23/11/2026  
**Fonte de requisitos e identificadores:** [Especificação de requisitos e rastreabilidade](specification.md) e documentação técnica existente no repositório.

> **Nota de rastreabilidade:** foram preservados os identificadores existentes (M1–M9, P1, B1, G1, D1–D4 e DOC). A documentação A1 original não foi localizada entre os artefatos consultados; por isso, as regras RB e os requisitos não funcionais RNF abaixo recebem identificadores complementares para esta especificação. A equipe deve compará-los com a A1 e substituir ou confirmar esses códigos antes da entrega final. Não se deve tratar os pontos marcados como “validar” como decisões aprovadas pela ITES.

## 1. Escopo e revisão para o MVP

O produto reúne um portal público e uma área autenticada para cadastro, gestão e acompanhamento de demandas da ITES. Para esta especificação, considera-se MVP o conjunto de jornadas já descritas como centrais na documentação: acesso ao portal, autenticação e autorização, organizações e perfil, abertura e acompanhamento de demandas, análise e decisão administrativa, gestão de permissões e edição/publicação de páginas. Relatórios são incluídos no escopo funcional documentado, com limites explicitados abaixo.

| Prioridade | Requisitos existentes | Tratamento nesta especificação |
|---|---|---|
| MVP | M1–M6, M9, P1, B1, G1 | Histórias HU01–HU09 e HU11; regras e casos de uso relacionados. M9 cobre a informação de estado na área do solicitante, não o envio de e-mail de decisão. |
| MVP / validar escopo | M8 | HU10 especifica consulta e exportação conforme o que está documentado como disponível. Confirmar com a equipe quais indicadores e relatórios são obrigatórios no MVP. |
| Fora do MVP atual | M7 | Planejamento de atividades fica registrado como evolução futura; não deve ser considerado entregue por esta especificação. |
| Entregáveis acadêmicos/técnicos | D1–D4, DOC | Não são histórias de usuário do produto. Mantêm critérios de verificação próprios na matriz de rastreabilidade. |

### Ajustes de clareza adotados

1. “Organização” não concede privilégios administrativos por si só; permissões dependem de papel/concessão válida.
2. “Setor econômico” da organização e “serviço solicitado” na demanda são dados diferentes.
3. Uma demanda tem código único e inicia como **Pendente**. O histórico registra as decisões e transições.
4. A conclusão exige nota de conclusão; recusa e cancelamento exigem justificativa.
5. A publicação é separada da edição: rascunhos e prévias não são conteúdo público.
6. A confirmação de situação ao solicitante ocorre na plataforma. Notificação transacional por e-mail de mudança de estado não é requisito confirmado e fica pendente de validação.
7. O escopo de relatório descrito inclui consultas analíticas de demandas, exportação CSV filtrada e impressão pelo navegador; geração de PDF no servidor e agregação de respostas de formulários não são assumidas.

## 2. Regras de negócio complementares

Os códigos RB abaixo organizam regras já presentes na especificação técnica; devem ser reconciliados com os códigos da A1, se existentes.

| ID | Regra |
|---|---|
| RB01 | Cada demanda recebe um código único e é criada na situação Pendente. |
| RB02 | O solicitante consulta somente demandas de sua titularidade e as respectivas decisões. |
| RB03 | Uma associação a organização ou vínculo institucional não concede automaticamente acesso administrativo. A autorização deve ser verificada para a operação e o escopo solicitados. |
| RB04 | Transições permitidas: Pendente → Aceita para atendimento, Recusada ou Cancelada; Aceita para atendimento → Em atendimento ou Cancelada; Em atendimento → Concluída ou Cancelada. |
| RB05 | Decisão/transição registra responsável, data e justificativa; conclusão requer nota de conclusão. Recusa e cancelamento guardam seus motivos. |
| RB06 | Setor econômico descreve a organização; serviço solicitado descreve o que se pede à ITES. Não são intercambiáveis. |
| RB07 | Edição e publicação são operações distintas. Apenas a versão publicada fica disponível publicamente; operações administrativas exigem autorização. |
| RB08 | Papéis e concessões são administrados explicitamente e aplicados no servidor; esconder uma ação na interface não substitui autorização. |
| RB09 | O estado da demanda deve estar disponível na área autenticada do solicitante. Envio de e-mail sobre mudança de estado depende de confirmação de escopo e configuração do serviço de e-mail. |

## 3. Requisitos não funcionais transversais (propostos para validação)

A especificação técnica consultada não apresenta uma lista identificada de RNFs. Os itens abaixo são propostas de critérios verificáveis, derivados das restrições documentadas de autorização, auditoria e consistência. Confirmar prioridade e valores com a equipe/docente; não são apresentados como requisitos originais da A1.

| ID complementar | Requisito e verificação proposta | Histórias relacionadas |
|---|---|---|
| RNF01 | **Autorização no servidor:** para cada operação protegida, uma requisição sem autenticação ou sem concessão/escopo válido é negada, mesmo que seja enviada diretamente à API. Verificar com testes de integração positivos e negativos. | HU02–HU10 |
| RNF02 | **Integridade do histórico:** a alteração de situação e o evento de auditoria correspondente são persistidos juntos; em falha, nenhum dos dois deve ficar parcialmente aplicado. Verificar com teste transacional. | HU07 |
| RNF03 | **Isolamento de dados:** um solicitante não consegue obter, alterar ou inferir dados de demanda pertencentes a outro solicitante por consulta direta à API. Verificar com dois usuários distintos. | HU04–HU05 |
| RNF04 | **Conteúdo público consistente:** visitantes recebem apenas conteúdo publicado; mudanças em rascunho não alteram a página pública antes da publicação. Verificar por teste de API/interface. | HU01, HU09 |

## 4. Histórias de usuário e critérios de aceitação

### HU01 — Consultar o portal institucional

**Descrição:** Como visitante, quero consultar as páginas públicas da ITES para conhecer a instituição, seus conteúdos e formas de contato.  
**Requisitos relacionados:** P1, B1, RB07, RNF04.

**Critérios de aceitação**
- Dado que existe uma página com versão publicada, quando um visitante acessar sua rota pública, então o sistema exibe a versão publicada sem exigir autenticação.
- Dado que há apenas um rascunho ou prévia, quando um visitante acessar a rota pública, então o rascunho não é exibido.
- Dado que uma página não tem versão publicada, quando o visitante tentar acessá-la, então o sistema não apresenta conteúdo de rascunho como se fosse publicado.
- Dado que o visitante acessa a página inicial, quando a publicação inicial estiver configurada, então o portal apresenta a versão publicada da página inicial.

### HU02 — Autenticar-se e acessar recursos autorizados

**Descrição:** Como usuário cadastrado, quero entrar com minhas credenciais para acessar as funcionalidades permitidas ao meu perfil.  
**Requisitos relacionados:** M3, G1, RB03, RB08, RNF01.

**Critérios de aceitação**
- Dado que a conta está ativa e as credenciais são válidas, quando o usuário solicitar acesso, então uma sessão autenticada é estabelecida e os recursos disponíveis correspondem às permissões efetivas.
- Dado que as credenciais são inválidas, quando o usuário tentar entrar, então o acesso é negado e nenhuma sessão autenticada é criada.
- Dado que o usuário não está autenticado ou não possui a concessão necessária, quando tentar chamar diretamente uma operação protegida, então o servidor nega a operação.
- Dado que um usuário possui vínculo com uma organização, quando não possui concessão para uma operação administrativa, então esse vínculo não autoriza a operação.

### HU03 — Manter perfil e vínculo com organização

**Descrição:** Como solicitante, quero informar e manter meus dados e vínculos organizacionais para que a ITES compreenda quem está solicitando atendimento e em nome de qual grupo.  
**Requisitos relacionados:** M1, M3, RB03, RB06, RNF01.

**Critérios de aceitação**
- Dado que o solicitante está autenticado, quando consultar ou atualizar o próprio perfil com dados válidos, então o sistema salva e exibe os dados atualizados.
- Dado que o solicitante informa ou seleciona uma organização, quando salvar o vínculo, então o sistema persiste a associação sem atribuir automaticamente papel administrativo.
- Dado que o usuário tenta consultar ou alterar o perfil de outra pessoa sem permissão, quando envia a operação, então o servidor a nega.
- Dado que uma organização possui setor econômico, quando esse dado for exibido em uma demanda, então ele não é usado como substituto do serviço solicitado.

### HU04 — Registrar uma demanda para a ITES

**Descrição:** Como solicitante, quero registrar uma demanda com minha condição, o serviço solicitado e as informações necessárias para que a ITES possa avaliá-la.  
**Requisitos relacionados:** M1, M2, M3, RB01, RB02, RB06, RNF01, RNF03.

**Critérios de aceitação**
- Dado que o solicitante está autenticado e preenche os campos obrigatórios com valores válidos, quando enviar a demanda, então o sistema a salva vinculada ao solicitante e gera um código único.
- Dado que a demanda foi criada, quando o solicitante consultar seu estado, então a situação inicial apresentada é Pendente.
- Dado que a condição informada é “outros”, quando essa opção exigir detalhamento, então o sistema solicita e persiste a descrição correspondente.
- Dado que faltam campos obrigatórios ou há valores inválidos, quando o solicitante enviar o formulário, então o sistema informa os erros e não cria uma demanda incompleta.
- Dado que o solicitante informa o serviço pedido, quando a demanda for persistida, então esse valor permanece distinto do setor econômico da organização.

### HU05 — Acompanhar minhas demandas

**Descrição:** Como solicitante, quero consultar minhas demandas, situações e decisões para acompanhar o atendimento da ITES.  
**Requisitos relacionados:** M5, M6, M9, RB02, RB05, RNF01, RNF03.

**Critérios de aceitação**
- Dado que o solicitante está autenticado, quando abrir sua área de demandas, então o sistema lista somente demandas de sua titularidade.
- Dado que existe uma decisão ou mudança de situação, quando o solicitante consultar a demanda, então a situação atual e as informações de decisão disponíveis são exibidas.
- Dado que o solicitante tenta consultar uma demanda de outra pessoa por identificador ou chamada direta à API, quando a operação for processada, então o servidor nega o acesso.
- Dado que o e-mail transacional de estado não foi confirmado/configurado, quando uma decisão for registrada, então o critério obrigatório é a atualização visível na plataforma, sem assumir envio de e-mail.

### HU06 — Localizar e classificar demandas para análise

**Descrição:** Como analista autorizado, quero listar, filtrar e detalhar demandas para organizar a fila de trabalho e preparar a decisão.  
**Requisitos relacionados:** M3, M4, G1, RB03, RB08, RNF01.

**Critérios de aceitação**
- Dado que o analista possui autorização para revisão, quando abrir a fila, então o sistema apresenta demandas que estejam dentro do escopo de acesso autorizado.
- Dado que há demandas com situações diferentes, quando aplicar um filtro por situação, então a lista contém somente registros correspondentes ao filtro.
- Dado que o analista abre uma demanda, quando consultar seus detalhes, então pode identificar os dados submetidos sem que setor econômico e serviço solicitado sejam confundidos.
- Dado que o usuário não possui autorização para revisão, quando tentar listar ou detalhar demandas administrativas, então o servidor nega a operação.

### HU07 — Decidir e atualizar uma demanda

**Descrição:** Como analista autorizado, quero registrar uma decisão e atualizar a situação da demanda para que o solicitante e a equipe acompanhem o resultado do atendimento.  
**Requisitos relacionados:** M3, M5, M6, M9, G1, RB04, RB05, RNF01, RNF02.

**Critérios de aceitação**
- Dado que a demanda está Pendente, quando o analista autorizado a aceita, recusa ou cancela com os dados exigidos, então a situação muda para uma das transições permitidas e o histórico registra responsável, data e justificativa.
- Dado que a demanda está Aceita para atendimento, quando o analista a move para Em atendimento ou Cancelada, então a transição permitida é persistida e auditada.
- Dado que a demanda está Em atendimento, quando o analista a conclui com nota de conclusão, então a situação passa a Concluída e a nota fica registrada.
- Dado que uma transição não é permitida ou falta justificativa/nota obrigatória, quando o analista tentar salvar, então o sistema rejeita a operação e preserva situação e histórico anteriores.
- Dado que a alteração ou o registro de histórico falha, quando a operação for concluída, então nenhuma atualização parcial é mantida.
- Dado que uma decisão foi salva, quando o solicitante consultar a demanda, então a situação atualizada fica visível na área autenticada.

### HU08 — Administrar papéis e permissões

**Descrição:** Como administrador autorizado, quero conceder e revogar papéis/permissões para controlar o acesso de cada usuário às funcionalidades e aos escopos institucionais.  
**Requisitos relacionados:** M3, G1, RB03, RB08, RNF01.

**Critérios de aceitação**
- Dado que o administrador possui a permissão necessária, quando conceder ou revogar um papel/concessão, então a alteração é persistida e considerada nas operações protegidas subsequentes.
- Dado que o usuário não tem autorização administrativa, quando tentar gerenciar permissões pela interface ou diretamente pela API, então o servidor nega a operação.
- Dado que um usuário possui papel institucional ou associação organizacional sem a concessão requerida, quando tentar executar uma ação administrativa, então o acesso é negado.
- Dado que uma ação administrativa é exibida ou ocultada na interface, quando a API receber a operação, então a autorização é novamente validada no servidor.

### HU09 — Editar, pré-visualizar e publicar páginas institucionais

**Descrição:** Como editor autorizado, quero editar páginas por blocos e pré-visualizar alterações para que o publicador possa disponibilizar conteúdo institucional revisado.  
**Requisitos relacionados:** P1, B1, M3, G1, RB07, RB08, RNF01, RNF04.

**Critérios de aceitação**
- Dado que o editor possui concessão para a página, quando adicionar, remover, reordenar ou editar blocos permitidos e salvar, então o conteúdo é mantido como rascunho recuperável.
- Dado que existe um rascunho, quando o editor solicitar uma prévia, então o sistema apresenta o rascunho sem torná-lo público.
- Dado que um usuário sem permissão tenta editar ou salvar, quando enviar a operação à API, então o servidor a nega.
- Dado que um publicador autorizado aprova e publica uma versão, quando a publicação for concluída, então a versão publicada é exibida na rota pública.
- Dado que uma versão publicada existe, quando uma nova edição for salva sem publicação, então a versão pública permanece inalterada.
- Dado que a publicação é retirada do ar, quando um visitante abrir a rota, então o conteúdo retirado não é exibido como vigente.

### HU10 — Consultar indicadores e exportar relatórios

**Descrição:** Como usuário analítico autorizado, quero filtrar demandas, consultar indicadores e exportar os resultados para apoiar a gestão e a prestação de contas.  
**Requisitos relacionados:** M8, M3, G1, RB03, RB08, RNF01. **Escopo a confirmar:** indicadores obrigatórios e limite de registros da exportação.

**Critérios de aceitação**
- Dado que o usuário possui concessão analítica, quando aplicar filtros disponíveis, então os indicadores e a lista/visualização representam os dados correspondentes aos filtros.
- Dado que o usuário não possui concessão analítica, quando tentar consultar painel, relatório ou exportação pela API, então o servidor nega a operação.
- Dado que o usuário autorizado solicita CSV, quando os filtros forem válidos, então o arquivo contém os registros que correspondem aos filtros e respeita o limite configurado/documentado.
- Dado que o usuário solicita impressão, quando abrir a visualização de impressão, então o navegador permite imprimir/salvar o relatório; não se presume geração de PDF no servidor.
- Dado que o resultado ultrapassa o limite documentado, quando a exportação for solicitada, então o sistema aplica o limite de forma explícita e informa o resultado limitado.
- **Validação pendente:** definir com a equipe a lista oficial de indicadores, filtros, escopo de dados e limites que compõem o MVP de M8.

### HU11 — Consultar respostas de formulários vinculados a projetos

**Descrição:** Como integrante autorizado da equipe, quero consultar respostas de formulários associados a uma publicação/projeto para acompanhar as informações recebidas.  
**Requisitos relacionados:** M3, M8, G1, RB03, RB08, RNF01. **Escopo a confirmar:** tratar como jornada complementar ao MVP se a A1 não a priorizar.

**Critérios de aceitação**
- Dado que o usuário tem autorização para a organização/projeto correspondente, quando acessar as respostas pela publicação, então o sistema apresenta somente respostas dentro desse escopo.
- Dado que o usuário não possui autorização ou tenta acessar respostas de outro escopo, quando consultar a API, então o servidor nega o acesso.
- Dado que o formulário mudou depois de respostas anteriores, quando uma resposta histórica for consultada, então sua estrutura é interpretada conforme a versão histórica do formulário, sem ser substituída pelo esquema atual.

## 5. Casos de uso

### UC01 — Registrar demanda

- **Objetivo:** registrar uma solicitação de atendimento à ITES com titularidade, dados de contexto e situação inicial rastreável.
- **Ator principal:** solicitante autenticado.
- **Atores secundários:** sistema de autenticação e persistência.
- **Requisitos relacionados:** M1, M2, M3; HU03, HU04; RB01, RB06; RNF01, RNF03.
- **Pré-condições:** conta autenticada; formulário de demanda disponível.
- **Pós-condições de sucesso:** demanda persistida vinculada ao solicitante, com código único, situação Pendente e dados válidos.

**Fluxo principal**
1. O solicitante abre o formulário de nova demanda.
2. O sistema apresenta os campos exigidos, incluindo condição do solicitante, serviço requerido e informações da organização quando aplicáveis.
3. O solicitante informa os dados e envia o formulário.
4. O sistema valida campos obrigatórios, formatos e opções selecionadas.
5. O sistema confirma a identidade do solicitante e associa a demanda à sua conta.
6. O sistema gera o código único, define a situação Pendente e persiste a demanda.
7. O sistema confirma o registro e apresenta o código e a situação inicial.

**Fluxos alternativos e de exceção**
- **A1 — Condição “outros”:** no passo 2, se o solicitante selecionar “outros”, o sistema solicita a descrição; sem ela, não permite concluir o registro.
- **A2 — Dados inválidos/incompletos:** no passo 4, o sistema informa os campos a corrigir, não persiste a demanda e mantém os dados que puderem ser reaproveitados na tela.
- **E1 — Sessão expirada:** se a sessão não for válida no envio, o sistema não cria demanda e solicita nova autenticação.
- **E2 — Falha de persistência:** o sistema informa que o registro não foi concluído e não apresenta confirmação/código como se a demanda tivesse sido criada.

### UC02 — Analisar e decidir demanda

- **Objetivo:** revisar uma demanda e registrar uma transição permitida com justificativa e histórico.
- **Ator principal:** analista autorizado.
- **Atores secundários:** solicitante (consulta posterior), serviço de autorização e persistência.
- **Requisitos relacionados:** M3–M6, M9, G1; HU05–HU08; RB02–RB05, RB08; RNF01–RNF03.
- **Pré-condições:** analista autenticado e autorizado para o escopo; demanda existente e acessível.
- **Pós-condições de sucesso:** situação atualizada conforme transição válida; responsável, data e justificativa registrados; solicitante pode consultar estado atualizado.

**Fluxo principal**
1. O analista abre a fila de revisão.
2. O sistema valida a permissão e apresenta demandas do escopo autorizado.
3. O analista aplica filtros e seleciona uma demanda.
4. O sistema apresenta os dados e a situação atual.
5. O analista escolhe uma transição permitida e informa justificativa; para conclusão, informa também a nota de conclusão.
6. O sistema valida autorização, transição e dados obrigatórios.
7. O sistema grava, na mesma operação transacional, a nova situação e o evento de histórico com responsável e data.
8. O sistema confirma a decisão; a situação atualizada fica disponível para consulta pelo titular.

**Fluxos alternativos e de exceção**
- **A1 — Transição inválida:** no passo 6, se a transição não for permitida para a situação atual, o sistema rejeita a solicitação e mantém o estado anterior.
- **A2 — Justificativa ou nota ausente:** no passo 6, o sistema informa os dados faltantes e não altera demanda nem histórico.
- **E1 — Acesso não autorizado:** no passo 2, 3 ou 6, o servidor nega a operação, inclusive quando enviada diretamente à API.
- **E2 — Falha de gravação:** no passo 7, a transação é revertida; situação e histórico permanecem consistentes, sem atualização parcial.
- **E3 — Registro alterado concorrentemente:** se a situação atual mudou desde a abertura, o sistema não aplica decisão baseada em estado obsoleto; informa o conflito e exige recarregar a demanda.

### UC03 — Editar e publicar página institucional

- **Objetivo:** alterar uma página institucional mantendo separação entre rascunho, prévia e conteúdo público.
- **Ator principal:** editor autorizado.
- **Ator secundário:** publicador autorizado.
- **Requisitos relacionados:** P1, B1, M3, G1; HU01, HU09; RB07, RB08; RNF01, RNF04.
- **Pré-condições:** página existente ou inicializada; editor autenticado com concessão para edição. Para publicação, usuário com concessão de publicação.
- **Pós-condições de sucesso:** rascunho persistido e recuperável; após publicação autorizada, versão publicada disponível publicamente.

**Fluxo principal**
1. O editor abre uma página que está dentro do seu escopo autorizado.
2. O sistema carrega o conteúdo da versão de trabalho e os blocos permitidos.
3. O editor altera propriedades, adiciona, remove ou reordena blocos.
4. O editor solicita prévia; o sistema renderiza a versão de trabalho sem publicá-la.
5. O editor salva; o sistema persiste o rascunho.
6. Um publicador autorizado revisa a versão e solicita publicação.
7. O sistema valida autorização e versão, publica o conteúdo aprovado e confirma a operação.
8. O visitante acessa a página e recebe a versão publicada.

**Fluxos alternativos e de exceção**
- **A1 — Continuar sem publicar:** após o passo 5, o rascunho permanece privado e a versão pública anterior, se existente, não muda.
- **A2 — Recuperar versão publicada:** se disponível e autorizado, o editor pode restaurar a versão publicada como base de trabalho; isso não publica automaticamente um novo conteúdo.
- **E1 — Sem concessão:** o servidor nega carregar/salvar/publicar, mesmo se a interface tiver sido acessada por URL direta.
- **E2 — Conteúdo inválido ou bloco não permitido:** o sistema informa a validação e não publica a versão inválida.
- **E3 — Conflito de versão:** se outra edição foi salva antes da publicação, o sistema exige recarregar/revisar a versão mais recente antes de publicar.

## 6. Matriz de rastreabilidade

| Requisito existente | Especificação associada | Verificação/critério principal | Situação documentada / observação |
|---|---|---|---|
| M1 — Perfil, organização e condição por demanda | HU03, HU04, UC01 | Perfil e vínculo persistidos; condição e titularidade corretas; não confundir setor e serviço | Implementado segundo specification.md; confirmar campos finais contra A1. |
| M2 — Demanda com código, serviço, urgência e situação inicial | HU04, UC01 | Código único; situação Pendente; campos obrigatórios validados | Implementado e testado segundo specification.md. |
| M3 — Autenticação, sessões e permissões | HU02–HU10, UC01–UC03 | Requisições protegidas validadas no servidor; credenciais inválidas não autenticam | Implementado segundo documentação técnica. |
| M4 — Listar, filtrar, detalhar e classificar | HU06, UC02 | Filtro e escopo aplicados; consulta sem permissão negada | Implementado e testado segundo specification.md. |
| M5 — Decisões e histórico | HU07, UC02 | Transição válida, justificativa, responsável, data; falha não deixa estado parcial | Implementado e testado com auditoria transacional segundo specification.md. |
| M6 — Acompanhamento das próprias demandas | HU05, UC02 | Titular consulta; outro usuário não acessa demanda | Implementado segundo specification.md. |
| M7 — Planejamento das atividades | — (fora do MVP) | Não considerar entregue; elaborar história/caso de uso em evolução futura | Explicitamente futuro na specification.md. |
| M8 — Relatórios | HU10–HU11 | Filtros, escopo, indicadores e exportação conforme limites definidos | Parcial na specification.md; documentação mais recente registra painel, CSV e impressão. Validar escopo final/indicadores. |
| M9 — Notificações/estado | HU05, HU07 | Estado e decisão visíveis na área do solicitante | Confirmação interna documentada; e-mail transacional de estado não implementado/confirmado. |
| P1 — Seções públicas e publicação | HU01, HU09, UC03 | Somente conteúdo publicado visível publicamente | Estrutura de páginas implementada; conteúdo de algumas seções ainda parcialmente estático. |
| B1 — Editar, pré-visualizar, salvar, publicar e recarregar | HU09, UC03 | Rascunho recuperável; prévia privada; publicação autorizada | Editor e fluxo de publicação documentados como implementados. |
| G1 — Atribuição e revogação de papéis | HU02, HU06–HU10 | Concessões aplicadas na API e por escopo | Implementado e testado segundo specification.md. |
| D1 — Modelo e mínimo de registros por tabela | Verificação técnica, não HU | Validar esquema/contagens no banco acadêmico conforme critério original | Entrega acadêmica; não representa necessariamente o schema operacional. |
| D2 — Consultas SQL | Verificação técnica, não HU | Executar consultas e conferir saídas/evidências | Consultas executadas no modelo acadêmico; reconciliação com schema operacional pendente. |
| D3 — Procedures, functions e triggers | Verificação técnica, não HU | Testes positivos e negativos das rotinas exigidas | Evidências referem-se ao modelo acadêmico; conferir requisito original e artefatos. |
| D4 — Papéis e privilégios do banco | Verificação técnica, não HU | Operações não autorizadas são negadas pelos papéis de banco | Validado no schema acadêmico segundo specification.md; não substituir autorização da aplicação. |
| DOC — Dicionário, modelo e evidências | Verificação documental, não HU | Artefatos correspondem ao escopo e identificam limitações | Documentação localizada em docs/database; conferir a exigência exata da A1. |
| RNF01–RNF04 | HU01–HU11 conforme tabela RNF | Testes de autorização, isolamento, atomicidade e publicação privada | Propostos nesta versão; validar/aprovar com equipe. |

## 7. Pontos a confirmar antes da entrega

- [ ] Comparar os IDs e descrições desta especificação com a documentação original da A1 e manter os identificadores originais em caso de divergência.
- [ ] Confirmar quais histórias são prioridade obrigatória do MVP e se HU11 pertence à entrega.
- [ ] Definir os indicadores, filtros, escopos e limites de exportação que concretizam M8.
- [ ] Confirmar se M9 exige somente atualização na plataforma ou também e-mail/notificação externa.
- [ ] Confirmar os RNFs propostos, incluindo valores mensuráveis quando a equipe tiver metas de desempenho, disponibilidade ou acessibilidade.
- [ ] Conferir critérios e evidências de D1–D4 e DOC com o enunciado acadêmico original; não misturar validação do modelo acadêmico com o schema operacional.
- [ ] Revisar os critérios com a equipe/representante da ITES e convertê-los em testes de aceitação.

## 8. Referências do repositório

- [Especificação de requisitos e rastreabilidade (base)](specification.md)
- [Estado de implementação](../IMPLEMENTATION_STATUS.md)
- [Índice da documentação](../INDEX.md)
