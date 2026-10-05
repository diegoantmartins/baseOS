// =====================================================================
// BaseOS Component - Quadro Oficial de Resultados (5 Sets Canônico)
// Dimensões SSOT: 162 x 141 pt (Posicionado entre Aprovação e Elencos)
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

  // 1. Header: 12pt
  header: {
    height: 12,
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.0,
    color: BASEOS_TOKENS.colors.WHITE,
    letterSpacing: 0.8,
  },

  // 2. Subheader Equipes: 11pt
  teamsBar: {
    height: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 2,
  },
  equipeLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  teamSlot: {
    flex: 1,
    height: 8.5,
    borderWidth: 0.5,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  teamSlotText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  circleBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 0.7,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  circleBadgeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 3. Colunas da Tabela: 9pt
  colHeadersRow: {
    height: 9,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
  },
  cellMiniHeader: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellPointsHeader: {
    width: 18,
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
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  headerPointsText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 4. Linhas de Sets (5 linhas x 9.2pt)
  setRow: {
    height: 9.2,
    flexDirection: 'row',
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  cellMini: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellPoints: {
    width: 18,
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
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  cellTextBold: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 5. Linha de Duração Total dos Sets: 8.5pt
  durationRow: {
    height: 8.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  durationText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 6. Linha de Totais: 9.5pt
  totalsRow: {
    height: 9.5,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },

  // 7. Horários do Jogo: 15pt
  timesRow: {
    height: 15,
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
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
    textAlign: 'center',
  },
  timeValue: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 8. Vencedor: 17pt
  winnerRow: {
    height: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    gap: 3,
  },
  winnerLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.0,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.4,
  },
  winnerSlot: {
    flex: 1,
    height: 11,
    borderWidth: 0.7,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  winnerSlotText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  finalScoreBox: {
    width: 20,
    height: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalScoreText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

export interface BaseosFiveSetResultProps {
  result?: MatchResultData;
  teamA?: BaseosTeamData;
  teamB?: BaseosTeamData;
  width?: number;
  height?: number;
}

export const BaseosFiveSetResult: React.FC<BaseosFiveSetResultProps> = ({
  result,
  teamA,
  teamB,
}) => {
  const sets = [1, 2, 3, 4, 5] as const;
  const setResults = result?.setResults || [];

  const getSetRowData = (setNum: number) => {
    const sr = setResults.find((r) => r.setNumber === setNum);
    return {
      tA: sr?.timeOutsA !== undefined ? String(sr.timeOutsA) : '',
      sA: sr?.substitutionsA !== undefined ? String(sr.substitutionsA) : '',
      vA: sr ? (sr.scoreA > sr.scoreB ? '1' : '0') : '',
      pA: sr?.scoreA !== undefined ? String(sr.scoreA) : '',
      dur: sr?.durationMinutes ? `${sr.durationMinutes}'` : '',
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

  return (
    <View style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RESULTADOS</Text>
      </View>

      {/* 2. Subheader Equipes */}
      <View style={styles.teamsBar}>
        <Text style={styles.equipeLabel}>EQUIPE</Text>
        <View style={styles.teamSlot}>
          <Text style={styles.teamSlotText}>
            {teamA?.name || ''}
          </Text>
        </View>
        <View style={styles.circleBadge}>
          <Text style={styles.circleBadgeText}>A</Text>
        </View>
        <View style={styles.circleBadge}>
          <Text style={styles.circleBadgeText}>B</Text>
        </View>
        <View style={styles.teamSlot}>
          <Text style={styles.teamSlotText}>
            {teamB?.name || ''}
          </Text>
        </View>
        <Text style={styles.equipeLabel}>EQUIPE</Text>
      </View>

      {/* 3. Colunas da Tabela */}
      <View style={styles.colHeadersRow}>
        <View style={styles.cellMiniHeader}>
          <Text style={styles.headerText}>'T'</Text>
        </View>
        <View style={styles.cellMiniHeader}>
          <Text style={styles.headerText}>S</Text>
        </View>
        <View style={styles.cellMiniHeader}>
          <Text style={styles.headerText}>V</Text>
        </View>
        <View style={styles.cellPointsHeader}>
          <Text style={styles.headerPointsText}>P (Pontos)</Text>
        </View>
        <View style={styles.cellCenterHeader}>
          <Text style={styles.headerText}>SET (DUR)</Text>
        </View>
        <View style={styles.cellPointsHeader}>
          <Text style={styles.headerPointsText}>P (Pontos)</Text>
        </View>
        <View style={styles.cellMiniHeader}>
          <Text style={styles.headerText}>V</Text>
        </View>
        <View style={styles.cellMiniHeader}>
          <Text style={styles.headerText}>S</Text>
        </View>
        <View style={[styles.cellMiniHeader, { borderRightWidth: 0 }]}>
          <Text style={styles.headerText}>'T'</Text>
        </View>
      </View>

      {/* 4. Linhas de Sets (1 a 5) */}
      {sets.map((setNum) => {
        const row = getSetRowData(setNum);

        return (
          <View key={setNum} style={styles.setRow}>
            <View style={styles.cellMini}>
              <Text style={styles.cellText}>{row.tA}</Text>
            </View>
            <View style={styles.cellMini}>
              <Text style={styles.cellText}>{row.sA}</Text>
            </View>
            <View style={styles.cellMini}>
              <Text style={styles.cellTextBold}>{row.vA}</Text>
            </View>
            <View style={styles.cellPoints}>
              <Text style={styles.cellTextBold}>{row.pA}</Text>
            </View>
            <View style={styles.cellCenter}>
              <Text style={styles.cellText}>
                {`${setNum}º (${row.dur ? ` ${row.dur} ` : ' '})`}
              </Text>
            </View>
            <View style={styles.cellPoints}>
              <Text style={styles.cellTextBold}>{row.pB}</Text>
            </View>
            <View style={styles.cellMini}>
              <Text style={styles.cellTextBold}>{row.vB}</Text>
            </View>
            <View style={styles.cellMini}>
              <Text style={styles.cellText}>{row.sB}</Text>
            </View>
            <View style={[styles.cellMini, { borderRightWidth: 0 }]}>
              <Text style={styles.cellText}>{row.tB}</Text>
            </View>
          </View>
        );
      })}

      {/* 5. Duração Total dos Sets */}
      <View style={styles.durationRow}>
        <Text style={styles.durationText}>
          Duração Total dos Sets: {totalDuration ? `${totalDuration} min` : '______ min'}
        </Text>
      </View>

      {/* 6. Linha de Totais */}
      <View style={styles.totalsRow}>
        <View style={styles.cellMini}>
          <Text style={styles.cellTextBold}>{setResults.length > 0 ? totalTA : ''}</Text>
        </View>
        <View style={styles.cellMini}>
          <Text style={styles.cellTextBold}>{setResults.length > 0 ? totalSA : ''}</Text>
        </View>
        <View style={styles.cellMini}>
          <Text style={styles.cellTextBold}>{setResults.length > 0 ? totalVA : ''}</Text>
        </View>
        <View style={styles.cellPoints}>
          <Text style={styles.cellTextBold}>{setResults.length > 0 ? totalPA : ''}</Text>
        </View>
        <View style={styles.cellCenter}>
          <Text style={styles.cellTextBold}>TOTAL</Text>
        </View>
        <View style={styles.cellPoints}>
          <Text style={styles.cellTextBold}>{setResults.length > 0 ? totalPB : ''}</Text>
        </View>
        <View style={styles.cellMini}>
          <Text style={styles.cellTextBold}>{setResults.length > 0 ? totalVB : ''}</Text>
        </View>
        <View style={styles.cellMini}>
          <Text style={styles.cellTextBold}>{setResults.length > 0 ? totalSB : ''}</Text>
        </View>
        <View style={[styles.cellMini, { borderRightWidth: 0 }]}>
          <Text style={styles.cellTextBold}>{setResults.length > 0 ? totalTB : ''}</Text>
        </View>
      </View>

      {/* 7. Horários do Jogo */}
      <View style={styles.timesRow}>
        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>Início do Jogo</Text>
          <Text style={styles.timeValue}>{result?.startTime || '___ h ___ min'}</Text>
        </View>
        <View style={[styles.timeCol, { borderLeftWidth: 0.4, borderRightWidth: 0.4, borderColor: BASEOS_TOKENS.colors.BLACK }]}>
          <Text style={styles.timeLabel}>Término do Jogo</Text>
          <Text style={styles.timeValue}>{result?.endTime || '___ h ___ min'}</Text>
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.timeLabel}>Duração Total</Text>
          <Text style={styles.timeValue}>
            {totalDuration ? `${totalDuration} min` : '___ h ___ min'}
          </Text>
        </View>
      </View>

      {/* 8. Vencedor */}
      <View style={styles.winnerRow}>
        <Text style={styles.winnerLabel}>VENCEDOR</Text>
        <View style={styles.winnerSlot}>
          <Text style={styles.winnerSlotText}>
            {result?.winnerTeamName || ''}
          </Text>
        </View>
        <View style={styles.finalScoreBox}>
          <Text style={styles.finalScoreText}>
            {(() => {
              const scoreA = result?.finalScoreSetsA ?? (setResults.length > 0 ? totalVA : undefined);
              const scoreB = result?.finalScoreSetsB ?? (setResults.length > 0 ? totalVB : undefined);
              if (scoreA !== undefined && scoreB !== undefined) {
                return `3: ${Math.min(scoreA, scoreB)}`;
              }
              return '3: ';
            })()}
          </Text>
        </View>
      </View>
    </View>
  );
};
