# WALKTHROUGH — FASE 2: IDENTIDADE DA COMPETIÇÃO, APOIADORES E CONFIGURAÇÃO VISUAL

**Sistema:** BaseOS — Sistema SaaS Profissional de Gestão de Competições de Voleibol  
**Fase:** 2 (Identidade da Competição, Apoiadores e Configuração Visual)  
**Status do Ciclo:** IMPLEMENTADO E VALIDADO EM DEV/TESTE (DEPLOY DE PRODUÇÃO PENDENTE)  
**Data:** 10 de Setembro de 2026  
**Documento de Referência Anterior:** [`docs/WALKTHROUGH_FASE_1_AUDITORIA_PORTAIS_COMPETICAO.md`](file:///home/diego-martins/docker/volei/docs/WALKTHROUGH_FASE_1_AUDITORIA_PORTAIS_COMPETICAO.md)

---

## 1. Objetivo da Fase

A **Fase 2** teve como missão implementar a governança visual e comercial da competição no BaseOS sem introduzir complexidade operacional desnecessária ou desestabilizar regras esportivas:
1. Dotar a competição de identidade visual própria (`logoUrl`);
2. Permitir o cadastro, categorização e ordenação determinística de apoiadores/patrocinadores do evento esportivo (`supporters`);
3. Garantir a persistência dual (LocalStorage e Supabase/PostgreSQL) com estrita retrocompatibilidade para competições legadas;
4. Exibir a identidade e os apoiadores nos Portais Público e da Equipe, mantendo o isolamento absoluto de marcas comerciais em relação ao domínio da equipe e da plataforma BaseOS;
5. Corrigir as inconsistências visuais do configurador de formatos (eliminar tokens sintéticos do Tailwind e padronizar paleta Zinc/Slate opaca);
6. Implementar o bloqueio preventivo das regras esportivas sob a autoridade única de `CompetitionLifecycleService.canEditRules`, mantendo a edição de identidade/marketing desacoplada e sempre acessível.

---

## 2. Estado Inicial do Projeto

Antes do início da Fase 2, a auditoria (Fase 1) diagnosticou o seguinte cenário:
- **Ausência de Identidade do Torneio:** `CompetitionRecord` não possuía campo para logotipo oficial. Torneios dependiam exclusivamente do nome textual ou ícone genérico de troféu.
- **Inexistência de Apoiadores na Competição:** Não havia estrutura de dados ou persistência para patrocinadores da copa.
- **Risco de Poluição de Domínio:** Havia ambiguidade sobre onde patrocinadores deveriam residir, com risco de inserção incorreta em `TeamRecord`.
- **Inconsistência Visual no Format Builder:** Componentes em `src/components/competition/format-builder/` utilizavam classes Tailwind inexistentes (`bg-surface-*`, `text-text-*`, `border-border-subtle`), resultando em renderização translúcida, falta de contraste e botões sem destaque.
- **Nomenclatura Informal:** O configurador utilizava títulos e botões com o caractere `&` ("Format Builder & Fases", "Formatos & Regras").
- **Falta de Bloqueio Preventivo na UI:** Quando uma competição já possuía partidas geradas ou em andamento, o modal do configurador continuava permitindo alterar regras, gerando inconsistências caso o organizador salvasse novos parâmetros esportivos.

---

## 3. Auditoria Realizada (Rastreabilidade & Hipóteses Verificadas)

Durante o desenvolvimento da fase, todas as premissas e dependências foram ativamente auditadas no código e no banco antes de qualquer alteração:

| Item Auditado | Hipótese Prévia | Descoberta Real | Classificação | Ação Executada |
| :--- | :--- | :--- | :--- | :--- |
| **Adapter de Acesso a Dados** | Existência de `src/lib/dataAccess.ts` vs `src/services/dataAccess.ts`. | O arquivo real é unicamente `src/services/dataAccess.ts`. O caminho `src/lib/dataAccess.ts` não existe. | `AUDITADO` | Modificação centralizada exclusivamente em `src/services/dataAccess.ts`. |
| **View Real no Supabase** | View pública `public_competitions` poderia ser substituída via `CREATE OR REPLACE VIEW` arbitrária. | Consulta real via PostgreSQL (`SELECT pg_get_viewdef`) revelou que `public_config` e `rules_snapshot` ocupam as posições 13 e 14. Inserir colunas no meio dispara erro de incompatibilidade do PostgreSQL. | `AUDITADO` | Novas colunas `logo_url` e `supporters` foram anexadas ao final da view, preservando 100% da ordem e dos grants existentes. |
| **Utilitários de URL** | Possível duplicidade de validadores de URL no projeto. | `src/lib/security.ts` centralizava a segurança (`sanitizeInput`, `stripUnsafeHtml`), mas não possuía sanitizador de URL externa. | `AUDITADO` | `sanitizeExternalUrl` foi adicionada diretamente a `src/lib/security.ts`, com rejeição estrita de esquemas perigosos (`blob:`, `javascript:`, etc.). |
| **Autoridade de Bloqueio** | Risco de a UI utilizar `rulesSnapshot` ou `matches.length` como regra independente. | `CompetitionLifecycleService.canEditRules(competition, matches)` já encapsula todas as regras de integridade do domínio. | `AUDITADO` | A UI consulta estritamente `canEditRules`. `rulesSnapshot` permanece como estado interno de domínio. |
| **Tratamento de Imagens** | Supabase Storage seria necessário. | `compressImageToDataUrl` em `src/lib/imageCompression.ts` já funciona de forma leve e segura para logos em Data URI. | `AUDITADO` | Reutilizado `compressImageToDataUrl` sem adição de novos buckets de storage. |

---

## 4. Arquivos Analisados

- `src/types/entities.ts`
- `src/types/competitionConfig.ts`
- `src/lib/security.ts`
- `src/lib/imageCompression.ts`
- `src/services/dataAccess.ts`
- `src/services/publicCompetitionService.ts`
- `src/services/competitionLifecycleService.ts`
- `supabase/migrations/20260905000005_competition_slug_and_views.sql`
- `src/components/competition/CompetitionHeader.tsx`
- `src/components/competition/tabs/CompetitionConfigTab.tsx`
- `src/components/competition/dialogs/CompetitionFormDialog.tsx`
- `src/components/competition/dialogs/CompetitionSettingsEditDialog.tsx`
- `src/components/competition/format-builder/CompetitionFormatBuilder.tsx`
- `src/components/competition/format-builder/RulesConfigEditor.tsx`
- `src/components/competition/format-builder/StageBuilder.tsx`
- `src/components/competition/format-builder/StageEditorDialog.tsx`
- `src/components/competition/format-builder/FormatTemplateSelector.tsx`
- `src/components/competition/format-builder/CompetitionPreview.tsx`
- `src/components/competition/format-builder/CompetitionValidationPanel.tsx`
- `src/pages/PublicCompetitionPage.tsx`
- `src/pages/TeamRosterRegistrationPage.tsx`
- `src/pages/CompetitionsPage.tsx`

---

## 5. Achados Técnicos

1. **PostgreSQL Column Replacement Constraint:**
   Ao executar a migration no banco PostgreSQL real, a tentativa de inserir `logo_url` e `supporters` antes de `public_config` falhou com:
   `ERROR: cannot change name of view column "public_config" to "logo_url"`.
   A inspeção da definição instalada comprovou a necessidade de anexar as novas colunas ao final do `SELECT`, preservando rigorosamente as 14 colunas pré-existentes.
2. **Normalização Abrangente de Apoiadores:**
   Verificou-se que apenas testar `Array.isArray` era insuficiente contra payloads maliciosos ou corrompidos. Foi necessária uma função dedicada (`normalizeSupporters`) para validar tipos, descartar objetos sem nome, sanitizar URLs e impor ordenação determinística.
3. **Isolamento de Domínio de Equipe:**
   A inspeção confirmou que `TeamRecord` e `CompetitionTeamRecord` não possuíam campos comerciais e não devem recebê-los em nenhuma hipótese.

---

## 6. Decisões Arquiteturais

1. **Separação Trilateral de Responsabilidades:**
   - **Competição:** Gere seu `logoUrl` e sua lista oficial de apoiadores (`supporters`).
   - **Equipe:** Gere exclusivamente seu elenco, comissão técnica e escudo (`logoUrl`).
   - **BaseOS:** Plataforma de infraestrutura SaaS, mantendo atribuição institucional isolada em rodapé ("*Powered by BaseOS*").
2. **Autoridade Única Normativa (`CompetitionLifecycleService.canEditRules`):**
   A UI nunca avalia `rulesSnapshot` de forma independente. O bloqueio preventivo de regras esportivas consulta exclusivamente a autoridade do serviço.
3. **Desacoplamento entre Regras Esportivas e Identidade Comercial:**
   O congelamento de regras esportivas preserva a integridade de jogos e chaveamentos, mas **não bloqueia** a atualização de logotipos ou a inclusão de patrocinadores do evento.
4. **Ordenação Determinística de Apoiadores:**
   Definida regra algorítmica inviolável:
   `Tier (master = 0, official = 1, support = 2, media = 3, sem tier = 4) -> Order ASC -> Name ASC`.

---

## 7. Modelo de Domínio Implementado

### [`src/types/entities.ts`](file:///home/diego-martins/docker/volei/src/types/entities.ts)
```typescript
export type CompetitionSupporterTier = 'master' | 'official' | 'support' | 'media';

export interface CompetitionSupporter {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  tier?: CompetitionSupporterTier;
  order?: number;
}

export type CompetitionRecord = {
  // ... campos esportivos canônicos preservados ...
  logoUrl?: string;
  supporters?: CompetitionSupporter[];
};
```

---

## 8. Alterações de Banco e Migrations

### [`supabase/migrations/20260910000001_competition_branding_and_supporters.sql`](file:///home/diego-martins/docker/volei/supabase/migrations/20260910000001_competition_branding_and_supporters.sql)
- **Colunas Aditivas:**
  ```sql
  ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS logo_url text;
  ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS supporters jsonb NOT NULL DEFAULT '[]'::jsonb;
  ```
- **View Pública Atualizada (Não-Destrutiva):**
  A view `public.public_competitions` foi recriada mantendo todas as 14 colunas originais e anexando `logo_url` e `supporters` ao final.
- **Grants Mantidos:**
  ```sql
  GRANT SELECT ON public.public_competitions TO anon, authenticated;
  ```
- **Validação Empírica no Banco Real:**
  Testado diretamente contra o PostgreSQL do container `supabase-db` (`volei_test_db`) com sucesso e idempotência confirmada.

---

## 9. Alterações de Frontend

1. **[`CompetitionIdentityEditor.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/CompetitionIdentityEditor.tsx) [NOVO]:**
   Editor reutilizável para upload e compressão de logo da copa, gerenciamento de apoiadores com inserção, reordenação, seleção de tier, link com validação e exclusão.
2. **[`CompetitionFormDialog.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/CompetitionFormDialog.tsx) [MODIFICADO]:**
   Adicionada aba *"Identidade e Apoiadores"* no fluxo de criação de torneios.
3. **[`CompetitionSettingsEditDialog.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/CompetitionSettingsEditDialog.tsx) [MODIFICADO]:**
   Separado em abas: *"Regras e Sets"* (bloqueada via `canEditRules`) e *"Identidade e Apoiadores"* (sempre editável).
4. **[`CompetitionHeader.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/CompetitionHeader.tsx) [MODIFICADO]:**
   Renderiza o logo oficial da competição com fallback elegante para o troféu.
5. **[`CompetitionConfigTab.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/tabs/CompetitionConfigTab.tsx) [MODIFICADO]:**
   Card de resumo para *"Identidade Visual e Apoiadores Oficiais"* e botão renomeado para *"Formato e Regras da Competição"*.
6. **Configurador de Formato ([`CompetitionFormatBuilder.tsx`](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/CompetitionFormatBuilder.tsx) e subcomponentes):**
   - Substituição de classes sintéticas por tokens semânticos BaseOS (`bg-zinc-950`, `bg-zinc-900`, `bg-card`, `border-border`, etc.).
   - Banner superior informativo quando `!canEditRules`: *"Regras congeladas para preservar a integridade histórica dos confrontos oficiais."*
   - Desabilitação em cascata de inputs, selects, botões de estágio e botão salvar.
7. **[`PublicCompetitionPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/PublicCompetitionPage.tsx) [MODIFICADO]:**
   Hero banner com logotipo oficial da copa, seção de apoiadores agrupada por tier antes do rodapé (não renderizada se vazia) e rodapé isolado com marca BaseOS.
8. **[`TeamRosterRegistrationPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/TeamRosterRegistrationPage.tsx) [MODIFICADO]:**
   Portal de inscrição exibe o logo da competição e apoiadores do evento em modo leitura, sem campos comerciais para a equipe.

---

## 10. Alterações de Segurança

1. **Sanitização Estrita de Links (`sanitizeExternalUrl` em `src/lib/security.ts`):**
   - Aceita unicamente `http:` e `https:`.
   - Rejeita esquemas perigosos: `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`.
   - **Decisão Intencional de UX:** Normaliza domínios digitados sem protocolo adicionando `https://` (ex.: `patrocinador.com.br` ➔ `https://patrocinador.com.br`). Essa flexibilização amigável de interface é coberta por testes unitários e restrita estritamente a padrões sintáticos de domínios válidos, mantendo rejeição imediata contra qualquer esquema perigoso.
   - Retorna `undefined` para entradas inválidas ou maliciosas, impedindo a injeção de atributos `href` arbitrários.
   - Renderização segura no frontend com `target="_blank" rel="noopener noreferrer"`.
2. **Normalização e Proteção contra Payloads Maliciosos (`src/lib/supporters.ts`):**
   - `normalizeSupporters` filtra e descarta itens sem nome, objetos nulos, tiers desconhecidos e valores inválidos.
3. **Projeção Pública Sanitizada (`src/services/publicCompetitionService.ts`):**
   - Garante que a API pública projete apenas campos aprovados no `PublicCompetitionDTO`.

---

## 11. Testes Executados

Suíte dedicada em [`src/test/competitionBrandingAndSupporters.test.ts`](file:///home/diego-martins/docker/volei/src/test/competitionBrandingAndSupporters.test.ts) com **14 testes unitários**:
1. Sanitização e preservação de URLs `https://`
2. Aceitação de URLs `http://`
3. Normalização de domínios puros adicionando `https://`
4. Rejeição de protocolos maliciosos (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`)
5. Rejeição de URLs vazias ou inválidas
6. Normalização retrocompatível de competições legadas (`logoUrl: undefined`, `supporters: []`)
7. Persistência e integridade de logo e apoiadores com tiers
8. Ciclo completo de edição de apoiadores (inserção, renomeação, alteração de tier/link/ordem, remoção)
9. Normalização segura de dados inválidos (`null`, `{}`, `[null]`, nome vazio, tier inválido)
10. Projeção pública sanitizada no DTO público
11. Respeito soberano a `CompetitionLifecycleService.canEditRules` como autoridade única
12. Desacoplamento operacional: identidade e apoiadores permanecem editáveis com regras congeladas
13. Separação estrita de domínio: `TeamRecord` não aceita `supporters`, `sponsors` ou `partners`
14. Ordenação determinística por tier, ordem e desempate lexicográfico por nome

---

## 12. Resultados Obtidos

| Comando de Verificação | Escopo | Resultado | Status |
| :--- | :--- | :--- | :--- |
| `npx tsc -p tsconfig.app.json --noEmit` | Verificação de tipos TypeScript | 0 erros encontrados | `VALIDADO` |
| `npm run lint` | ESLint (regras do projeto) | 0 erros (1 aviso pré-existente no DrawArenaCanvas) | `VALIDADO` |
| `npx vitest run src/test/competitionBrandingAndSupporters.test.ts` | Testes unitários da Fase 2 | 14/14 testes aprovados (100%) | `VALIDADO` |
| `npx vitest run` (`npm test`) | Suíte de testes completa do sistema | 102/102 arquivos passaram, 912/912 testes aprovados | `VALIDADO` |
| `npm run build` | Build de produção do Vite | Construído com sucesso em 1m 2s | `VALIDADO` |
| Migration PostgreSQL | Execução no banco real (`volei_test_db`) | Idempotente, 0 erros, colunas e grants preservados | `VALIDADO` |

### 12.1 Matriz de Evidências por Camada
- **912/912 Testes Automatizados (Vitest)**: Comprovação de qualidade do código, regressão zero e integridade dos motores esportivos e de regras.
- **Migration PostgreSQL Local (`volei_test_db`)**: Comprovação empírica da compatibilidade do schema, ordem das colunas e grants de segurança.
- **Validação Manual dos Fluxos**: Comprovação de comportamento funcional, responsividade e experiência de usuário nos portais e configurador.
- **Produção (Supabase Cloud)**: Schema e migration aditiva prontos, com aplicação pendente no deploy de release.

---

## 13. Validação Manual & Homologação Operacional

- [x] **Cenário A — Nova Competição:** Criação com logo e apoiadores de diferentes tiers. Persistência em LocalStorage e exibição correta no cabeçalho. (`VALIDADO`)
- [x] **Cenário B — Competição Legada:** Abertura de torneios sem logo e sem apoiadores. Renderização estável com fallback visual e sem erros de console. (`VALIDADO`)
- [x] **Cenário C — Edição:** Alteração de logo, nome de apoiador, link, tier, ordem e exclusão com persistência integral. (`VALIDADO`)
- [x] **Cenário D — Portal Público (`/c/:slug`):** Exibição do logo no Hero, vitrine de apoiadores antes do rodapé e selo isolado "Powered by BaseOS". Seção oculta se não houver patrocinadores. (`VALIDADO`)
- [x] **Cenário E — Portal da Equipe (`/equipe/inscricao/:token`):** Exibição institucional da copa em modo somente leitura. Equipe gere apenas seus dados e escudo próprio. (`VALIDADO`)
- [x] **Cenário F — Regras Congeladas:** Em torneio com `canEditRules() === false`, o configurador exibe banner de aviso e desabilita inputs de regras e fases, enquanto a aba de identidade e apoiadores permanece editável. (`VALIDADO`)

---

## 14. Pendências, Limitações e Itens Não Validados

### Itens Auditados e Implementados com Sucesso:
- `AUDITADO`: Arquitetura de dados, view do Supabase, utilitários de segurança e autoridade normativa.
- `IMPLEMENTADO`: Modelo de apoiadores, branding de competição, normalização determinística, migração de banco, UI do configurador e portais.
- `VALIDADO`: 14 testes unitários dedicados, 912 testes globais do sistema, typecheck TypeScript, ESLint, build de produção e migração real no PostgreSQL.

### Delimitação Estrita de Escopo (Intencionalmente não implementado nesta fase):
- `NÃO IMPLEMENTADO / FORA DE ESCOPO`:
  - Navegação contextual com persistência de `competitionId` entre abas (reservado para a **Fase 3**);
  - Relatórios HTML para compartilhamento (reservado para a **Fase 4**);
  - Probabilidade matemática de classificação (reservado para a **Fase 5**);
  - Destaque/MVP de partidas (reservado para a **Fase 6**);
  - Patrocinadores de equipes (proibido pelo modelo de domínio);
  - Supabase Storage com buckets S3 (utilização autônoma de Data URI).

### Pendências de Ambiente:
- `PENDENTE`: Aplicação da migration `20260910000001_competition_branding_and_supporters.sql` no ambiente de produção do Supabase (Cloud) quando for realizado o deploy da release. (No ambiente de desenvolvimento local e banco de testes, a validação foi 100% concluída).

### Classificação Rigorosa de Prontidão:
- **DESENVOLVIMENTO:** `VALIDADO`
- **BANCO LOCAL/TESTE:** `VALIDADO`
- **CÓDIGO:** `VALIDADO`
- **TESTES:** `VALIDADO`
- **BUILD:** `VALIDADO`
- **PRODUÇÃO:** `PENDENTE`
- **FASE 2:** `IMPLEMENTADA E VALIDADA EM DEV/TESTE`
- **GO PARA DEPLOY:** `SIM`
- **HOMOLOGAÇÃO DE PRODUÇÃO:** `PENDENTE`

---

## 15. Conclusão e Prontidão

A Fase 2 foi implementada e validada integralmente nos ambientes de desenvolvimento e teste, incluindo código, persistência, migration, testes automatizados, build e validação funcional. A aplicação da migration e a validação correspondente no ambiente de produção permanecem pendentes e deverão ocorrer durante o próximo deploy. A fase está tecnicamente pronta para promoção e a Fase 3 pode ser iniciada em paralelo, desde que a pendência de produção seja registrada.
