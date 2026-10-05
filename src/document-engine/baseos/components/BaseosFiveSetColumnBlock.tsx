// =====================================================================
// BaseOS Component - Bloco de Set de 5 Sets (Oficial CBV / FIVB)
// Sets 1-4 (Padrão 1–48) e Set 5 (Tie-break Canônico com Troca de Lado)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosSetData, SubstitutionEntry } from '../types/set';
import type { BaseosTeamData } from '../types/team';
import { BASEOS_TOKENS } from '../theme/tokens';
import { ROTATION_POSITIONS } from '../domain/rotation.rules';

interface SubPositionInfo {
  jerseyNumber?: number | string;
  scoreAtSub?: { team?: number | string; opponent?: number | string } | string;
  playerInJersey?: number | string;
}

// Constantes SSOT de Alturas de Linha para Sets 1 a 4 (Total: 118 pt)
const FIVE_SET_1_4_HEIGHTS = {
  headerBar: 14,      // Horário de Início / Equipe
  rotHeader: 10,      // Ordem de Saque / I..VI
  starter: 13,        // Jogadores Iniciantes / Starter player
  subPlayer: 13,      // Substituições - Nº Jogador / Sub player
  subScore1: 11,      // Placar na Troca 1 / :
  subScore2: 11,      // Placar na Troca 2 / :
  subScoreTotal: 22,  // Sidebar Placar na Troca (subScore1 + subScore2)
  saqueRow: 11.5,     // 4 rodadas de saques = 46 pt (1º..4º e 5º..8º)
  total: 118,         // 14 + 10 + 13 + 13 + 11 + 11 + 46 = 118 pt
};

