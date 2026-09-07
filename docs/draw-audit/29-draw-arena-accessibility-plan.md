# 29 — Draw Arena Accessibility Plan

## Princípio

A experiência cinematográfica não é apenas visual. Deve funcionar para TODOS, mesmo sem suporte a JavaScript, GPU, ou com preferência por movimento reduzido.

---

## 1. ACCESSIBLE NAME & SEMANTICS

### 1.1 Estrutura HTML

```html
<!-- Main draw arena section -->
<section 
  aria-label="Sorteio de competição"
  role="region"
>
  <!-- 3D Canvas -->
  <canvas 
    aria-label="Arena 3D do sorteio"
    role="img"
  ></canvas>
  
  <!-- HUD Layer -->
  <div 
    role="toolbar" 
    aria-label="Controles do sorteio"
  >
    <!-- Botões -->
  </div>
  
  <!-- Status/Results -->
  <div 
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <!-- Atualizações de progresso -->
  </div>
</section>
```

### 1.2 ARIA Labels

```typescript
// Equipe selecionada
<span aria-label={`${teamName} sorteado para ${groupName}`}>
  {teamName}
</span>

// Progress
<div aria-label={`${current} de ${total} equipes sorteadas`}>
  {progressBar}
</div>

// Grupo status
<div aria-label={`Grupo ${name} com ${count} equipes`}>
  {groupCard}
</div>
```

---

## 2. MOTOR DE SORTEIO (ACESSÍVEL DESDE SEMPRE)

**Importante:** Motor de sorteio não é visual

```typescript
// Backend calcula tudo
DrawResult = {
  competitionId: "...",
  groups: [
    { name: "Grupo A", teams: [...] },
    { name: "Grupo B", teams: [...] }
  ],
  matches: [...]
}

// Qualquer dispositivo pode consumi-lo
// JSON em API
// CSV para download
// Impressão de texto simples
```

---

## 3. MODO REDUCED MOTION

### 3.1 Detecção

```typescript
const prefersReducedMotion = 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### 3.2 Aplicação

**Com reduced-motion:**

| Elemento | Normal | Reduced |
|----------|--------|---------|
| Abertura (INTRO) | 2-3s fade | Instantâneo |
| Urna giratória | 1 RPM contínuo | Estática |
| Trajetória equipe | 1.5s curva 3D | Instantâneo |
| Câmera tracking | Smooth dolly | Corte direto |
| Bloom/Glow | Dinâmico | Estático |
| Vibração (shake) | 0.4s | Nenhuma |
| DOF (desfoque) | Ativo | Desativo |
| Partículas | Fluindo | Congeladas |

**Resultado:** Sequência mantida, sem movimento

### 3.3 Implementação

```typescript
const reduceMotion = prefersReducedMotion 
  ? { duration: 0, delay: 0 } 
  : { duration: 0.8, delay: 0.1 };

motion.animate(
  { opacity: 1 },
  reduceMotion
);
```

---

## 4. KEYBOARD NAVIGATION

### 4.1 Controles Principais

```
Tab          → Navegar entre elementos
Enter/Space  → Ativar botão focado
Arrow Keys   → Pausar/Retomar (se necessário)
Escape       → Fechar modal
```

### 4.2 Focus Management

```typescript
// Quando modal abre
const modal = useRef();
useEffect(() => {
  modal.current?.focus();
}, [isOpen]);

// Trap focus dentro do modal
useKeyboardNavigation({
  trapFocus: true,
  cycleTab: true
});
```

### 4.3 Skip Links

```html
<a href="#draw-controls" class="sr-only">
  Pular para controles do sorteio
</a>
```

---

## 5. SCREEN READER SUPPORT

### 5.1 Anúncios Dinâmicos

```typescript
// Quando equipe é sorteada
const announcement = 
  `${teamName} foi sorteado para ${groupName}`;

// Usar aria-live para anunciar
<div role="status" aria-live="polite">
  {announcement}
</div>
```

### 5.2 Descrição de Conteúdo

```typescript
// Equipe em sorteio
<img 
  src={teamLogo}
  alt={`Escudo do time ${teamName}`}
/>

// Grupo
<div 
  aria-label={`Grupo ${letter} com ${teams.length} equipes`}
>
  {groupContent}
</div>
```

### 5.3 Estrutura Semântica

```html
<!-- Usar headers, lists, etc. -->
<h1>Sorteio da Competição</h1>

<dl>
  <dt>Competição</dt>
  <dd>{competitionName}</dd>
  
  <dt>Grupos</dt>
  <dd>{groupsCount}</dd>
  
  <dt>Status</dt>
  <dd>{drawStatus}</dd>
</dl>

<ol aria-label="Ordem de sorteio">
  <li>Grupo A - {teamName1}</li>
  <li>Grupo B - {teamName2}</li>
</ol>
```

---

## 6. CONTRASTE E CORES

### 6.1 WCAG AA (Mínimo)

```
Foreground: #f8fafc (branco)
Background: #020816 (preto)
Ratio: 23.8:1 ✅ (Recomendado: 4.5:1)
```

### 6.2 Não depender só de cor

**❌ Errado:**
```
"Equipe verde foi sorteada"
(usuário daltônico não entende)
```

**✅ Correto:**
```
"Equipe Flamengo (vermelho) foi sorteada"
(fornece contexto adicional)
```

### 6.3 Paleta Acessível

```
Primária:  #f6c76b (dourado) ✅
Secundária: #3b82f6 (azul) ✅
Destaque: #8b5cf6 (roxo) ✅
Fundo: #020816 (preto) ✅

