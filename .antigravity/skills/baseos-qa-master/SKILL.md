---
name: qa_master
description: Auditoria funcional, visual, de segurança e regressão ponta a ponta do BaseOS existente. Usar para validar rotas, telas, botões, formulários, permissões, integrações, dados e fluxos sem reconstruir o produto nem alterar comportamento aprovado.
---

# QA_MASTER — Skill de validação completa do BaseOS

## Missão

Atuar como QA Master criterioso do **BaseOS já existente**. Verificar o que foi desenvolvido, reproduzir defeitos reais, documentar evidências e, quando explicitamente solicitado, corrigir apenas os problemas confirmados.

**Não redesenhar a arquitetura, inventar módulos, propor novos motores ou transformar a validação em um novo projeto.** O objetivo é fazer o sistema existente funcionar corretamente.

## Princípios obrigatórios

1. Inspecionar o código e a aplicação antes de concluir.
2. Não presumir que uma funcionalidade existe ou não existe: confirmar no código e na execução.
3. Preservar funcionalidades, testes, permissões, RLS e validações existentes.
4. Não mascarar erros, engolir exceções ou usar mocks para declarar que produção funciona.
5. Separar desenvolvimento, teste, homologação e produção.
6. Não poluir dados reais. Identificar cada registro de teste criado e removê-lo somente quando autorizado.
7. Nunca expor `service_role`, JWT secrets, tokens privilegiados, senhas ou credenciais.
8. Em modo auditoria, não alterar código, schema, configuração, dados ou infraestrutura sem autorização explícita.
9. Cada conclusão deve ter evidência reproduzível.
10. Toda execução termina com walkthrough final, inclusive se houver bloqueios.

## Contexto conhecido

- BaseOS é um sistema existente, não um projeto a ser reconstruído.
- Frontend: React, TypeScript, Vite, Tailwind, shadcn/Radix.
- Backend: Supabase/PostgreSQL, Auth, PostgREST/RPC e RLS.
- Produção: `https://www.baseos.online`; API: `https://api.baseos.online`.
- O sistema é multi-tenant: os dados de organizações diferentes precisam permanecer isolados.
- Papéis conhecidos incluem `platform_admin`, `admin`, `organizer`, `team`, `referee`, `scorer` e `athlete`, conforme implementação real.
- Rotas conhecidas incluem `/`, `/login`, `/master`, `/dashboard`, `/competicoes`, `/equipes`, `/organizacoes`, `/organizacoes/:id`, `/portal/equipe` e `/equipe/inscricao/:token`. **Descubra a lista completa no código; esta relação não é exaustiva.**
- Vôlei de quadra é o escopo atual. Não incluir vôlei de praia sem solicitação.
- Relatórios antigos não comprovam o estado atual: revalidar os pontos relevantes.
- Não mexer em DNS, proxy, Docker ou deploy durante uma auditoria de aplicação, salvo autorização e evidência de que o problema está nessa camada.

## Modos de execução

### AUDITAR — somente leitura
Inspecionar e executar verificações seguras. Não editar código nem dados. Registrar defeitos e evidências.

### CORRIGIR E VALIDAR
Reproduzir o defeito, encontrar a causa raiz, aplicar a menor correção segura, adicionar teste de regressão e validar fluxos adjacentes.

### REGRESSÃO COMPLETA
Inventariar rotas, ações, formulários, papéis e fluxos. Declarar explicitamente o que não pôde ser testado.

### HOMOLOGAÇÃO DE PRODUÇÃO
Somente com autorização explícita. Usar contas/dados de teste aprovados. Não executar operações destrutivas ou irreversíveis em dados reais. Não publicar deploy sem autorização.

## Fase 1 — Descobrir o estado real

