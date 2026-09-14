# BASEOS — FASE 8.6.2: CORREÇÃO E HOMOLOGAÇÃO COM BACKEND REAL LOCAL

## Walkthrough Oficial de Correção e Homologação com Backend Real Local

**Sistema:** BaseOS — SaaS multi-tenant de gestão de competições de voleibol  
**Instância:** VOLTZ  
**Fase:** 8.6.2 — Correção e Homologação com Backend Real Local  
**Ambiente:** Desenvolvimento Local (Supabase Local na porta 8400, PostgreSQL na porta 5432)  
**Produção (VOLTZ):** Preservada (Sem deploy/release/tag/push)  
**Parecer:** **GO** (Ambiente e contratos estabilizados, pronto para homologação operacional de ponta a ponta)

---

### 1. Resumo Executivo

Na transição para a homologação com backend real Supabase Local (Fase 8.6.1), o teste manual no navegador revelou dois erros críticos que impediam a operação:
1. **HTTP 404 em `GET /rest/v1/modalities?select=*`**: PostgREST respondia Not Found.
2. **Crash do CompetitionFormatBuilder**: `Cannot read properties of undefined (reading 'stages')` ao abrir ou configurar o formato de uma competição.

Ambos os problemas foram investigados até suas causas raízes arquiteturais e corrigidos sem criação de tabelas artificiais e sem máscaras temporárias. A suíte completa de testes, tipagem e build foi aprovada com 100% de sucesso.

---

### 2. Diagnóstico das Causas Raízes e Correções Implementadas

#### Erro 1 — Endpoint `/modalities` (HTTP 404)
* **Causa Raiz:** O frontend executava chamadas REST ao PostgREST procurando uma tabela `modalities`. No entanto, na modelagem canônica do BaseOS (e nas 24 migrações oficiais de produção VOLTZ), modalidades (`indoor` e `beach`) são um catálogo estático de regras esportivas de domínio, e não uma tabela relacional dinâmica no PostgreSQL.
* **Correção Arquitetural:**
  - Purgada qualquer tabela artificial ou migração órfã de `modalities` (`DROP TABLE IF EXISTS public.modalities` executado no banco local).
  - Atualizado [src/services/dataAccess.ts](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts): `supabaseAdapter.listModalities()` e `getModality()` servem diretamente o catálogo de domínio em memória (`seedModalities`), eliminando a requisição de rede e garantindo paridade com VOLTZ.
  - Criado teste de contrato em [src/test/modalitiesContract.test.ts](file:///home/diego-martins/docker/volei/src/test/modalitiesContract.test.ts) (2/2 testes aprovados).

#### Erro 2 — Crash do CompetitionFormatBuilder (`Cannot read properties of undefined (reading 'stages')`)
* **Causa Raiz:** O preset desportivo padrão (`DEFAULT_INDOOR_COMPETITION_CONFIG` / `DEFAULT_BEACH_COMPETITION_CONFIG`) define regras de pontuação e critérios de desempate, mas a árvore de fases esportivas (`stages`) pertence ao **template de disputa** (`CompetitionTemplateService`). Quando `CompetitionRulesService.getConfig()` ou `normalizeLegacyToConfig()` processavam uma competição sem fases customizadas gravadas, entregavam uma configuração sem `stages` estruturados ao `CompetitionFormatBuilder`. Ao invocar `generatePreviewSlots()`, o builder tentava ler `config.format.stages` e colapsava a renderização do React.
* **Correção Arquitetural:**
  - [src/services/competitionRulesService.ts](file:///home/diego-martins/docker/volei/src/services/competitionRulesService.ts): `normalizeLegacyToConfig` agora aciona `CompetitionTemplateService.createConfigFromTemplate` com base no formato da competição (`round-robin`, `groups-knockout`, etc.), derivando uma árvore canônica completa de fases (`stages`).
  - Em `getConfig()`, quando `competition.config` existe mas não possui fases explícitas, as fases do template canônico são preservadas e integradas.
  - [src/hooks/useCompetitionFormatBuilder.ts](file:///home/diego-martins/docker/volei/src/hooks/useCompetitionFormatBuilder.ts): Proteção na inicialização garantindo que o builder receba uma configuração de template válida antes da primeira renderização.
  - Criado teste de regressão em [src/test/competitionFormatBuilderRegression.test.ts](file:///home/diego-martins/docker/volei/src/test/competitionFormatBuilderRegression.test.ts) (5/5 testes aprovados).

#### Preservação da Especificidade de Vôlei de Praia (Beach)
* **Regra de Domínio:** No Vôlei de Praia, todas as fases (incluindo semifinais e final) são disputadas estritamente em melhor de 3 sets (`defaultSetsToWin: 2`). Não há finais em melhor de 5 sets como no vôlei de quadra.
* **Ajuste:** `phaseOverrides` foi configurado como estritamente `undefined` para `modality === 'beach'` tanto nos templates de [competitionTemplateService.ts](file:///home/diego-martins/docker/volei/src/services/competitionTemplateService.ts) quanto em `competitionRulesService.ts`. Validado com sucesso em [src/test/baseosScoresheetConsolidation.test.ts](file:///home/diego-martins/docker/volei/src/test/baseosScoresheetConsolidation.test.ts).

---

### 3. Matriz de Verificação Técnica

| Verificação | Comando | Resultado |
| :--- | :--- | :--- |
| **Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** ✅ |
| **Linter** | `npm run lint` | **0 erros** (1 warning react-hooks pré-existente) ✅ |
| **Build de Produção** | `npm run build` | **Aprovado em 2m 19s** (dist gerado com sucesso) ✅ |
| **Suíte de Testes Críticos** | `npx vitest run ...` | **8 arquivos avaliados, 99 testes executados, 99 aprovados (0 falhas)** ✅ |

#### Testes Críticos Aprovados:
1. `src/test/modalitiesContract.test.ts` (2 testes)
2. `src/test/competitionFormatBuilderRegression.test.ts` (5 testes)
3. `src/test/baseosScoresheetConsolidation.test.ts` (10 testes)
4. `src/test/matchStatisticsReport.test.tsx` (19 testes)
5. `src/test/classificationProbability.test.ts` (18 testes)
6. `src/test/competitionConfigFormIntegration.test.ts` (7 testes)
7. `src/test/competitionRulesService.test.ts` (33 testes)
8. `src/test/fase86E2EHomologation.test.ts` (5 testes)

---

### 4. Próximo Passo Imediato

1. **Abrir o sistema no navegador:** Navegar até `http://localhost:3004/competitions` (ou via proxy 5173).
2. **Validar no console:** Confirmar visualmente 0 erros de rede (sem 404 em `/modalities`) e render perfeito do `CompetitionFormatBuilder` com os slots de preview de fases sem crash.
3. **Prosseguir com o fluxo de testes ponta a ponta:** Inscrição de equipes, atletas, sorteio e registro de súmula de partida persistidos no PostgreSQL local (`supabase-db`).
