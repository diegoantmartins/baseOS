// =====================================================================
// BaseOS Component - Quadro de Resultados (110pt Exatos no Rodapé)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { MatchResultData } from '../types/scoresheet';
import type { BaseosTeamData } from '../types/team';
import { BASEOS_TOKENS } from '../theme/tokens';

const styles = StyleSheet.create({
  container: {
    borderWidth: BASEOS_TOKENS.borders.STRONG,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'column',
  },
  header: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: BASEOS_TOKENS.borders.STRONG,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.WHITE,
    letterSpacing: 0.8,
  },
  teamHeadersRow: {
    height: 10,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: BASEOS_TOKENS.borders.STRONG,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  teamHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.WHITE,
  },
  subHeaderRow: {
    height: 10,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
  },
  col: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  colText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
  },
  setRow: {
    height: 9.5,
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
  },
  durationSummaryRow: {
    height: 10,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleSummaryRow: {
    height: 12,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  summaryText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.8,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  winnerRow: {
    height: 19,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  winnerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.WHITE,
  },
});

interface BaseosResultProps {
  result?: MatchResultData;
  teamA: BaseosTeamData;
  teamB: BaseosTeamData;
  maxSets?: 3 | 5;
  height?: number;
}

export const BaseosResult: React.FC<BaseosResultProps> = ({
  result,
  teamA,
  teamB,
  maxSets = 3,
  height,
}) => {
  const setRows = Array.from({ length: maxSets }, (_, i) => {
    const setNo = i + 1;
    const res = result?.setResults.find(r => r.setNumber === setNo);
    return { setNo, res };
  });

  const totalTA = setRows.reduce((sum, {res}) => sum + (res ? res.timeOutsA || 0 : 0), 0);
  const totalSA = setRows.reduce((sum, {res}) => sum + (res ? res.substitutionsA || 0 : 0), 0);
  const totalVA = setRows.reduce((sum, {res}) => sum + (res && res.scoreA > res.scoreB ? 1 : 0), 0);
  const totalPA = setRows.reduce((sum, {res}) => sum + (res ? res.scoreA || 0 : 0), 0);

  const totalTB = setRows.reduce((sum, {res}) => sum + (res ? res.timeOutsB || 0 : 0), 0);
  const totalSB = setRows.reduce((sum, {res}) => sum + (res ? res.substitutionsB || 0 : 0), 0);
  const totalVB = setRows.reduce((sum, {res}) => sum + (res && res.scoreB > res.scoreA ? 1 : 0), 0);
  const totalPB = setRows.reduce((sum, {res}) => sum + (res ? res.scoreB || 0 : 0), 0);
  const hasAnyResult = setRows.some(({res}) => !!res);

  return (
    <View style={[styles.container, height ? { height } : { height: '100%' }]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>RESULTADOS</Text>
      </View>

      <View style={styles.teamHeadersRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.teamHeaderText}>EQUIPE  </Text>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.WHITE, marginHorizontal: 2 }} />
          <Text style={styles.teamHeaderText}> A  </Text>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.WHITE, marginHorizontal: 2 }} />
          <Text style={styles.teamHeaderText}> B    {teamA.name ? teamA.name.toUpperCase() : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.teamHeaderText}>{teamB.name ? teamB.name.toUpperCase() : ''}    </Text>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.WHITE, marginHorizontal: 2 }} />
          <Text style={styles.teamHeaderText}> A  </Text>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.WHITE, marginHorizontal: 2 }} />
          <Text style={styles.teamHeaderText}> B  EQUIPE</Text>
        </View>
      </View>

      <View style={styles.subHeaderRow}>
        <View style={[styles.col, { width: 14 }]}>
          <Text style={styles.colText}>"T"</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={styles.colText}>S</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={styles.colText}>V</Text>
        </View>
        <View style={[styles.col, { width: 20 }]}>
          <Text style={styles.colText}>Pontos</Text>
        </View>
        <View style={[styles.col, { flex: 1, backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST }]}>
          <Text style={styles.colText}>Set</Text>
        </View>
        <View style={[styles.col, { width: 20 }]}>
          <Text style={styles.colText}>Pontos</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={styles.colText}>V</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={styles.colText}>S</Text>
        </View>
        <View style={[styles.col, { width: 14, borderRightWidth: 0 }]}>
          <Text style={styles.colText}>"T"</Text>
        </View>
      </View>

      {setRows.map(({ setNo, res }) => {
        const isWinA = res && res.scoreA > res.scoreB;
        const isWinB = res && res.scoreB > res.scoreA;

        return (
          <View key={`res-set-${setNo}`} style={styles.setRow}>
            <View style={[styles.col, { width: 14 }]}>
              <Text style={styles.colText}>{res ? String(res.timeOutsA) : ''}</Text>
            </View>
            <View style={[styles.col, { width: 12 }]}>
              <Text style={styles.colText}>{res ? String(res.substitutionsA) : ''}</Text>
            </View>
            <View style={[styles.col, { width: 12 }]}>
              <Text style={styles.colText}>{isWinA ? '1' : res ? '0' : ''}</Text>
            </View>
            <View style={[styles.col, { width: 20 }]}>
              <Text style={[styles.colText, { fontFamily: BASEOS_TOKENS.fonts.BOLD }]}>
                {res ? String(res.scoreA) : ''}
              </Text>
            </View>
            <View style={[styles.col, { flex: 1 }]}>
              <Text style={styles.colText}>
                {setNo}º ( {res?.durationMinutes ? `${res.durationMinutes} min` : '    '} )
              </Text>
            </View>
            <View style={[styles.col, { width: 20 }]}>
              <Text style={[styles.colText, { fontFamily: BASEOS_TOKENS.fonts.BOLD }]}>
                {res ? String(res.scoreB) : ''}
              </Text>
            </View>
            <View style={[styles.col, { width: 12 }]}>
              <Text style={styles.colText}>{isWinB ? '1' : res ? '0' : ''}</Text>
            </View>
            <View style={[styles.col, { width: 12 }]}>
              <Text style={styles.colText}>{res ? String(res.substitutionsB) : ''}</Text>
            </View>
            <View style={[styles.col, { width: 14, borderRightWidth: 0 }]}>
              <Text style={styles.colText}>{res ? String(res.timeOutsB) : ''}</Text>
            </View>
          </View>
        );
      })}

      <View style={[styles.setRow, { borderTopWidth: 1, borderTopColor: BASEOS_TOKENS.colors.BLACK, borderBottomWidth: 1, borderBottomColor: BASEOS_TOKENS.colors.BLACK, backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST }]}>
        <View style={[styles.col, { width: 14 }]}>
          <Text style={[styles.colText, { color: BASEOS_TOKENS.colors.BRAND_PRIMARY }]}>{hasAnyResult ? totalTA : ''}</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={[styles.colText, { color: BASEOS_TOKENS.colors.BRAND_PRIMARY }]}>{hasAnyResult ? totalSA : ''}</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={[styles.colText, { color: BASEOS_TOKENS.colors.BRAND_PRIMARY }]}>{hasAnyResult ? totalVA : ''}</Text>
        </View>
        <View style={[styles.col, { width: 20 }]}>
          <Text style={[styles.colText, { color: BASEOS_TOKENS.colors.BRAND_PRIMARY }]}>{hasAnyResult ? totalPA : ''}</Text>
        </View>
        <View style={[styles.col, { flex: 1, backgroundColor: BASEOS_TOKENS.colors.WHITE }]}>
          <Text style={styles.summaryText}>
            Duração: {result?.totalDurationMinutes ? `${result.totalDurationMinutes} min` : '       min'}
          </Text>
        </View>
        <View style={[styles.col, { width: 20 }]}>
          <Text style={[styles.colText, { color: BASEOS_TOKENS.colors.BRAND_PRIMARY }]}>{hasAnyResult ? totalPB : ''}</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={[styles.colText, { color: BASEOS_TOKENS.colors.BRAND_PRIMARY }]}>{hasAnyResult ? totalVB : ''}</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={[styles.colText, { color: BASEOS_TOKENS.colors.BRAND_PRIMARY }]}>{hasAnyResult ? totalSB : ''}</Text>
        </View>
        <View style={[styles.col, { width: 14, borderRightWidth: 0 }]}>
          <Text style={[styles.colText, { color: BASEOS_TOKENS.colors.BRAND_PRIMARY }]}>{hasAnyResult ? totalTB : ''}</Text>
        </View>
      </View>

      <View style={styles.scheduleSummaryRow}>
        <Text style={styles.summaryText}>
          Hora Início: {result?.startTime || '____h ____min'}
        </Text>
        <Text style={styles.summaryText}>
          Hora Término: {result?.endTime || '____h ____min'}
        </Text>
        <Text style={styles.summaryText}>
          Duração Total: {result?.totalDurationMinutes ? `${result.totalDurationMinutes} min` : '____h ____min'}
        </Text>
      </View>

      <View style={styles.winnerRow}>
        <Text style={styles.winnerText}>
          VENCEDOR: {result?.winnerTeamName ? result.winnerTeamName.toUpperCase() : '________________________'}
        </Text>
        <Text style={styles.winnerText}>
          {maxSets === 5 ? '3' : '2'} : {result?.finalScoreSetsB !== undefined ? String(result.finalScoreSetsB) : '....'}
        </Text>
      </View>
    </View>
  );
};