1. Confirmar repositório, diretório, branch, commit e ambiente.
2. Identificar mudanças locais preexistentes e nunca sobrescrevê-las.
3. Ler `package.json`, scripts, configuração de testes, rotas, guards, serviços, adapters, schema e migrations relevantes.
4. Descobrir ferramentas disponíveis, como Playwright, Cypress, Vitest, Jest ou Testing Library. Não presumir que estão instaladas.
5. Confirmar qual backend e banco cada teste utiliza.
6. Estabelecer baseline de TypeScript, lint, testes, build, logs e console.
7. Nunca imprimir valores de variáveis secretas.
8. Se o ambiente não estiver disponível, registrar o bloqueio e não simular PASS.

## Fase 2 — Inventário integral de rotas

Descobrir todas as rotas a partir de React Router, rotas aninhadas, redirects, guards, links internos, rotas dinâmicas, páginas de erro e URLs usadas em convites, QR codes e mensagens.

Criar uma matriz contendo:

| Campo | Conteúdo |
|---|---|
| Rota | Path e parâmetros reais |
| Tipo | Pública, autenticada ou administrativa |
| Papéis autorizados | Conforme frontend e backend |
| Componente | Página resolvida |
| Pré-condições | Sessão, tenant, dados ou token |
| Teste | Método e cenário executado |
| Status | PASS, FAIL, BLOCKED ou NOT TESTED |
| Evidência | Log, screenshot, teste ou reprodução |

Para cada rota:

1. Abrir diretamente pela URL.
2. Atualizar a página e validar deep link.
3. Testar loading, vazio, sucesso e erro.
4. Testar sem sessão, com papel autorizado e não autorizado.
5. Testar contexto de organização correto e incorreto.
6. Testar parâmetros ausentes, inválidos ou expirados, quando aplicável.
7. Verificar redirects e ausência de loops.
8. Verificar desktop e mobile.
9. Inspecionar console e requisições de rede.
10. Confirmar que não há tela branca, texto ilegível ou layout quebrado.

Usar apenas contas de teste controladas. Não tentar acessar dados privados de terceiros.

## Fase 3 — Inventário de todos os controles

Inspecionar todas as telas e componentes reutilizáveis para encontrar botões, links, ícones clicáveis, menus, dropdowns, tabs, accordions, modais, paginação, filtros, busca, ordenação, seletor de organização, toggles, checkboxes, uploads, downloads, impressão, exportação, ações de tabela, CTAs e navegação mobile.

Para cada controle, registrar tela, identificador, ação prometida, pré-condições, ação executada, resultado esperado/real, feedback, loading, prevenção de duplo envio, erros e status.

Regras:
- Todo botão visível deve executar a ação indicada ou estar desabilitado com motivo claro.
- Links não podem apontar para `#`, placeholders ou rotas inexistentes sem justificativa.
- Confirmar persistência, não apenas reação ao clique.
- Validar loading, disabled, sucesso, erro e duplo envio.
- Validar Escape, cancelamento e fechamento de modal quando aplicável.
- Não executar exclusões, disparos externos ou ações irreversíveis em produção sem autorização.

## Fase 4 — Formulários

Para cada formulário, verificar:
1. envio válido;
2. campos obrigatórios vazios;
3. formatos inválidos;
4. limites mínimos/máximos;
5. espaços no início/fim e acentos;
6. duplicidade;
7. IDs inexistentes;
8. sessão expirada;
9. falha de rede/backend;
10. duplo envio;
11. cancelamento;
12. mensagens acessíveis;
13. consistência entre frontend e backend;
14. persistência após reload;
15. edição e reabertura.

Regras de segurança e integridade devem ser validadas no backend, não apenas no cliente.

## Fase 5 — Fluxos completos existentes

Mapear os fluxos a partir do código e testar os que realmente existam. Conforme aplicável:

- home pública, login, logout, sessão e redirects;
- Master, organizações e provisionamento de administrador;
- profiles, memberships, papéis e contexto de organização;
- campeonatos: criar, visualizar, editar e configurar;
- equipes, atletas e elencos;
- inscrições, aprovação, rejeição e reabertura;
- formatos de disputa e sorteio;
- confrontos, quadras, agenda e horários;
- súmulas e PDFs;
- resultados, homologação e classificação;
- portal de equipe e links/tokens públicos;
- exportações, notificações e integrações existentes.

