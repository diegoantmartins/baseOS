// =====================================================================
// BaseOS Component - Bloco Individual do Set (138pt Exatos com Tipografia Alinhada)
// =====================================================================

import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BaseosSetData } from '../types/set';
import type { BaseosTeamData } from '../types/team';
import { BASEOS_TOKENS } from '../theme/tokens';
import { ROTATION_POSITIONS } from '../domain/rotation.rules';
import { BaseosPointGrid } from './BaseosPointGrid';

const styles = StyleSheet.create({
  setContainer: {
    height: 138,
    borderWidth: BASEOS_TOKENS.borders.REGULAR,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    marginBottom: 3,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'row',
  },
  leftSetMetaStrip: {
    width: 14,
    height: 138,
    borderRightWidth: BASEOS_TOKENS.borders.REGULAR,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setBadge: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  setLetter: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.5,
    color: BASEOS_TOKENS.colors.BLACK,
    lineHeight: 1.05,
  },
  setNum: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.5,
    color: BASEOS_TOKENS.colors.BLACK,
    marginTop: 1,
  },
  formacaoLettersBox: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 3,
  },
  formacaoChar: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.5,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
    lineHeight: 1.0,
  },
  mainSetArea: {
    flex: 1,
    height: 138,
    flexDirection: 'column',
  },
  setTopBar: {
    height: 12,
    flexDirection: 'row',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setTimeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  setBody: {
    height: 126,
    flexDirection: 'row',
  },
  teamQuadrant: {
    flex: 1,
    height: 126,
    flexDirection: 'row',
    borderRightWidth: BASEOS_TOKENS.borders.THIN,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  teamFormArea: {
    flex: 1,
    height: 126,
    flexDirection: 'column',
  },
  teamHeader: {
    height: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 3,
  },
  teamNameText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.2,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  srBadgeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.2,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  gridContentRow: {
    height: 114,
    flexDirection: 'row',
  },
  leftLegendColumn: {
    width: 44,
    height: 114,
    flexDirection: 'column',
    borderRightWidth: BASEOS_TOKENS.borders.THIN,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  legendCellOrdem: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  legendCellIniciantes: {
    height: 12,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  legendCellSubHeader: {
    height: 28,
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    justifyContent: 'space-around',
    paddingLeft: 2,
  },
  legendCellSaques: {
    height: 64,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  legendText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.8,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  legendSubText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  positionsContainer: {
    flex: 1,
    height: 114,
    flexDirection: 'row',
  },
  posCol: {
    flex: 1,
    height: 114,
    flexDirection: 'column',
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  posHeaderCell: {
    height: 10,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.2,
  },
  starterBox: {
    height: 12,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  starterJerseyText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.2,
  },
  subBlock: {
    height: 28,
    flexDirection: 'column',
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },
  subSlotRow: {
    height: 7,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPlacarSlotRow: {
    height: 7,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subColonText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  serviceRoundGrid: {
    height: 64,
    flexDirection: 'column',
  },
  serviceRoundRow: {
    height: 16,
    flexDirection: 'row',
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  serviceBox: {
    flex: 1,
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBoxNum: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  sideChangeCol: {
    width: 12,
    height: 126,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderRightWidth: BASEOS_TOKENS.borders.THIN,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  sideChangeChar: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.5,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

interface BaseosSetBlockProps {
  setData: BaseosSetData;
  teamA: BaseosTeamData;
  teamB: BaseosTeamData;
  isDecidingSet?: boolean;
}

export const BaseosSetBlock: React.FC<BaseosSetBlockProps> = ({
  setData,
  teamA,
  teamB,
  isDecidingSet = false,
}) => {
  const isSet2 = setData.setNumber === 2;
  const leftTeam = isSet2 ? teamB : teamA;
  const rightTeam = isSet2 ? teamA : teamB;
  const leftRot = isSet2 ? setData.rotation.teamB : setData.rotation.teamA;
  const rightRot = isSet2 ? setData.rotation.teamA : setData.rotation.teamB;
  const leftPoints = isSet2 ? setData.points.teamB : setData.points.teamA;
  const rightPoints = isSet2 ? setData.points.teamA : setData.points.teamB;

  const renderTeamQuadrant = (
    team: BaseosTeamData,
    rot: BaseosSetData['rotation']['teamA'],
    points: BaseosSetData['points']['teamA'],
    customTitle?: string,
    showLeftLegend = true,
    isLastQuadrant = false,
    maxPts = 36,
  ) => {
    return (
      <View style={[styles.teamQuadrant, isLastQuadrant ? { borderRightWidth: 0 } : {}]}>
        <View style={styles.teamFormArea}>
          <View style={styles.teamHeader}>
            <Text style={styles.teamNameText}>
              {customTitle || `(   ) ${team.name ? team.name.toUpperCase() : 'EQUIPE'}`}
            </Text>
            <Text style={styles.srBadgeText}>(S) [ ]  (R) [ ]</Text>
          </View>

          <View style={styles.gridContentRow}>
            {showLeftLegend ? (
              <View style={styles.leftLegendColumn}>
                <View style={styles.legendCellOrdem}>
                  <Text style={styles.legendText}>Ordem de Saque</Text>
                </View>
                <View style={styles.legendCellIniciantes}>
                  <Text style={styles.legendSubText}>Jogadores Iniciantes</Text>
                </View>
                <View style={styles.legendCellSubHeader}>
                  <Text style={styles.legendSubText}>Nº do Jogador</Text>
                  <Text style={styles.legendSubText}>Placar na Troca</Text>
                </View>
                <View style={styles.legendCellSaques}>
                  <Text style={styles.legendText}>Rodada de Saques</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.positionsContainer}>
              {ROTATION_POSITIONS.map((pos, pIdx) => {
                const starterJersey =
                  rot?.positions[pos] !== undefined && rot?.positions[pos] !== ''
                    ? String(rot.positions[pos])
                    : '';

                return (
                  <View
                    key={pos}
                    style={[
                      styles.posCol,
                      pIdx === ROTATION_POSITIONS.length - 1 ? { borderRightWidth: 0 } : {},
                    ]}
                  >
                    <View style={styles.posHeaderCell}>
                      <Text style={styles.posHeaderText}>{pos}</Text>
                    </View>

                    <View style={styles.starterBox}>
                      <Text style={styles.starterJerseyText}>{starterJersey}</Text>
                    </View>

                    <View style={styles.subBlock}>
                      <View style={styles.subSlotRow} />
                      <View style={styles.subSlotRow} />
                      <View style={styles.subPlacarSlotRow}>
                        <Text style={styles.subColonText}>:</Text>
                      </View>
                      <View style={[styles.subPlacarSlotRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.subColonText}>:</Text>
                      </View>
                    </View>

                    <View style={styles.serviceRoundGrid}>
                      {[
                        [1, 2],
                        [3, 4],
                        [5, 6],
                        [7, 8],
                      ].map(([s1, s2], rIdx) => (
                        <View key={`sr-row-${rIdx}`} style={styles.serviceRoundRow}>
                          <View style={styles.serviceBox}>
                            <Text style={styles.serviceBoxNum}>{s1}</Text>
                          </View>
                          <View style={[styles.serviceBox, { borderRightWidth: 0 }]}>
                            <Text style={styles.serviceBoxNum}>{s2}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <BaseosPointGrid pointGrid={points} maxPoints={maxPts} />
      </View>
    );
  };

  return (
    <View style={styles.setContainer}>
      {/* Barra Lateral do Set com Letras Empilhadas (Sem distorção de rotação) */}
      <View style={styles.leftSetMetaStrip}>
        <View style={styles.setBadge}>
          <Text style={styles.setLetter}>S</Text>
          <Text style={styles.setLetter}>E</Text>
          <Text style={styles.setLetter}>T</Text>
          <Text style={styles.setNum}>{setData.setNumber}</Text>
        </View>
        <View style={styles.formacaoLettersBox}>
          {['F', 'O', 'R', 'M', 'A', 'Ç', 'Ã', 'O'].map((ch, i) => (
            <Text key={`fc-${i}`} style={styles.formacaoChar}>{ch}</Text>
          ))}
        </View>
      </View>

      <View style={styles.mainSetArea}>
        <View style={styles.setTopBar}>
          <Text style={styles.setTimeText}>
            HORÁRIO DO INÍCIO: {setData.startTime || '__:__'}
          </Text>
          <Text style={styles.setTimeText}>
            HORÁRIO DO FIM: {setData.endTime || '__:__'}
          </Text>
          <Text style={styles.setTimeText}>
            DURAÇÃO: {setData.durationMinutes ? `${setData.durationMinutes} min` : '___ min'}
          </Text>
        </View>

        <View style={styles.setBody}>
          {isDecidingSet ? (
            <>
              {renderTeamQuadrant(leftTeam, leftRot, leftPoints, undefined, true, false, 8)}
              {renderTeamQuadrant(rightTeam, rightRot, rightPoints, undefined, false, false, 30)}

              {/* Coluna Central com Letras Empilhadas */}
              <View style={styles.sideChangeCol}>
                {['T', 'R', 'O', 'C', 'A', ' ', 'D', 'E', ' ', 'L', 'A', 'D', 'O'].map((ch, i) => (
                  <Text key={`sc-${i}`} style={styles.sideChangeChar}>
                    {ch === ' ' ? ' ' : ch}
                  </Text>
                ))}
              </View>

              {renderTeamQuadrant(
                leftTeam,
                leftRot,
                leftPoints,
                'PONTOS NA TROCA [ : ]',
                false,
                true,
                30,
              )}
            </>
          ) : (
            <>
              {renderTeamQuadrant(leftTeam, leftRot, leftPoints, undefined, true, false, 36)}
              {renderTeamQuadrant(rightTeam, rightRot, rightPoints, undefined, false, true, 36)}
            </>
          )}
        </View>
      </View>
    </View>
  );
};
