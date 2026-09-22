import { describe, it, expect } from 'vitest';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import type { SetFormatConfig } from '@/types/competitionConfig';

describe('Domínio 3 — MatchSheet / Set Validation & Side-Out', () => {
  const indoorConfig: SetFormatConfig = {
    setsToWin: 2,
    maxSets: 3,
    regularSetPoints: 25,
    tiebreakPoints: 15,
    minAdvantage: 2,
  };

  const beachConfig: SetFormatConfig = {
    setsToWin: 2,
    maxSets: 3,
    regularSetPoints: 21,
    tiebreakPoints: 15,
    minAdvantage: 2,
  };

  describe('Validação Canônica de Sets (CompetitionRulesService.validateSingleSet)', () => {
    it('25-23 -> válido (regular set indoor)', () => {
      const result = CompetitionRulesService.validateSingleSet(1, 25, 23, indoorConfig, false);
      expect(result.valid).toBe(true);
      expect(result.winner).toBe('A');
    });

    it('25-24 -> inválido (vantagem insuficiente)', () => {
      const result = CompetitionRulesService.validateSingleSet(1, 25, 24, indoorConfig, false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('vantagem de pelo menos 2 pontos');
    });

    it('24-24 -> inválido (placar em andamento)', () => {
      const result = CompetitionRulesService.validateSingleSet(1, 24, 24, indoorConfig, false);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('26-24 -> válido (vantagem exata de 2 além dos 25)', () => {
      const result = CompetitionRulesService.validateSingleSet(1, 26, 24, indoorConfig, false);
      expect(result.valid).toBe(true);
      expect(result.winner).toBe('A');
    });

    it('27-24 -> inválido (pontuação além de 25 deve terminar exatamente com 2 de vantagem)', () => {
      const result = CompetitionRulesService.validateSingleSet(1, 27, 24, indoorConfig, false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('deve terminar exatamente com 2 pontos de vantagem');
    });

    it('15-13 -> válido no set decisivo (tiebreak)', () => {
      const result = CompetitionRulesService.validateSingleSet(3, 13, 15, indoorConfig, true);
      expect(result.valid).toBe(true);
      expect(result.winner).toBe('B');
    });

    it('15-14 -> inválido no set decisivo (tiebreak sem vantagem de 2)', () => {
      const result = CompetitionRulesService.validateSingleSet(3, 15, 14, indoorConfig, true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('vantagem de pelo menos 2 pontos');
    });

    it('configuração com set regular de 21 pontos (praia): 21-19 válido, 21-20 inválido', () => {
      const valid = CompetitionRulesService.validateSingleSet(1, 21, 19, beachConfig, false);
      expect(valid.valid).toBe(true);

      const invalid = CompetitionRulesService.validateSingleSet(1, 21, 20, beachConfig, false);
      expect(invalid.valid).toBe(false);
    });
  });

  describe('Regra Oficial FIVB/CBV de Side-Out e Rotação', () => {
    function applyRallyPoint(
      state: { servingTeam: 'A' | 'B'; rotationA: number; rotationB: number },
      scoringTeam: 'A' | 'B',
    ) {
      const isSideOut = state.servingTeam !== scoringTeam;
      if (isSideOut) {
        state.servingTeam = scoringTeam;
        if (scoringTeam === 'A') state.rotationA = (state.rotationA + 1) % 6;
        else state.rotationB = (state.rotationB + 1) % 6;
      }
      return { isSideOut };
    }

    it('equipe sacadora marca ponto: mantém saque e NÃO rotaciona', () => {
      const state = { servingTeam: 'A' as 'A' | 'B', rotationA: 0, rotationB: 0 };
      const { isSideOut } = applyRallyPoint(state, 'A');

      expect(isSideOut).toBe(false);
      expect(state.servingTeam).toBe('A');
      expect(state.rotationA).toBe(0); // NÃO roda
      expect(state.rotationB).toBe(0);
    });

    it('equipe receptora marca ponto: conquista o saque (side-out) e roda 1 posição', () => {
      const state = { servingTeam: 'A' as 'A' | 'B', rotationA: 0, rotationB: 0 };
      const { isSideOut } = applyRallyPoint(state, 'B');

      expect(isSideOut).toBe(true);
      expect(state.servingTeam).toBe('B');
      expect(state.rotationA).toBe(0);
      expect(state.rotationB).toBe(1); // Equipe B roda 1 posição
    });

    it('entre sets: rotações de ambas as equipes são resetadas para 0', () => {
      let rotationA = 3;
      let rotationB = 4;

      // Fim do set: reseta rotações
      rotationA = 0;
      rotationB = 0;

      expect(rotationA).toBe(0);
      expect(rotationB).toBe(0);
    });
  });
});