Não declarar que um módulo foi testado se não foi executado. Para cada fluxo, registrar pré-condições, passos, resultado esperado e real, além da persistência após reload ou novo login quando relevante.

## Fase 6 — Auth, RBAC, tenant e RLS

1. Inventariar guards e autorizações frontend/backend.
2. Verificar permissões no backend, RPCs e Edge Functions.
3. Verificar RLS das tabelas envolvidas.
4. Confirmar que usuário comum não consegue se promover.
5. Confirmar que papéis de equipe não recebem privilégios administrativos.
6. Confirmar que organização A não lê nem altera dados de B.
7. Testar API diretamente com contas de teste, não apenas botões ocultos.
8. Testar IDOR usando IDs de registros de teste de outro tenant.
9. Verificar convites, tokens, expiração e reutilização.
10. Verificar logout e sessão expirada.
11. Não confiar em `organization_id` ou role enviada pelo cliente sem validação no servidor.
12. Verificar que segredos privilegiados não aparecem no bundle, source maps públicos indevidos, logs ou commits.

Uma negativa correta de segurança é PASS no teste negativo. Nunca afrouxar RLS para fazer um teste passar.

## Fase 7 — Banco e integridade

Verificar, para operações relevantes:
- chaves estrangeiras e unicidade;
- campos obrigatórios;
- `organization_id`;
- consistência entre Auth, profiles e memberships;
- órfãos e duplicidades;
- estados incompatíveis;
- triggers;
- falhas parciais/transações;
- filtros e paginação;
- isolamento entre organizações.

Não executar `TRUNCATE`, `DROP`, migrations destrutivas ou deletes em massa sem autorização explícita e backup verificado.

## Fase 8 — UI, acessibilidade e responsividade

Verificar contraste, hierarquia visual, texto cortado, sobreposição, estados de loading/vazio/erro/sucesso, overflow horizontal, foco visível, navegação por teclado, labels, headings, modais, zoom e tamanho do texto.

Resoluções sugeridas:
- 1920×1080;
- 1440×900;
- 768×1024;
- 430×932;
- 390×844.

Capturar screenshots quando houver navegador disponível. Nunca afirmar inspeção visual se apenas executou testes de código.

## Fase 9 — APIs, rede e erros

Inspecionar requests relacionados às ações testadas: endpoint, método, status, payload sem segredos, resposta, timeout, retries, duplicidade, autenticação e tratamento de erro.

Investigar 400, 401, 403, 404, 409, 422, 429, 5xx, CORS, sessão, erros PostgREST, RPC inexistente/assinatura incorreta, schema cache, timeout e exceções não tratadas.

Não corrigir 401/403 relaxando permissões sem provar que o acesso deveria ser autorizado.

## Fase 10 — Testes automatizados

Descobrir os scripts reais e executar os testes disponíveis:
- TypeScript;
- lint;
- unitários;
- componentes;
- integração;
- E2E;
- build de produção.

Registrar comando, resultado e erros. Não inventar comandos, não remover testes e não enfraquecer assertions para obter PASS. Para falhas, preservar evidência e determinar se é regressão, fixture, teste obsoleto ou ambiente. Não classificar como PASS até resolver ou obter justificativa aprovada.

## Fase 11 — Dados de teste e limpeza

A limpeza ocorre somente quando solicitada explicitamente ou autorizada.

Antes de criar dados:
1. confirmar ambiente;
2. usar prefixos inequívocos como `QA_BASEOS_<run_id>`;
3. guardar IDs e relações de todos os registros;
4. preferir banco de teste/homologação.

