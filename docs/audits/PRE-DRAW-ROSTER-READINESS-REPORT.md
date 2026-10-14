# BASEOS v2.4.4 — RELATÓRIO TÉCNICO DE AUDITORIA NOMINAL PRÉ-SORTEIO
## RAIO-X DE EQUIPES, ELENCOS E ELEGIBILIDADE NA DRAW ARENA (VOLTZ 10 EQUIPES)

**Data da Auditoria:** 14 de Outubro de 2026  
**Status do Ambiente:** Produção (`https://api.baseos.online` / `supabase_db_baseOs-voltz`)  
**Competição Auditada:** `comp-9008fe63-7a10-46bc-bf69-9a7dbb00865f` ("4º Campeonato Voltz de Voleibol")  
**Organização:** `org-0bb1c089-49b5-477c-b909-bb04a204eb2b` ("Voltz Sports")  
**Modo de Execução:** `AUDITAR — SOMENTE LEITURA (READ-ONLY ESTRITO)`  
**Auditor Responsável:** QA Master & Principal DBRE Auditor  

---

## 1. SUMÁRIO EXECUTIVO

Foi realizada uma auditoria forense detalhada e estritamente somente leitura no banco de dados de produção (`supabase_db_baseOs-voltz`) e no motor da tela de sorteio (`src/pages/DrawPage.tsx` e `src/services/CompetitionDrawEligibilityService.ts`).

### Indicadores Gerais:
- **Total de equipes cadastradas na organização:** 9 equipes (todas vinculadas à competição ativa).
- **Equipes órfãs (em `public.teams` sem registro em `public.competition_teams`):** **0 equipes** (integridade relacional 100%).
- **Equipes com elenco preenchido (>= 10 atletas):** 6 equipes (totalizando **73 atletas** vinculados em `competition_athletes`).
- **Equipes com elenco pendente (0 atletas):** 3 equipes (`Nexus`, `VOLTZ A`, `Voltz B`).
- **10ª Equipe necessária para o formato `[4, 3, 3]`:** Ainda não cadastrada no sistema.
- **Status da Competição:** `registration-open` (Inscrições Abertas).
- **Status Atual na Draw Arena (`DrawPage.tsx`):** **BLOQUEADO (`canDraw = false`)**. Zero equipes elegíveis atualmente, pois as 6 equipes com elenco estão em status `in_progress` (não submetidas/aprovadas) e a competição ainda não teve suas inscrições formalmente encerradas.

---

## 2. LISTA NOMINAL COMPLETA DE EQUIPES E ELENCOS NO POSTGRESQL

Consulta executada no banco de produção `supabase_db_baseOs-voltz` cruzando `public.teams`, `public.competition_teams`, `public.competition_athletes` e `public.user_memberships`:

