# BASEOS — FASE 4.1: AUDITORIA COMPLETA DO MOTOR DE COMPETIÇÕES, FORMATOS, DISPUTAS, CLASSIFICAÇÃO E PROGRESSÃO

**Data:** 05/09/2026  
**Modo:** Somente Leitura (Audit Only)  
**Status da Certificação:** **AUDITORIA CONCLUÍDA — BLOQUEADORES ARQUITETURAIS IDENTIFICADOS**

---

## 1. INTRODUÇÃO E OBJETIVO

Esta auditoria técnica, arquitetural e funcional inspeciona o sistema de competições do **BaseOS** com base estrita no código-fonte real e nos testes existentes. O objetivo é mapear as capacidades atuais, determinar o que é configurável por competição via `CompetitionConfig` (Single Source of Truth), identificar o que está hardcoded ou espalhado, auditar os limites dos subsistemas esportivos e projetar a arquitetura necessária para suportar múltiplos formatos esportivos amadores (incluindo o caso de homologação do Campeonato Voltz) sem introduzir regras ad-hoc ou exceções específicas no código.

---

## 2. EVIDÊNCIAS DE INTEGRIDADE DO CÓDIGO ATUAL

Antes de detalhar as inspeções de domínio, a integridade da base de código foi checada em modo estritamente não-modificativo:

1. **TypeScript Typecheck:**
   - Comando: `npx tsc -p tsconfig.app.json --noEmit`
   - Resultado: **0 erros de tipagem** (Exit Code 0).
2. **ESLint:**
   - Comando: `npm run lint`
   - Resultado: **0 erros**, 1 aviso (`react-hooks/exhaustive-deps` em `DrawArenaCanvas.tsx`) (Exit Code 0).
3. **Testes Automatizados (Vitest):**
   - Comando: `npm test -- --run`
   - Resultado: **77 arquivos de teste executados, 638 testes aprovados, 0 falhas** (Exit Code 0, duração 178.13s).
4. **Build de Produção:**
   - Comando: `npm run build`
   - Resultado: **Build Vite concluído com sucesso** em 57.38s (Exit Code 0).

---

## 3. MAPEAMENTO DO FLUXO ARQUITETURAL ATUAL

O fluxo do ciclo de vida esportivo do BaseOS foi rastreado ponta a ponta:

```text
Competition
    ↓
CompetitionConfig
    ↓
Lifecycle (CompetitionLifecycleService)
    ↓
Registration (registrationService & CompetitionRegistrationService)
    ↓
Draw (drawService & DrawPage)
    ↓
Groups (DrawGroup, matches.group_name)
    ↓
Matches (dataAccess.saveDrawWithMatches, matches table)
    ↓
Results (CompetitionRulesService.getCanonicalMatchResult)
    ↓
Standings (standingsService.computeStandingsByGroup)
    ↓
Qualification (CompetitionBracketService.generatePlayoffSlots)
    ↓
Next Stage (playoffsService.advancePlayoffMatches)
    ↓
Champion (playoffsService.computePodium)
```

### Análise Detalhada por Etapa:

