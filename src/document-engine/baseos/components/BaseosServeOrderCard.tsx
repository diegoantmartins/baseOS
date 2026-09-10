// =====================================================================
// BaseOS Component - Filipeta Individual da Ordem de Saque
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ServeOrderCardData } from '../types/serveOrder';
import { BASEOS_TOKENS } from '../theme/tokens';

const styles = StyleSheet.create({
  card: {
    width: '24.2%',
    height: 258,
    borderWidth: BASEOS_TOKENS.borders.REGULAR,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 4,
  },
  // --- Micro-Cabeçalho ---
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: '#D1D5DB',
    paddingBottom: 2,
    marginBottom: 2,
  },
  cardBrand: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: '#000000',
    letterSpacing: 0.3,
  },
  cardBrandAccent: {
    color: '#F59E0B',
  },
  cardTypeLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  metaRight: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: '#111827',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderColor: '#E2E8F0',
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginBottom: 2,
  },
  teamPrefix: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6,
    color: '#64748B',
    marginRight: 2,
  },
  teamName: {
    flex: 1,
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.5,
    color: '#000000',
    textTransform: 'uppercase',
  },
  setAndServeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingBottom: 2,
    marginBottom: 3,
  },
  setBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    backgroundColor: '#000000',
    borderRadius: 1,
  },
  setBadgeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  reserveBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  reserveBadgeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.5,
    color: '#334155',
    textTransform: 'uppercase',
  },
  serveBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  serveLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6,
    color: '#000000',
  },
  serveCheckbox: {
    width: 10,
    height: 10,
    borderWidth: BASEOS_TOKENS.borders.REGULAR,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },

  // --- Grade de Rotação (I a VI) ---
  gridContainer: {
    flex: 1,
    flexDirection: 'column',
    borderWidth: BASEOS_TOKENS.borders.REGULAR,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    marginVertical: 2,
  },
  netBanner: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netBannerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5,
    color: '#475569',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridRowBorderBottom: {
    borderBottomWidth: BASEOS_TOKENS.borders.REGULAR,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },
  cell: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  cellBorderRight: {
    borderRightWidth: BASEOS_TOKENS.borders.REGULAR,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  cellHeader: {
    height: 13,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellHeaderHighlight: {
    backgroundColor: '#FEF3C7', // Suave destaque para posição I (saque)
  },
  cellNumeral: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 8,
    color: '#000000',
  },
  cellNumeralHighlight: {
    color: '#B45309',
  },
  cellBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  handwritingGuide: {
    width: '80%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 20,
  },

  // --- Linha de Controle Operacional (Líberos e Capitão) ---
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: BASEOS_TOKENS.borders.THIN,
    borderColor: '#000000',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginVertical: 2,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  controlLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6,
    color: '#334155',
  },
  controlBox: {
    width: 18,
    height: 11,
    borderWidth: BASEOS_TOKENS.borders.THIN,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlValue: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7,
    color: '#000000',
  },

  // --- Rodapé da Filipeta ---
  footerSection: {
    borderTopWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderTopColor: '#94A3B8',
    paddingTop: 2,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  coachLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: '#475569',
    marginRight: 2,
  },
  coachNameText: {
    flex: 1,
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6,
    color: '#000000',
    textTransform: 'uppercase',
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 12,
  },
  signatureLabel: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5,
    color: '#64748B',
    marginRight: 2,
    marginBottom: 1,
  },
  signatureLine: {
    flex: 1,
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: '#000000',
    height: 8,
  },
});

interface Props {
  card: ServeOrderCardData;
}

