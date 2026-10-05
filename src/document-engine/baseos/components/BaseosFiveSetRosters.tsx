// =====================================================================
// BaseOS Component - Elenco Oficial da Súmula 5 Sets Oficial (CBV / FIVB)
// Dimensões SSOT: 309.89 x 271 pt (2 Colunas Paralelas Equipe A e Equipe B)
// Posicionado ao longo das Linhas 3 e 4 (ao lado de Set 5 e Resultados)
// Elenco Completo (14 Atletas), Líberos, Comissão Técnica e Assinaturas
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosTeamData } from '../types/team';
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

  // 1. Header principal: 13pt
  headerRow: {
    height: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 3,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  teamCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCircleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  teamNameSlot: {
    flex: 1,
    height: 10,
    borderWidth: 0.5,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    marginHorizontal: 3,
  },
  teamNameSlotText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.2,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  headerCenterTitle: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.2,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.6,
  },

  // 2. Subheader colunas: 9pt
  subheaderRow: {
    height: 9,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'row',
  },
  teamHalf: {
    flex: 1,
    flexDirection: 'row',
  },
  teamHalfDivider: {
    borderRightWidth: 0.8,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  numHeaderCell: {
    width: 15,
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
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 3. Linhas de Atletas regulares (14 linhas x 11.05pt)
  contentRow: {
    height: 11.05,
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    flexDirection: 'row',
  },
  numCell: {
    width: 15,
    borderRightWidth: 0.5,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  numText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  nameCell: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 2,
  },
  nameText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 5.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 4. Banners de Seção: 8pt
  sectionBanner: {
    height: 8,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderTopWidth: 0.6,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBannerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
  },

  // 5. Linhas de Líberos e Staff: 9.5pt
  specialRow: {
    height: 9.5,
    flexDirection: 'row',
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  roleBadgeCell: {
    width: 15,
    borderRightWidth: 0.5,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  roleBadgeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // 6. Bloco de Assinaturas: 32pt (banner 8pt + 2 linhas de 12pt)
  signaturesContainer: {
    height: 32,
    flexDirection: 'column',
    borderTopWidth: 0.8,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
  },
  signBanner: {
    height: 8,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.5,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signBannerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.5,
  },
  signRow: {
    height: 12,
    flexDirection: 'row',
    borderBottomWidth: 0.35,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  signHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  signLabelText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  signLine: {
    flex: 1,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    marginLeft: 4,
    height: 1,
  },
  signValueText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
    marginLeft: 4,
  },
});

export interface BaseosFiveSetRostersProps {
  teamA: BaseosTeamData;
  teamB: BaseosTeamData;
  signatures?: BaseosSignaturesData;
  height?: number;
}

export const BaseosFiveSetRosters: React.FC<BaseosFiveSetRostersProps> = ({
  teamA,
  teamB,
  signatures,
}) => {
  const athletesA = teamA.athletes || [];
  const athletesB = teamB.athletes || [];

  const liberosA = teamA.liberos || [];
  const liberosB = teamB.liberos || [];

  const staffA = teamA.staff || [];
  const staffB = teamB.staff || [];

  const regularSlots = Array.from({ length: 14 }, (_, i) => i);

  return (
    <View style={styles.container}>
      {/* 1. Header: (A) EQUIPE A | EQUIPES | EQUIPE B (B) */}
      <View style={styles.headerRow}>
        <View style={styles.teamCircle}>
          <Text style={styles.teamCircleText}>A</Text>
        </View>
        <View style={styles.teamNameSlot}>
          <Text style={styles.teamNameSlotText}>
            {teamA.name}
          </Text>
        </View>
        <View style={styles.headerCenterTitle}>
          <Text style={styles.headerCenterText}>EQUIPES</Text>
        </View>
        <View style={styles.teamNameSlot}>
          <Text style={styles.teamNameSlotText}>
            {teamB.name}
          </Text>
        </View>
        <View style={styles.teamCircle}>
          <Text style={styles.teamCircleText}>B</Text>
        </View>
      </View>

      {/* 2. Subheader colunas: Nº / NOME DO JOGADOR */}
      <View style={styles.subheaderRow}>
        <View style={[styles.teamHalf, styles.teamHalfDivider]}>
          <View style={styles.numHeaderCell}>
            <Text style={styles.headerLabelText}>Nº</Text>
          </View>
          <View style={styles.nameHeaderCell}>
            <Text style={styles.headerLabelText}>NOME DO JOGADOR</Text>
          </View>
        </View>
        <View style={styles.teamHalf}>
          <View style={styles.numHeaderCell}>
            <Text style={styles.headerLabelText}>Nº</Text>
          </View>
          <View style={styles.nameHeaderCell}>
            <Text style={styles.headerLabelText}>NOME DO JOGADOR</Text>
          </View>
        </View>
      </View>

      {/* 3. Atletas regulares (14 linhas completas) */}
      {regularSlots.map((idx) => {
        const aA = athletesA[idx];
        const aB = athletesB[idx];
        return (
          <View key={idx} style={styles.contentRow}>
            {/* Lado A */}
            <View style={[styles.teamHalf, styles.teamHalfDivider]}>
              <View style={styles.numCell}>
                <Text style={styles.numText}>{aA?.jerseyNumber != null ? String(aA.jerseyNumber) : ''}</Text>
              </View>
              <View style={styles.nameCell}>
                <Text style={styles.nameText}>
                  {aA ? (aA.isCaptain ? `${aA.name} (C)` : aA.name) : ''}
                </Text>
              </View>
            </View>

            {/* Lado B */}
            <View style={styles.teamHalf}>
              <View style={styles.numCell}>
                <Text style={styles.numText}>{aB?.jerseyNumber != null ? String(aB.jerseyNumber) : ''}</Text>
              </View>
              <View style={styles.nameCell}>
                <Text style={styles.nameText}>
                  {aB ? (aB.isCaptain ? `${aB.name} (C)` : aB.name) : ''}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* 4. Banner Líberos */}
      <View style={styles.sectionBanner}>
        <Text style={styles.sectionBannerText}>JOGADORES LÍBEROS ("L")</Text>
      </View>

      {/* Linha Líbero 1 */}
      <View style={styles.specialRow}>
        <View style={[styles.teamHalf, styles.teamHalfDivider]}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>L</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {liberosA[0] ? `${liberosA[0].jerseyNumber != null ? `#${liberosA[0].jerseyNumber} ` : ''}${liberosA[0].name}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.teamHalf}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>L</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {liberosB[0] ? `${liberosB[0].jerseyNumber != null ? `#${liberosB[0].jerseyNumber} ` : ''}${liberosB[0].name}` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Linha Líbero 2 */}
      <View style={styles.specialRow}>
        <View style={[styles.teamHalf, styles.teamHalfDivider]}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>L</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {liberosA[1] ? `${liberosA[1].jerseyNumber != null ? `#${liberosA[1].jerseyNumber} ` : ''}${liberosA[1].name}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.teamHalf}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>L</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {liberosB[1] ? `${liberosB[1].jerseyNumber != null ? `#${liberosB[1].jerseyNumber} ` : ''}${liberosB[1].name}` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* 5. Banner Comissão Técnica */}
      <View style={styles.sectionBanner}>
        <Text style={styles.sectionBannerText}>COMISSÃO TÉCNICA</Text>
      </View>

      {/* Staff: Técnico */}
      <View style={styles.specialRow}>
        <View style={[styles.teamHalf, styles.teamHalfDivider]}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>T</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {staffA.find((s) => s.roleCode === 'T')?.name || ''}
            </Text>
          </View>
        </View>
        <View style={styles.teamHalf}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>T</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {staffB.find((s) => s.roleCode === 'T')?.name || ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Staff: Assistente Técnico */}
      <View style={styles.specialRow}>
        <View style={[styles.teamHalf, styles.teamHalfDivider]}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>AT</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {staffA.find((s) => s.roleCode === 'AT1' || (s.roleCode as string) === 'AT')?.name || ''}
            </Text>
          </View>
        </View>
        <View style={styles.teamHalf}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>AT</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {staffB.find((s) => s.roleCode === 'AT1' || (s.roleCode as string) === 'AT')?.name || ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Staff: Prep. Físico / Médico */}
      <View style={styles.specialRow}>
        <View style={[styles.teamHalf, styles.teamHalfDivider]}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>PF</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {staffA.find((s) => s.roleCode === 'PF' || s.roleCode === 'M/F')?.name || ''}
            </Text>
          </View>
        </View>
        <View style={styles.teamHalf}>
          <View style={styles.roleBadgeCell}>
            <Text style={styles.roleBadgeText}>PF</Text>
          </View>
          <View style={styles.nameCell}>
            <Text style={styles.nameText}>
              {staffB.find((s) => s.roleCode === 'PF' || s.roleCode === 'M/F')?.name || ''}
            </Text>
          </View>
        </View>
      </View>

      {/* 6. Bloco de Assinaturas */}
      <View style={styles.signaturesContainer}>
        <View style={styles.signBanner}>
          <Text style={styles.signBannerText}>ASSINATURAS</Text>
        </View>
        <View style={styles.signRow}>
          <View style={[styles.signHalf, styles.teamHalfDivider]}>
            <Text style={styles.signLabelText}>CAPITÃO A:</Text>
            {signatures?.captainA?.name ? (
              <Text style={styles.signValueText}>{signatures.captainA.name}</Text>
            ) : (
              <View style={styles.signLine} />
            )}
          </View>
          <View style={styles.signHalf}>
            <Text style={styles.signLabelText}>CAPITÃO B:</Text>
            {signatures?.captainB?.name ? (
              <Text style={styles.signValueText}>{signatures.captainB.name}</Text>
            ) : (
              <View style={styles.signLine} />
            )}
          </View>
        </View>
        <View style={[styles.signRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.signHalf, styles.teamHalfDivider]}>
            <Text style={styles.signLabelText}>TÉCNICO A:</Text>
            {signatures?.coachA?.name ? (
              <Text style={styles.signValueText}>{signatures.coachA.name}</Text>
            ) : (
              <View style={styles.signLine} />
            )}
          </View>
          <View style={styles.signHalf}>
            <Text style={styles.signLabelText}>TÉCNICO B:</Text>
            {signatures?.coachB?.name ? (
              <Text style={styles.signValueText}>{signatures.coachB.name}</Text>
            ) : (
              <View style={styles.signLine} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
