# QA MASTER — RELATÓRIO DE APONTAMENTOS E VULNERABILIDADES (FINDINGS)
**Sistema**: BaseOS (VolleyPro)  
**Versão**: 1.0.0 | **Commit**: `a9e42ac`  
**Data**: 04/09/2026  

---

## 1. MATRIZ DE RESULTADOS E CLASSIFICAÇÃO DE RISCO

| Área | Teste / Cenário | Resultado | Severidade | Evidência / Arquivo |
|---|---|---|---|---|
| **Auditoria** | Instrumentação de Audit Logs em Ações de UI | ✅ RESOLVIDO (Fase 4.9.1) | **P2 (Fechado)** | `src/services/operationalAuditService.ts`, `supabase/migrations/20260904000001_audit_logs.sql`, `src/pages/MatchesPage.tsx`, `LiveScorerDeskModal.tsx`, `CompetitionsPage.tsx`, `DrawPage.tsx`, `SettingsPage.tsx` |
| **Qualidade de Código** | Dependências em hooks React (ESLint Warning) | ⚠️ ATENÇÃO | **P3 (Médio)** | `src/components/draw/cinematic/DrawArenaCanvas.tsx:438` |
| **Performance Web** | Tamanho de Chunks do Build de Produção (>1MB) | ⚠️ ALERTA | **P3 (Médio)** | `dist/assets/vendor-pdf-*.js`, `dist/assets/vendor-core-*.js` |
| **Compatibilidade** | Módulos Node importados em utilitários de PDF | ⚠️ ALERTA | **P3 (Médio)** | `src/document-engine/utils/pdfUtils.ts` (node:fs/promises) |
| **Arquitetura Vite** | Importação mista (estática + dinâmica) de Supabase | ℹ️ INFO | **P4 (Baixo)** | `src/lib/supabaseClient.ts` |
| **TypeScript** | Typecheck do projeto sem emissão | ✅ PASS | N/A | `npx tsc -p tsconfig.app.json --noEmit` (0 erros) |
| **Regras Canônicas** | Imutabilidade e congelamento do rulesSnapshot | ✅ PASS | N/A | `src/test/competitionDomainFinalAudit.test.ts` |
| **Ciclo de Vida** | Transições de status e bloqueio de edição | ✅ PASS | N/A | `src/test/competitionLifecycleIntegration.test.ts` |
| **Integridade de Equipes**| Bloqueio de exclusão com partidas/inscrições | ✅ PASS | N/A | `src/test/competitionRegistrationIntegrity.test.ts` |
| **Sorteio / Chaveamento**| Sorteio atômico e proteção de partidas jogadas | ✅ PASS | N/A | `src/test/drawValidator.test.ts`, `drawArenaFeatures.test.ts` |
| **Playoffs e Pódio** | Avanço canônico de vencedores e pódio | ✅ PASS | N/A | `src/test/competitionBracket.test.ts` |
| **Document Engine** | Emissão de Súmulas 3/5 sets e Ordem de Saque | ✅ PASS | N/A | `src/test/qaMaster.test.ts` |
| **Infraestrutura Docker**| Build multi-stage e runtime Nginx com fallback SPA | ✅ PASS | N/A | Dockerfile, `nginx.conf`, porta 8092 |
| **Segurança** | Verificação de headers OWASP e isolamento de secrets | ✅ PASS | N/A | `curl -i` contra container Nginx |

---

## 2. DETALHAMENTO DOS APONTAMENTOS ENCONTRADOS

### FINDING-01: Ausência de Disparo Sistemático de Audit Logs na UI
- **Classificação**: Funcional / Governança Operacional
- **Severidade**: **P2 — Alto**
- **Status**: **RESOLVIDO E FECHADO NA FASE 4.9.1 (04/09/2026)**
- **Descrição Original**: O serviço `dataAccess` e o schema relacional do banco fornecem infraestrutura de trilha de auditoria, mas as telas de UI não realizavam chamadas sistemáticas a `dataAccess.addAuditLog` para gravar o autor da alteração, timestamp e dados anteriores/novos.
- **Resolução Implementada (Fase 4.9.1)**:
  1. **Contrato Canônico e Serviço Central**: Implementado `OperationalAuditService` (`src/services/operationalAuditService.ts`) que responde inequívocamente às 7 perguntas canônicas de auditoria (*Quem fez, Quando fez, O que fez, Qual competição, Qual entidade, Estado anterior e Novo estado*).
  2. **Persistência Híbrida e Filtros**:
     - Estendido `MatchAuditEntry` em `src/types/entities.ts` com `entityType`, `entityId`, `competitionId`, `competitionName` e `details`.
     - Atualizado `dataAccess.listAuditLogs` em `src/services/dataAccess.ts` com suporte a filtros por `competitionId`, `entityType` e `entityId` no LocalStorage e Supabase.
     - Criada migração oficial Supabase `supabase/migrations/20260904000001_audit_logs.sql` criando a tabela `public.audit_logs`, índices relacionais e políticas RLS.
  3. **Instrumentação das Mutações de UI**:
     - `MatchesPage.tsx`: homologação oficial (`recordMatchHomologation`), reabertura (`recordMatchReopen`), sincronização de playoffs (`recordPlayoffSync`), agendamento de partidas (`recordMatchEdit`) e validação de resultados (`recordMatchResult`).
     - `LiveScorerDeskModal.tsx`: finalização oficial na súmula digital e finalização rápida.
     - `CompetitionsPage.tsx`: transição de status no ciclo de vida (`recordCompetitionTransition`), criação de competição (`recordCompetitionCreation`) e atualização de regras (`recordCompetitionConfigUpdate`).
     - `DrawPage.tsx`: oficialização do sorteio (`recordDrawExecution`).
     - `SettingsPage.tsx`: carregamento em tempo real da trilha consolidada via `dataAccess.listAuditLogs` com busca textual instantânea por operador, ação, entidade e detalhes.
  4. **Testes Automatizados**: Suíte dedicada `src/test/operationalAuditService.test.ts` com 12 testes cobrindo todas as 7 perguntas canônicas, mutações de partidas, competições, sorteio, filtros relacionais e sincronismo. Todos aprovados (12/12).

