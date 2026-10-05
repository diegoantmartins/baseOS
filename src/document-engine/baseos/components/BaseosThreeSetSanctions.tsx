// =====================================================================
// BaseOS Component - Quadro de Sanções Disciplinares (3 Sets Oficial)
// Dimensões SSOT: 175 x 141 pt
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { SanctionEntry } from '../types/officials';
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

  // 1. Header: 16pt
  headerRow: {
    height: 16,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },
  sancoesTitleBox: {
    width: 85,
    borderRightWidth: 1,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sancoesTitleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 8.0,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.8,
  },
  solicitacoesBox: {
    flex: 1,
    flexDirection: 'column',
  },
  solicitacoesHeader: {
    height: 7.5,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.5,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solicitacoesHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  solicitacoesTeamsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  solicitacoesTeamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 2,
  },
  solicitacoesTeamCellDivider: {
    borderRightWidth: 0.5,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  solicitacoesTeamLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  solicitacoesTeamMark: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 2. Subheader: 13pt
  subheaderRow: {
    height: 13,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
  },
  codeColHeader: {
    width: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  teamColHeader: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  setColHeader: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  scoreColHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextMain: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  headerTextSub: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 3. Data Rows: 9.5pt each (8 rows = 76pt)
  row: {
    height: 9.5,
    flexDirection: 'row',
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  codeCell: {
    width: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  teamCell: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  setCell: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  scoreCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  scoreText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 1,
  },

  // 4. Instructions: 36pt
  instructionsBox: {
    height: 36,
    borderTopWidth: 0.8,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    padding: 2.5,
    justifyContent: 'center',
  },
  instructionsText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
    lineHeight: 1.25,
  },
});

export interface BaseosThreeSetSanctionsProps {
  sanctions?: SanctionEntry[];
  improperRequests?: { teamA?: boolean; teamB?: boolean };
  height?: number;
}

export const BaseosThreeSetSanctions: React.FC<BaseosThreeSetSanctionsProps> = ({
  sanctions = [],
  improperRequests,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Header: SANÇÕES | SOLICITAÇÕES INDEVIDAS */}
      <View style={styles.headerRow}>
        <View style={styles.sancoesTitleBox}>
          <Text style={styles.sancoesTitleText}>SANÇÕES</Text>
        </View>
        <View style={styles.solicitacoesBox}>
          <View style={styles.solicitacoesHeader}>
            <Text style={styles.solicitacoesHeaderText}>SOLICITAÇÕES INDEVIDAS</Text>
          </View>
          <View style={styles.solicitacoesTeamsRow}>
            <View style={[styles.solicitacoesTeamCell, styles.solicitacoesTeamCellDivider]}>
              <Text style={styles.solicitacoesTeamLabel}>EQUIPE (A)</Text>
              <Text style={styles.solicitacoesTeamMark}>{improperRequests?.teamA ? 'X' : ''}</Text>
            </View>
            <View style={styles.solicitacoesTeamCell}>
              <Text style={styles.solicitacoesTeamLabel}>EQUIPE (B)</Text>
              <Text style={styles.solicitacoesTeamMark}>{improperRequests?.teamB ? 'X' : ''}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Subheader: A, P, E, D, (A)/(B), SET, PLACAR */}
      <View style={styles.subheaderRow}>
        <View style={styles.codeColHeader}>
          <Text style={styles.headerTextMain}>A</Text>
          <Text style={styles.headerTextSub}>(Advert)</Text>
        </View>
        <View style={styles.codeColHeader}>
          <Text style={styles.headerTextMain}>P</Text>
          <Text style={styles.headerTextSub}>(Penal)</Text>
        </View>
        <View style={styles.codeColHeader}>
          <Text style={styles.headerTextMain}>E</Text>
          <Text style={styles.headerTextSub}>(Expuls)</Text>
        </View>
        <View style={styles.codeColHeader}>
          <Text style={styles.headerTextMain}>D</Text>
          <Text style={styles.headerTextSub}>(Desqual)</Text>
        </View>
        <View style={styles.teamColHeader}>
          <Text style={styles.headerTextMain}>A/B</Text>
        </View>
        <View style={styles.setColHeader}>
          <Text style={styles.headerTextMain}>SET</Text>
        </View>
        <View style={styles.scoreColHeader}>
          <Text style={styles.headerTextMain}>PLACAR</Text>
        </View>
      </View>

      {/* 3. 8 Linhas de Sanções */}
      {Array.from({ length: 8 }).map((_, idx) => {
        const item = sanctions[idx];
        return (
          <View key={idx} style={styles.row}>
            <View style={styles.codeCell}>
              <Text style={styles.cellText}>{item?.typeCode === 'A' ? (item.individualNameOrJersey || 'X') : ''}</Text>
            </View>
            <View style={styles.codeCell}>
              <Text style={styles.cellText}>{item?.typeCode === 'P' ? (item.individualNameOrJersey || 'X') : ''}</Text>
            </View>
            <View style={styles.codeCell}>
              <Text style={styles.cellText}>{item?.typeCode === 'E' ? (item.individualNameOrJersey || 'X') : ''}</Text>
            </View>
            <View style={styles.codeCell}>
              <Text style={styles.cellText}>{item?.typeCode === 'D' ? (item.individualNameOrJersey || 'X') : ''}</Text>
            </View>
            <View style={styles.teamCell}>
              <Text style={styles.cellText}>{item ? `(${item.teamSide})` : ''}</Text>
            </View>
            <View style={styles.setCell}>
              <Text style={styles.cellText}>{item ? String(item.setNumber) : ''}</Text>
            </View>
            <View style={styles.scoreCell}>
              <Text style={styles.scoreText}>{item ? item.scoreAtSanction : ' : '}</Text>
            </View>
          </View>
        );
      })}

      {/* 4. Instruções Oficiais */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsText}>
          Para assinalar uma sanção: escrever a abreviação correspondente (Nº do jogador, T=Técnico, AT=Assistente Técnico, PF=Preparador Físico e M=Médico) ou R para Retardamento na coluna apropriada e indicar a equipe, o set e o placar no momento da sanção.
        </Text>
      </View>
    </View>
  );
};