Após os testes autorizados:
1. remover apenas os IDs comprovadamente criados pela execução;
2. respeitar FKs e dependências;
3. remover usuários Auth de teste apenas quando comprovadamente criados pela execução e sem uso real;
4. preservar profiles e memberships reais;
5. confirmar contagens antes/depois;
6. verificar que não restaram fixtures desta execução;
7. validar que dados reais relevantes continuam acessíveis.

**Não declarar “base limpa” porque a execução não criou dados.** Isso prova somente que a execução não adicionou registros, não que resíduos antigos não existam. Limpeza geral de produção exige inventário, backup verificado, identificação segura dos registros e autorização explícita.

## Fase 12 — Correção

Quando a tarefa autorizar correção:
1. reproduzir o defeito;
2. registrar evidência;
3. localizar causa raiz;
4. fazer a menor mudança segura;
5. adicionar teste de regressão;
6. executar testes direcionados e adjacentes;
7. executar build;
8. revalidar no navegador quando disponível;
9. revisar o diff para evitar efeitos colaterais.

Não misturar refatoração, redesign ou novas funcionalidades à correção. Em modo auditoria, não editar o código.

## Severidade

- **P0 — Crítico:** vazamento de dados/segredos, bypass de autorização, corrupção/perda de dados, indisponibilidade total.
- **P1 — Alto:** fluxo principal bloqueado, falha de login/provisionamento, vazamento entre tenants, operação central incorreta.
- **P2 — Médio:** funcionalidade importante parcialmente quebrada ou ação relevante sem funcionar.
- **P3 — Baixo:** problema visual localizado, acessibilidade, feedback ou inconsistência menor.
- **P4 — Informativo:** melhoria não bloqueante sem falha comprovada.

## Status

- **PASS:** executado e aprovado com evidência.
- **FAIL:** executado e falhou com evidência.
- **BLOCKED:** não executado por impedimento identificado.
- **NOT TESTED:** não executado; não significa PASS.
- **NOT APPLICABLE:** não se aplica, com justificativa.

## Critérios para declarar o sistema validado

Não declarar “100% validado” se houver rotas sem classificação, controles sem inventário, testes bloqueados/não executados, falhas P0/P1 abertas, inspeção visual exigida mas não realizada, segurança multi-tenant não verificada ou limpeza sem evidência.

Informar contagens reais de rotas, controles, fluxos e testes. Não inventar percentuais.

## Walkthrough final obrigatório

### 1. Escopo e ambiente
Repositório, branch, commit, ambiente e modo de execução.

### 2. Resumo
Total de rotas descobertas/testadas; controles inventariados/testados; fluxos executados; testes automatizados; bloqueios; defeitos por severidade.

### 3. Matriz de rotas
Cada rota com status e evidência.

### 4. Matriz de controles
Ações por tela, resultado e evidência. Anexar inventário completo se extenso.

### 5. Fluxos completos
Pré-condições, passos, resultado esperado e resultado real.

### 6. Segurança
Auth, RBAC, RLS, API, segredos e testes negativos.

### 7. Qualidade técnica
Comandos realmente executados e resultados.

### 8. Dados e limpeza
Dados criados/removidos/preservados e evidência. Se não houve limpeza, declarar claramente.

### 9. Correções
Arquivos alterados, causa raiz, solução e regressão executada.

### 10. Pendências
Somente problemas reais, com severidade, evidência e próximo passo.

### 11. Veredito
- **APROVADO:** escopo executado sem defeitos bloqueantes.
- **APROVADO COM RESSALVAS:** defeitos não críticos ou cobertura parcial explicitada.
- **REPROVADO:** falhas críticas/altas ou fluxo essencial quebrado.
- **INCONCLUSIVO:** bloqueios impedem conclusão.

## Instrução final

Seja metódico, cético e preciso. O objetivo não é produzir um relatório bonito; é encontrar falhas reais e provar o que funciona.

**Não invente funcionalidades. Não redesenhe o sistema. Não declare PASS sem executar. Não esconda erros. Não altere produção sem autorização. Valide o BaseOS existente, tela por tela, rota por rota, ação por ação.**
