// =====================================================================
// BaseOS Component - Quadro de Aprovação, Oficiais e Observações (3 Sets)
// Dimensões SSOT: 390 x 141 pt
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

  // 1. Observações: 45pt
  observationsBox: {
    height: 45,
    borderBottomWidth: 1.2,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  observationsHeader: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  obsLine: {
    flex: 1,
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    justifyContent: 'center',
  },
  obsText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 2. Aprovação: 76pt
  approvalsBox: {
    height: 76,
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
  officialRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    paddingHorizontal: 4,
  },
  officialRoleCell: {
    width: 90,
  },
  officialRoleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  officialNameCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  officialNameText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  officialSigCell: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 0.4,
    borderLeftColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  officialSigText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 3. Capitães: 20pt
  captainsBar: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
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
  captainCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captainCircleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  captainSigLine: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    height: 12,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  captainSigText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

export interface BaseosThreeSetSignaturesProps {
  officials?: BaseosOfficialsData;
  signatures?: BaseosSignaturesData;
  observations?: string | string[];
  height?: number;
}

export const BaseosThreeSetSignatures: React.FC<BaseosThreeSetSignaturesProps> = ({
  officials,
  signatures,
  observations,
}) => {
  const obsLines = typeof observations === 'string'
    ? observations.split('\n')
    : Array.isArray(observations)
      ? observations
      : [];
  return (
    <View style={styles.container}>
      {/* 1. Observações */}
      <View style={styles.observationsBox}>
        <Text style={styles.observationsHeader}>OBSERVAÇÕES</Text>
        {Array.from({ length: 3 }).map((_, idx) => (
          <View key={idx} style={styles.obsLine}>
            <Text style={styles.obsText}>{obsLines[idx] || ''}</Text>
          </View>
        ))}
      </View>

      {/* 2. Aprovação (Equipe de Arbitragem) */}
      <View style={styles.approvalsBox}>
        <View style={styles.approvalsHeader}>
          <Text style={styles.approvalsHeaderText}>APROVAÇÃO (Equipe de Arbitragem)</Text>
        </View>

        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}><Text style={styles.officialRoleText}>1º Árbitro</Text></View>
          <View style={styles.officialNameCell}><Text style={styles.officialNameText}>{officials?.referee1 || ''}</Text></View>
          <View style={styles.officialSigCell}><Text style={styles.officialSigText}>{signatures?.referee1?.signed ? 'Assinado' : ''}</Text></View>
        </View>

        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}><Text style={styles.officialRoleText}>2º Árbitro</Text></View>
          <View style={styles.officialNameCell}><Text style={styles.officialNameText}>{officials?.referee2 || ''}</Text></View>
          <View style={styles.officialSigCell}><Text style={styles.officialSigText}>{signatures?.referee2?.signed ? 'Assinado' : ''}</Text></View>
        </View>

        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}><Text style={styles.officialRoleText}>Apontador</Text></View>
          <View style={styles.officialNameCell}><Text style={styles.officialNameText}>{officials?.scorer || ''}</Text></View>
          <View style={styles.officialSigCell}><Text style={styles.officialSigText}>{signatures?.scorer?.signed ? 'Assinado' : ''}</Text></View>
        </View>

        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}><Text style={styles.officialRoleText}>Apontador Assist.</Text></View>
          <View style={styles.officialNameCell}><Text style={styles.officialNameText}>{officials?.assistantScorer || ''}</Text></View>
          <View style={styles.officialSigCell}><Text style={styles.officialSigText}>—</Text></View>
        </View>

        <View style={styles.officialRow}>
          <View style={styles.officialRoleCell}><Text style={styles.officialRoleText}>Juízes de Linha</Text></View>
          <View style={styles.officialNameCell}>
            <Text style={styles.officialNameText}>
              {[officials?.lineJudge1, officials?.lineJudge2].filter(Boolean).join(' / ') || '1:              2:'}
            </Text>
          </View>
          <View style={styles.officialSigCell}><Text style={styles.officialSigText}>—</Text></View>
        </View>
      </View>

      {/* 3. Capitães */}
      <View style={styles.captainsBar}>
        <View style={styles.captainSide}>
          <View style={styles.captainCircle}><Text style={styles.captainCircleText}>A</Text></View>
          <View style={styles.captainSigLine}>
            <Text style={styles.captainSigText}>{signatures?.captainA?.signed ? 'Assinado' : ''}</Text>
          </View>
        </View>

        <View style={styles.captainsCenterLabel}>
          <Text style={styles.captainsCenterText}>Capitães</Text>
        </View>

        <View style={styles.captainSide}>
          <View style={styles.captainSigLine}>
            <Text style={styles.captainSigText}>{signatures?.captainB?.signed ? 'Assinado' : ''}</Text>
          </View>
          <View style={styles.captainCircle}><Text style={styles.captainCircleText}>B</Text></View>
        </View>
      </View>
    </View>
  );
};
