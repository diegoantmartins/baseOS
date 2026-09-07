import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DrawScene3D } from '@/components/draw/DrawScene3D';
import type { DrawResult } from '@/types/draw';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

const teams: TeamRecord[] = [
  { id: 'team-1', name: 'Time 1', shortName: 'T1', modality: 'indoor' },
  { id: 'team-2', name: 'Time 2', shortName: 'T2', modality: 'indoor' },
  { id: 'team-3', name: 'Time 3', shortName: 'T3', modality: 'indoor' },
];

const competition: CompetitionRecord = {
  id: 'comp-1',
  name: 'Copa 3D',
  modality: 'indoor',
  format: 'round-robin',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  status: 'registration',
};

const result: DrawResult = {
  competitionId: 'comp-1',
  config: {
    groupsCount: 2,
    seedingMode: 'random',
    seed: 123,
    headSeeds: [],
  },
  groups: [
    { name: 'Grupo A', teams: [{ teamId: 'team-1', seed: 1 }, { teamId: 'team-2', seed: 2 }] },
    { name: 'Grupo B', teams: [{ teamId: 'team-3', seed: 3 }] },
  ],
  matches: [],
  status: 'preview',
};

describe('DrawScene3D', () => {
  it('renderiza a cena 3D do sorteio e mostra o nome da competição', () => {
    render(
      <DrawScene3D
        result={result}
        teams={teams}
        competition={competition}
        revealDurationMs={600}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Sorteio Oficial')).toBeInTheDocument();
    expect(screen.getByText('Copa 3D')).toBeInTheDocument();
    expect(screen.getAllByText('Grupo A').length).toBeGreaterThan(0);
  });

  it('inicia a revelação automaticamente com a primeira equipe do sorteio', () => {
    vi.useFakeTimers();

    render(
      <DrawScene3D
        result={result}
        teams={teams}
        competition={competition}
        revealDurationMs={20000}
        onClose={() => {}}
      />
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getAllByText('Time 1').length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('inicia automaticamente e exibe controles de ritmo (pausar/avançar/velocidade)', () => {
    vi.useFakeTimers();

    render(
      <DrawScene3D
        result={result}
        teams={teams}
        competition={competition}
        revealDurationMs={20000}
        onClose={() => {}}
      />
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getAllByText('Time 1').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /pausar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /avançar/i })).toBeInTheDocument();
    expect(screen.getByText(/velocidade/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('pausa interrompe o avanço automático e permite avanço manual', () => {
    vi.useFakeTimers();

    render(
      <DrawScene3D
        result={result}
        teams={teams}
        competition={competition}
        revealDurationMs={5000}
        onClose={() => {}}
      />
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getAllByText('Time 1').length).toBeGreaterThan(0);

    // Pausa
    fireEvent.click(screen.getByRole('button', { name: /pausar/i }));
    expect(screen.getByRole('button', { name: /reproduzir/i })).toBeInTheDocument();

    // Avança manualmente mesmo pausado
    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));
    expect(screen.getAllByText('Time 2').length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('avançar manual em autoplay revela a próxima equipe', () => {
    vi.useFakeTimers();

    render(
      <DrawScene3D
        result={result}
        teams={teams}
        competition={competition}
        revealDurationMs={20000}
        onClose={() => {}}
      />
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getAllByText('Time 1').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /avançar/i }));
    expect(screen.getAllByText('Time 2').length).toBeGreaterThan(0);

    vi.useRealTimers();
  });
});