| # | Nome da Equipe | ID Equipe / Vínculo | Responsável / Dirigente | E-mail de Contato | Status Inscrição | Trava (`is_locked`) | Qtd Atletas | Capitão Registrado | Líberos Registrados | Camisas Informadas |
|---|---|---|---|---|:---:|:---:|:---:|---|---|:---:|
| 1 | **OVERZONE** | `tm-f3be7df5...`<br>`ct-f72d0257...` | Paulo | `pcesar1991@gmail.com` | `in_progress` | `false` | **14** | Fabrício Rodrigues Costa (#6, Levantador) | Danilo de Araújo (#30)<br>Cleverson Macari (#2) | 7 / 14 |
| 2 | **AVQI Quedas do Iguaçu** | `tm-d04b6f12...`<br>`ct-70864639...` | Cainã Uriel Queiroz | `queirozcainan@gmail.com` | `in_progress` | `false` | **13** | Cainã Uriel Queiroz (#2, Levantador) | João Vitor Schllemer | 11 / 13 |
| 3 | **SNK’S CORE VOLEIBOL** | `tm-363eb077...`<br>`ct-b7fb3488...` | Kailan Bello do Prado | `kailanbello@gmail.com` | `in_progress` | `false` | **13** | Gabriel Prudêncio (Ponteiro) | *Nenhum* | 0 / 13 |
| 4 | **AAADU Preguiça** | `tm-c4a00508...`<br>`ct-75a7e164...` | André Alexandro Rodrigues | `andrewinchester2002@gmail.com` | `in_progress` | `false` | **12** | André Alexandro Rodrigues (Ponteiro) | Lucas Soster Souza<br>Vítor da Silva Tibola | 0 / 12 |
| 5 | **MAFIA** | `tm-e8a329d6...`<br>`ct-bd3e9995...` | BELLO | `csar.bello08@gmail.com` | `in_progress` | `false` | **11** | CESAR BARBOSA BELLO (Universal) | *Nenhum* | 0 / 11 |
| 6 | **UFFS Realeza** | `tm-b7fb58b6...`<br>`ct-e4566e2d...` | Matheus França Ragievicz | `matheusfrancar@gmail.com` | `in_progress` | `false` | **10** | Matheus França Ragievicz (Levantador) | *Nenhum* | 0 / 10 |
| 7 | **Nexus** | `tm-6f3f65fe...`<br>`ct-826d472f...` | Eberty | `eberty007@hotmail.com` | `invited` | `false` | **0** | *Pendente* | *Pendente* | 0 / 0 |
| 8 | **VOLTZ A** | `tm-b8cb21d5...`<br>`ct-48fa03ee...` | Allan | `allan.roberto.stuani@gmail.com` | `invited` | `false` | **0** | *Pendente* | *Pendente* | 0 / 0 |
| 9 | **Voltz B** | `tm-f9dc16c0...`<br>`ct-933315f0...` | Marcelo Domeraska | `marcelodomeraska@gmail.com` | `invited` | `false` | **0** | *Pendente* | *Pendente* | 0 / 0 |

### 2.1. Detalhes Forenses do Banco
1. **Atletas Globais vs Atletas Vinculados:**
   - Existem 74 atletas na tabela `public.athletes` e 73 vinculações ativas na tabela `public.competition_athletes`.
   - O único atleta com registro em `public.athletes` sem vínculo nesta competição é `André Alexandro Rodrigues` (`ath-81a1bb1e-36c1-4cfd-b8d9-299f2a03cf65`), cujo registro inicial foi criado na criação do time, mas a vinculação oficial com a competição utiliza o registro atleta de elenco `ath-2d7c0f1d-2396-4db0-ba29-fb18dcf9e1d7`.
2. **Conformidade de Regras de Voleibol nas 6 Equipes com Elenco:**
   - **Capitão:** Todas as 6 equipes possuem exatamente 1 capitão designado.
   - **Líbero:** As 6 equipes respeitam o limite máximo de até 2 líberos (AAADU: 2, AVQI: 1, OVERZONE: 2, SNK: 0, MAFIA: 0, UFFS: 0).
   - **Numeração de Camisa:** O regulamento e o sistema tratam a numeração como opcional no momento da inscrição inicial (podendo ser confirmada na reunião técnica/dia dos jogos). As equipes OVERZONE (7 atletas) e AVQI (11 atletas) já cadastraram numerações sem duplicidade interna.

---

## 3. AUDITORIA DO MOTOR DE ELEGIBILIDADE NA `DrawPage.tsx`

A inspeção do código-fonte em `src/pages/DrawPage.tsx` e `src/services/CompetitionDrawEligibilityService.ts` revelou a mecânica exata de filtragem e as travas de segurança ativas:

```typescript
// Trecho de src/services/CompetitionDrawEligibilityService.ts
export function evaluateTeamDrawEligibility(
  competitionTeam: CompetitionTeam,
  athleteCount: number,
  limits: { min: number; max: number }
): TeamDrawEligibility {
  const issues: string[] = [];

  // Regra 1: Status da Inscrição
  if (competitionTeam.status !== 'approved') {
    issues.push(`Inscrição não aprovada (status: ${competitionTeam.status})`);
  }

  // Regra 2: Tamanho Mínimo do Elenco
  if (athleteCount < limits.min) {
    issues.push(`Elenco incompleto: ${athleteCount}/${limits.min} atleta(s) inscrito(s)`);
  }

  return {
    isEligible: issues.length === 0,
    issues,
  };
}
```

### 3.1. As Quatro Travas Mandatórias do Sorteio:

1. **Trava 1 — Exigência de Aprovação Formal (`status === 'approved'`):**
   - **Comportamento:** A `DrawPage.tsx` **NÃO** permite sortear equipes com status `in_progress`, `invited` ou `submitted`. 
   - **Segurança:** O organizador precisa obrigatoriamente aprovar a inscrição de cada equipe na tela de Gestão de Inscrições. Isso impede que uma equipe com documentação incompleta entre acidentalmente nas chaves.

2. **Trava 2 — Limite Mínimo de Atletas no Elenco (`athleteCount >= 6`):**
   - **Comportamento:** Se uma equipe tiver menos de 6 atletas vinculados, ela é classificada como **inelegível** com a mensagem clara: `"Elenco incompleto: X/6 atleta(s) inscrito(s)"`.
   - **Segurança:** Impede que equipes sem quórum técnico mínimo de voleibol (6 atletas em quadra) participem do sorteio.

3. **Trava 3 — Fechamento Formal das Inscrições (`competition.status`):**
   - **Comportamento:** Se a competição estiver com `status === 'registration-open'`, o sorteio é **terminantemente bloqueado**.
   - **Mensagem emitida:** `"Inscrições ainda abertas. É necessário encerrar formalmente as inscrições antes de realizar o sorteio."`
   - O botão principal `"Realizar Sorteio"` fica `disabled={!canDraw}`.

4. **Trava 4 — Quantidade Mínima Técnica para 3 Grupos:**
   - **Comportamento:** Para 3 grupos, o serviço exige no mínimo `Math.max(2, 3 * 2) = 6` equipes aprovadas e elegíveis. Para o formato específico do torneio Voltz de 10 equipes (`[4, 3, 3]`), são necessárias exatamente as **10 equipes aprovadas**.

### 3.2. Painel Diagnóstico da Arena de Sorteio:
Quando houver qualquer pendência, a `DrawPage.tsx` renderiza no topo da tela um card de alerta em vermelho com o badge `"Sorteio Bloqueado"`, listando:
- Lista detalhada de todos os impeditivos.
- Tabela de equipes inelegíveis com a indicação exata de por que cada uma está bloqueada.
- Um botão de atalho `"Encerrar Inscrições da Competição Agora"` (que só é habilitado quando as equipes estiverem em conformidade e faltar apenas o encerramento do prazo).

---

## 4. PLANO DE AÇÃO OPERACIONAL: DA 10ª EQUIPE AO SORTEIO OFICIAL

Para realizar o sorteio oficial das 10 equipes no formato `[4, 3, 3]`, o comitê organizador deve seguir exatamente este roteiro de 6 passos:

```mermaid
flowchart TD
    A[1. Cadastrar 10ª Equipe] --> B[2. Preencher Elencos Pendentes: Nexus, Voltz A, Voltz B e 10ª Equipe]
    B --> C[3. Submeter Elencos das 10 Equipes: in_progress -> submitted]
    C --> D[4. Organizador Aprova as 10 Equipes: submitted -> approved]
    D --> E[5. Encerrar Inscrições da Competição: registration-open -> registration-closed]
    E --> F[6. Acessar Draw Arena e Executar Sorteio 10 Equipes [4, 3, 3]]
```

### Passo 1: Cadastro / Convite da 10ª Equipe
- O organizador acessa o menu da competição em `Gestão > Inscrições`.
- Clica no botão **"Adicionar Equipe Convidada"**.
- Informa o nome da 10ª equipe e o e-mail/contato do dirigente responsável.
- O sistema gera o registro em `teams` e `competition_teams` com o token exclusivo de acesso.

### Passo 2: Preenchimento dos Elencos Pendentes
As 4 equipes pendentes (`Nexus`, `VOLTZ A`, `Voltz B` e a 10ª Equipe) devem registrar seus atletas:
- Cada dirigente acessa seu link público via token: `https://www.baseos.online/equipe/inscricao/:token`.
- Cadastra no mínimo **6 atletas**, selecionando obrigatoriamente **1 Capitão** (e até 2 Líberos opcionais).
- As camisas podem ser preenchidas agora ou deixadas em branco para a confirmação na mesa do campeonato.

### Passo 3: Submissão dos Elencos (`in_progress` -> `submitted`)
- No portal da equipe, o dirigente clica em **"Finalizar Inscrição / Enviar Elenco"**.
- *Alternativa administrativa:* Se o organizador já tiver a relação em mãos, ele próprio pode entrar no painel de inscrições, clicar em **"Ver Elenco"** e clicar em **"Finalizar Inscrição"**, transitando as 10 equipes de `in_progress` para `submitted`.

### Passo 4: Aprovação das Inscrições pelo Organizador (`submitted` -> `approved`)
- O organizador acessa `Gestão da Competição > Inscrições`.
- Para cada uma das 10 equipes submetidas, clica no botão **"Confirmar"** (Aprovar Inscrição).
- O status de cada equipe muda para `approved` e o elenco é travado contra edições (`is_locked = true`).

### Passo 5: Encerramento Oficial das Inscrições
- Com as 10 equipes aprovadas, o organizador encerra o período de inscrições:
  - Clicando no botão **"Encerrar Inscrições"** na aba de Gestão de Inscrições;
  - Ou clicando em **"Encerrar Inscrições da Competição Agora"** diretamente no painel diagnóstico da tela de sorteio.
- O status da competição muda de `registration-open` para `registration-closed`.

### Passo 6: Realização do Sorteio Oficial na Draw Arena (`DrawPage.tsx`)
1. O organizador navega para a aba **Sorteio / Chaves** (`/competitions/:id/draw`).
2. O sistema detecta 10 equipes elegíveis e zera os bloqueadores (`canDraw = true`).
3. O painel sugere ou permite configurar a distribuição para **3 Grupos** (gerando a distribuição assimétrica `[4, 3, 3]`: Grupo A com 4 equipes, Grupo B com 3 equipes e Grupo C com 3 equipes).
4. Opcionalmente, definem-se os **Cabeças de Chave** (Pote 1).
5. O organizador clica em **"Realizar Sorteio"** (assistindo à animação visual dos potes e das chaves).
6. Após a conferência dos grupos sorteados, clica em **"Salvar Grupos"**.
7. O sistema grava os grupos em `competition_teams` (`group_id = 'A', 'B', 'C'`), atualiza o status do torneio e compila a grade oficial com a Fase Classificatória, Repescagem (Play-in) e Mata-mata.

---

## 5. CONCLUSÃO E PARECER DE CONFORMIDADE
- **Integridade dos Dados:** Todas as 9 equipes e 73 atletas existentes estão perfeitamente íntegros e consistentes no PostgreSQL de produção.
- **Robustez da Draw Arena:** O sistema possui proteção contra sorteios antecipados ou elencos incompletos.
- **Prontidão do Motor:** O motor de disputa suporta o formato de 10 equipes (`[4, 3, 3]` + Play-in + Quartas + Semis + Final/3º) e está pronto para receber a 10ª equipe e prosseguir para o sorteio assim que as inscrições forem homologadas.
