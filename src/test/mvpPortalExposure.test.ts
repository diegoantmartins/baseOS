import { describe, it, expect } from 'vitest';
import { validateMatchHighlight } from '@/services/matchValidationService';
import type { MatchRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

describe('BASEOS v2.4.9 — Homologação com Seleção de MVP e Exposição nos Portais', () => {
  const match = {
    id: 'match-101',
    competitionId: 'comp-1',
    matchNumber: 1,
    round: 1,
    teamAId: 'team-alpha',
    teamAName: 'Alpha Volley Club',
    teamAShortName: 'ALP',
    teamBId: 'team-beta',
    teamBName: 'Beta Sport Club',
    teamBShortName: 'BET',
    phase: 'group',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 25, scoreB: 22 },
    ],
    status: 'completed',
    scheduledTime: new Date().toISOString(),
  } as unknown as MatchRecord;

  const teamARoster = [
    {
      id: 'ath-1',
      competitionTeamId: 'team-alpha',
      name: 'Gabriela Guimarães',
      jerseyNumber: 10,
      position: 'Ponteiro',
      isCaptain: true,
      isLibero: false,
    },
    {
      id: 'ath-2',
      competitionTeamId: 'team-alpha',
      name: 'Thaísa Daher',
      jerseyNumber: 6,
      position: 'Central',
      isCaptain: false,
      isLibero: false,
    },
  ] as unknown as CompetitionAthlete[];

  const teamBRoster = [
    {
      id: 'ath-3',
      competitionTeamId: 'team-beta',
      name: 'Tifanny Abreu',
      jerseyNumber: 7,
      position: 'Oposto',
      isCaptain: false,
      isLibero: false,
    },
  ] as unknown as CompetitionAthlete[];

  it('1. Valida elegibilidade do MVP ao homologar a partida', () => {
    // Atleta pertencente ao time A
    const resA = validateMatchHighlight(match, 'ath-1', teamARoster, teamBRoster);
    expect(resA.valid).toBe(true);

    // Atleta pertencente ao time B
    const resB = validateMatchHighlight(match, 'ath-3', teamARoster, teamBRoster);
    expect(resB.valid).toBe(true);

    // Atleta inexistente ou de outra equipe
    const resInvalid = validateMatchHighlight(match, 'ath-unknown', teamARoster, teamBRoster);
    expect(resInvalid.valid).toBe(false);
  });

  it('2. Calcula contagem acumulada de MVPs por atleta em partidas homologadas', () => {
    const matchesList: MatchRecord[] = [
      { ...match, id: 'm-1', highlightAthleteId: 'ath-1', status: 'homologated' },
      { ...match, id: 'm-2', highlightAthleteId: 'ath-1', status: 'homologated' },
      { ...match, id: 'm-3', highlightAthleteId: 'ath-2', status: 'completed' },
      { ...match, id: 'm-4', highlightAthleteId: 'ath-3', status: 'in-progress' }, // não encerrado
    ];

    const counts = new Map<string, number>();
    matchesList.forEach((m) => {
      if ((m.status === 'homologated' || m.status === 'completed') && m.highlightAthleteId) {
        counts.set(m.highlightAthleteId, (counts.get(m.highlightAthleteId) || 0) + 1);
      }
    });

    expect(counts.get('ath-1')).toBe(2);
    expect(counts.get('ath-2')).toBe(1);
    expect(counts.get('ath-3')).toBeUndefined();
  });

  it('3. Formata rótulo do atleta no padrão [Nº Camisa] Nome do Atleta (Nome da Equipe)', () => {
    const formatAthlete = (ath: CompetitionAthlete, teamName: string) =>
      `${ath.jerseyNumber != null ? `[#${ath.jerseyNumber}] ` : ''}${ath.name} (${teamName})`;

    expect(formatAthlete(teamARoster[0], 'Alpha Volley Club')).toBe('[#10] Gabriela Guimarães (Alpha Volley Club)');
    expect(formatAthlete(teamBRoster[0], 'Beta Sport Club')).toBe('[#7] Tifanny Abreu (Beta Sport Club)');
  });

  it('4. Distingue entre MVP do time logado vs MVP do adversário no Portal da Equipe', () => {
    const myTeamAthletes = teamARoster;
    const opponentTeamName = 'Beta Sport Club';

    const getMvpDisplay = (highlightAthleteId: string) => {
      const isOur = myTeamAthletes.some((a) => a.id === highlightAthleteId);
      if (isOur) {
        const ath = myTeamAthletes.find((a) => a.id === highlightAthleteId);
        return {
          type: 'celebration',
          text: `🏆 MVP do Jogo: Seu atleta ${ath ? `[#${ath.jerseyNumber}] ${ath.name}` : ''}`,
        };
      }
      return {
        type: 'opponent',
        text: `⭐ MVP da Partida: Atleta indicado (${opponentTeamName})`,
      };
    };

    const displayOur = getMvpDisplay('ath-1');
    expect(displayOur.type).toBe('celebration');
    expect(displayOur.text).toContain('🏆 MVP do Jogo: Seu atleta [#10] Gabriela Guimarães');

    const displayOpp = getMvpDisplay('ath-3');
    expect(displayOpp.type).toBe('opponent');
    expect(displayOpp.text).toContain('⭐ MVP da Partida');
  });
});