---

### FINDING-02: Alerta ESLint em Hook `useMemo` de Cenário 3D
- **Classificação**: Qualidade de Código / Frontend
- **Severidade**: **P3 — Médio**
- **Descrição**: O ESLint acusa um aviso na renderização 3D da arena de sorteio:
  `src/components/draw/cinematic/DrawArenaCanvas.tsx: 438:6 warning React Hook useMemo has a missing dependency: 'team'`.
- **Causa Provável**: O objeto ou propriedade `team` é utilizado dentro do cálculo memorizado sem estar declarado no array de dependências do hook `useMemo`.
- **Impacto**: Se os dados da equipe sofrerem mutação durante a animação em tempo real sem re-renderização completa do componente pai, o modelo 3D pode não refletir a nova equipe imediatamente.
- **Evidência**: Alerta retornado por `npm run lint`.
- **Recomendação**: Adicionar `team` ao array de dependências do `useMemo` ou refatorar para extrair a propriedade primitiva utilizada.

---

### FINDING-03: Tamanho Elevado de Chunks Javascript no Build
- **Classificação**: Performance Web (Core Web Vitals)
- **Severidade**: **P3 — Médio**
- **Descrição**: O empacotador Vite emite alerta para dois bundles que superam 1.000 kB:
  - `vendor-pdf-BauSLd-X.js`: 2.398 kB (853 kB comprimido com gzip)
  - `vendor-core-hDoaiJms.js`: 1.266 kB (361 kB comprimido com gzip)
- **Causa Provável**: As bibliotecas `@react-pdf/renderer`, Three.js (`@react-three/fiber`, `@react-three/drei`) e Lucide Icons concentram módulos pesados.
- **Impacto**: Usuários em conexões 3G/4G podem experimentar tempo maior para o primeiro carregamento interativo caso acessem rotas pesadas. (Atenuado pelo uso de `React.lazy` nas rotas no `App.tsx`).
- **Recomendação**:
  1. Configurar `manualChunks` no `vite.config.ts` para isolar `@react-pdf` exclusivamente na rota de emissão documental.
  2. Isolar o Three.js exclusivamente para o chunk de sorteio cinematográfico (`DrawArena`).

---

### FINDING-04: Módulos Node.js em Utilitário de PDF para Browser
- **Classificação**: Compatibilidade de Plataforma
- **Severidade**: **P3 — Médio**
- **Descrição**: O arquivo `src/document-engine/utils/pdfUtils.ts` realiza import de `node:fs/promises` e `node:path`. O Vite externalizou automaticamente esses módulos para o browser durante o build de produção (`Module "node:fs/promises" has been externalized for browser compatibility`).
- **Causa Provável**: Compartilhamento de código entre scripts de geração em terminal/Node e o código executado no navegador.
- **Impacto**: Qualquer chamada em runtime que execute métodos desse utilitário no cliente disparará `TypeError: fs.readFile is not a function`.
- **Evidência**: Alerta de build do Vite na linha 25 de `pdfUtils.ts`.
- **Recomendação**: Separar utilitários de sistema de arquivos para a pasta `scripts/` e manter em `src/` apenas geradores que operam com `Uint8Array` e `Blob` em memória.

---

### FINDING-05: Dynamic Import Ambíguo de SupabaseClient
- **Classificação**: Otimização de Bundling
- **Severidade**: **P4 — Baixo**
- **Descrição**: O Vite emite alerta informando que `src/lib/supabaseClient.ts` é importado dinamicamente em `src/services/authService.ts`, mas importado estaticamente em outros módulos (`dataAccess.ts`, `LoginPage.tsx`), anulando o split em chunk separado.
- **Impacto**: Apenas ineficiência de tree-shaking; nenhuma falha de execução.
- **Recomendação**: Padronizar as importações como estáticas ou criar factory assíncrona única.
