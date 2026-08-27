# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 08. Micro-interações, Transições & Animações (Motion Blueprint)

---

## 1. DIRETRIZES DE MOTION PARA SAAS PROFISSIONAL

No BaseOS, as animações existem **exclusivamente para fornecer feedback de estado, guiar a atenção e suavizar transições de tela**. Animações puramente decorativas, lentas ou chamativas são proibidas.

```text
ORÇAMENTO DE MOTION (PERFORMANCE BUDGET):
- Duração Padrão:     150ms a 200ms (Rápido, tátil e instantâneo).
- Curva de Transição: ease-out (cubic-bezier(0.16, 1, 0.3, 1)) para entradas;
                      ease-in (cubic-bezier(0.7, 0, 0.84, 0)) para saídas.
- Propriedades Únicas: Apenas opacity, transform (translate/scale) e background-color.
```

---

## 2. PADRÕES OFICIAIS DE TRANSIÇÃO COM FRAMER MOTION

### A. Transição de Entrada de Páginas (`Page Entrance`)
Substituir atrasos longos de `staggerChildren: 0.06` por uma transição sutil quase imperceptível:

```typescript
export const pageMotion = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.15, ease: 'easeOut' },
};
```

### B. Modais e Diálogos (`Dialog Backdrop & Content`)
- **Backdrop**: Fade-in de opacidade de 0 a 1 em 150ms.
- **Content**: Zoom sutil de escala 0.98 para 1.0 com elevação de 4px para 0px em 180ms.

### C. Feedback Tátil em Botões e Cards (`Hover & Active`)
- **Hover**: Elevação de fundo em 150ms (`transition-colors duration-150`).
- **Active (Clique)**: Efeito tátil suave de escala `active:scale-[0.98]` em botões de pontuação esportiva.

---

## 3. SUPORTE A MOVIMENTO REDUZIDO (`prefers-reduced-motion`)

Em respeito a usuários sensíveis a movimentos visuais:

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