export const BaseosServeOrderCard: React.FC<Props> = ({ card }) => {
  const isOfficial = card.cardType === 'official-set';
  const setDisplay = isOfficial
    ? card.isDecidingSet
      ? `SET ${card.setNumber} — DECISIVO`
      : `SET ${card.setNumber}`
    : 'FICHA DE RESERVA';

  const libero1 = card.libero1Jersey !== undefined ? String(card.libero1Jersey) : '';
  const libero2 = card.libero2Jersey !== undefined ? String(card.libero2Jersey) : '';
  const captain = card.captainJersey !== undefined ? String(card.captainJersey) : '';

  return (
    <View style={styles.card}>
      {/* 1. Micro-Cabeçalho */}
      <View>
        <View style={styles.headerTopRow}>
          <Text style={styles.cardBrand}>
            BASE<Text style={styles.cardBrandAccent}>OS</Text>{' '}
            <Text style={styles.cardTypeLabel}>· FICHA DE POSIÇÃO</Text>
          </Text>
          <Text style={styles.metaRight}>
            LADO: [{card.teamSide}] {card.matchNumber ? `· JOGO ${card.matchNumber}` : ''}
          </Text>
        </View>

        <View style={styles.teamRow}>
          <Text style={styles.teamPrefix}>EQUIPE:</Text>
          <Text style={styles.teamName}>
            {card.teamName || '_____________________'}
          </Text>
        </View>

        <View style={styles.setAndServeRow}>
          <View style={isOfficial ? styles.setBadge : styles.reserveBadge}>
            <Text style={isOfficial ? styles.setBadgeText : styles.reserveBadgeText}>
              {setDisplay}
            </Text>
          </View>
          <View style={styles.serveBoxContainer}>
            <Text style={styles.serveLabel}>SAQUE:</Text>
            <View style={styles.serveCheckbox} />
          </View>
        </View>
      </View>

      {/* 2. Grade Oficial de Rotação (I a VI) */}
      <View style={styles.gridContainer}>
        <View style={styles.netBanner}>
          <Text style={styles.netBannerText}>--- REDE (ATAQUE) ---</Text>
        </View>

        {/* Linha Superior (Ataque): IV, III, II */}
        <View style={[styles.gridRow, styles.gridRowBorderBottom]}>
          <View style={[styles.cell, styles.cellBorderRight]}>
            <View style={styles.cellHeader}>
              <Text style={styles.cellNumeral}>IV</Text>
            </View>
            <View style={styles.cellBody}>
              <View style={styles.handwritingGuide} />
            </View>
          </View>

          <View style={[styles.cell, styles.cellBorderRight]}>
            <View style={styles.cellHeader}>
              <Text style={styles.cellNumeral}>III</Text>
            </View>
            <View style={styles.cellBody}>
              <View style={styles.handwritingGuide} />
            </View>
          </View>

          <View style={styles.cell}>
            <View style={styles.cellHeader}>
              <Text style={styles.cellNumeral}>II</Text>
            </View>
            <View style={styles.cellBody}>
              <View style={styles.handwritingGuide} />
            </View>
          </View>
        </View>

        {/* Linha Inferior (Fundo/Defesa): V, VI, I */}
        <View style={styles.gridRow}>
          <View style={[styles.cell, styles.cellBorderRight]}>
            <View style={styles.cellHeader}>
              <Text style={styles.cellNumeral}>V</Text>
            </View>
            <View style={styles.cellBody}>
              <View style={styles.handwritingGuide} />
            </View>
          </View>

          <View style={[styles.cell, styles.cellBorderRight]}>
            <View style={styles.cellHeader}>
              <Text style={styles.cellNumeral}>VI</Text>
            </View>
            <View style={styles.cellBody}>
              <View style={styles.handwritingGuide} />
            </View>
          </View>

          <View style={styles.cell}>
            <View style={[styles.cellHeader, styles.cellHeaderHighlight]}>
              <Text style={[styles.cellNumeral, styles.cellNumeralHighlight]}>I (S)</Text>
            </View>
            <View style={styles.cellBody}>
              <View style={styles.handwritingGuide} />
            </View>
          </View>
        </View>
      </View>

      {/* 3. Linha de Controle Operacional (Líberos e Capitão) */}
      <View style={styles.controlRow}>
        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>L1:</Text>
          <View style={styles.controlBox}>
            <Text style={styles.controlValue}>{libero1}</Text>
          </View>
        </View>

        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>L2:</Text>
          <View style={styles.controlBox}>
            <Text style={styles.controlValue}>{libero2}</Text>
          </View>
        </View>

        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>CAP:</Text>
          <View style={styles.controlBox}>
            <Text style={styles.controlValue}>{captain}</Text>
          </View>
        </View>
      </View>

      {/* 4. Rodapé e Assinatura */}
      <View style={styles.footerSection}>
        <View style={styles.coachRow}>
          <Text style={styles.coachLabel}>Técnico:</Text>
          <Text style={styles.coachNameText}>
            {card.coachName || '____________________________'}
          </Text>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureLabel}>Assinatura:</Text>
          <View style={styles.signatureLine} />
        </View>
      </View>
    </View>
  );
};
