# BASEOS — FASE 3.1: Estrategia de Acessibilidade

## 1. Princıpios

- WCAG 2.1 AA como referencia
- Sorteio permanece funcional para usuarios com limitacoes visuais
- `prefers-reduced-motion` respeitado com fallback
- Compatibilidade com leitores de tela
- Navegacao por teclado completa

## 2. prefers-reduced-motion

### 2.1 Deteccao

```typescript
const prefersReducedMotion = useMemo(
  () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  []
);
```

### 2.2 Comportamento

- Se `prefersReducedMotion === true`:
  - Forcar fallback 2D
  - Sem animacoes 3D
  - Sem transicoes Framer Motion spring
  - Transicoes lineares e curtas
  - Mostrar resultado instantaneamente

```typescript
// useWebGLCapability.ts
if (prefersReducedMotion || !isSupported || preferLowPower) {
  return <DrawPresentation2D reducedMotion />;
}
```

## 3. Aria Attributes

### 3.1 Modal/Dialog

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="draw-title"
  aria-describedby="draw-description"
>
  <h1 id="draw-title">Sorteio Oficial</h1>
  <p id="draw-description">{competition.name}</p>
</div>
```

### 3.2 Botoes

```typescript
<button
  aria-label={isRevealing ? "Sorteando proxima equipe" : "Sortear proxima equipe"}
  aria-disabled={isRevealing}
>
  {isRevealing ? "Sorteando..." : "Sortear Proximo"}
</button>
```

### 3.3 Progresso

```typescript
<div
  role="progressbar"
  aria-valuenow={currentIndex + 1}
  aria-valuemin={0}
  aria-valuemax={sequence.length}
  aria-label={`Progresso do sorteio: ${currentIndex + 1} de ${sequence.length}`}
/>
```

### 3.4 Equipe Atual

```typescript
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {currentTeam ? `Equipe sorteada: ${currentTeam.name}, ${currentDraw?.groupName}` : ''}
</div>
```

## 4. Leitor de Tela (SR)

### 4.1 Texto de Atualizacao

O componente renderiza um texto invisivel para SR:

```typescript
<div className="sr-only" role="status" aria-live="polite">
  {currentTeam && `Equipe ${currentTeam.name} sorteada para o ${currentGroup?.name}. ${
    sequence.length - currentIndex - 1
  } equipes restantes.`}
</div>
```

### 4.2 Resumo Final

```typescript
{state === 'completed' && (
  <div role="status" aria-live="assertive">
    Sorteio concluido. {groups.length} grupos foram definidos.
  </div>
)}
```

## 5. Contraste de Cores

- Textos sobre fundo escuro: WCAG AA 4.5:1 minimo
- Textos sobre fundo claro: WCAG AA 4.5:1 minimo
- Cores do tema BASEOS ja validadas para frontend 2D
- Verificar contraste no canvas 3D (texturas, glow effects)

## 6. Navegacao por Teclado

### 6.1 Tab Order

1. Botao "Sortear Proximo" / "Iniciar Sorteio"
2. Botao "Cancelar" (se visivel)
3. Botao "Reiniciar" (se estado final)
4. Botao "Fechar"
5. Botao "Tela Cheia"

### 6.2 Atalhos

| Tecla | Acao |
|-------|------|
| `Space` / `Enter` | Proximo / Iniciar |
| `Escape` | Cancelar / Fechar |
| `R` | Reiniciar |
| `F` | Fullscreen |
| `Tab` | Proximo elemento |
| `Shift+Tab` | Elemento anterior |

### 6.3 Focus Management

```typescript
// Foco automatico no botao principal ao abrir
useEffect(() => {
  if (isOpen) {
    buttonRef.current?.focus();
  }
}, [isOpen]);
```

## 7. Foco Visual

```typescript
// Focus ring visivel e acessivel
<button className="
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-accent
  focus-visible:ring-offset-2
  focus-visible:ring-offset-slate-950
">
```

## 8. Compatibilidade

### 8.1 Tecnologias Assistivas Suportadas

- NVDA + Firefox
- JAWS + Chrome
- VoiceOver + Safari (macOS, iOS)
- TalkBack + Chrome Android

### 8.2 Browser Testes

- [ ] Chrome 90+ com VoiceOver
- [ ] Firefox 90+ com NVDA
- [ ] Safari 15+ com VoiceOver
- [ ] Edge 90+ com Narrator

## 9. Acessibilidade 3D Especıfica

### 9.1 Problemas

- Canvas 3D nao e acessıvel por SR
- Animacoes podem causar vertigens/mareo
- Profundidade nao e percepitvel por usuarios com visao monocular

### 9.2 Solucoes

- Texto alternativo (sr-only) descreve o que acontece
- `prefers-reduced-motion` desabilita 3D
- Botoes de acao focaveis
- Indicador textual do estado da cena
- `aria-describedby` para descrecao longa

### 9.3 Alternativa Textual

```typescript
// Sempre disponıvel, com ou sem 3D
<details>
  <summary>Ver resultado em formato lista</summary>
  <ul>
    {groups.map(group => (
      <li>
        <strong>{group.name}:</strong> {group.teams.map(t => t.name).join(', ')}
      </li>
    ))}
  </ul>
</details>
```

## 10. Testes de Acessibilidade

- [ ] Navegacao por teclado completa
- [ ] Screen reader anuncia equipes
- [ ] Foco visivel em todos os elementos
- [ ] `prefers-reduced-motion` respeitado
- [ ] Contraste WCAG AA
- [ ] Aria attributes corretos
- [ ] Foco automatico no botao principal
- [ ] Fullscreen com teclado
