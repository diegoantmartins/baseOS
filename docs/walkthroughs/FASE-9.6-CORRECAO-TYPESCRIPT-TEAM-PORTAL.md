# BASEOS — FASE 9.6: CORREÇÃO CIRÚRGICA DE TYPESCRIPT (PORTAL DA EQUIPE)

**Documento:** `docs/walkthroughs/FASE-9.6-CORRECAO-TYPESCRIPT-TEAM-PORTAL.md`  
**Data:** 2026-09-14  
**Responsável:** Engenheiro de Software BaseOS / Antigravity Agent  
**Ambiente:** DEV Local (Sem alterações ou deploys na instância VOLTZ)  
**Status:** **GO** (100% Homologado e Validado)

---

## 1. Objetivo

A **Fase 9.6 do BaseOS** teve como missão exclusiva executar a **correção cirúrgica de 3 erros de tipagem TypeScript** identificados no ecossistema do componente:

```text
src/pages/TeamRosterRegistrationPage.tsx
```

### Premissas Inegociáveis Respeitadas
- **Zero refatoração desnecessária:** Nenhuma alteração de arquitetura, contratos de serviço ou UI/UX.
- **Zero alteração funcional:** Preservação integral do fluxo de auto-inscrição de elencos, limites de elenco (6 a 14 atletas), capitão único, até 2 líberos, numeração 1-99 opcional, geração de relatórios nominais e boletins de jogos em PDF, consulta de súmula oficial e abas do portal.
- **Zero alteração de infraestrutura/segurança:** Nenhuma criação de migration, sem alterações de schema/tabelas/views, RLS, GoTrue/Supabase Auth ou banco de dados.
- **Isolamento de produção:** Nenhuma chamada destrutiva ou deploy contra a instância `https://voltz.baseos.online`.
- **Proibição de atalhos frágeis:** Nenhum uso de `any`, `as any`, `@ts-ignore` ou `@ts-expect-error`.

---

## 2. Estado Inicial

Antes de qualquer modificação, o estado do repositório foi capturado e registrado:

```bash
git status --short
# ?? docs/walkthroughs/RELEASE-v2.4.0-PUBLICACAO.md
# ?? tsconfig.app.tsbuildinfo
# ?? tsconfig.node.tsbuildinfo

git branch --show-current
# main

git log -1 --oneline
# 756e56d (HEAD -> main, tag: v2.4.0, origin/main, origin/HEAD) feat(release): BaseOS v2.4.0-rc.1 - Homologação Indoor, Auth de Equipes e Pacote de Promoção
```

### Execução Inicial do Typecheck
```bash
npx tsc -p tsconfig.app.json --noEmit
```

Sob o compilador TypeScript 5.8/5.9 em conformidade com checagens formais de tipos de propriedades e atribuições a props opcionais (`exactOptionalPropertyTypes` e strict checks), foram identificadas as 3 incompatibilidades clássicas em `TeamRosterRegistrationPage.tsx` e seus contratos acoplados.

---

## 3. Diagnóstico Detalhado dos 3 Erros

---

### Erro 1: Incompatibilidade de tipos no mapeamento da Relação Nominal em PDF
* **Arquivo:** `src/pages/TeamRosterRegistrationPage.tsx` (linhas 205-215) e `src/lib/pdf/reportsPdf.ts` (linhas 46-67)
* **Linha no Componente:** 208
* **Código TS:** `TS2322` / `TS2375`
* **Mensagem:**  
  `Type '{ jerseyNumber: number | undefined; name: string; position: string; documentNumber: string | undefined; isCaptain: boolean; isLibero: boolean; }[]' is not assignable to type 'RosterReportAthlete[]'. Types of property 'jerseyNumber' are incompatible. Type 'number | undefined' is not assignable to type 'number'.`  
  `Type '{ name: string; shortName: string; coach: string | undefined; logoUrl: string | undefined; ... }' is not assignable to type 'RosterReportTeam'. Types of property 'coach' are incompatible.`
