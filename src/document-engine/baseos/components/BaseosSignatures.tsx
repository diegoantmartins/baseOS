// =====================================================================
// BaseOS Component - Quadro de Aprovação da Arbitragem (110pt Exatos)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosOfficialsData, BaseosSignaturesData } from '../types/officials';
import { BASEOS_TOKENS } from '../theme/tokens';

const styles = StyleSheet.create({
  container: {
    height: 110,
    borderWidth: BASEOS_TOKENS.borders.REGULAR,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'column',
  },
  header: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    letterSpacing: 0.8,
  },
  officialsGrid: {
    height: 82,
    flexDirection: 'column',
    paddingHorizontal: 4,
    paddingVertical: 1,
    justifyContent: 'space-between',
  },
  officialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 9.5,
  },
  officialLabel: {
    width: 85,
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
  },
  officialLine: {
    flex: 1,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    height: 8,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  officialNameText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.5,
  },
  captainsFooter: {
    height: 18,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderTopWidth: BASEOS_TOKENS.borders.THIN,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  captainBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captainText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
  },
  captainLine: {
    width: 80,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    marginLeft: 4,
    height: 8,
  },
});

interface BaseosSignaturesProps {
  officials?: BaseosOfficialsData;
  signatures?: BaseosSignaturesData;
  observations?: string;
}

export const BaseosSignatures: React.FC<BaseosSignaturesProps> = ({
  officials,
}) => {
  const officialsList = [
    { label: 'Árbitro Principal:', name: officials?.referee1 },
    { label: 'Árbitro Auxiliar:', name: officials?.referee2 },
    { label: 'Apontador:', name: officials?.scorer },
    { label: 'Apontador Assistente:', name: officials?.assistantScorer },
    { label: 'Juiz de Linha 1:', name: officials?.lineJudge1 },
    { label: 'Juiz de Linha 2:', name: officials?.lineJudge2 },
    { label: 'Juiz de Linha 3:', name: officials?.lineJudge3 },
    { label: 'Juiz de Linha 4:', name: officials?.lineJudge4 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>APROVAÇÃO (Equipe de Arbitragem)</Text>
      </View>

      <View style={styles.officialsGrid}>
        {officialsList.map((off, idx) => (
          <View key={`off-${idx}`} style={styles.officialRow}>
            <Text style={styles.officialLabel}>{off.label}</Text>
            <View style={styles.officialLine}>
              <Text style={styles.officialNameText}>{off.name || ''}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.captainsFooter}>
        <View style={styles.captainBlock}>
          <Text style={styles.captainText}>Capitão (A):</Text>
          <View style={styles.captainLine} />
        </View>
        <Text style={[styles.captainText, { color: BASEOS_TOKENS.colors.GRAY_DARK }]}>Capitães</Text>
        <View style={styles.captainBlock}>
          <Text style={styles.captainText}>Capitão (B):</Text>
          <View style={styles.captainLine} />
        </View>
      </View>
    </View>
  );
};
