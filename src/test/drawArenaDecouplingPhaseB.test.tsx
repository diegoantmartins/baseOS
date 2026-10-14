import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DrawScene3D } from '@/components/draw/DrawScene3D';
import { DrawArenaHUD } from '@/components/draw/cinematic/DrawArenaHUD';
import { roundRobinMatchCount } from '@/services/drawService';
import type { DrawResult } from '@/types/draw';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

describe('BaseOS — Fase B: Desacoplamento da Draw Arena e Suporte a Grandes Formatos', () => {
  const mockCompetition: CompetitionRecord = {
    id: 'comp-grand-slam',
    name: 'Grand Slam Nacional 2026',
    modality: 'indoor',
    format: 'groups-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'registration-closed',
  };

  describe('TAREFA 1: Cálculo Preciso de Partidas em Grupos Desiguais', () => {
    // Função espelhada de cálculo real do DrawPage.tsx
    const calculateEstimatedMatches = (
      teamsCount: number,
      groupsCount: number,
      previewGroups?: { teams: { teamId: string }[] }[]
    ) => {
      if (teamsCount < 2 || groupsCount < 1) return 0;
      if (previewGroups && previewGroups.length > 0) {
        return previewGroups.reduce((acc, g) => acc + roundRobinMatchCount(g.teams.length), 0);
      }
      const actualGroups = Math.min(groupsCount, teamsCount);
      const basePerGroup = Math.floor(teamsCount / actualGroups);
      const remainder = teamsCount % actualGroups;
      let totalMatches = 0;
      for (let i = 0; i < actualGroups; i++) {
        const teamsInThisGroup = i < remainder ? basePerGroup + 1 : basePerGroup;
        totalMatches += roundRobinMatchCount(teamsInThisGroup);
      }
      return totalMatches;
    };

    it('calcula com precisão para 7 equipes em 2 grupos (4 equipes no grupo A e 3 no grupo B)', () => {
      // Grupo A (4 equipes): 4*3/2 = 6 jogos
      // Grupo B (3 equipes): 3*2/2 = 3 jogos
      // Total = 9 jogos (a divisão ingênua anterior previa 12)
      expect(calculateEstimatedMatches(7, 2)).toBe(9);
    });

    it('calcula com precisão para formato complexo de 7 grupos com 3 equipes (21 equipes)', () => {
      // 7 grupos de 3 equipes = 7 * (3*2/2) = 21 jogos
      expect(calculateEstimatedMatches(21, 7)).toBe(21);
    });

    it('calcula com precisão para 22 equipes em 7 grupos (1 grupo de 4 e 6 grupos de 3)', () => {
      // 1 grupo de 4: 6 jogos
      // 6 grupos de 3: 6 * 3 = 18 jogos
      // Total = 24 jogos (a divisão ingênua anterior previa Math.ceil(22/7)*7 = 42 jogos)
      expect(calculateEstimatedMatches(22, 7)).toBe(24);
    });

    it('respeita os grupos reais do preview quando o sorteio já foi gerado', () => {
      const preview = [
        { teams: [{ teamId: 't1' }, { teamId: 't2' }, { teamId: 't3' }] }, // 3 jogos
        { teams: [{ teamId: 't4' }, { teamId: 't5' }] },                    // 1 jogo
      ];
      expect(calculateEstimatedMatches(5, 2, preview)).toBe(4);
    });
  });

  describe('TAREFA 2: Responsividade e Contenção do HUD de Transmissão (DrawArenaHUD)', () => {
    it('renderiza as alas laterais com classes de contenção vertical e rolagem', () => {
      // Simula 7 grupos (A até G)
      const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name, i) => ({
        name: `Grupo ${name}`,
        teams: [
          { teamId: `t-${i}-1`, seed: 1 },
          { teamId: `t-${i}-2`, seed: 2 },
          { teamId: `t-${i}-3`, seed: 3 },
        ],
      }));

      const drawResult: DrawResult = {
        competitionId: mockCompetition.id,
        config: { groupsCount: 7, seedingMode: 'random', seed: 2026, headSeeds: [] },
        groups,
        matches: [],
        status: 'preview',
      };

      const teamsList: TeamRecord[] = groups.flatMap(g =>
        g.teams.map(t => ({
          id: t.teamId,
          name: `Equipe ${t.teamId}`,
          shortName: t.teamId,
          modality: 'indoor' as const,
        }))
      );

      const { container } = render(
        <DrawArenaHUD
          state="IDLE"
          progress={0}
          progressCount="00 / 21"
          currentIndex={-1}
          currentTeam={null}
          currentGroup={null}
          teams={teamsList}
          drawResult={drawResult}
          revealSequence={[]}
          totalReveals={21}
          competition={mockCompetition}
          isAutoPlay={false}
          onAutoPlayToggle={() => {}}
          onRevealDurationChange={() => {}}
          revealDurationMs={2000}
          canAdvance={true}
          onAdvance={() => {}}
        />
      );

      // Encontra a estrutura de estúdio e o pote de sorteio
      expect(screen.getByText(/Pote do Sorteio/i)).toBeInTheDocument();

      // Valida que todos os grupos estão presentes no palco principal
      expect(screen.getAllByText(/Grupo A/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Grupo D/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Grupo G/i).length).toBeGreaterThan(0);

      // Valida que as equipes estão no pote com seus escudos e identificadores
      expect(screen.getAllByText('t-0-1').length).toBeGreaterThan(0);
    });
  });

  describe('TAREFA 3: Generalização do Fallback Visual (DrawScene3D)', () => {
    it('carrega 100% das equipes na urna sem corte arbitrário de 18 equipes', () => {
      // Simula 24 equipes em 4 grupos de 6
      const groups = ['A', 'B', 'C', 'D'].map((name, gIdx) => ({
        name: `Grupo ${name}`,
        teams: Array.from({ length: 6 }, (_, tIdx) => ({
          teamId: `team-${gIdx * 6 + tIdx + 1}`,
          seed: tIdx + 1,
        })),
      }));

      const drawResult: DrawResult = {
        competitionId: mockCompetition.id,
        config: { groupsCount: 4, seedingMode: 'random', seed: 777, headSeeds: [] },
        groups,
        matches: [],
        status: 'preview',
      };

      const teamsList: TeamRecord[] = groups.flatMap(g =>
        g.teams.map(t => ({
          id: t.teamId,
          name: `Time ${t.teamId}`,
          shortName: `T${t.teamId.replace('team-', '')}`,
          modality: 'indoor' as const,
        }))
      );

      const { container } = render(
        <DrawScene3D
          result={drawResult}
          teams={teamsList}
          competition={mockCompetition}
          revealDurationMs={20000}
          onClose={() => {}}
        />
      );

      // Total de equipes deve ser 24 na contagem (01 / 24)
      expect(screen.getAllByText(/24/i).length).toBeGreaterThan(0);

      // Equipes além do antigo corte de 18 estão presentes e renderizadas
      expect(screen.getByText('Time team-19')).toBeInTheDocument();
      expect(screen.getByText('Time team-24')).toBeInTheDocument();

      // Todas as 24 esferas individuais estão renderizadas no DOM dentro da urna
      const balls = container.querySelectorAll('.border-white\\/30.rounded-full');
      expect(balls.length).toBe(24);
    });

    it('calcula translação X dinâmica proporcional para direcionar card ao grupo alvo', () => {
      // Função espelhada de translação dinâmica
      const calculateTargetX = (targetGroupIndex: number, totalGroups: number) => {
        if (targetGroupIndex < 0 || totalGroups <= 1) return 0;
        return Math.round(((targetGroupIndex / (totalGroups - 1)) - 0.5) * 360);
      };

      // Para 2 grupos: -180 (A) e +180 (B)
      expect(calculateTargetX(0, 2)).toBe(-180);
      expect(calculateTargetX(1, 2)).toBe(180);

      // Para 3 grupos: -180 (A), 0 (B), +180 (C) — idêntico ao comportamento histórico
      expect(calculateTargetX(0, 3)).toBe(-180);
      expect(calculateTargetX(1, 3)).toBe(0);
      expect(calculateTargetX(2, 3)).toBe(180);

      // Para 7 grupos: interpolação suave
      expect(calculateTargetX(0, 7)).toBe(-180);
      expect(calculateTargetX(3, 7)).toBe(0);   // grupo do meio perfeitamente centralizado
      expect(calculateTargetX(6, 7)).toBe(180); // último grupo na extremidade direita
    });
  });
});