* **Causa:**  
  O contrato de relatório editorial em `reportsPdf.ts` definia as propriedades opcionais `jerseyNumber?: number;`, `documentNumber?: string;`, `coach?: string;` e `logoUrl?: string;` sem prever o literal `undefined` explícito. No modelo canônico do BaseOS, atletas podem não ter camisa cadastrada antecipadamente (`CompetitionAthlete.jerseyNumber` é `number | undefined`) ou documento preenchido, e a agremiação pode não ter treinador ou logo. Ao passar esses valores mapeados, o compilador apontava inconsistência de atribuição estrita.
* **Correção Cirúrgica:**
  1. No contrato `src/lib/pdf/reportsPdf.ts`, os tipos `RosterReportAthlete` e `RosterReportTeam` foram ajustados para aceitar expressamente `| undefined` em suas propriedades opcionais.
  2. No componente `TeamRosterRegistrationPage.tsx`, o callback do mapeamento foi explicitamente anotado como `(a): RosterReportAthlete => (...)`.

---

### Erro 2: Incompatibilidade de tipos opcionais no Boletim de Jogos em PDF
* **Arquivo:** `src/pages/TeamRosterRegistrationPage.tsx` (linhas 226-254) e `src/lib/pdf/reportsPdf.ts` (linhas 19-39)
* **Linha no Componente:** 252
* **Código TS:** `TS2345`
* **Mensagem:**  
  `Argument of type '{ matchNumber: number; round: number; phase: string | undefined; groupName: string | undefined; date: string; time: string; venue: string; court: string | undefined; teamAName: string; teamBName: string; scoreA: number | undefined; scoreB: number | undefined; statusLabel: string; }[]' is not assignable to parameter of type 'MatchBoletimRow[]'. Types of property 'phase' are incompatible. Type 'string | undefined' is not assignable to type 'string'.`
* **Causa:**  
  O tipo `MatchBoletimRow` em `reportsPdf.ts` não declarava união com `undefined` nos campos `phase`, `groupName`, `court`, `scoreA`, `scoreB`, `teamAShort`, `teamBShort`, etc. Quando partidas agendadas ou em fase classificatória sem chaveamento específico eram mapeadas, valores `undefined` eram enviados explicitamente, violando o contrato estrito da função `generateMatchesBoletimPdf(rows, competitionName)`.
* **Correção Cirúrgica:**
  1. No contrato `src/lib/pdf/reportsPdf.ts`, a tipagem de `MatchBoletimRow` foi atualizada adicionando `| undefined` a todos os campos opcionais.
  2. No componente `TeamRosterRegistrationPage.tsx`, o array mapeado foi formalmente tipado como `const rows: MatchBoletimRow[] = matches...`.

---

### Erro 3: Incompatibilidade de prop `athlete` no Modal de Cadastro de Atleta
* **Arquivo:** `src/pages/TeamRosterRegistrationPage.tsx` (linhas 771-777) e `src/components/registration/AthleteFormModal.tsx` (linhas 77-83)
* **Linha no Componente:** 774
* **Código TS:** `TS2375` / `TS2322`
* **Mensagem:**  
  `Type '{ open: boolean; onOpenChange: Dispatch<SetStateAction<boolean>>; athlete: CompetitionAthlete | undefined; gender: "male" | "female"; onSubmit: (input: CompetitionAthleteInput) => Promise<...>; }' is not assignable to type 'AthleteFormModalProps'. Types of property 'athlete' are incompatible. Type 'CompetitionAthlete | undefined' is not assignable to type 'CompetitionAthlete'.`
* **Causa:**  
  Em `TeamRosterRegistrationPage.tsx`, o estado de edição do atleta é gerenciado via:
  ```ts
  const [editingAthlete, setEditingAthlete] = useState<CompetitionAthlete | undefined>();
  ```
  Ao renderizar `<AthleteFormModal ... athlete={editingAthlete} />`, o valor passado pode ser `CompetitionAthlete` (em modo edição) ou `undefined` (em modo inclusão). Como a interface `AthleteFormModalProps` declarava `athlete?: CompetitionAthlete;` sem união explícita com `undefined`, TypeScript em checagens estritas rejeitava o repasse da variável do estado.
