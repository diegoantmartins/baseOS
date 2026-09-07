# 11 — Implementação 3D do Sorteio

> **STATUS: LEGADO / SUPERADO**
> Documento histórico da Fase 3.2. A implementação descrita aqui (via
> `DrawScene3D` como apresentação principal) foi sucedida pelo Draw Arena
> Cinematográfico. A arquitetura oficial vigente está em
> `44-phase-3.4-etapa-12-cleanup-report.md`.

## Objetivo
A apresentação do sorteio foi transformada em uma experiência cinematicamente orientada, sem alterar a lógica de negócio do motor de sorteio.

## Regras atendidas
- O motor continua responsável pelo cálculo do resultado.
- A camada 3D apenas revela o resultado já definido.
- O modal passa o `DrawResult` completo para a cena.
- Existe fallback visual quando a apresentação em 3D não é adequada.

## Arquitetura implantada
- `src/pages/DrawPage.tsx`: passa o `DrawResult` real para a modal.
- `src/components/draw/LiveDrawModal.tsx`: recebe o resultado e entrega ao renderer visual.
- `src/components/draw/DrawScene3D.tsx`: renderiza a arena de sorteio, bolas, grupos, revelação e HUD.
- `src/components/draw/drawRevealSequence.ts`: gera a ordem de revelação por grupo.

## Fluxo
1. O usuário define o sorteio.
2. `runDraw` calcula o `DrawResult`.
3. A modal abre com o resultado real do sorteio.
4. A cena revela as equipes em sequência.
5. A lógica da competição continua determinística.

## Observações
A cena é visualmente orientada por narrativa esportiva, com arena central, iluminação premium e grupos laterais, sem interferir no algoritmo.
