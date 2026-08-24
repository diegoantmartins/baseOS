// =====================================================================
// BaseOS Component - Quadro de Sanções (110pt Exatos no Rodapé)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { SanctionEntry } from '../types/officials';
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
  rowHeader: {
    height: 12,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
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
    fontSize: 4.0,
  },
  colSubText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 2.8,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  rowsBlock: {
    height: 36,
    flexDirection: 'column',
  },
  row: {
    height: 9,
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
  },
  improperRow: {
    height: 12,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderTopWidth: BASEOS_TOKENS.borders.THIN,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  improperText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
  },
  footerNote: {
    height: 40,
    padding: 2,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    justifyContent: 'center',
  },
  footerNoteText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.0,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
    lineHeight: 1.15,
  },
});

interface BaseosSanctionsProps {
  sanctions: SanctionEntry[];
  improperRequests?: { teamA: boolean; teamB: boolean };
}

export const BaseosSanctions: React.FC<BaseosSanctionsProps> = ({
  sanctions,
  improperRequests,
}) => {
  const rows = Array.from({ length: 4 }, (_, i) => sanctions[i]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>SANÇÕES</Text>
      </View>

      <View style={styles.rowHeader}>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={styles.colText}>A</Text>
          <Text style={styles.colSubText}>(Adv)</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={styles.colText}>P</Text>
          <Text style={styles.colSubText}>(Pen)</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={styles.colText}>E</Text>
          <Text style={styles.colSubText}>(Exp)</Text>
        </View>
        <View style={[styles.col, { width: 12 }]}>
          <Text style={styles.colText}>D</Text>
          <Text style={styles.colSubText}>(Desq)</Text>
        </View>
        <View style={[styles.col, { flex: 1 }]}>
          <Text style={styles.colText}>EQUIPE</Text>
        </View>
        <View style={[styles.col, { width: 16 }]}>
          <Text style={styles.colText}>SET</Text>
        </View>
        <View style={[styles.col, { width: 24, borderRightWidth: 0 }]}>
          <Text style={styles.colText}>PLACAR</Text>
        </View>
      </View>

      <View style={styles.rowsBlock}>
        {rows.map((s, idx) => (
          <View key={`sanc-${idx}`} style={styles.row}>
            <View style={[styles.col, { width: 12 }]}>
              <Text style={styles.colText}>{s?.typeCode === 'A' ? 'X' : ''}</Text>
            </View>
            <View style={[styles.col, { width: 12 }]}>
              <Text style={styles.colText}>{s?.typeCode === 'P' ? 'X' : ''}</Text>
            </View>
            <View style={[styles.col, { width: 12 }]}>
              <Text style={styles.colText}>{s?.typeCode === 'E' ? 'X' : ''}</Text>
            </View>
            <View style={[styles.col, { width: 12 }]}>
              <Text style={styles.colText}>{s?.typeCode === 'D' ? 'X' : ''}</Text>
            </View>
            <View style={[styles.col, { flex: 1, alignItems: 'flex-start', paddingLeft: 2 }]}>
              <Text style={styles.colText}>{s?.teamName || ''}</Text>
            </View>
            <View style={[styles.col, { width: 16 }]}>
              <Text style={styles.colText}>{s ? String(s.setNumber) : ''}</Text>
            </View>
            <View style={[styles.col, { width: 24, borderRightWidth: 0 }]}>
              <Text style={styles.colText}>{s?.scoreAtSanction || ''}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.improperRow}>
        <Text style={styles.improperText}>
          SOLICITAÇÕES INDEVIDAS: EQ (A) [{improperRequests?.teamA ? 'X' : ' '}]
        </Text>
        <Text style={styles.improperText}>
          EQ (B) [{improperRequests?.teamB ? 'X' : ' '}]
        </Text>
      </View>

      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText}>
          Para assinalar uma sanção: escrever a abreviação (Nº do jogador, T=Técnico, AT=Assistente Técnico, PF=Preparador Físico e M=Médico) ou R para Retardamento na coluna apropriada e indicar a equipe, o set e o placar no momento da sanção.
        </Text>
      </View>
    </View>
  );
};