| Etapa | Arquivo / Serviço | Função / Método | Entrada | Saída | Configurável? | Hardcoded? | Evidência no Código |
|---|---|---|---|---|---|---|---|
| **Competition** | `src/types/entities.ts` | `CompetitionRecord` | Formulário / Seed | Objeto Competição | Parcial | Sim (`format` livre) | `src/types/entities.ts:52-103` |
| **Config (SSOT)** | `src/types/competitionConfig.ts`, `CompetitionRulesService` | `getConfig`, `normalizeLegacyToConfig` | `CompetitionRecord` | `CompetitionConfig` | Sim (Sets, Pontos, Desempate, Elenco) | Parcial (não modela formato de disputa nem fases) | `src/types/competitionConfig.ts:123-140`, `src/services/competitionRulesService.ts:46-120` |
| **Lifecycle** | `src/services/competitionLifecycleService.ts` | `validateTransition`, `getNextRecommendedStatus` | Status atual + Target + Contexto | `LifecycleValidationResult` | Não | Sim (Status fixos: `in-progress` → `playoffs`) | `src/services/competitionLifecycleService.ts:340-360` |
| **Registration** | `src/services/registrationService.ts`, `CompetitionRegistrationService` | `validateAthleteInput`, `evaluateTeamDrawEligibility` | Inscrição + Atletas | Validação booleana | Sim (limites via config) | Não | `src/services/registrationService.ts:60-113`, `src/services/competitionDrawEligibilityService.ts:94-100` |
| **Draw** | `src/services/drawService.ts`, `src/pages/DrawPage.tsx` | `runDraw`, `distributeTeamsIntoGroups` | Equipes + `DrawConfig` | `DrawResult` (Grupos e Jogos) | Parcial (seed, cabeças de chave, grupos) | Sim (só gera Round-Robin Berger por grupo) | `src/services/drawService.ts:63-185`, `src/pages/DrawPage.tsx:309-346` |
| **Groups** | `src/types/draw.ts`, `src/types/entities.ts` | `DrawGroup`, `match.groupName` | Sorteio | Strings de grupo (`Grupo A`, etc.) | Sim (qtd de grupos) | Sim (não há entidade/tabela `groups`) | `src/types/draw.ts:35-40`, `supabase/migrations/20260819000000_venues_logos_phases.sql:33` |
| **Matches** | `src/services/dataAccess.ts` | `saveDrawWithMatches`, `createMatch` | Propostas de jogos | `MatchRecord[]` persistidos | Não | Sim (`phase = 'classificatória'`) | `src/services/dataAccess.ts:421-478`, `src/services/dataAccess.ts:1010-1077` |
| **Results** | `src/services/competitionRulesService.ts` | `getCanonicalMatchResult`, `validateMatchScore` | `MatchRecord.sets` | `CanonicalMatchResult` | Sim (SetsToWin por fase, pontuações) | Não | `src/services/competitionRulesService.ts:256-337`, `src/services/competitionRulesService.ts:380-590` |
| **Standings** | `src/services/standingsService.ts` | `computeStandingsByGroup`, `computeStandings` | `StandingInput[]`, `MatchRecord[]` | `StandingsByGroup` | Sim (Ordem de desempate, pontuação FIVB) | Parcial (H2H só avalia 2 times; não há ranking geral entre grupos) | `src/services/standingsService.ts:151-261`, `src/services/standingsService.ts:272-348` |
| **Qualification** | `src/services/competitionBracketService.ts`, `playoffsService` | `generatePlayoffSlots` | `StandingsByGroup` | `PlayoffMatchSlot[]` | Não | **SIM (CRÍTICO)**: só suporta 1, 2 ou 4 grupos | `src/services/competitionBracketService.ts:150-175`, `src/services/playoffsService.ts:46-196` |
| **Next Stage** | `src/services/playoffsService.ts` | `advancePlayoffMatches` | `MatchRecord[]` dos playoffs | Partidas atualizadas | Não | **SIM (CRÍTICO)**: cruzamentos hardcoded (Q1→S1, Q2→S1, etc.) | `src/services/playoffsService.ts:245-377` |
| **Champion** | `src/services/playoffsService.ts` | `computePodium` | `MatchRecord[]` | Pódio (1º, 2º, 3º, 4º) | Não | Sim (depende de partida com `phase = 'final'`) | `src/services/playoffsService.ts:383-413` |

---

## 4. O QUE O BASEOS JÁ CONSEGUE FAZER (CAPACIDADES COMPROVADAS)

1. **Configuração Unificada de Sets por Partida e Sobrescrita por Fase:**
   - Suporta `setsToWin: 1 | 2 | 3` (set único, melhor de 3, melhor de 5) e calcula `maxSets = (setsToWin * 2) - 1` (`deriveMaxSets`).
   - Permite sobrescrever sets por fase: `groupStage`, `quarterfinals`, `semifinals`, `final`, `thirdPlace` (`CompetitionRulesService.resolveMatchFormat`).
2. **Validação Matemática Estrita de Sets e Vantagem Aberta:**
   - Valida sets regulares (25 pts na quadra, 21 pts na praia) e tiebreak (15 pts).
   - Exige vantagem mínima de 2 pontos (`minAdvantage: 2`).
   - Não impõe limite artificial no teto do set (suporta parciais como 29x27, 34x32).
3. **Resultado Canônico Oficial (`CanonicalMatchResult`):**
   - Unifica apuração de vencedor, perdedor, sets vencidos, pontos marcados e detecção de inconsistências esportivas em `CompetitionRulesService.getCanonicalMatchResult`.
4. **Tabela de Classificação com Critérios Ordenáveis:**
   - Suporta ordenação flexível de desempate via `standings.tiebreakCriteriaOrder`: pontos, vitórias, saldo de sets, quociente de sets (set average), saldo de pontos, quociente de pontos (pontos average), confronto direto e sorteio determinístico estável.
5. **Cálculo de Pontuação na Tabela:**
   - Suporta pontuação padrão FIVB/CBV para melhor de 5 (3x0/3x1 = 3pts, 3x2 = 2pts, 2x3 = 1pt, 1x3/0x3 = 0pts) e melhor de 3 (2x0 = 3pts, 2x1 = 2pts, 1x2 = 1pt, 0x2 = 0pts) via `CompetitionRulesService.calculateCompetitionPoints`.
