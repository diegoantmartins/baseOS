# BASEOS — FLUXO DE INSCRIÇÕES E CADASTRO DE EQUIPES
## Diagnóstico do Fluxo Atual, Prazos, Elencos e Especificação do Fluxo Alvo

**Projeto:** BaseOS (VolleyPro)  
**Data:** 04/09/2026  
**Documento:** `docs/competition-portals/REGISTRATION-FLOW.md`  

---

## 1. COMPARAÇÃO ARQUITETURAL: FLUXO ATUAL VS FLUXO ALVO

### 1.1. O Problema da Fragmentação Atual
Hoje coexistem dois fluxos paralelos e desconectados:

```text
FLUXO ATUAL 1 (TeamsPage):
[Organizador cadastra Equipe em /equipes]
          ↓
[Cria TeamRecord global]
          ↓
[Gera registrationToken avulso sem competição]
          ↓
[Abre modal com link /equipe/inscricao/:token que resolve para competição "geral"]


FLUXO ATUAL 2 (CompetitionRegistrationsPage):
[Organizador acessa /competicoes/:id/inscricoes]
          ↓
[Clica em "Convidar Equipe"]
          ↓
[Seleciona equipe da lista]
          ↓
[Define prazo individual daquela equipe]
          ↓
[Cria CompetitionTeam com accessToken próprio]
          ↓
[Copia link manualmente ou aguarda preenchimento]
```

### 1.2. O Fluxo Alvo Canônico
No fluxo unificado, a agremiação é cadastrada com contexto de competição:

```text
[Organizador em /competicoes/:id/equipes ou Modal Unificado]
          ↓
CLICAR EM "SALVAR"
          ↓
EXECUÇÃO ATÔMICA:
  1. Team (se nova agremiação) ou reutilização de existente
  2. CompetitionRegistration (CompetitionTeam) vinculada à competição
  3. Acesso do gestor da equipe (senha / token exclusivo)
  4. Link exclusivo do Portal da Equipe (/equipe/inscricao/:token)
  5. Status inicial da inscrição ('invited' ou 'in_progress')
  6. Elegibilidade configurada (depende de prazo + elenco mínimo)
  7. Log de Auditoria Operacional (OperationalAuditService)
          ↓
MODAL DE CONFIRMAÇÃO IMEDIATA:
  - Resumo das credenciais
  - Link de inscrição
  - Botão "Enviar no WhatsApp" (abre WhatsApp Web com mensagem pré-formatada)
```

---

## 2. MECANISMOS DE PRAZO E CONGELAMENTO

### 2.1. Variáveis de Prazo Existentes
1. `competition.defaultDeadline`: data/hora limite global definida na criação da competição.
2. `competition_teams.registrationDeadline`: data/hora limite atribuída à inscrição específica daquela equipe.
3. `competition_teams.isLocked`: trava booleana administrativa para fechamento manual individual.
4. `competition.status`: status macro do torneio (`'registration-open'`, `'registration-closed'`, `'groups-defined'`, `'in-progress'`).

### 2.2. Avaliação de Bloqueio em `registrationService.ts`
```ts
export function isDeadlineExpired(competitionTeam: CompetitionTeam, now: Date = new Date()): boolean {
  return now.getTime() > new Date(competitionTeam.registrationDeadline).getTime();
}

export function isRegistrationLocked(competitionTeam: CompetitionTeam, now: Date = new Date()): boolean {
  return competitionTeam.isLocked || isDeadlineExpired(competitionTeam, now);
}
```

### 2.3. Diagnóstico de Vulnerabilidade no Fechamento Global
- **Problema:** `isRegistrationLocked` recebe **apenas** o objeto `CompetitionTeam`. Ele desconhece se a competição já transitou para `'registration-closed'`, `'groups-defined'` ou `'in-progress'`.
- **Impacto:** Se o organizador fechar as inscrições da competição ou realizar o sorteio, mas o prazo individual `competition_teams.registrationDeadline` for posterior, o gestor ainda consegue adicionar ou alterar atletas pelo portal.
- **Requisito de Correção Futura:**
  ```ts
  export function isRegistrationLocked(
    competitionTeam: CompetitionTeam,
    competition?: CompetitionRecord,
    now: Date = new Date()
  ): boolean {
    if (competition && (
      competition.status === 'registration-closed' ||
      competition.status === 'groups-defined' ||
      competition.status === 'in-progress' ||
      competition.status === 'completed' ||
      competition.status === 'cancelled'
    )) {
      return true;
    }
    return competitionTeam.isLocked || isDeadlineExpired(competitionTeam, now);
  }
  ```

---

## 3. REGRAS DE VALIDAÇÃO DE ELENCO

O BaseOS possui validações implementadas em [`src/services/competitionRegistrationService.ts`](file:///home/diego-martins/docker/volei/src/services/competitionRegistrationService.ts):

| Regra de Elenco | Implementação Atual | Status |
|---|---|---|
| **Limite Mínimo de Atletas** | `CompetitionRulesService.getRosterLimits(competition).min` | ✅ Validado na submissão |
| **Limite Máximo de Atletas** | `CompetitionRulesService.getRosterLimits(competition).max` | ✅ Validado no cadastro do atleta |
| **Máximo de Capitães** | Máximo de 1 capitão por equipe (`maxCaptains`) | ✅ Validado |
| **Máximo de Líberos** | 2 líberos na quadra; 0 na praia (`maxLiberos`) | ✅ Validado |
| **Camisa Única por Equipe** | 1 a 99 (opcional); se preenchida, deve ser única | ✅ Validado |
| **Unicidade de Atleta no Torneio** | O mesmo atleta (por documento ou nome completo) não pode ser inscrito por duas equipes no mesmo torneio | ✅ Validado |
| **Proteção de Histórico de Jogos** | Atleta que entrou em quadra em partida oficial não pode ser removido do elenco | ✅ Validado |

---

## 4. O QUE FALTA PARA CONCLUIR O FLUXO ALVO

1. **Unificação do Formulário de Cadastro:**
   Permitir que na própria tela de inscrições da competição o administrador cadastre uma nova equipe informando dados da agremiação, gestor e comissão, gravando `teams` e `competition_teams` em operação única.
2. **Propagação Automática de Prazos:**
   O prazo da inscrição (`registrationDeadline`) deve herdar automaticamente o `defaultDeadline` da competição se nenhum prazo for informado.
3. **Sincronismo com o Sorteio:**
   Apenas inscrições com status `'approved'` e elenco validado (`>= minAthletes`) devem ser consideradas no sorteio.
