import { describe, it, expect, beforeEach } from 'vitest';
import { dataAccess } from '@/services/dataAccess';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import { CompetitionBracketService } from '@/services/competitionBracketService';
import { computeStandings } from '@/services/standingsService';
import { buildMatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionConfig } from '@/types/competitionConfig';
import { DEFAULT_INDOOR_COMPETITION_CONFIG, DEFAULT_BEACH_COMPETITION_CONFIG } from '@/types/competitionConfig';
import type { CompetitionAthlete } from '@/types/registration';

describe('Fase 4.9 — Auditoria Final e Certificação do Domínio de Competição', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // 1. AUDITORIA DE RULES SNAPSHOT (IMUTABILIDADE E PROTEÇÃO CONTRA SOBRESCRITA)
  // --------------------------------------------------------------------------
  describe('Auditoria de Rules Snapshot e Imutabilidade', () => {
    it('deve preservar incondicionalmente o rulesSnapshot original contra tentativas de sobrescrita', async () => {
      // 1. Cria competição com snapshot de melhor de 5 sets (defaultSetsToWin: 3)
      const baseComp = await dataAccess.createCompetition({
        name: 'Superliga Freeze Test',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 3,
          },
        },
      });

      // Congela o snapshot
      const snap = CompetitionRulesService.createRulesSnapshot(baseComp);
      expect(snap.format.defaultSetsToWin).toBe(3);

      const compWithSnap = await dataAccess.updateCompetition(baseComp.id, {
        rulesSnapshot: snap,
      });
      expect(compWithSnap?.rulesSnapshot?.format.defaultSetsToWin).toBe(3);

      // 2. Tentativa indevida de sobrescrever o rulesSnapshot
      const tamperedSnap: CompetitionConfig = {
        ...snap,
        format: {
          ...snap.format,
          defaultSetsToWin: 1,
        },
      };

      const updated = await dataAccess.updateCompetition(baseComp.id, {
        rulesSnapshot: tamperedSnap,
        name: 'Superliga Freeze Test - Name Updated',
      });

      // O rulesSnapshot DEVE permanecer intacto com defaultSetsToWin = 3
      expect(updated?.rulesSnapshot?.format.defaultSetsToWin).toBe(3);
      expect(updated?.name).toBe('Superliga Freeze Test - Name Updated');

      // 3. Verifica persistência real ao reler do dataAccess
      const reloaded = await dataAccess.getCompetition(baseComp.id);
      expect(reloaded?.rulesSnapshot?.format.defaultSetsToWin).toBe(3);

      // 4. Garante que CompetitionRulesService resolve o formato usando o snapshot congelado
      const resolved = CompetitionRulesService.resolveMatchFormat(reloaded!, 'group');
      expect(resolved.setsToWin).toBe(3);
      expect(resolved.maxSets).toBe(5);
    });

    it('deve manter o snapshot original quando freezeRulesSnapshot for chamado em competição já congelada', () => {
      const comp: CompetitionRecord = {
        id: 'comp-freeze-id',
        name: 'Freeze Check',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rulesSnapshot: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 3,
          },
        },
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
          },
        },
      };

      const frozen = CompetitionLifecycleService.freezeRulesSnapshot(comp);
      expect(frozen.rulesSnapshot?.format.defaultSetsToWin).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // 2. AUDITORIA DE LIFECYCLE E MUTATIONS BLOQUEADAS
  // --------------------------------------------------------------------------
  describe('Auditoria de Lifecycle e Bloqueio de Mutações', () => {
    it('deve bloquear a edição de regras esportivas se a competição já tiver partidas iniciadas ou completadas', async () => {
      const comp = await dataAccess.createCompetition({
        name: 'Lifecycle Lock Test',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'draft',
      });

      // Sem partidas: canEditRules deve ser true
      const canEditBefore = CompetitionLifecycleService.canEditRules(comp, []);
      expect(canEditBefore).toBe(true);

      // Com 1 partida completada
      const dummyMatch: MatchRecord = {
        id: 'match-lock-1',
        competitionId: comp.id,
        teamAId: 'team-1',
        teamBId: 'team-2',
        teamAName: 'Time A',
        teamBName: 'Time B',
        teamAShortName: 'TMA',
        teamBShortName: 'TMB',
        phase: 'group',
        round: 1,
        matchNumber: 1,
        scheduledTime: new Date().toISOString(),
        venue: 'Ginásio',
        court: 'Quadra 1',
        referees: [],
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 25, scoreB: 18 },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const canEditAfter = CompetitionLifecycleService.canEditRules(comp, [dummyMatch]);
      expect(canEditAfter).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. AUDITORIA DE PARTICIPANTES E INTEGRIDADE REFERENCIAL (LOCALSTORAGE VS SUPABASE)
  // --------------------------------------------------------------------------
  describe('Auditoria de Integridade Referencial em Exclusões', () => {
    it('deve impedir exclusão de equipe com partidas no histórico no LocalStorage (espelhando FK RESTRICT)', async () => {
      const team = await dataAccess.createTeam({
        name: 'Time Histórico Imutável',
        shortName: 'THI',
        modality: 'indoor',
        city: 'Curitiba',
        state: 'PR',
      });

      const comp = await dataAccess.createCompetition({
        name: 'Torneio Integridade',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      });

      // Cria uma partida vinculando a equipe
      await dataAccess.createMatch({
        competitionId: comp.id,
        teamAId: team.id,
        teamBId: 'other-team',
        teamAName: team.name,
        teamBName: 'Outro Time',
        teamAShortName: team.shortName,
        teamBShortName: 'OUT',
        phase: 'group',
        round: 1,
        matchNumber: 101,
        scheduledTime: new Date().toISOString(),
        venue: 'Ginásio Principal',
        court: '1',
        referees: [],
        status: 'scheduled',
        sets: [],
      });

      // Tentativa de excluir a equipe deve lançar erro de integridade referencial
      await expect(dataAccess.deleteTeam(team.id)).rejects.toThrow(
        /Não é possível excluir a equipe pois ela possui partidas vinculadas/
      );

      // Equipe deve continuar existindo
      const teams = await dataAccess.listTeams();
      const stillExists = teams.find((t) => t.id === team.id);
      expect(stillExists).toBeDefined();
    });

    it('deve realizar cascade delete de partidas e inscrições ao excluir competição no LocalStorage', async () => {
      const comp = await dataAccess.createCompetition({
        name: 'Torneio Cascade Test',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'draft',
      });

      const team = await dataAccess.createTeam({
        name: 'Time Cascade',
        shortName: 'TCS',
        modality: 'indoor',
        city: 'São Paulo',
        state: 'SP',
      });

      await dataAccess.createCompetitionTeam({
        competitionId: comp.id,
        teamId: team.id,
        teamName: team.name,
        teamShortName: team.shortName,
        status: 'approved',
        isLocked: false,
        registrationDeadline: new Date().toISOString(),
      });

      await dataAccess.createMatch({
        competitionId: comp.id,
        teamAId: team.id,
        teamBId: 'opponent',
        teamAName: team.name,
        teamBName: 'Oponente',
        teamAShortName: team.shortName,
        teamBShortName: 'OPO',
        phase: 'group',
        round: 1,
        matchNumber: 201,
        scheduledTime: new Date().toISOString(),
        venue: 'Quadra B',
        court: '2',
        referees: [],
        status: 'scheduled',
        sets: [],
      });

      // Exclui a competição
      await dataAccess.deleteCompetition(comp.id);

      // Partidas associadas devem ter sido excluídas em cascata
      const remainingMatches = await dataAccess.listMatches(comp.id);
      expect(remainingMatches).toHaveLength(0);

      // Inscrições associadas devem ter sido excluídas em cascata
      const remainingTeams = await dataAccess.listCompetitionTeams(comp.id);
      expect(remainingTeams).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. AUDITORIA DO RESULTADO CANÔNICO E GERAÇÃO DE SÚMULA (PDF)
  // --------------------------------------------------------------------------
  describe('Auditoria do Resultado Canônico em Documentos (PDF)', () => {
    it('deve derivar vencedor e placar final no matchSheetDataBuilder estritamente do resultado canônico oficial', async () => {
      const comp: CompetitionRecord = {
        id: 'comp-pdf-canonical',
        name: 'Copa Súmula',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
          },
        },
      };

      const match: MatchRecord = {
        id: 'match-pdf-1',
        competitionId: comp.id,
        teamAId: 'team-a',
        teamBId: 'team-b',
        teamAName: 'Vôlei A',
        teamBName: 'Vôlei B',
        teamAShortName: 'VA',
        teamBShortName: 'VB',
        phase: 'final',
        round: 1,
        matchNumber: 1,
        scheduledTime: new Date().toISOString(),
        venue: 'Arena Central',
        court: '1',
        referees: [],
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 23 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 15, scoreB: 12 },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sheetData = await buildMatchSheetData(match, comp, [], []);

      // Deve refletir 2 x 1 e vencedor 'A'
      expect(sheetData.finalScoreA).toBe(2);
      expect(sheetData.finalScoreB).toBe(1);
      expect(sheetData.winner).toBe('A');
      expect(sheetData.sheetMode).toBe('post');
    });

    it('deve derivar vencedor corretamente em W.O. no matchSheetDataBuilder', async () => {
      const comp: CompetitionRecord = {
        id: 'comp-pdf-wo',
        name: 'Copa W.O.',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Partida com W.O.
      const matchWO: MatchRecord = {
        id: 'match-pdf-wo',
        competitionId: comp.id,
        teamAId: 'team-presente',
        teamBId: 'team-ausente',
        teamAName: 'Presente FC',
        teamBName: 'Ausente FC',
        teamAShortName: 'PRE',
        teamBShortName: 'AUS',
        phase: 'group',
        round: 1,
        matchNumber: 2,
        scheduledTime: new Date().toISOString(),
        venue: 'Ginásio',
        court: '1',
        referees: [],
        status: 'completed',
        winnerId: 'team-presente',
        isWo: true,
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 0 },
          { setNumber: 2, scoreA: 25, scoreB: 0 },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sheetData = await buildMatchSheetData(matchWO, comp, [], []);
      expect(sheetData.winner).toBe('A');
      expect(sheetData.finalScoreA).toBe(2);
      expect(sheetData.finalScoreB).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. AUDITORIA DE W.O. END-TO-END NA CLASSIFICAÇÃO
  // --------------------------------------------------------------------------
  describe('Auditoria de W.O. na Classificação', () => {
    it('deve computar W.O. na classificação oficial sem distorção estatística', () => {
      const comp: CompetitionRecord = {
        id: 'comp-wo-test',
        name: 'Torneio W.O. Standings',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
          },
        },
      };

      const teamA: TeamRecord = {
        id: 'team-a',
        name: 'Alpha',
        shortName: 'ALP',
        modality: 'indoor',
        city: 'A',
        state: 'AA',
        createdAt: '',
        updatedAt: '',
      };
      const teamB: TeamRecord = {
        id: 'team-b',
        name: 'Beta',
        shortName: 'BET',
        modality: 'indoor',
        city: 'B',
        state: 'BB',
        createdAt: '',
        updatedAt: '',
      };

      const matchWO: MatchRecord = {
        id: 'm-wo-1',
        competitionId: comp.id,
        teamAId: 'team-a',
        teamBId: 'team-b',
        teamAName: 'Alpha',
        teamBName: 'Beta',
        teamAShortName: 'ALP',
        teamBShortName: 'BET',
        phase: 'group',
        groupName: 'Grupo A',
        round: 1,
        matchNumber: 1,
        scheduledTime: new Date().toISOString(),
        venue: 'G1',
        court: '1',
        referees: [],
        status: 'completed',
        winnerId: 'team-a',
        isWo: true,
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 0 },
          { setNumber: 2, scoreA: 25, scoreB: 0 },
        ],
        createdAt: '',
        updatedAt: '',
      };

      const standings = computeStandings(
        [{ team: teamA }, { team: teamB }],
        [matchWO],
        { competition: comp }
      );
      expect(standings).toHaveLength(2);

      const alpha = standings.find((s) => s.teamId === 'team-a');
      const beta = standings.find((s) => s.teamId === 'team-b');

      expect(alpha).toBeDefined();
      expect(beta).toBeDefined();

      // Alpha venceu por W.O. (2-0 sets) -> 3 pontos
      expect(alpha?.competitionPoints).toBe(3);
      expect(alpha?.matchesWon).toBe(1);
      expect(alpha?.matchesLost).toBe(0);
      expect(alpha?.setsWon).toBe(2);
      expect(alpha?.setsLost).toBe(0);
      expect(alpha?.pointsWon).toBe(50);
      expect(alpha?.pointsLost).toBe(0);

      // Beta perdeu por W.O. -> 0 pontos, 0 sets ganhos, 2 perdidos
      expect(beta?.competitionPoints).toBe(0);
      expect(beta?.matchesWon).toBe(0);
      expect(beta?.matchesLost).toBe(1);
      expect(beta?.setsWon).toBe(0);
      expect(beta?.setsLost).toBe(2);
      expect(beta?.pointsWon).toBe(0);
      expect(beta?.pointsLost).toBe(50);
    });
  });

  // --------------------------------------------------------------------------
  // 6. CENÁRIO REAL A — FLUXO COMPLETO INDOOR (INSCRIÇÃO → VALIDAÇÃO → STANDINGS → PLAYOFFS → PÓDIO)
  // --------------------------------------------------------------------------
  describe('Cenário Real A — Fluxo Completo Indoor', () => {
    it('executa com sucesso o fluxo completo indoor de 4 equipes com round-robin, classificação e playoffs', async () => {
      // 1. Criação da competição
      const comp = await dataAccess.createCompetition({
        name: 'Campeonato Metropolitano Indoor',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'draft',
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
          },
        },
      });

      // 2. Criação das 4 equipes e atletas válidos
      const teamNames = ['Tigres', 'Panteras', 'Gaviões', 'Águias'];
      const teams: TeamRecord[] = [];

      for (const name of teamNames) {
        const t = await dataAccess.createTeam({
          name,
          shortName: name.substring(0, 3).toUpperCase(),
          modality: 'indoor',
          city: 'Campinas',
          state: 'SP',
        });
        teams.push(t);

        const ct = await dataAccess.createCompetitionTeam({
          competitionId: comp.id,
          teamId: t.id,
          teamName: t.name,
          teamShortName: t.shortName,
          status: 'approved',
          isLocked: false,
          registrationDeadline: new Date().toISOString(),
        });

        // Adiciona 6 atletas (roster mínimo regulamentar)
        const athletes: CompetitionAthlete[] = [];
        for (let j = 1; j <= 6; j++) {
          const athlete = await dataAccess.createCompetitionAthlete({
            competitionTeamId: ct.id,
            name: `Atleta ${j} ${name}`,
            jerseyNumber: j,
            position: j === 1 ? 'levantador' : 'ponteiro',
            gender: 'male',
            isCaptain: j === 1,
            isLibero: false,
          });
          athletes.push(athlete);
        }

        // Validação canônica de roster mínimo via CompetitionRegistrationService
        const minCheck = CompetitionRegistrationService.validateRosterMinimum(athletes, comp);
        expect(minCheck.valid).toBe(true);
      }

      // 3. Simulação de partidas da fase de grupos
      const groupMatches: MatchRecord[] = [
        {
          id: 'm-g-1',
          competitionId: comp.id,
          teamAId: teams[0].id,
          teamBId: teams[1].id,
          teamAName: teams[0].name,
          teamBName: teams[1].name,
          teamAShortName: teams[0].shortName,
          teamBShortName: teams[1].shortName,
          phase: 'classificatória',
          round: 1,
          matchNumber: 1,
          scheduledTime: new Date().toISOString(),
          venue: 'G1',
          court: '1',
          referees: [],
          status: 'completed',
          sets: [
            { setNumber: 1, scoreA: 25, scoreB: 20 },
            { setNumber: 2, scoreA: 25, scoreB: 18 },
          ],
          winnerId: teams[0].id,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'm-g-2',
          competitionId: comp.id,
          teamAId: teams[2].id,
          teamBId: teams[3].id,
          teamAName: teams[2].name,
          teamBName: teams[3].name,
          teamAShortName: teams[2].shortName,
          teamBShortName: teams[3].shortName,
          phase: 'classificatória',
          round: 1,
          matchNumber: 2,
          scheduledTime: new Date().toISOString(),
          venue: 'G1',
          court: '1',
          referees: [],
          status: 'completed',
          sets: [
            { setNumber: 1, scoreA: 25, scoreB: 22 },
            { setNumber: 2, scoreA: 25, scoreB: 23 },
          ],
          winnerId: teams[2].id,
          createdAt: '',
          updatedAt: '',
        },
      ];

      // Verificação de bloqueio canônico: fase de grupos com partidas completadas NÃO pode ser re-sorteada
      const canModGroup = CompetitionBracketService.canModifyGroupStage(comp, groupMatches);
      expect(canModGroup.ok).toBe(false);

      // 4. Cálculo da classificação canônica
      const standings = computeStandings(
        teams.map((t) => ({ team: t, groupName: 'Grupo Único' })),
        groupMatches,
        { competition: comp }
      );
      expect(standings).toHaveLength(4);
      expect(standings[0].position).toBe(1);
      expect(standings[3].position).toBe(4);

      // 5. Geração canônica de chaveamento eliminatório (Playoff slots)
      const playoffSlots = CompetitionBracketService.generatePlayoffSlots(comp, [
        { groupName: 'Grupo Único', standings },
      ]);
      expect(playoffSlots.length).toBeGreaterThanOrEqual(1);

      const playoffMatches = CompetitionBracketService.buildPlayoffMatchRecords(
        comp,
        playoffSlots,
        teams,
        3
      );
      expect(playoffMatches.length).toBeGreaterThanOrEqual(1);

      // 6. Simulação da Final e cálculo do pódio
      const finalMatchRecord: MatchRecord = {
        ...playoffMatches.find((m) => m.phase === 'final')!,
        id: 'm-final-1',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 25, scoreB: 22 },
        ],
        winnerId: teams[0].id,
        createdAt: '',
        updatedAt: '',
      };

      const podium = CompetitionBracketService.getPodium(comp, [finalMatchRecord]);
      expect(podium.championTeamId).toBe(finalMatchRecord.teamAId);
      expect(podium.runnerUpTeamId).toBe(finalMatchRecord.teamBId);
    });
  });

  // --------------------------------------------------------------------------
  // 7. CENÁRIO REAL B — FLUXO DE VÔLEI DE PRAIA (2X2, 21 PONTOS)
  // --------------------------------------------------------------------------
  describe('Cenário Real B — Vôlei de Praia', () => {
    it('valida regras, pontuação e placares específicos de praia (2x2, 21 pts, tiebreak 15)', () => {
      const beachComp: CompetitionRecord = {
        id: 'comp-beach-1',
        name: 'Circuito Open de Praia',
        modality: 'beach',
        format: 'groups-playoffs',
        playerFormat: '2x2',
        setFormat: '3-sets',
        genderCategory: 'mixed',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          ...DEFAULT_BEACH_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_BEACH_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
            setRules: {
              regularSetPoints: 21,
              tiebreakPoints: 15,
              minAdvantage: 2,
            },
          },
        },
      };

      // Formato resolvido deve ter 21 pontos por set e tiebreak de 15
      const format = CompetitionRulesService.resolveMatchFormat(beachComp, 'group');
      expect(format.regularSetPoints).toBe(21);
      expect(format.tiebreakPoints).toBe(15);
      expect(format.setsToWin).toBe(2);

      // Validação de set regular de praia (21 x 19 é válido)
      const validSet1 = CompetitionRulesService.validateSingleSet(
        1,
        21,
        19,
        format,
        false
      );
      expect(validSet1.valid).toBe(true);

      // 20 x 19 é incompleto (alvo é 21)
      const invalidSet = CompetitionRulesService.validateSingleSet(
        1,
        20,
        19,
        format,
        false
      );
      expect(invalidSet.valid).toBe(false);

      // Tiebreak no 3º set (15 pontos)
      const validTiebreak = CompetitionRulesService.validateSingleSet(
        3,
        15,
        13,
        format,
        true
      );
      expect(validTiebreak.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 8. CENÁRIO REAL E — HISTÓRICO IMUTÁVEL PÓS-PARTIDA
  // --------------------------------------------------------------------------
  describe('Cenário Real E — Histórico Imutável', () => {
    it('não altera resultado canônico ou vencedor de partida concluída quando cadastro de equipe sofre mutação', async () => {
      const comp = await dataAccess.createCompetition({
        name: 'Histórico Permanente',
        modality: 'indoor',
        format: 'groups-playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      });

      const teamA = await dataAccess.createTeam({
        name: 'Clube Original A',
        shortName: 'COA',
        modality: 'indoor',
        city: 'A',
        state: 'AA',
      });
      const teamB = await dataAccess.createTeam({
        name: 'Clube Original B',
        shortName: 'COB',
        modality: 'indoor',
        city: 'B',
        state: 'BB',
      });

      const match = await dataAccess.createMatch({
        competitionId: comp.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        teamAShortName: teamA.shortName,
        teamBShortName: teamB.shortName,
        phase: 'final',
        round: 1,
        matchNumber: 999,
        scheduledTime: new Date().toISOString(),
        venue: 'Ginásio',
        court: '1',
        referees: [],
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 25, scoreB: 22 },
        ],
        winnerId: teamA.id,
      });

      // Resultado canônico inicial
      const canonBefore = CompetitionRulesService.getCanonicalMatchResult(comp, match);
      expect(canonBefore.winnerId).toBe(teamA.id);
      expect(canonBefore.setsWonA).toBe(2);

      // Mutação posterior no cadastro da equipe (ex: alteração de nome fantasia)
      await dataAccess.updateTeam(teamA.id, { name: 'Clube Renomeado A' });

      // Recarrega a partida
      const reloadedMatch = await dataAccess.getMatch(match.id);
      expect(reloadedMatch).not.toBeNull();

      const canonAfter = CompetitionRulesService.getCanonicalMatchResult(comp, reloadedMatch!);
      expect(canonAfter.winnerId).toBe(teamA.id);
      expect(canonAfter.setsWonA).toBe(2);
      expect(canonAfter.setsWonB).toBe(0);
      expect(canonAfter.isCompleted).toBe(true);
    });
  });
});