6. **Sorteio Determinístico e Tabela Berger:**
   - Sorteio puro (`random`) e dirigido (`seeded` com cabeças de chave) com PRNG mulberry32 reproduzível.
   - Geração de tabela round-robin turno único com folga (`__BYE__`) para grupos com número ímpar de equipes.
7. **Congelamento Imutável de Regras (`rulesSnapshot`):**
   - Bloqueia mutação de regras esportivas após início ou homologação de partidas via `CompetitionLifecycleService.freezeRulesSnapshot`.

---

## 5. O QUE ESTÁ HARDCODED OU LIMITADO (BLOQUEADORES E GAPS)

### Bloqueador 1: Ausência de Entidade e Motor de Fases (`Stages / Phases`)
- **Evidência:** No banco de dados (`public.matches`) e em `MatchRecord`, a fase é apenas uma coluna de texto livre (`phase text`).
- **Impacto:** O sistema não possui conceito de fase como entidade com ciclo de vida próprio, regras de classificação próprias, formato de chaveamento ou transição. O ciclo de vida geral tem status rígido: `in-progress` (fase de grupos) → `playoffs` (mata-mata) → `completed`.

### Bloqueador 2: Chaveamento e Cruzamento Eliminatório Rígidos (Hardcoded)
- **Evidência:** `src/services/competitionBracketService.ts:150-175` e `src/services/playoffsService.ts:46-196`.
- **Impacto:** O sistema só consegue gerar cruzamentos eliminatórios para:
  - 4 grupos (Quartas: 1A x 2B, 1C x 2D, 1B x 2A, 1D x 2C).
  - 2 grupos (Semis: 1A x 2B, 1B x 2A).
  - 1 grupo (Final: 1º x 2º, 3º lugar: 3º x 4º).
  - Qualquer outra quantidade (3 grupos, 5 grupos, 6 grupos, 8 grupos / oitavas) **retorna lista vazia `[]` e falha silenciosamente ou exibe toast informativo na UI**.

### Bloqueador 3: Ausência de Ranking Geral Inter-Grupos e Repescagem
- **Evidência:** `src/services/standingsService.ts` calcula `computeStandingsByGroup` (tabelas isoladas por grupo). Existe uma função `computeBestThirds`, mas o parâmetro `bestThirds` em `generateFourGroupPlayoffs` **é completamente ignorado e não conecta nenhuma equipe aos confrontos**.
- **Impacto:** Impossível ranquear vencedores (1-4) e restantes (5-12) para disputar repescagem / play-in (como no formato Voltz).

### Bloqueador 4: Confronto Direto Restrito a 2 Equipes
- **Evidência:** `src/services/standingsService.ts:151-171` (`headToHeadWinner`).
- **Impacto:** Compara apenas vitórias mútuas entre 2 times. No desempate de 3 ou mais equipes empatadas em pontos, o método falha matematicamente (não constrói mini-tabela entre os empatados e gera ordenação não-transitiva no sort).

### Bloqueador 5: Formato da Competição Não Reside no `CompetitionConfig`
- **Evidência:** `src/types/competitionConfig.ts:123-140` define `CompetitionConfig` apenas com `format` (referente a sets: setsToWin, setRules, phaseOverrides), `scoring`, `standings` e `registration`. O formato do torneio (`group-stage-knockout`, `round-robin`, `single-elimination`) está como string solta em `CompetitionRecord.format` e não governa o motor de sorteio nem a progressão.

### Bloqueador 6: DrawEngine Acoplado Exclusivamente a Fase de Grupos
- **Evidência:** `src/services/drawService.ts:144-185`.
- **Impacto:** O sorteio não consegue sortear uma chave eliminatória direta (mata-mata puro), nem chaveamento com cabeças de chave em posições de bracket olímpico com byes.

---

## 6. STATUS DA CERTIFICAÇÃO DA FASE 4.1

Classificação fundamentada nas evidências:

### **AUDITORIA CONCLUÍDA — BLOQUEADORES ARQUITETURAIS IDENTIFICADOS**

*Justificativa:* O motor atual possui excelente solidez para o caso específico de "Fase de Grupos (2 ou 4 grupos) + Mata-mata Olímpico padrão FIVB", com regras canônicas de sets, pontuação e integridade de ciclo de vida. Contudo, a ausência de um motor genérico de fases (`Stages`), a rigidez dos cruzamentos e a inexistência de progressão baseada em ranking geral impedem a realização de torneios híbridos como o Campeonato Voltz sem extensões arquiteturais.