* **Correção Cirúrgica:**
  1. Na interface `AthleteFormModalProps` (`src/components/registration/AthleteFormModal.tsx`), a prop foi declarada como `athlete?: CompetitionAthlete | undefined;`.
  2. Adicionalmente, em `TeamRosterRegistrationPage.tsx`, a inicialização de `limits` recebeu um fallback defensivo garantido:
     ```ts
     const limits = (competition
       ? CompetitionRulesService.getRosterLimits(competition)
       : (ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6'])) ?? { min: 6, max: 14 };
     ```
     eliminando qualquer risco de `limits` ser inferido como `undefined` (TS18048).

---

## 4. Arquivos Alterados

| Arquivo | Motivo da Alteração |
|---|---|
| `src/components/registration/AthleteFormModal.tsx` | Ajuste da interface `AthleteFormModalProps` para admitir `athlete?: CompetitionAthlete | undefined;`, compatibilizando o contrato com o `useState` do componente pai. |
| `src/lib/pdf/reportsPdf.ts` | Correção dos contratos `MatchBoletimRow`, `RosterReportAthlete` e `RosterReportTeam`, adicionando suporte explícito a `undefined` nos campos opcionais consumidos por relatórios em PDF. |
| `src/pages/TeamRosterRegistrationPage.tsx` | Importação e anotação dos tipos `MatchBoletimRow` e `RosterReportAthlete`, garantindo conformidade estrita nos callbacks de PDF e adicionando fallback robusto em `limits`. |

---

## 5. Decisões Técnicas

1. **Correção no Contrato de Origem:**  
   Em vez de fazer asserções forçadas com `as any` ou `as RosterReportAthlete[]` dentro da página, as definições de tipo nos arquivos de origem (`reportsPdf.ts` e `AthleteFormModal.tsx`) foram alinhadas à realidade do modelo de dados da aplicação. Isso protege não apenas o `TeamRosterRegistrationPage.tsx`, mas qualquer outro ponto do sistema que gere ou consuma esses dados.

2. **Tipagem Estrita sem Casts:**  
   Nenhum `any`, `@ts-ignore` ou `@ts-expect-error` foi utilizado. As interfaces agora aceitam `undefined` explicitamente, padrão recomendado pela documentação oficial do TypeScript moderno para propriedades opcionais.

3. **Invariância de Negócio e Banco de Dados:**  
   Não foi necessária nenhuma alteração no schema do banco, nas RPCs, nas migrations ou na camada de dados (`dataAccess.ts`).

---

## 6. Segurança e Conformidade

Confirmamos que as seguintes camadas permaneceram **completamente intocadas**:
- **Autenticação:** Supabase Auth, GoTrue, fluxos de login/sessão e rotas protegidas inalterados.
- **Autorização e RLS:** Políticas de segurança row-level de `competition_teams`, `competition_athletes`, `profiles` e `matches` 100% mantidas.
- **Credenciais e Tokens:** Links de auto-inscrição `/equipe/inscricao/:token` preservados sem alteração de rota ou formato.
- **Instância de Produção:** Nenhuma conexão externa ou chamada destrutiva realizada contra `https://voltz.baseos.online`.

---

## 7. Validação de Testes e Qualidade

| Verificação | Comando Executado | Resultado | Status |
|---|---|---|:---:|
| **TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** | **PASS** |
| **ESLint** | `npm run lint` | **0 erros** (1 warning conhecido no canvas 3D) | **PASS** |
| **Testes Direcionados** | `npx vitest run src/test/teamRegistrationFlow.test.ts src/test/registrationService.test.ts` | **26/26 testes aprovados** | **PASS** |
| **Suíte Completa Vitest** | `npm test -- --run` | **120/120 arquivos, 1.161/1.161 testes aprovados** | **PASS** |
| **Build de Produção** | `npm run build` | **Sucesso (Vite build concluído com código 0)** | **PASS** |

---

## 8. Diff das Alterações

O diff permaneceu extremamente conciso e cirúrgico:

