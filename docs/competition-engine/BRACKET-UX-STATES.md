# BaseOS — Estados de Apresentação e Guia de UX do Bracket

**Status:** Homologado  
**Versão:** 1.0  
**Data:** 2026-09-05  
**Autor:** Antigravity / Gemini  
**Componentes:** `MatchSlotCard.tsx`, `ParticipantSlotRow.tsx`, `GenericTournamentBracket.tsx`

---

## 1. Matriz de Estados Visuais (`MatchSlotVisualState`)

Cada slot no diagrama de chaveamento é projetado em um dos 8 estados visuais estritos:

| Estado Visual | Descrição Operacional | Badge Visual | Ação Permitida |
| :--- | :--- | :--- | :--- |
| `pending` | Ambos os participantes são referências ainda não resolvidas. | `Pendente` (Cinza) | Visualização |
| `partial` | Apenas um lado do confronto está resolvido. | `Parcial` (Âmbar) | Visualização |
| `resolved_unmaterialized` | Ambos os participantes estão definidos, mas a partida ainda aguarda criação no banco. | `Pronto para Materializar` (Azul) | Sincronizar |
| `materialized` | Partida oficial criada no banco, aguardando início. | `Agendada` (Azul/Ciano) | Abrir Mesa / Detalhes |
| `in_progress` | Partida sendo disputada ao vivo na mesa do apontador. | `Ao Vivo` (Verde Pulsante) | Acompanhar / Mesa |
| `completed` | Partida finalizada com resultado canônico homologado. | `Encerrada` (Cinza/Verde) | Ver Súmula / Mesa |
| `bye` | Passagem direta de rodada por chaveamento ímpar. | `BYE` (Roxo) | Nenhuma |
| `inconsistent` | Discrepância detectada entre os dados do slot e a partida vinculada. | `Inconsistente` (Vermelho) | Auditoria |

---

## 2. Acessibilidade Semântica (Item 10 do Usuário)

Conforme a exigência da auditoria:
> *"Um div com tabIndex={0} e onKeyDown não é a melhor solução. Usar elementos semânticos `<button>` para ações."*

O componente `MatchSlotCard.tsx` foi implementado com as seguintes diretrizes:

1. **Card Semântico:**
   O card renderiza um elemento nativo `<button>` acessível quando `canOpenMatch === true`:
   ```tsx
   <button
     type="button"
     onClick={() => onOpenMatch?.(slot.matchId!)}
     aria-label={`Confronto ${slot.matchNumber || slot.slotNumber}: ${slot.participantA.name} contra ${slot.participantB.name}`}
     className="w-full text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-3 bg-surface-base border hover:border-primary-400"
   >
     {/* Conteúdo do Card */}
   </button>
   ```

2. **Card Passivo (Sem Match):**
   Quando o slot ainda não possui partida materializada (`canOpenMatch === false`), ele é renderizado como um `<div role="article">` estático, evitando poluir o ciclo de foco de leitores de tela com elementos interativos inertes.

3. **Contraste e Cores do Design System:**
   - Modo Dark nativo com tokens `bg-surface-elevated`, `border-border-subtle`, `text-text-primary`.
   - Destaque em negrito e cores acentuadas para equipes vencedoras (`font-semibold text-text-primary`).
   - Equipes derrotadas atenuadas com `text-text-secondary line-through opacity-70`.
