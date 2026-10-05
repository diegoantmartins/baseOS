// =====================================================================
// BaseOS Component - Assinaturas de Capitães e Técnicos (3 Sets Oficial)
// Localizado ao lado do Set 3, sob o bloco de Elencos
// Dimensões SSOT: 172.89 x 122 pt
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosSignaturesData } from '../types/officials';
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
  header: {
    height: 15,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 1,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.8,
  },
  body: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  signRow: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  signLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  signValueText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
    marginLeft: 4,
  },
  signUnderline: {
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    width: '100%',
    height: 1,
    marginTop: 1,
  },
});

export interface BaseosThreeSetTeamSignaturesProps {
  signatures?: BaseosSignaturesData;
  height?: number;
}

export const BaseosThreeSetTeamSignatures: React.FC<BaseosThreeSetTeamSignaturesProps> = ({
  signatures,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>ASSINATURAS</Text>
      </View>
      <View style={styles.body}>
        {/* Capitão A */}
        <View style={styles.signRow}>
          <View style={styles.labelRow}>
            <Text style={styles.signLabel}>CAPITÃO A:</Text>
            <Text style={styles.signValueText}>{signatures?.captainA?.name || ''}</Text>
          </View>
          <View style={styles.signUnderline} />
        </View>

        {/* Técnico A */}
        <View style={styles.signRow}>
          <View style={styles.labelRow}>
            <Text style={styles.signLabel}>TÉCNICO A:</Text>
            <Text style={styles.signValueText}>{signatures?.coachA?.name || ''}</Text>
          </View>
          <View style={styles.signUnderline} />
        </View>

        {/* Capitão B */}
        <View style={styles.signRow}>
          <View style={styles.labelRow}>
            <Text style={styles.signLabel}>CAPITÃO B:</Text>
            <Text style={styles.signValueText}>{signatures?.captainB?.name || ''}</Text>
          </View>
          <View style={styles.signUnderline} />
        </View>

        {/* Técnico B */}
        <View style={[styles.signRow, { borderBottomWidth: 0 }]}>
          <View style={styles.labelRow}>
            <Text style={styles.signLabel}>TÉCNICO B:</Text>
            <Text style={styles.signValueText}>{signatures?.coachB?.name || ''}</Text>
          </View>
          <View style={styles.signUnderline} />
        </View>
      </View>
    </View>
  );
};