// Constantes SSOT de Alturas de Linha para Set 5 Tie-Break (Total: 126 pt)
const FIVE_SET_5_HEIGHTS = {
  headerBar: 14,      // Horário de Início / Equipe
  rotHeader: 10,      // Ordem de Saque / I..VI
  starter: 14,        // Jogadores Iniciantes / Starter player
  subPlayer: 14,      // Substituições - Nº Jogador / Sub player
  subScore1: 12,      // Placar na Troca 1 / :
  subScore2: 12,      // Placar na Troca 2 / :
  subScoreTotal: 24,  // Sidebar Placar na Troca (subScore1 + subScore2)
  saqueRow1: 16.5,    // 1º | 4º
  saqueRow2: 16.5,    // 2º | 5º
  saqueRow3: 17.0,    // 3º | 6º
  saqueTotal: 50,     // 16.5 + 16.5 + 17.0 = 50 pt
  total: 126,         // 14 + 10 + 14 + 14 + 12 + 12 + 50 = 126 pt
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'row',
    borderWidth: 1.0,
    borderColor: BASEOS_TOKENS.colors.BLACK,
  },

  // -------------------------------------------------------------------
  // 1. Sidebar de Ordem de Saque / Formação de Equipe
  // -------------------------------------------------------------------
  sidebar: {
    width: 44,
    flexDirection: 'column',
  },
  sidebarTopSpacer: {
    width: '100%',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  sidebarMain: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: 1.0,
    borderRightWidth: 1.0,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  sidebarVerticalTitle: {
    width: 8,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderRightWidth: 0.6,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarVerticalText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
    transform: 'rotate(-90deg)',
    width: 85,
    textAlign: 'center',
  },
  sidebarContent: {
    flex: 1,
    flexDirection: 'column',
  },
  sidebarHeaderCell: {
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.8,
    color: BASEOS_TOKENS.colors.BLACK,
    textAlign: 'center',
  },
  sidebarStartersCell: {
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  sidebarSubsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },
  sidebarSubsVerticalLabel: {
    width: 7,
    borderRightWidth: 0.5,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarSubsVerticalText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.4,
    color: BASEOS_TOKENS.colors.BLACK,
    transform: 'rotate(-90deg)',
    width: 36,
    textAlign: 'center',
  },
  sidebarSubsCol: {
    flex: 1,
    flexDirection: 'column',
  },
  sidebarSubPlayerCell: {
    borderBottomWidth: 0.5,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarSubPlayerText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
    textAlign: 'center',
  },
  sidebarSubScoreCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  sidebarSubScoreText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.3,
    color: BASEOS_TOKENS.colors.BLACK,
    textAlign: 'center',
  },
  sidebarSaquesContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarSaquesLabelCol: {
    width: 13,
    borderRightWidth: 0.5,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  sidebarSaquesLabelText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.BLACK,
    textAlign: 'center',
    lineHeight: 1.15,
  },
  sidebarSaquesRowsCol: {
    flex: 1,
    flexDirection: 'column',
  },
  sidebarSaqueRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
  },
  sidebarSaqueSubCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  sidebarSaqueNumText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // -------------------------------------------------------------------
  // 2. Banner Vertical do Set (S E T <n>)
  // -------------------------------------------------------------------
  setBanner: {
    width: 10,
    borderRightWidth: 1.0,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'column',
  },
  setBannerSlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBannerLetter: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // -------------------------------------------------------------------
  // 3. Seções das Equipes (Sets 1 a 4)
  // -------------------------------------------------------------------
  teamSection: {
    flex: 1,
    flexDirection: 'column',
  },
  teamHeaderBar: {
    height: 14,
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  timeBoxGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabelStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: 2,
  },
  timeLabelText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.BLACK,
    lineHeight: 1.05,
  },
  timeBoxOuter: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  timeBoxSlot: {
    width: 24,
    height: 8.5,
    borderWidth: 0.5,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  timeBoxValue: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  timeBoxHMinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 24,
    paddingHorizontal: 2,
    marginTop: 0.5,
  },
  timeBoxHMinText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  teamCodeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipeLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.BLACK,
    marginRight: 2,
  },
  threeSlotBox: {
    flexDirection: 'row',
    height: 8.5,
    width: 22,
    borderWidth: 0.6,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  slotCharCell: {
    flex: 1,
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCharText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  teamLetterCircle: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 0.7,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  teamLetterText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  stackedSRGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 1,
  },
  srCircleItem: {
    width: 5.2,
    height: 5.2,
    borderRadius: 2.6,
    borderWidth: 0.5,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0.5,
  },
  srCircleText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // -------------------------------------------------------------------
  // 4. Corpo da Equipe (Rotações + Pontos)
  // -------------------------------------------------------------------
  teamBodyRow: {
    flex: 1,
    flexDirection: 'row',
  },
  rotationGrid: {
    flex: 1,
    flexDirection: 'row',
  },
  rotationCol: {
    flex: 1,
    flexDirection: 'column',
    borderRightWidth: 0.6,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  rotationHeaderCell: {
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotationHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  starterCell: {
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterPlayerNum: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  subPlayerCell: {
    borderBottomWidth: 0.5,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPlayerNum: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  subScoreRow: {
    borderBottomWidth: 0.5,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subScoreText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  saquesGroup: {
    flex: 1,
    flexDirection: 'column',
  },
  saqueCell: {
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saqueSubCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.4,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  saqueNumItem: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // -------------------------------------------------------------------
  // 5. Régua de Pontos (Sets 1 a 4: 1–48)
  // -------------------------------------------------------------------
  pointsRulerContainer: {
    width: 32,
    borderLeftWidth: 0.8,
    borderLeftColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  pointsHeaderCell: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.6,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.8,
    color: BASEOS_TOKENS.colors.BLACK,
    letterSpacing: 0.4,
  },
  pointsGrid48: {
    flex: 1,
    flexDirection: 'column',
  },
  pointRow48: {
    flex: 1,
    flexDirection: 'row',
  },
  pointCell48: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.3,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    borderBottomWidth: 0.3,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  pointNum48: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  markedPointCircle48: {
    width: 4.8,
    height: 4.8,
    borderRadius: 2.4,
    borderWidth: 0.5,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeoutContainer: {
    height: 20,
    borderTopWidth: 0.8,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
  },
  timeoutHeaderCell: {
    height: 6.5,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeoutHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  timeoutSlotRow: {
    flex: 1,
    borderBottomWidth: 0.4,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeoutSlotText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },

  // -------------------------------------------------------------------
  // 6. Set 5 (Tie-break Canônico Oficial)
  // -------------------------------------------------------------------
  tbBlock1: {
    width: 135,
    flexDirection: 'column',
    borderRightWidth: 1.0,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  tbBlock2: {
    width: 152,
    flexDirection: 'column',
    borderRightWidth: 1.0,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  tbTrocaDivider: {
    width: 10,
    borderRightWidth: 1.0,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbTrocaVerticalText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
    transform: 'rotate(-90deg)',
    width: 90,
    textAlign: 'center',
  },
  tbBlock3: {
    flex: 1,
    flexDirection: 'column',
  },
  singlePointsColContainer: {
    width: 15,
    borderLeftWidth: 0.8,
    borderLeftColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
  },
  singlePointCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.3,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  singlePointText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.6,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  triplePointsColContainer: {
    width: 26,
    borderLeftWidth: 0.8,
    borderLeftColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
  },
  triplePointRow: {
    flex: 1,
    flexDirection: 'row',
  },
  triplePointCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.3,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    borderBottomWidth: 0.3,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  pontosNaTrocaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pontosNaTrocaLabel: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.BLACK,
    marginRight: 2,
  },
  pontosNaTrocaBox: {
    width: 14,
    height: 8.5,
    borderWidth: 0.6,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontosNaTrocaValue: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

export interface BaseosFiveSetColumnBlockProps {
  setData: BaseosSetData;
  teamA: BaseosTeamData;
  teamB: BaseosTeamData;
  height?: number;
}

export const BaseosFiveSetColumnBlock: React.FC<BaseosFiveSetColumnBlockProps> = ({
  setData,
  teamA,
  teamB,
}) => {
  const setNum = setData.setNumber;
  const isSet5 = setNum === 5;
  const isEvenSet = setNum % 2 === 0;

  // Em sets pares (Set 2, Set 4): Equipe B na esquerda, Equipe A na direita
  const leftTeam = isEvenSet ? teamB : teamA;
  const rightTeam = isEvenSet ? teamA : teamB;
  const leftTeamLetter = isEvenSet ? 'B' : 'A';
  const rightTeamLetter = isEvenSet ? 'A' : 'B';

  const leftRotation = isEvenSet ? setData.rotation?.teamB : setData.rotation?.teamA;
  const rightRotation = isEvenSet ? setData.rotation?.teamA : setData.rotation?.teamB;

  const leftPoints = isEvenSet ? setData.points?.teamB : setData.points?.teamA;
  const rightPoints = isEvenSet ? setData.points?.teamA : setData.points?.teamB;

  const leftMarkedSet = new Set(
    leftPoints?.points ? leftPoints.points.filter((p) => p.marked).map((p) => p.point) : [],
  );
  const rightMarkedSet = new Set(
    rightPoints?.points ? rightPoints.points.filter((p) => p.marked).map((p) => p.point) : [],
  );

  const isGenericLeft =
    !leftTeam.shortName ||
    leftTeam.shortName.startsWith('EQ') ||
    leftTeam.name.toUpperCase().startsWith('EQUIPE') ||
    leftTeam.name.toUpperCase().startsWith('TIME') ||
    leftTeam.id.startsWith('blank');
  const isGenericRight =
    !rightTeam.shortName ||
    rightTeam.shortName.startsWith('EQ') ||
    rightTeam.name.toUpperCase().startsWith('EQUIPE') ||
    rightTeam.name.toUpperCase().startsWith('TIME') ||
    rightTeam.id.startsWith('blank');

  const leftAcronym = isGenericLeft ? '' : (leftTeam.shortName || leftTeam.name || '').slice(0, 3).toUpperCase();
  const rightAcronym = isGenericRight ? '' : (rightTeam.shortName || rightTeam.name || '').slice(0, 3).toUpperCase();

  // Helper: caixa de 3 slots
  const render3SlotBox = (acronym: string) => (
    <View style={styles.threeSlotBox}>
      <View style={styles.slotCharCell}>
        <Text style={styles.slotCharText}>{acronym[0] || ''}</Text>
      </View>
      <View style={styles.slotCharCell}>
        <Text style={styles.slotCharText}>{acronym[1] || ''}</Text>
      </View>
      <View style={[styles.slotCharCell, { borderRightWidth: 0 }]}>
        <Text style={styles.slotCharText}>{acronym[2] || ''}</Text>
      </View>
    </View>
  );

  // Helper: horário de início
  const renderStartTimeBox = () => (
    <View style={styles.timeBoxGroup}>
      <View style={styles.timeLabelStacked}>
        <Text style={styles.timeLabelText}>HORÁRIO</Text>
        <Text style={styles.timeLabelText}>DE INÍCIO</Text>
      </View>
      <View style={styles.timeBoxOuter}>
        <View style={styles.timeBoxSlot}>
          <Text style={styles.timeBoxValue}>{setData.startTime || ' : '}</Text>
        </View>
        <View style={styles.timeBoxHMinRow}>
          <Text style={styles.timeBoxHMinText}>H</Text>
          <Text style={styles.timeBoxHMinText}>MIN</Text>
        </View>
      </View>
    </View>
  );

  // Helper: círculos S / R
  const renderStackedSR = () => (
    <View style={styles.stackedSRGroup}>
      <View style={styles.srCircleItem}>
        <Text style={styles.srCircleText}>S</Text>
      </View>
      <View style={[styles.srCircleItem, { marginBottom: 0 }]}>
        <Text style={styles.srCircleText}>R</Text>
      </View>
    </View>
  );

  // Helper: Sidebar
  const renderSidebar = (maxSaques: 6 | 8) => {
    const isSet5Sidebar = maxSaques === 6;
    const H = isSet5Sidebar ? FIVE_SET_5_HEIGHTS : FIVE_SET_1_4_HEIGHTS;

    return (
      <View style={styles.sidebar}>
        {/* Spacer de alinhamento com o cabeçalho das equipes (Horário de Início) */}
        <View style={[styles.sidebarTopSpacer, { height: H.headerBar }]} />

        {/* Bloco Principal da Sidebar */}
        <View style={styles.sidebarMain}>
          <View style={styles.sidebarVerticalTitle}>
            <Text style={styles.sidebarVerticalText}>Formação de Equipe</Text>
          </View>
          <View style={styles.sidebarContent}>
            {/* 1. Ordem de Saque */}
            <View style={[styles.sidebarHeaderCell, { height: H.rotHeader }]}>
              <Text style={styles.sidebarHeaderText}>Ordem de Saque</Text>
            </View>

            {/* 2. Jogadores Iniciantes */}
            <View style={[styles.sidebarStartersCell, { height: H.starter }]}>
              <Text style={styles.sidebarHeaderText}>Jogadores Iniciantes</Text>
            </View>

            {/* 3, 4, 5. Substituições (Nº Jogador + Placar na Troca) */}
            <View style={[styles.sidebarSubsContainer, { height: H.subPlayer + H.subScoreTotal }]}>
              <View style={styles.sidebarSubsVerticalLabel}>
                <Text style={styles.sidebarSubsVerticalText}>Substituições</Text>
              </View>
              <View style={styles.sidebarSubsCol}>
                <View style={[styles.sidebarSubPlayerCell, { height: H.subPlayer }]}>
                  <Text style={styles.sidebarSubPlayerText}>Nº Jogador</Text>
                </View>
                <View style={[styles.sidebarSubScoreCell, { height: H.subScoreTotal }]}>
                  <Text style={styles.sidebarSubScoreText}>Placar na Troca</Text>
                </View>
              </View>
            </View>

            {/* 6..9. Rodada de Saques (Dividida em 2 colunas com divisor vertical) */}
            <View style={styles.sidebarSaquesContainer}>
              <View style={styles.sidebarSaquesLabelCol}>
                <Text style={styles.sidebarSaquesLabelText}>Rodada de Saques</Text>
              </View>
              <View style={styles.sidebarSaquesRowsCol}>
                {isSet5Sidebar ? (
                  <>
                    <View style={[styles.sidebarSaqueRow, { height: FIVE_SET_5_HEIGHTS.saqueRow1 }]}>
                      <View style={styles.sidebarSaqueSubCol}>
                        <Text style={styles.sidebarSaqueNumText}>1º</Text>
                      </View>
                      <View style={[styles.sidebarSaqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.sidebarSaqueNumText}>4º</Text>
                      </View>
                    </View>
                    <View style={[styles.sidebarSaqueRow, { height: FIVE_SET_5_HEIGHTS.saqueRow2 }]}>
                      <View style={styles.sidebarSaqueSubCol}>
                        <Text style={styles.sidebarSaqueNumText}>2º</Text>
                      </View>
                      <View style={[styles.sidebarSaqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.sidebarSaqueNumText}>5º</Text>
                      </View>
                    </View>
                    <View style={[styles.sidebarSaqueRow, { height: FIVE_SET_5_HEIGHTS.saqueRow3, borderBottomWidth: 0 }]}>
                      <View style={styles.sidebarSaqueSubCol}>
                        <Text style={styles.sidebarSaqueNumText}>3º</Text>
                      </View>
                      <View style={[styles.sidebarSaqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.sidebarSaqueNumText}>6º</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.sidebarSaqueRow, { height: FIVE_SET_1_4_HEIGHTS.saqueRow }]}>
                      <View style={styles.sidebarSaqueSubCol}>
                        <Text style={styles.sidebarSaqueNumText}>1º</Text>
                      </View>
                      <View style={[styles.sidebarSaqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.sidebarSaqueNumText}>5º</Text>
                      </View>
                    </View>
                    <View style={[styles.sidebarSaqueRow, { height: FIVE_SET_1_4_HEIGHTS.saqueRow }]}>
                      <View style={styles.sidebarSaqueSubCol}>
                        <Text style={styles.sidebarSaqueNumText}>2º</Text>
                      </View>
                      <View style={[styles.sidebarSaqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.sidebarSaqueNumText}>6º</Text>
                      </View>
                    </View>
                    <View style={[styles.sidebarSaqueRow, { height: FIVE_SET_1_4_HEIGHTS.saqueRow }]}>
                      <View style={styles.sidebarSaqueSubCol}>
                        <Text style={styles.sidebarSaqueNumText}>3º</Text>
                      </View>
                      <View style={[styles.sidebarSaqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.sidebarSaqueNumText}>7º</Text>
                      </View>
                    </View>
                    <View style={[styles.sidebarSaqueRow, { height: FIVE_SET_1_4_HEIGHTS.saqueRow, borderBottomWidth: 0 }]}>
                      <View style={styles.sidebarSaqueSubCol}>
                        <Text style={styles.sidebarSaqueNumText}>4º</Text>
                      </View>
                      <View style={[styles.sidebarSaqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.sidebarSaqueNumText}>8º</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Helper: Banner Vertical do Set (S E T <n>)
  const renderSetBanner = (num: number, isSet5Mode: boolean) => {
    const H = isSet5Mode ? FIVE_SET_5_HEIGHTS : FIVE_SET_1_4_HEIGHTS;
    return (
      <View style={styles.setBanner}>
        <View style={[styles.setBannerSlot, { height: H.headerBar }]}>
          <Text style={styles.setBannerLetter}>S</Text>
        </View>
        <View style={[styles.setBannerSlot, { height: H.rotHeader }]}>
          <Text style={styles.setBannerLetter}>E</Text>
        </View>
        <View style={[styles.setBannerSlot, { height: H.starter }]}>
          <Text style={styles.setBannerLetter}>T</Text>
        </View>
        <View style={[styles.setBannerSlot, { height: H.subPlayer }]}>
          <Text style={[styles.setBannerLetter, { fontSize: 7.5 }]}>{num}</Text>
        </View>
        <View style={[styles.setBannerSlot, { flex: 1 }]} />
      </View>
    );
  };

  // Helper: Rotação de Equipe (6 colunas I a VI)
  const renderTeamRotationBody = (
    rotation: typeof leftRotation,
    subs: SubstitutionEntry[] | Record<string, SubPositionInfo | undefined> | undefined,
    maxSaques: 6 | 8,
  ) => {
    const isSet5Mode = maxSaques === 6;
    const H = isSet5Mode ? FIVE_SET_5_HEIGHTS : FIVE_SET_1_4_HEIGHTS;

    return (
      <View style={styles.rotationGrid}>
        {ROTATION_POSITIONS.map((pos, idx) => {
          const starterVal = rotation?.positions?.[pos as keyof typeof rotation.positions] ?? (rotation as unknown as Record<string, unknown> | undefined)?.[pos];
          const starterNum = (typeof starterVal === 'object' && starterVal !== null)
            ? (starterVal as { jerseyNumber?: number | string }).jerseyNumber
            : starterVal;

          const subInfo: SubPositionInfo | undefined = Array.isArray(subs)
            ? (subs[idx] ? { jerseyNumber: subs[idx].playerInJersey, scoreAtSub: subs[idx].scoreAtSub } : undefined)
            : subs?.[pos];

          const scoreText = subInfo?.scoreAtSub
            ? (typeof subInfo.scoreAtSub === 'object'
                ? `${subInfo.scoreAtSub.team ?? ''}:${subInfo.scoreAtSub.opponent ?? ''}`
                : String(subInfo.scoreAtSub))
            : ' : ';

          return (
            <View key={pos} style={styles.rotationCol}>
              <View style={[styles.rotationHeaderCell, { height: H.rotHeader }]}>
                <Text style={styles.rotationHeaderText}>{pos}</Text>
              </View>
              <View style={[styles.starterCell, { height: H.starter }]}>
                <Text style={styles.starterPlayerNum}>
                  {starterNum != null ? String(starterNum) : ''}
                </Text>
              </View>
              <View style={[styles.subPlayerCell, { height: H.subPlayer }]}>
                <Text style={styles.subPlayerNum}>
                  {subInfo?.jerseyNumber != null ? String(subInfo.jerseyNumber) : ''}
                </Text>
              </View>
              <View style={[styles.subScoreRow, { height: H.subScore1 }]}>
                <Text style={styles.subScoreText}>
                  {scoreText}
                </Text>
              </View>
              <View style={[styles.subScoreRow, { height: H.subScore2 }]}>
                <Text style={styles.subScoreText}> : </Text>
              </View>
              <View style={styles.saquesGroup}>
                {isSet5Mode ? (
                  <>
                    <View style={[styles.saqueCell, { height: FIVE_SET_5_HEIGHTS.saqueRow1 }]}>
                      <View style={styles.saqueSubCol}>
                        <Text style={styles.saqueNumItem}>1</Text>
                      </View>
                      <View style={[styles.saqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.saqueNumItem}>4</Text>
                      </View>
                    </View>
                    <View style={[styles.saqueCell, { height: FIVE_SET_5_HEIGHTS.saqueRow2 }]}>
                      <View style={styles.saqueSubCol}>
                        <Text style={styles.saqueNumItem}>2</Text>
                      </View>
                      <View style={[styles.saqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.saqueNumItem}>5</Text>
                      </View>
                    </View>
                    <View style={[styles.saqueCell, { height: FIVE_SET_5_HEIGHTS.saqueRow3, borderBottomWidth: 0 }]}>
                      <View style={styles.saqueSubCol}>
                        <Text style={styles.saqueNumItem}>3</Text>
                      </View>
                      <View style={[styles.saqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.saqueNumItem}>6</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.saqueCell, { height: FIVE_SET_1_4_HEIGHTS.saqueRow }]}>
                      <View style={styles.saqueSubCol}>
                        <Text style={styles.saqueNumItem}>1</Text>
                      </View>
                      <View style={[styles.saqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.saqueNumItem}>5</Text>
                      </View>
                    </View>
                    <View style={[styles.saqueCell, { height: FIVE_SET_1_4_HEIGHTS.saqueRow }]}>
                      <View style={styles.saqueSubCol}>
                        <Text style={styles.saqueNumItem}>2</Text>
                      </View>
                      <View style={[styles.saqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.saqueNumItem}>6</Text>
                      </View>
                    </View>
                    <View style={[styles.saqueCell, { height: FIVE_SET_1_4_HEIGHTS.saqueRow }]}>
                      <View style={styles.saqueSubCol}>
                        <Text style={styles.saqueNumItem}>3</Text>
                      </View>
                      <View style={[styles.saqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.saqueNumItem}>7</Text>
                      </View>
                    </View>
                    <View style={[styles.saqueCell, { height: FIVE_SET_1_4_HEIGHTS.saqueRow, borderBottomWidth: 0 }]}>
                      <View style={styles.saqueSubCol}>
                        <Text style={styles.saqueNumItem}>4</Text>
                      </View>
                      <View style={[styles.saqueSubCol, { borderRightWidth: 0 }]}>
                        <Text style={styles.saqueNumItem}>8</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Helper: Régua de Pontos 1–48 (Sets 1 a 4)
  const renderPointsRuler = (
    markedSet: Set<number>,
    timeouts?: string[],
  ) => {
    const rows = Array.from({ length: 12 }, (_, i) => i + 1);
    return (
      <View style={styles.pointsRulerContainer}>
        <View style={styles.pointsHeaderCell}>
          <Text style={styles.pointsHeaderText}>PONTOS</Text>
        </View>
        <View style={styles.pointsGrid48}>
          {rows.map((row) => (
            <View key={row} style={styles.pointRow48}>
              {[0, 12, 24, 36].map((offset) => {
                const pt = row + offset;
                const isMarked = markedSet.has(pt);
                return (
                  <View key={pt} style={styles.pointCell48}>
                    {isMarked ? (
                      <View style={styles.markedPointCircle48}>
                        <Text style={[styles.pointNum48, { fontFamily: BASEOS_TOKENS.fonts.BOLD }]}>
                          {pt}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.pointNum48}>{pt}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.timeoutContainer}>
          <View style={styles.timeoutHeaderCell}>
            <Text style={styles.timeoutHeaderText}>"T"</Text>
          </View>
          <View style={styles.timeoutSlotRow}>
            <Text style={styles.timeoutSlotText}>{timeouts?.[0] || ' : '}</Text>
          </View>
          <View style={[styles.timeoutSlotRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.timeoutSlotText}>{timeouts?.[1] || ' : '}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Helper: Coluna de Pontos 1 a 8 para Set 5 (Seção 1)
  const renderSingleTiebreakPointsCol = (
    markedSet: Set<number>,
    timeouts?: string[],
  ) => {
    const points = [1, 2, 3, 4, 5, 6, 7, 8];
    return (
      <View style={styles.singlePointsColContainer}>
        <View style={styles.pointsHeaderCell}>
          <Text style={[styles.pointsHeaderText, { fontSize: 3.2 }]}>PONTOS</Text>
        </View>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          {points.map((pt) => {
            const isMarked = markedSet.has(pt);
            return (
              <View key={pt} style={styles.singlePointCell}>
                {isMarked ? (
                  <View style={styles.markedPointCircle48}>
                    <Text style={[styles.singlePointText, { fontFamily: BASEOS_TOKENS.fonts.BOLD }]}>
                      {pt}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.singlePointText}>{pt}</Text>
                )}
              </View>
            );
          })}
        </View>
        <View style={[styles.timeoutContainer, { height: 18 }]}>
          <View style={[styles.timeoutHeaderCell, { height: 6 }]}>
            <Text style={styles.timeoutHeaderText}>"T"</Text>
          </View>
          <View style={[styles.timeoutSlotRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.timeoutSlotText}>{timeouts?.[0] || ' : '}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Helper: Coluna Tripla 1 a 30 para Set 5 (Seção 2 e Seção 3)
  const renderTripleTiebreakPointsCol = (
    markedSet: Set<number>,
    timeouts?: string[],
  ) => {
    const rows = Array.from({ length: 10 }, (_, i) => i + 1);
    return (
      <View style={styles.triplePointsColContainer}>
        <View style={styles.pointsHeaderCell}>
          <Text style={[styles.pointsHeaderText, { fontSize: 3.2 }]}>PONTOS</Text>
        </View>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          {rows.map((row) => (
            <View key={row} style={styles.triplePointRow}>
              {[0, 10, 20].map((offset) => {
                const pt = row + offset;
                const isMarked = markedSet.has(pt);
                return (
                  <View key={pt} style={styles.triplePointCell}>
                    {isMarked ? (
                      <View style={styles.markedPointCircle48}>
                        <Text style={[styles.pointNum48, { fontFamily: BASEOS_TOKENS.fonts.BOLD }]}>
                          {pt}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.pointNum48}>{pt}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <View style={[styles.timeoutContainer, { height: 18 }]}>
          <View style={[styles.timeoutHeaderCell, { height: 6 }]}>
            <Text style={styles.timeoutHeaderText}>"T"</Text>
          </View>
          <View style={[styles.timeoutSlotRow, { height: 6 }]}>
            <Text style={[styles.timeoutSlotText, { fontSize: 3.8 }]}>{timeouts?.[0] || ' : '}</Text>
          </View>
          <View style={[styles.timeoutSlotRow, { height: 6, borderBottomWidth: 0 }]}>
            <Text style={[styles.timeoutSlotText, { fontSize: 3.8 }]}>{timeouts?.[1] || ' : '}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ===================================================================
  // RENDERIZAÇÃO DE SETS 1, 2, 3, 4 (Padrão 1–48)
  // ===================================================================
  if (!isSet5) {
    return (
      <View style={styles.container}>
        {/* 1. Sidebar */}
        {renderSidebar(8)}

        {/* 2. Banner Vertical do Set */}
        {renderSetBanner(setNum, false)}

        {/* 3. Equipe da Esquerda */}
        <View style={[styles.teamSection, { borderRightWidth: 1.0, borderRightColor: BASEOS_TOKENS.colors.BLACK }]}>
          <View style={styles.teamHeaderBar}>
            {renderStartTimeBox()}
            <View style={styles.teamCodeGroup}>
              <Text style={styles.equipeLabel}>EQUIPE</Text>
              {render3SlotBox(leftAcronym)}
              <View style={styles.teamLetterCircle}>
                <Text style={styles.teamLetterText}>{leftTeamLetter}</Text>
              </View>
              {renderStackedSR()}
            </View>
          </View>
          <View style={styles.teamBodyRow}>
            {renderTeamRotationBody(
              leftRotation,
              isEvenSet ? setData.substitutions?.teamB : setData.substitutions?.teamA,
              8,
            )}
            {renderPointsRuler(leftMarkedSet, isEvenSet ? setData.timeouts?.teamB : setData.timeouts?.teamA)}
          </View>
        </View>

        {/* 4. Equipe da Direita */}
        <View style={styles.teamSection}>
          <View style={styles.teamHeaderBar}>
            <View style={styles.teamCodeGroup}>
              {renderStackedSR()}
              <View style={styles.teamLetterCircle}>
                <Text style={styles.teamLetterText}>{rightTeamLetter}</Text>
              </View>
              {render3SlotBox(rightAcronym)}
              <Text style={[styles.equipeLabel, { marginLeft: 2, marginRight: 0 }]}>EQUIPE</Text>
            </View>
            {renderStartTimeBox()}
          </View>
          <View style={styles.teamBodyRow}>
            {renderTeamRotationBody(
              rightRotation,
              isEvenSet ? setData.substitutions?.teamA : setData.substitutions?.teamB,
              8,
            )}
            {renderPointsRuler(rightMarkedSet, isEvenSet ? setData.timeouts?.teamA : setData.timeouts?.teamB)}
          </View>
        </View>
      </View>
    );
  }

  // ===================================================================
  // RENDERIZAÇÃO DO SET 5 (Tie-break Canônico com Troca de Lado)
  // ===================================================================
  return (
    <View style={styles.container}>
      {/* 1. Sidebar */}
      {renderSidebar(6)}

      {/* 2. Banner Vertical do Set */}
      {renderSetBanner(5, true)}

      {/* 3. Seção 1 (Equipe A antes da troca) */}
      <View style={styles.tbBlock1}>
        <View style={styles.teamHeaderBar}>
          {renderStartTimeBox()}
          <View style={styles.teamCodeGroup}>
            <Text style={styles.equipeLabel}>EQUIPE</Text>
            {render3SlotBox(leftAcronym)}
            <View style={styles.teamLetterCircle}>
              <Text style={styles.teamLetterText}>A</Text>
            </View>
            {renderStackedSR()}
          </View>
        </View>
        <View style={styles.teamBodyRow}>
          {renderTeamRotationBody(setData.rotation?.teamA, setData.substitutions?.teamA, 6)}
          {renderSingleTiebreakPointsCol(leftMarkedSet, setData.timeouts?.teamA)}
        </View>
      </View>

      {/* 4. Seção 2 (Equipe B) */}
      <View style={styles.tbBlock2}>
        <View style={styles.teamHeaderBar}>
          <View style={styles.teamCodeGroup}>
            {renderStackedSR()}
            <View style={styles.teamLetterCircle}>
              <Text style={styles.teamLetterText}>B</Text>
            </View>
            {render3SlotBox(rightAcronym)}
            <Text style={[styles.equipeLabel, { marginLeft: 2, marginRight: 0 }]}>EQUIPE</Text>
          </View>
          {renderStartTimeBox()}
        </View>
        <View style={styles.teamBodyRow}>
          {renderTeamRotationBody(setData.rotation?.teamB, setData.substitutions?.teamB, 6)}
          {renderTripleTiebreakPointsCol(rightMarkedSet, setData.timeouts?.teamB)}
        </View>
      </View>

      {/* 5. Divisor Vertical: TROCA DE LADO */}
      <View style={styles.tbTrocaDivider}>
        <Text style={styles.tbTrocaVerticalText}>TROCA DE LADO</Text>
      </View>

      {/* 6. Seção 3 (Equipe A após troca) */}
      <View style={styles.tbBlock3}>
        <View style={styles.teamHeaderBar}>
          <View style={styles.teamCodeGroup}>
            <Text style={styles.equipeLabel}>EQUIPE</Text>
            <View style={styles.teamLetterCircle}>
              <Text style={styles.teamLetterText}>A</Text>
            </View>
          </View>
          <View style={styles.pontosNaTrocaGroup}>
            <Text style={styles.pontosNaTrocaLabel}>PONTOS NA TROCA</Text>
            <View style={styles.pontosNaTrocaBox}>
              <Text style={styles.pontosNaTrocaValue}>
                {setData.sideChange?.pointsAtChange?.teamA != null
                  ? String(setData.sideChange.pointsAtChange.teamA)
                  : ''}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.teamBodyRow}>
          {renderTeamRotationBody(setData.rotation?.teamA, setData.substitutions?.teamA, 6)}
          {renderTripleTiebreakPointsCol(leftMarkedSet, setData.timeouts?.teamA)}
        </View>
      </View>
    </View>
  );
};
