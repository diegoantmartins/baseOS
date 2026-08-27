# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 07. Diretrizes de Acessibilidade & Inclusão (Accessibility Blueprint)

---

## 1. CONFORMIDADE WCAG 2.1 AA

O BaseOS adota como meta mandatória a conformidade com as diretrizes internacionais de acessibilidade **WCAG 2.1 Nível AA**, garantindo usabilidade por pessoas com deficiências visuais, motoras e cognitivas.

```text
┌───────────────────────────────┬────────────────────────────────────────────────────────┐
│ Requisito WCAG                │ Implementação Oficial no BaseOS                        │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1.4.3 Contraste Mínimo (AA)   │ Texto normal: >= 4.5:1 (zinc-100 em zinc-950 = 14.2:1) │
│                               │ Texto grande (>= 18px): >= 3.0:1 (amber-500 = 6.8:1)   │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ 2.4.7 Foco Visível (AA)       │ :focus-visible { outline: 2px solid #f59e0b;           │
│                               │                  outline-offset: 2px; }                │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ 4.1.2 Nome, Função e Valor    │ 100% dos botões de ícone possuem aria-label descritivo. │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ 2.5.5 Dimensão do Alvo (AAA)  │ Alvos táteis com dimensão mínima de 44x44px em mobile. │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ 4.1.3 Mensagens de Status     │ Atualizações de placar com aria-live="polite".         │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. NAVEGAÇÃO COMPLETA POR TECLADO

A interface deve ser 100% operável sem o uso do mouse:
- **`Tab` e `Shift + Tab`**: Navega sequencialmente entre campos, botões e links navegáveis.
- **`Enter` e `Space`**: Aciona botões, abre selects e ativa checkboxes/switches.
- **`Setas (↑ ↓ ← →)`**: Navega entre opções de dropdowns, abas de campeonatos e células de rodízio.
- **`Escape (Esc)`**: Fecha qualquer modal (`Dialog`), gaveta (`Drawer`), dropdown ou menu suspenso aberto, retornando o foco imediatamente ao elemento acionador original.

---

## 3. ANÚNCIOS DINÂMICOS PARA LEITORES DE TELA (`aria-live`)

Durante uma partida de vôlei ao vivo, quando o apontador registra um ponto, leitores de tela devem comunicar a pontuação sem interromper a navegação:

```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {`Placar atualizado: ${match.teamAName} ${teamA.score}, ${match.teamBName} ${teamB.score}`}
</div>
```
