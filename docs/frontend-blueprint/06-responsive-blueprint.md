# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 06. Estratégia de Responsividade & Comportamento Adaptativo (Responsive Blueprint)

---

## 1. COMPORTAMENTO POR FAIXA DE BREAKPOINT

O BaseOS foi projetado para responder de forma inteligente aos diferentes cenários de uso, desde monitores ultrawide em centros de comando até smartphones compactos nas mãos de apontadores e dirigentes.

```text
┌─────────────────┬────────────────────────────────────────────────────────────────────────┐
│ Breakpoint      │ Estratégia de Comportamento Visual e Operacional                       │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 1440px+         │ Container centralizado com max-w-7xl. Tabelas em visualização expandida│
│ (Monitores G)   │ com todas as colunas visíveis e pré-visualização de PDF lateral.       │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 1024px a 1280px │ Sidebar colapsada em ícones (w-18) ou expandida (w-64).                │
│ (Laptops/iPads) │ Preview de PDF se mantém ao lado da súmula.                            │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 768px a 1023px  │ Sidebar oculta, ativada por botão hambúrguer.                          │
│ (Tablets Quadra)│ Preview de PDF colapsa para aba dedicada ou modal de pré-visualização. │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 640px a 767px   │ Grids de 2 colunas colapsam para 1 coluna vertical.                   │
│ (Mobile Grande) │ Filtros de modalidade se transformam em ToggleGroup compacto.          │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 375px a 480px   │ Ativação da Bottom Navigation Bar fixa. Tabelas de classificação viram │
│ (Smartphones)   │ Cards sanfonados (Accordions). Modais ganham max-h-[85vh] com scroll.  │
└─────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 2. TRANSFORMAÇÃO DE TABELAS EM DISPOSITIVOS MÓVEIS

Em telas menores que 768px, tabelas densas (como a Classificação de Grupos de 10 colunas) sofrem quebra estrutural se exibidas em formato matricial tradicional. O blueprint adota o **Padrão Híbrido de Tabela Esportiva**:

```text
┌────────────────────────────────────────────────────────┐
│ FORMATO MOBILE (< 768px): CARD SANFONADO               │
├────────────────────────────────────────────────────────┤
│ #1 🏆 Vôlei Clube Alpha          9 PTS · 3J (3V - 0D)  │
│    Sets: 9-1 (+8) · Pontos: 245-180 (+65)        [ ▾ ] │
│ ┌────────────────────────────────────────────────────┐ │
│ │ (Detalhes expandidos ao tocar):                    │ │
│ │ Set Average: 9.0000  ·  Points Average: 1.3611     │ │
│ │ Próximo Confronto: vs Minas Tênis Clube (Quadra 1) │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 3. MODAIS & FORMULÁRIOS COM TECLADO VIRTUAL

Para garantir que o botão "Salvar" ou "Confirmar" nunca fique inacessível ao abrir o teclado virtual no celular:
- Todos os componentes `<DialogContent>` recebem:
  ```tsx
  <DialogContent className="max-w-lg w-[95vw] max-h-[88vh] flex flex-col p-0 overflow-hidden bg-zinc-900 border-zinc-800 rounded-xl">
    <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-zinc-800">
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
    <ScrollArea className="flex-1 p-4 sm:p-6 overflow-y-auto">
      {/* Formulário com inputs */}
    </ScrollArea>
    <DialogFooter className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end gap-2">
      <Button variant="outline">Cancelar</Button>
      <Button variant="default">Salvar Alterações</Button>
    </DialogFooter>
  </DialogContent>
  ```
