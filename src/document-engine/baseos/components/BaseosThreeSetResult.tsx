// =====================================================================
// BaseOS Component - Quadro Oficial de Resultados (3 Sets Comercial/Forense)
// Dimensões SSOT: 248.89 x 141 pt
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { MatchResultData } from '../types/scoresheet';
import type { BaseosTeamData } from '../types/team';
import { BASEOS_TOKENS } from '../theme/tokens';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderWidth: 1.2,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // 1. Header: 14pt
  header: {
    height: 14,
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.8,
    color: BASEOS_TOKENS.colors.WHITE,
    letterSpacing: 0.8,
  },

  // 2. Subheader Equipes: 14pt
  teamsBar: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 2,
  },
  equipeLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  teamSlot: {
    flex: 1,
    height: 11,
    borderWidth: 0.5,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  teamSlotText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.2,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  circleBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  circleBadgeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 3. Colunas da Tabela: 11pt
  colHeadersRow: {
    height: 11,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
  },
  cellMiniHeader: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellPointsHeader: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellCenterHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  headerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  headerPointsText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 4. Linhas de Sets (14pt cada para 3 sets)
  setRow: {
    height: 14,
    flexDirection: 'row',
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  cellMini: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellPoints: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  cellTextBold: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 5. Linha de Duração Total dos Sets: 11pt
  durationRow: {
    height: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  durationText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 6. Linha de Totais: 12pt
  totalsRow: {
    height: 12,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },

  // 7. Horários do Jogo: 18pt
  timesRow: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 2,
  },
  timeCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
    textAlign: 'center',
  },
  timeValue: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 8. Vencedor: 19pt
  winnerRow: {
    height: 19,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  winnerLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.8,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
  },
  winnerSlot: {
    flex: 1,
    height: 13,
    borderWidth: 0.8,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  winnerSlotText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.8,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  winnerScore: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

export interface BaseosThreeSetResultProps {
  result?: MatchResultData;
  teamA?: BaseosTeamData;
  teamB?: BaseosTeamData;
  height?: number;
  maxSets?: number;
}

export const BaseosThreeSetResult: React.FC<BaseosThreeSetResultProps> = ({
  result,
  teamA,
  teamB,
}) => {
  const setResults = result?.setResults || [];

  const getSetRowData = (setNum: number) => {
    const sr = setResults.find((r) => r.setNumber === setNum);
    return {
      tA: sr?.timeOutsA !== undefined ? String(sr.timeOutsA) : '',
      sA: sr?.substitutionsA !== undefined ? String(sr.substitutionsA) : '',
      vA: sr ? (sr.scoreA > sr.scoreB ? '1' : '0') : '',
      pA: sr?.scoreA !== undefined ? String(sr.scoreA) : '',
      dur: sr?.durationMinutes ? `${sr.durationMinutes}m` : '   ',
      pB: sr?.scoreB !== undefined ? String(sr.scoreB) : '',
      vB: sr ? (sr.scoreB > sr.scoreA ? '1' : '0') : '',
      sB: sr?.substitutionsB !== undefined ? String(sr.substitutionsB) : '',
      tB: sr?.timeOutsB !== undefined ? String(sr.timeOutsB) : '',
    };
  };

  const totalTA = setResults.reduce((acc, r) => acc + (r.timeOutsA || 0), 0);
  const totalSA = setResults.reduce((acc, r) => acc + (r.substitutionsA || 0), 0);
  const totalVA = setResults.reduce((acc, r) => acc + (r.scoreA > r.scoreB ? 1 : 0), 0);
  const totalPA = setResults.reduce((acc, r) => acc + (r.scoreA || 0), 0);

  const totalTB = setResults.reduce((acc, r) => acc + (r.timeOutsB || 0), 0);
  const totalSB = setResults.reduce((acc, r) => acc + (r.substitutionsB || 0), 0);
  const totalVB = setResults.reduce((acc, r) => acc + (r.scoreB > r.scoreA ? 1 : 0), 0);
  const totalPB = setResults.reduce((acc, r) => acc + (r.scoreB || 0), 0);

  const totalDuration = result?.totalDurationMinutes || setResults.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);

  const scoreA = result?.finalScoreSetsA ?? (setResults.length > 0 ? totalVA : undefined);
  const scoreB = result?.finalScoreSetsB ?? (setResults.length > 0 ? totalVB : undefined);
  const winnerScoreText =
    scoreA !== undefined && scoreB !== undefined
      ? `2: ${Math.min(scoreA, scoreB)}`
      : '2: ';

  return (
    <View style={styles.container}>
      {/* 1. Header: RESULTADOS */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RESULTADOS</Text>
      </View>

      {/* 2. Subheader Equipes */}
      <View style={styles.teamsBar}>
        <Text style={styles.equipeLabel}>EQUIPE</Text>
        <View style={styles.teamSlot}>
          <Text style={styles.teamSlotText}>{teamA?.name || ''}</Text>
        </View>
        <View style={styles.circleBadge}><Text style={styles.circleBadgeText}>A</Text></View>
        <View style={styles.circleBadge}><Text style={styles.circleBadgeText}>B</Text></View>
        <View style={styles.teamSlot}>
          <Text style={styles.teamSlotText}>{teamB?.name || ''}</Text>
        </View>
        <Text style={styles.equipeLabel}>EQUIPE</Text>
      </View>

      {/* 3. Colunas: T S V P | Set | P V S T */}
      <View style={styles.colHeadersRow}>
        <View style={styles.cellMiniHeader}><Text style={styles.headerText}>"T"</Text></View>
        <View style={styles.cellMiniHeader}><Text style={styles.headerText}>S</Text></View>
        <View style={styles.cellMiniHeader}><Text style={styles.headerText}>V</Text></View>
        <View style={styles.cellPointsHeader}><Text style={styles.headerPointsText}>P (Pontos)</Text></View>

        <View style={styles.cellCenterHeader}><Text style={styles.headerText}>SET (DUR)</Text></View>

        <View style={styles.cellPointsHeader}><Text style={styles.headerPointsText}>P (Pontos)</Text></View>
        <View style={styles.cellMiniHeader}><Text style={styles.headerText}>V</Text></View>
        <View style={styles.cellMiniHeader}><Text style={styles.headerText}>S</Text></View>
        <View style={styles.cellMiniHeader}><Text style={styles.headerText}>"T"</Text></View>
      </View>

      {/* 4. 3 Linhas de Sets (1º ao 3º - estritamente formato 3 sets) */}
      {[1, 2, 3].map((setNum) => {
        const d = getSetRowData(setNum);
        return (
          <View key={setNum} style={styles.setRow}>
            <View style={styles.cellMini}><Text style={styles.cellText}>{d.tA}</Text></View>
            <View style={styles.cellMini}><Text style={styles.cellText}>{d.sA}</Text></View>
            <View style={styles.cellMini}><Text style={styles.cellText}>{d.vA}</Text></View>
            <View style={styles.cellPoints}><Text style={styles.cellTextBold}>{d.pA}</Text></View>

            <View style={styles.cellCenter}>
              <Text style={styles.cellText}>
                {`${setNum}º (${d.dur || '    '})`}
              </Text>
            </View>

            <View style={styles.cellPoints}><Text style={styles.cellTextBold}>{d.pB}</Text></View>
            <View style={styles.cellMini}><Text style={styles.cellText}>{d.vB}</Text></View>
            <View style={styles.cellMini}><Text style={styles.cellText}>{d.sB}</Text></View>
            <View style={styles.cellMini}><Text style={styles.cellText}>{d.tB}</Text></View>
          </View>
        );
      })}

      {/* 5. Linha Duração Total dos Sets */}
      <View style={styles.durationRow}>
        <Text style={styles.durationText}>
          Duração Total dos Sets: {totalDuration > 0 ? `${totalDuration} min` : '______ min'}
        </Text>
      </View>

      {/* 6. Linha de Totais */}
      <View style={styles.totalsRow}>
        <View style={styles.cellMini}><Text style={styles.cellTextBold}>{setResults.length > 0 ? String(totalTA) : ''}</Text></View>
        <View style={styles.cellMini}><Text style={styles.cellTextBold}>{setResults.length > 0 ? String(totalSA) : ''}</Text></View>
        <View style={styles.cellMini}><Text style={styles.cellTextBold}>{setResults.length > 0 ? String(totalVA) : ''}</Text></View>
        <View style={styles.cellPoints}><Text style={styles.cellTextBold}>{setResults.length > 0 ? String(totalPA) : ''}</Text></View>

        <View style={styles.cellCenter}><Text style={styles.cellTextBold}>TOTAL</Text></View>

        <View style={styles.cellPoints}><Text style={styles.cellTextBold}>{setResults.length > 0 ? String(totalPB) : ''}</Text></View>
        <View style={styles.cellMini}><Text style={styles.cellTextBold}>{setResults.length > 0 ? String(totalVB) : ''}</Text></View>
        <View style={styles.cellMini}><Text style={styles.cellTextBold}>{setResults.length > 0 ? String(totalSB) : ''}</Text></View>
        <View style={styles.cellMini}><Text style={styles.cellTextBold}>{setResults.length > 0 ? String(totalTB) : ''}</Text></View>
      </View>

      {/* 7. Horários do Jogo */}
      <View style={styles.timesRow}>
        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>Início do Jogo</Text>
          <Text style={styles.timeValue}>{result?.startTime || '___h ___min'}</Text>
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>Término do Jogo</Text>
          <Text style={styles.timeValue}>{result?.endTime || '___h ___min'}</Text>
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>Duração Total</Text>
          <Text style={styles.timeValue}>{totalDuration > 0 ? `${totalDuration} min` : '___h ___min'}</Text>
        </View>
      </View>

      {/* 8. Vencedor */}
      <View style={styles.winnerRow}>
        <Text style={styles.winnerLabel}>VENCEDOR</Text>
        <View style={styles.winnerSlot}>
          <Text style={styles.winnerSlotText}>{result?.winnerTeamName || ''}</Text>
        </View>
        <Text style={styles.winnerScore}>{winnerScoreText}</Text>
      </View>
    </View>
  );
};