Todos > 7:1 contrast ratio
```

---

## 7. RESPONSIVE TEXT

### 7.1 Tamanho Mínimo

```
Corpo: 16px mínimo (mobile)
Rótulos: 14px mínimo
Headers: Escala proporcionalmente

Desktop: +20% tamanho
Mobile: -10% tamanho (mas nunca < 14px)
```

### 7.2 Line Height & Spacing

```
Line height: 1.5
Letter spacing: 0.05em

Permite leitura confortável
Evita linhas muito juntas
```

### 7.3 Text Wrapping

```
Max-width: 70-80 caracteres por linha
Previne linhas muito longas
Melhora legibilidade
```

---

## 8. CONTROLS ACESSÍVEL

### 8.1 Botões

```typescript
<Button
  aria-label="Iniciar sorteio de grupos"
  disabled={!canDraw}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleStart();
    }
  }}
>
  Iniciar
</Button>
```

### 8.2 Form Controls

```typescript
<label htmlFor="groups-select">
  Número de grupos:
</label>
<select 
  id="groups-select"
  aria-describedby="groups-help"
>
  <option>2</option>
  <option>3</option>
  <option>4</option>
</select>
<span id="groups-help">
  De 2 a 6 grupos
</span>
```

### 8.3 Tooltips

```typescript
<Tooltip 
  content="Embaralha e distribui as equipes"
  aria-label="Informação de ajuda para sorteio"
>
  <Button>Sortear</Button>
</Tooltip>
```

---

## 9. MOBILE ACCESSIBILITY

### 9.1 Touch Targets

```
Mínimo: 44x44px
Recomendado: 48x48px
Espaçamento: 8px mínimo entre targets
```

### 9.2 Mobile Keyboard

```
- Soft keyboard não deve esconder conteúdo crítico
- Input focus deve ser visível
- Scroll behavior deve ser natural
```

### 9.3 Orientação

```
- Suportar landscape e portrait
- Sem lock forçado
- Layout responsivo em ambas
```

---

## 10. FALLBACK SEM JAVASCRIPT

### 10.1 HTML Simples

```html
<!-- Sem JavaScript -->
<div class="draw-summary">
  <h1>Resultado do Sorteio</h1>
  
  <section aria-label="Grupos">
    <article>
      <h2>Grupo A</h2>
      <ul>
        <li>Time 1</li>
        <li>Time 2</li>
        <li>Time 3</li>
      </ul>
    </article>
    
    <article>
      <h2>Grupo B</h2>
      <ul>
        <li>Time 4</li>
        <li>Time 5</li>
      </ul>
    </article>
  </section>
  
  <section aria-label="Rodadas">
    <table>
      <thead>
        <tr><th>Rodada</th><th>Jogo</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Time 1 vs Time 2</td></tr>
      </tbody>
    </table>
  </section>
</div>
```

### 10.2 Progressiva Enhancement

```
1. HTML básico (sempre funciona)
2. CSS estilo (melhor visual)
3. JavaScript interativo (melhor UX)
4. WebGL 3D (premium experience)

Cada camada é opcional
Sem quebra de funcionalidade
```

---

## 11. TESTES DE ACESSIBILIDADE

### 11.1 Automated Testing

```typescript
import { axe } from 'jest-axe';

test('Draw Arena modal is accessible', async () => {
  const { container } = render(<DrawArenaModal />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 11.2 Manual Testing

**Com screen reader:**
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

**Com keyboard only:**
- Tab navigation
- Focus indicators
- No mouse required

**Com tools:**
- Lighthouse (Chrome)
- WAVE (Browser extension)
- axe DevTools (Browser extension)

### 11.3 Relatório WCAG

```
Conformidade alvo: WCAG 2.1 AA

Critérios avaliados:
- Perceivable (Perceptível)
- Operable (Operável)
- Understandable (Compreensível)
- Robust (Robusto)
```

---

## 12. DOCUMENTAÇÃO PARA USUÁRIOS

### 12.1 Instruções Acessíveis

```
# Como usar o Sorteio

## Modo Visual (Padrão)
1. Clique "Iniciar Sorteio"
2. Veja as equipes sendo reveladas
3. Cada equipe é atribuída a um grupo

## Modo Texto (Acessível)
1. Ative "Modo de Alto Contraste" nas preferências
2. Use Escape para pausar
3. Use setas para navegar grupos

## Com Leitor de Tela
1. O sorteio será anunciado
2. Grupos serão listados
3. Resultado será tabulado
```

### 12.2 Atalhos de Teclado

```
Space      - Pausar/Retomar
Enter      - Próximo sorteio
Escape     - Fechar
?          - Ver ajuda
A          - Alto contraste
M          - Modo movimento reduzido
```

---

## 13. CHECKLIST DE ACESSIBILIDADE

- [ ] Sem erros axe (automated)
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation 100%
- [ ] Screen reader tested (NVDA)
- [ ] Contrast ratio > 7:1
- [ ] Focus indicators visível
- [ ] Tamanho texto ≥ 14px
- [ ] Mobile touch targets ≥ 44px
- [ ] Reduced motion respeitado
- [ ] Fallback sem JS funciona
- [ ] Documentação acessível
- [ ] Testes de acessibilidade passam

---

## Conclusão

Acessibilidade não é adereço. É parte central do design.

A Draw Arena é acessível porque:
- ✅ Motor de sorteio é sempre acessível
- ✅ Cinematografia é enhancement, não bloqueio
- ✅ Teclado + screen reader funcionam
- ✅ Reduzido movimento respeitado
- ✅ Contraste e tipos adequados

Próximo: **Plano de Implementação**
