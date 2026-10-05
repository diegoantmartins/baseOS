// =====================================================================
// BaseOS Component - Quadro Oficial de Sanções Disciplinares (5 Sets)
// Dimensões SSOT: 118 x 141 pt (Extremo inferior esquerdo)
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

  // 1. Header: 15pt
  headerRow: {
    height: 15,
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },
  sancoesTitleBox: {
    width: 48,
    borderRightWidth: 0.8,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  sancoesTitleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.5,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
  },
  solicitacoesBox: {
    flex: 1,
    flexDirection: 'column',
  },
  solicitacoesHeader: {
    height: 7,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solicitacoesHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.5,
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
    paddingHorizontal: 1,
  },
  solicitacoesTeamCellDivider: {
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  solicitacoesTeamLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  solicitacoesTeamMark: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
    marginLeft: 2,
  },

  // 2. Subheader colunas: 11pt
  subheaderRow: {
    height: 11,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
  },
  codeColHeader: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  teamColHeader: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  setColHeader: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  placarColHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subHeaderTitle: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 3. Linhas de Sanções (7 linhas x 11.5pt)
  row: {
    height: 11.5,
    flexDirection: 'row',
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  codeCell: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  teamCell: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  setCell: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  placarCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  cellTextBold: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 4. Rodapé Informativo: 32pt
  instructionsBox: {
    flex: 1,
    padding: 2,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    borderTopWidth: 0.6,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    justifyContent: 'center',
  },
  instructionsText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.0,
    color: BASEOS_TOKENS.colors.BLACK,
    lineHeight: 1.15,
  },
});

export interface BaseosFiveSetSanctionsProps {
  sanctions?: SanctionEntry[];
  improperRequests?: {
    teamA?: boolean;
    teamB?: boolean;
  };
  width?: number;
  height?: number;
}

export const BaseosFiveSetSanctions: React.FC<BaseosFiveSetSanctionsProps> = ({
  sanctions = [],
  improperRequests,
}) => {
  const rows = Array.from({ length: 7 }, (_, i) => i);

  return (
    <View style={styles.container}>
      {/* 1. Header */}
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
              {improperRequests?.teamA && <Text style={styles.solicitacoesTeamMark}>X</Text>}
            </View>
            <View style={styles.solicitacoesTeamCell}>
              <Text style={styles.solicitacoesTeamLabel}>EQUIPE (B)</Text>
              {improperRequests?.teamB && <Text style={styles.solicitacoesTeamMark}>X</Text>}
            </View>
          </View>
        </View>
      </View>

      {/* 2. Subheader Colunas */}
      <View style={styles.subheaderRow}>
        <View style={styles.codeColHeader}>
          <Text style={styles.subHeaderTitle}>A</Text>
        </View>
        <View style={styles.codeColHeader}>
          <Text style={styles.subHeaderTitle}>P</Text>
        </View>
        <View style={styles.codeColHeader}>
          <Text style={styles.subHeaderTitle}>E</Text>
        </View>
        <View style={styles.codeColHeader}>
          <Text style={styles.subHeaderTitle}>D</Text>
        </View>
        <View style={styles.teamColHeader}>
          <Text style={styles.subHeaderTitle}>A/B</Text>
        </View>
        <View style={styles.setColHeader}>
          <Text style={styles.subHeaderTitle}>SET</Text>
        </View>
        <View style={styles.placarColHeader}>
          <Text style={styles.subHeaderTitle}>PLACAR</Text>
        </View>
      </View>

      {/* 3. Linhas da Tabela */}
      {rows.map((idx) => {
        const item = sanctions[idx];
        const val = item ? (item.individualNameOrJersey || 'T') : '';
        const aVal = item?.typeCode === 'A' ? val : '';
        const pVal = item?.typeCode === 'P' ? val : '';
        const eVal = item?.typeCode === 'E' ? val : '';
        const dVal = item?.typeCode === 'D' ? val : '';

        return (
          <View key={idx} style={styles.row}>
            <View style={styles.codeCell}>
              <Text style={styles.cellText}>{aVal}</Text>
            </View>
            <View style={styles.codeCell}>
              <Text style={styles.cellText}>{pVal}</Text>
            </View>
            <View style={styles.codeCell}>
              <Text style={styles.cellText}>{eVal}</Text>
            </View>
            <View style={styles.codeCell}>
              <Text style={styles.cellText}>{dVal}</Text>
            </View>
            <View style={styles.teamCell}>
              <Text style={styles.cellTextBold}>{item?.teamSide || ''}</Text>
            </View>
            <View style={styles.setCell}>
              <Text style={styles.cellText}>{item?.setNumber != null ? String(item.setNumber) : ''}</Text>
            </View>
            <View style={styles.placarCell}>
              <Text style={styles.cellText}>{item?.scoreAtSanction ? item.scoreAtSanction : ':'}</Text>
            </View>
          </View>
        );
      })}

      {/* 4. Rodapé Informativo */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsText}>
          Para assinalar uma sanção: escrever a abreviação correspondente (Nº do jogador, T=Técnico, AT=Assistente Técnico, PF=Preparador Físico, M=Médico) ou R para Retardamento.
        </Text>
      </View>
    </View>
  );
};
