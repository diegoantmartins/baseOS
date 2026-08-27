---
name: baseos-uiux
description: Standards for UI/UX, visual hierarchy, spacing, typography, information density, interface states, visual feedback, accessibility, and operational SaaS experience for BaseOS.
---

# BaseOS — Diretrizes de UI/UX e Experiência do Usuário

## Identidade da Skill

- **Nome**: baseos-uiux
- **Escopo**: Design de Interface (UI), Experiência do Usuário (UX), Arquitetura da Informação, Micro-interações e Acessibilidade no BaseOS.
- **Posicionamento**: O BaseOS é um **sistema SaaS profissional de gestão de competições esportivas**, focado em eficiência operacional, clareza e alta legibilidade.

---

# 1. VISÃO DE DESIGN: SAAS PROFISSIONAL DE ALTA PERFORMANCE

O BaseOS é utilizado por organizadores de torneios, árbitros, delegados e dirigentes de equipes sob restrição de tempo. A interface deve transparecer **confiança, estabilidade e velocidade operacional**.

### O que EVITAR rigorosamente:
- ❌ **Estética Gamer ou Neons**: Evite paletas neon, roxos cyberpunk e fundos escuros saturados com visual de e-sports.
- ❌ **Excesso de Gradientes e Sombras**: Evite sombras pesadas, bordas brilhantes ou gradientes multicoloridos sem propósito funcional.
- ❌ **Efeitos Decorativos Desnecessários**: Evite animações lentas, vidros desfocados (glassmorphism) excessivos que dificultem a leitura.
- ❌ **Dashboards Genéricos**: Evite cartões com números gigantes soltos sem contexto histórico ou ações diretas.
- ❌ **Inconsistência Visual**: Evite botões com alturas, cantos arredondados ou cores primárias diferentes em páginas distintas.

### O que PRIORIZAR sempre:
- ✅ **Clareza e Legibilidade**: Tipografia limpa, alto contraste (WCAG 2.1 AA) e suporte a números tabulares para placares e estatísticas.
- ✅ **Velocidade Operacional**: Ações frequentes (ex: registrar ponto, substituir atleta, definir escalação) acessíveis com o mínimo de cliques.
- ✅ **Hierarquia Visual Forte**: Distinção clara entre ações primárias, secundárias e destrutivas.
- ✅ **Densidade de Informação Equilibrada**: Tabelas compactas porém confortáveis para exibição de chaveamentos, elencos e classificação.
- ✅ **Consistência Sistêmica**: Reutilização padronizada de componentes e tokens.

---

# 2. COBERTURA DE ESTADOS DE INTERFACE (STATE COVERAGE)

Toda tela, módulo ou componente do BaseOS deve obrigatoriamente contemplar os 4 estados fundamentais de interface:

1. **Estado Normal (Data Ready)**:
   - Exibição limpa da informação com ações contextuais disponíveis.
2. **Estado de Carregamento (Loading State)**:
   - Utilizar Skeleton Loaders com a exata geometria do conteúdo final em vez de spinners genéricos centralizados na tela inteira.
3. **Estado Vazio (Empty State)**:
   - Sempre informar por que está vazio (ex: "Nenhuma equipe inscrita nesta categoria") acompanhado de uma ação direta (ex: "Inscrever Primeira Equipe").
4. **Estado de Erro (Error State)**:
   - Exibir mensagem amigável e acionável em português do Brasil (ex: "Não foi possível carregar a súmula. [Tentar Novamente]").

---

# 3. FEEDBACK VISUAL E MICRO-INTERAÇÕES

- **Confirmações de Ação**: Feedback imediato para salvamentos e edições via Toasts (`sonner`) no canto superior direito.
- **Ações Destrutivas**: Diálogos de confirmação obrigatórios (`AlertDialog` do Radix UI) para exclusões ou cancelamento de partidas.
- **Estados Ativos e Foco**: Foco visível acessível por teclado em todos os elementos interativos (`ring-2 ring-offset-2`).
- **Navegação Responsiva**: Transição fluida de tabelas completas em desktop para cards sanfonados (accordions) em visões mobile.

---

# 4. TIPOGRAFIA E TABELAS ESPORTIVAS

- **Fonte**: Fonte sans-serif moderna (Inter / Roboto / System UI).
- **Placares e Tabelas**: Usar a propriedade `font-mono` ou `tabular-nums` para que números não oscilem em largura durante atualizações ao vivo de partidas.
- **Badges de Status**: Cores semânticas claras para estados de competição:
  - Rascunho / Pendente: Âmbar/Amarelo (`bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300`)
  - Em Andamento / Ao Vivo: Verde Emerald (`bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300`)
  - Encerrado / Finalizado: Azul Slate (`bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300`)
  - Cancelado / W.O.: Vermelho Destrutivo (`bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300`).
