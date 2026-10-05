// =====================================================================
// BaseOS Component - Elenco Oficial da Súmula 3 Sets Oficial
// Dimensões SSOT: 323.89 x 248 pt (2 Colunas Paralelas Equipe A e Equipe B)
// Posicionado ao lado dos Sets 1 e 2 apenas
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
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
  
  // Header row: 15pt
  headerRow: {
    height: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 3,
  },
  teamCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCircleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  stackedCircles: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginHorizontal: 2,
    gap: 0.5,
  },
  miniCircle: {
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
    borderWidth: 0.5,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCircleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  teamNameSlot: {
    flex: 1,
    height: 11,
    borderWidth: 0.5,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  teamNameSlotText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.2,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  headerCenterTitle: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.5,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
  },

  // Subheader row: 10pt
  subheaderRow: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
  },
  numHeaderCell: {
    width: 14,
    borderRightWidth: 0.5,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabelText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // Meio Time (coluna A ou B): 50% cada
  teamHalf: {
    flex: 1,
    flexDirection: 'row',
  },
  teamHalfDivider: {
    borderRightWidth: 1.2,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },

  // Linhas de Conteúdo (Atletas: 10.4pt cada)
  contentRow: {
    height: 10.4,
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    flexDirection: 'row',
  },
  numCell: {
    width: 14,
    borderRightWidth: 0.5,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  numText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  nameCell: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 3,
  },
  nameText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // Banners de Seção: 10pt
  sectionBanner: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderTopWidth: 0.8,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBannerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
  },

  // Linhas Especiais (Líberos: 10.4pt, Staff: 8.5pt)
  specialRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  roleCell: {
    width: 14,
    borderRightWidth: 0.5,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  roleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

export interface BaseosThreeSetRostersProps {
  teamA?: BaseosTeamData;
  teamB?: BaseosTeamData;
  height?: number;
}

const STAFF_ROLES = [
  { code: 'T', label: 'Técnico' },
  { code: 'AT', label: 'Assistente Técnico' },
  { code: 'PF', label: 'Prep. Físico' },
  { code: 'M', label: 'Médico' },
];

export const BaseosThreeSetRosters: React.FC<BaseosThreeSetRostersProps> = ({
  teamA,
  teamB,
}) => {
  const athletesA = teamA?.athletes?.filter((a) => !a.isLibero) || [];
  const athletesB = teamB?.athletes?.filter((a) => !a.isLibero) || [];
  const liberosA = teamA?.athletes?.filter((a) => a.isLibero) || [];
  const liberosB = teamB?.athletes?.filter((a) => a.isLibero) || [];
  const staffA = teamA?.staff || [];
  const staffB = teamB?.staff || [];

  return (
    <View style={styles.container}>
      {/* 1. Header: EQUIPES */}
      <View style={styles.headerRow}>
        <View style={styles.teamCircle}>
          <Text style={styles.teamCircleText}>A</Text>
        </View>
        <View style={styles.stackedCircles}>
          <View style={styles.miniCircle}><Text style={styles.miniCircleText}>A</Text></View>
          <View style={styles.miniCircle}><Text style={styles.miniCircleText}>B</Text></View>
        </View>
        <View style={styles.teamNameSlot}>
          <Text style={styles.teamNameSlotText}>{teamA?.name || ''}</Text>
        </View>

        <View style={styles.headerCenterTitle}>
          <Text style={styles.headerCenterText}>EQUIPES</Text>
        </View>

        <View style={styles.teamNameSlot}>
          <Text style={styles.teamNameSlotText}>{teamB?.name || ''}</Text>
        </View>
        <View style={styles.stackedCircles}>
          <View style={styles.miniCircle}><Text style={styles.miniCircleText}>A</Text></View>
          <View style={styles.miniCircle}><Text style={styles.miniCircleText}>B</Text></View>
        </View>
        <View style={styles.teamCircle}>
          <Text style={styles.teamCircleText}>B</Text>
        </View>
      </View>

      {/* 2. Subheader: Nº / NOME */}
      <View style={styles.subheaderRow}>
        <View style={[styles.teamHalf, styles.teamHalfDivider]}>
          <View style={styles.numHeaderCell}><Text style={styles.headerLabelText}>Nº</Text></View>
          <View style={styles.nameHeaderCell}><Text style={styles.headerLabelText}>NOME DO JOGADOR</Text></View>
        </View>
        <View style={styles.teamHalf}>
          <View style={styles.numHeaderCell}><Text style={styles.headerLabelText}>Nº</Text></View>
          <View style={styles.nameHeaderCell}><Text style={styles.headerLabelText}>NOME DO JOGADOR</Text></View>
        </View>
      </View>

      {/* 3. 14 Linhas de Atletas */}
      {Array.from({ length: 14 }).map((_, idx) => {
        const pA = athletesA[idx];
        const pB = athletesB[idx];
        return (
          <View key={idx} style={styles.contentRow}>
            <View style={[styles.teamHalf, styles.teamHalfDivider]}>
              <View style={styles.numCell}>
                <Text style={styles.numText}>
                  {pA?.jerseyNumber !== undefined ? String(pA.jerseyNumber) : ''}
                </Text>
              </View>
              <View style={styles.nameCell}>
                <Text style={styles.nameText}>
                  {pA ? `${pA.name}${pA.isCaptain ? ' (C)' : ''}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.teamHalf}>
              <View style={styles.numCell}>
                <Text style={styles.numText}>
                  {pB?.jerseyNumber !== undefined ? String(pB.jerseyNumber) : ''}
                </Text>
              </View>
              <View style={styles.nameCell}>
                <Text style={styles.nameText}>
                  {pB ? `${pB.name}${pB.isCaptain ? ' (C)' : ''}` : ''}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* 4. Banner Líberos */}
      <View style={styles.sectionBanner}>
        <Text style={styles.sectionBannerText}>JOGADORES LIBEROS ("L")</Text>
      </View>

      {/* 5. 2 Linhas de Líberos */}
      {Array.from({ length: 2 }).map((_, idx) => {
        const lA = liberosA[idx];
        const lB = liberosB[idx];
        return (
          <View key={idx} style={[styles.specialRow, { height: 10.4 }]}>
            <View style={[styles.teamHalf, styles.teamHalfDivider]}>
              <View style={styles.numCell}>
                <Text style={styles.numText}>
                  {lA?.jerseyNumber !== undefined ? String(lA.jerseyNumber) : ''}
                </Text>
              </View>
              <View style={styles.nameCell}>
                <Text style={styles.nameText}>{lA?.name || ''}</Text>
              </View>
            </View>
            <View style={styles.teamHalf}>
              <View style={styles.numCell}>
                <Text style={styles.numText}>
                  {lB?.jerseyNumber !== undefined ? String(lB.jerseyNumber) : ''}
                </Text>
              </View>
              <View style={styles.nameCell}>
                <Text style={styles.nameText}>{lB?.name || ''}</Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* 6. Banner Comissão Técnica */}
      <View style={styles.sectionBanner}>
        <Text style={styles.sectionBannerText}>COMISSÃO TÉCNICA</Text>
      </View>

      {/* 7. 4 Linhas de Comissão Técnica */}
      {STAFF_ROLES.map((role, idx) => {
        const sA = staffA.find((s) => s.roleCode === role.code) || staffA[idx];
        const sB = staffB.find((s) => s.roleCode === role.code) || staffB[idx];
        return (
          <View key={role.code} style={[styles.specialRow, { height: 8.5 }]}>
            <View style={[styles.teamHalf, styles.teamHalfDivider]}>
              <View style={styles.roleCell}>
                <Text style={styles.roleText}>{role.code}</Text>
              </View>
              <View style={styles.nameCell}>
                <Text style={styles.nameText}>{sA?.name || ''}</Text>
              </View>
            </View>
            <View style={styles.teamHalf}>
              <View style={styles.roleCell}>
                <Text style={styles.roleText}>{role.code}</Text>
              </View>
              <View style={styles.nameCell}>
                <Text style={styles.nameText}>{sB?.name || ''}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};