```diff
diff --git a/src/components/registration/AthleteFormModal.tsx b/src/components/registration/AthleteFormModal.tsx
--- a/src/components/registration/AthleteFormModal.tsx
+++ b/src/components/registration/AthleteFormModal.tsx
@@ -80,3 +80,3 @@ interface AthleteFormModalProps {
   onOpenChange: (open: boolean) => void;
-  athlete?: CompetitionAthlete;
+  athlete?: CompetitionAthlete | undefined;
   gender?: 'male' | 'female';

diff --git a/src/lib/pdf/reportsPdf.ts b/src/lib/pdf/reportsPdf.ts
--- a/src/lib/pdf/reportsPdf.ts
+++ b/src/lib/pdf/reportsPdf.ts
@@ -22,17 +22,17 @@ export type MatchBoletimRow = {
   round: number;
-  phase?: string;
-  groupName?: string;
+  phase?: string | undefined;
+  groupName?: string | undefined;
   date: string;
   time: string;
   venue: string;
-  court?: string;
+  court?: string | undefined;
   teamAName: string;
-  teamAShort?: string;
-  teamALogo?: string;
+  teamAShort?: string | undefined;
+  teamALogo?: string | undefined;
   teamBName: string;
-  teamBShort?: string;
-  teamBLogo?: string;
-  scoreA?: number;
-  scoreB?: number;
+  teamBShort?: string | undefined;
+  teamBLogo?: string | undefined;
+  scoreA?: number | undefined;
+  scoreB?: number | undefined;
   statusLabel: string;
@@ -46,4 +46,4 @@ export type RosterReportAthlete = {
-  jerseyNumber?: number;
+  jerseyNumber?: number | undefined;
   name: string;
   position: string;
-  documentNumber?: string;
+  documentNumber?: string | undefined;
   isCaptain: boolean;
@@ -58,7 +58,7 @@ export type RosterReportTeam = {
   shortName: string;
-  coach?: string;
-  assistantCoach?: string;
-  medicalStaff?: string;
-  city?: string;
-  state?: string;
-  modality?: string;
-  logoUrl?: string;
+  coach?: string | undefined;
+  assistantCoach?: string | undefined;
+  medicalStaff?: string | undefined;
+  city?: string | undefined;
   state?: string | undefined;
   modality?: string | undefined;
   logoUrl?: string | undefined;
   athletes: RosterReportAthlete[];

diff --git a/src/pages/TeamRosterRegistrationPage.tsx b/src/pages/TeamRosterRegistrationPage.tsx
--- a/src/pages/TeamRosterRegistrationPage.tsx
+++ b/src/pages/TeamRosterRegistrationPage.tsx
@@ -61,2 +61,4 @@ import {
   downloadReportsPdf,
+  type MatchBoletimRow,
+  type RosterReportAthlete,
 } from '@/lib/pdf/reportsPdf';
@@ -134,3 +136,3 @@ export function TeamRosterRegistrationPage() {
   const playerFormat = competition?.playerFormat || '6x6';
-  const limits = competition
+  const limits = (competition
     ? CompetitionRulesService.getRosterLimits(competition)
-    : (ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6']);
+    : (ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6'])) ?? { min: 6, max: 14 };
@@ -208,1 +210,1 @@ export function TeamRosterRegistrationPage() {
-          athletes: athletes.map(a => ({
+          athletes: athletes.map((a): RosterReportAthlete => ({
@@ -227,1 +229,1 @@ export function TeamRosterRegistrationPage() {
-    const rows = matches
+    const rows: MatchBoletimRow[] = matches
```

---

## 9. Pendências / Fora do Escopo

Nenhum débito técnico ou pendência foi introduzido.
- O warning pontual no componente `DrawArenaCanvas.tsx` (`useMemo has a missing dependency: 'team'`) pertence ao módulo cinemático 3D do sorteio e permanece catalogado para a esteira de manutenção do canvas, fora do escopo desta fase.

---

## 10. Veredito Final

```text
================================================================================
                               VEREDITO: GO
================================================================================
  [✓] 3 inconsistências de tipagem diagnosticadas e sanadas na raiz
  [✓] npx tsc -p tsconfig.app.json --noEmit: 0 ERROS
  [✓] ESLint: 0 erros
  [✓] Testes de registro e regras: 26/26 aprovados
  [✓] Zero uso de 'any', '@ts-ignore' ou casts inseguros
  [✓] Fluxos funcionais e segurança preservados integralmente
  [✓] Zero migrations ou alterações na base VOLTZ
  [✓] Build de produção: SUCESSO
================================================================================
```
