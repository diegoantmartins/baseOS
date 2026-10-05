// =====================================================================
// BaseOS Component - Quadro Oficial de Observações e Aprovação (5 Sets)
// Dimensões SSOT: 220 x 141 pt (Posicionado entre Sanções e Resultados)
// Observações Compactas (3 linhas) + Quadro de Aprovação de Arbitragem
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosOfficialsData, BaseosSignaturesData } from '../types/officials';
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

  // 1. Observações Compactas: 36pt
  observationsBox: {
    height: 36,
    borderBottomWidth: 1.2,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  observationsHeader: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  obsLine: {
    flex: 1,
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    justifyContent: 'center',
  },
  obsText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.6,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 2. Aprovação: 95pt
  approvalsBox: {
    height: 95,
    borderBottomWidth: 1.2,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
  },
  approvalsHeader: {
    height: 12,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalsHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.8,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
  },
  tableSubheaderRow: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.5,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
  },
  colRoleHeader: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  colNameHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  colSigHeader: {
    width: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  officialRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  officialRoleCell: {
    width: 72,
    paddingLeft: 4,
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  officialRoleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  officialNameCell: {
    flex: 1,
    paddingHorizontal: 4,
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  officialNameText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  officialSigCell: {
    width: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialSigText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // Linha de Juízes de Linha
  linesmenRow: {
    height: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 0,
  },
  linesmenLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
    width: 72,
  },
  linesmenSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  linesmenText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 3. Capitães: 24pt
  captainsBar: {
    height: 24.4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  captainSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  captainsCenterLabel: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captainsCenterText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  circleBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBadgeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  captainSignLine: {
    flex: 1,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    height: 1,
  },
  captainSignValue: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.6,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

export interface BaseosFiveSetSignaturesProps {
  officials?: BaseosOfficialsData;
  signatures?: BaseosSignaturesData;
  observations?: string | string[];
  remarks?: string[];
  width?: number;
  height?: number;
}

export const BaseosFiveSetSignatures: React.FC<BaseosFiveSetSignaturesProps> = ({
  officials,
  signatures,
  observations,
  remarks,
}) => {
  const obsSource = observations ?? remarks ?? [];
  const obsLines = Array.isArray(obsSource)
    ? obsSource
    : (typeof obsSource === 'string' ? obsSource.split('\n') : []);
  const line1 = obsLines[0] || '';
  const line2 = obsLines[1] || '';
  const line3 = obsLines[2] || '';

  return (
    <View style={styles.container}>
      {/* 1. Observações (Compacto) */}
      <View style={styles.observationsBox}>
        <Text style={styles.observationsHeader}>OBSERVAÇÕES:</Text>
        <View style={styles.obsLine}>
          <Text style={styles.obsText}>{line1}</Text>
        </View>
        <View style={styles.obsLine}>
          <Text style={styles.obsText}>{line2}</Text>
        </View>
        <View style={[styles.obsLine, { borderBottomWidth: 0 }]}>
          <Text style={styles.obsText}>{line3}</Text>
        </View>
      </View>

      {/* 2. Aprovação (Equipe de Arbitragem) */}
      <View style={styles.approvalsBox}>
        <View style={styles.approvalsHeader}>
          <Text style={styles.approvalsHeaderText}>APROVAÇÃO (Equipe de Arbitragem)</Text>
        </View>

        {/* Subheader Colunas */}
        <View style={styles.tableSubheaderRow}>
          <View style={styles.colRoleHeader}>
            <Text style={styles.subHeaderText}>FUNÇÃO</Text>
          </View>
          <View style={styles.colNameHeader}>
            <Text style={styles.subHeaderText}>NOME</Text>
          </View>
          <View style={styles.colSigHeader}>
            <Text style={styles.subHeaderText}>ASSINATURA</Text>
          </View>
        </View>

        {/* 1º Árbitro */}
        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}>
            <Text style={styles.officialRoleText}>1º Árbitro</Text>
          </View>
          <View style={styles.officialNameCell}>
            <Text style={styles.officialNameText}>{officials?.referee1 || ''}</Text>
          </View>
          <View style={styles.officialSigCell}>
            <Text style={styles.officialSigText}>{signatures?.referee1?.signed ? 'ASSINADO' : '—'}</Text>
          </View>
        </View>

        {/* 2º Árbitro */}
        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}>
            <Text style={styles.officialRoleText}>2º Árbitro</Text>
          </View>
          <View style={styles.officialNameCell}>
            <Text style={styles.officialNameText}>{officials?.referee2 || ''}</Text>
          </View>
          <View style={styles.officialSigCell}>
            <Text style={styles.officialSigText}>{signatures?.referee2?.signed ? 'ASSINADO' : '—'}</Text>
          </View>
        </View>

        {/* Apontador */}
        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}>
            <Text style={styles.officialRoleText}>Apontador</Text>
          </View>
          <View style={styles.officialNameCell}>
            <Text style={styles.officialNameText}>{officials?.scorer || ''}</Text>
          </View>
          <View style={styles.officialSigCell}>
            <Text style={styles.officialSigText}>{signatures?.scorer?.signed ? 'ASSINADO' : '—'}</Text>
          </View>
        </View>

        {/* Apontador Assist. */}
        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}>
            <Text style={styles.officialRoleText}>Apontador Assist.</Text>
          </View>
          <View style={styles.officialNameCell}>
            <Text style={styles.officialNameText}>{officials?.assistantScorer || ''}</Text>
          </View>
          <View style={styles.officialSigCell}>
            <Text style={styles.officialSigText}>—</Text>
          </View>
        </View>

        {/* Juízes de Linha */}
        <View style={styles.linesmenRow}>
          <Text style={styles.linesmenLabel}>Juízes de Linha</Text>
          <View style={styles.linesmenSlot}>
            <Text style={styles.linesmenText}>
              {`1: ${officials?.lineJudge1 || ''}   2: ${officials?.lineJudge2 || ''}`}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Rodapé Capitães */}
      <View style={styles.captainsBar}>
        {/* Lado A */}
        <View style={styles.captainSide}>
          <View style={styles.circleBadge}>
            <Text style={styles.circleBadgeText}>A</Text>
          </View>
          {signatures?.captainA?.name ? (
            <Text style={styles.captainSignValue}>{signatures.captainA.name}</Text>
          ) : (
            <View style={styles.captainSignLine} />
          )}
        </View>

        {/* Label Central */}
        <View style={styles.captainsCenterLabel}>
          <Text style={styles.captainsCenterText}>Capitães</Text>
        </View>

        {/* Lado B */}
        <View style={styles.captainSide}>
          {signatures?.captainB?.name ? (
            <Text style={styles.captainSignValue}>{signatures.captainB.name}</Text>
          ) : (
            <View style={styles.captainSignLine} />
          )}
          <View style={styles.circleBadge}>
            <Text style={styles.circleBadgeText}>B</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
