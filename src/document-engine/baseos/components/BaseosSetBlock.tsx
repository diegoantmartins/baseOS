// =====================================================================
// BaseOS Component - Bloco Individual do Set (Flexível e Determinístico)
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
    borderWidth: BASEOS_TOKENS.borders.STRONG,
    borderColor: BASEOS_TOKENS.colors.BLACK,
    marginBottom: 2,
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    flexDirection: 'row',
  },
  leftSetMetaStrip: {
    width: 14,
    borderRightWidth: BASEOS_TOKENS.borders.REGULAR,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  setBadge: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  setLetter: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 5.0,
    color: BASEOS_TOKENS.colors.WHITE,
    lineHeight: 1.05,
  },
  setNum: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 7.0,
    color: BASEOS_TOKENS.colors.WHITE,
    marginTop: 1,
  },
  formacaoLettersBox: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 2,
  },
  formacaoChar: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.2,
    color: BASEOS_TOKENS.colors.WHITE,
    lineHeight: 0.95,
  },
  mainSetArea: {
    flex: 1,
    flexDirection: 'column',
  },
  setTopBar: {
    height: 10,
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
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  setBody: {
    flex: 1,
    flexDirection: 'row',
  },
  teamQuadrant: {
    flex: 1,
    flexDirection: 'row',
    borderRightWidth: BASEOS_TOKENS.borders.THIN,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
  },
  teamFormArea: {
    flex: 1,
    flexDirection: 'column',
  },
  teamHeader: {
    height: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
    borderBottomWidth: BASEOS_TOKENS.borders.STRONG,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    paddingHorizontal: 4,
  },
  teamNameText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
    color: BASEOS_TOKENS.colors.BLACK,
    textTransform: 'uppercase',
  },
  srBadgeText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.4,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  gridContentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  leftLegendColumn: {
    width: 42,
    flexDirection: 'column',
    borderRightWidth: BASEOS_TOKENS.borders.THIN,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHTEST,
  },
  legendCellOrdem: {
    height: 9,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  legendCellIniciantes: {
    height: 11,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  legendCellSubHeader: {
    height: 24,
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    justifyContent: 'space-around',
    paddingLeft: 2,
  },
  legendCellSaques: {
    flex: 1,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderTopWidth: BASEOS_TOKENS.borders.REGULAR,
    borderTopColor: BASEOS_TOKENS.colors.BLACK,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  legendText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 3.6,
    color: BASEOS_TOKENS.colors.BLACK,
  },
  legendSubText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.0,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  positionsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  posCol: {
    flex: 1,
    flexDirection: 'column',
    borderRightWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderRightColor: BASEOS_TOKENS.colors.BORDER_MUTED,
  },
  posHeaderCell: {
    height: 9,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posHeaderText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.8,
  },
  starterBox: {
    height: 11,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BASEOS_TOKENS.colors.WHITE,
  },
  starterJerseyText: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 6.8,
  },
  subBlock: {
    height: 24,
    flexDirection: 'column',
    borderBottomWidth: BASEOS_TOKENS.borders.THIN,
    borderBottomColor: BASEOS_TOKENS.colors.BLACK,
  },
  subSlotRow: {
    flex: 1,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subPlacarSlotRow: {
    flex: 1,
    borderBottomWidth: BASEOS_TOKENS.borders.HAIRLINE,
    borderBottomColor: BASEOS_TOKENS.colors.BORDER_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subColonText: {
    fontFamily: BASEOS_TOKENS.fonts.REGULAR,
    fontSize: 3.8,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  serviceRoundGrid: {
    flex: 1,
    flexDirection: 'column',
  },
  serviceRoundRow: {
    flex: 1,
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
    fontSize: 3.8,
    color: BASEOS_TOKENS.colors.GRAY_DARK,
  },
  sideChangeCol: {
    width: 11,
    backgroundColor: BASEOS_TOKENS.colors.GRAY_LIGHT,
    borderRightWidth: BASEOS_TOKENS.borders.THIN,
    borderRightColor: BASEOS_TOKENS.colors.BLACK,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 3,
  },
  sideChangeChar: {
    fontFamily: BASEOS_TOKENS.fonts.BOLD,
    fontSize: 4.0,
    color: BASEOS_TOKENS.colors.BLACK,
  },
});

interface BaseosSetBlockProps {
  setData: BaseosSetData;
  teamA: BaseosTeamData;
  teamB: BaseosTeamData;
  isDecidingSet?: boolean;
  height?: number;
}

export const BaseosSetBlock: React.FC<BaseosSetBlockProps> = ({
  setData,
  teamA,
  teamB,
  isDecidingSet = false,
  height = 138,
}) => {
  const isSet2 = setData.setNumber === 2 || setData.setNumber === 4;
  const leftTeam = isSet2 ? teamB : teamA;
  const rightTeam = isSet2 ? teamA : teamB;
  const leftRot = isSet2 ? setData.rotation.teamB : setData.rotation.teamA;
  const rightRot = isSet2 ? setData.rotation.teamA : setData.rotation.teamB;
  const leftPoints = isSet2 ? setData.points.teamB : setData.points.teamA;
  const rightPoints = isSet2 ? setData.points.teamA : setData.points.teamB;

  const isCompact = height <= 95;
  const pointGridHeight = height - 10;

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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.BLACK, marginHorizontal: 2 }} />
              <Text style={styles.teamNameText}> A  </Text>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.BLACK, marginHorizontal: 2 }} />
              <Text style={styles.teamNameText}> B</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontFamily: BASEOS_TOKENS.fonts.BOLD, fontSize: 4.0, color: BASEOS_TOKENS.colors.BLACK, marginRight: 3 }}>EQUIPE</Text>
              <View style={{ width: 8, height: 8, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.BLACK, marginRight: 1 }} />
              <View style={{ width: 8, height: 8, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.BLACK, marginRight: 1 }} />
              <View style={{ width: 8, height: 8, borderWidth: 1, borderColor: BASEOS_TOKENS.colors.BLACK }} />
            </View>
            <Text style={styles.srBadgeText}>(S) [ ]  (R) [ ]</Text>
          </View>

          <View style={styles.gridContentRow}>
            {showLeftLegend ? (
              <View style={styles.leftLegendColumn}>
                <View style={[styles.legendCellOrdem, isCompact ? { height: 7.5 } : {}]}>
                  <Text style={styles.legendText}>Ordem de Saque</Text>
                </View>
                <View style={[styles.legendCellIniciantes, isCompact ? { height: 8.5 } : {}]}>
                  <Text style={styles.legendSubText}>Jogadores Iniciantes</Text>
                </View>
                <View style={[styles.legendCellSubHeader, isCompact ? { height: 16 } : {}]}>
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
                    <View style={[styles.posHeaderCell, isCompact ? { height: 7.5 } : {}]}>
                      <Text style={styles.posHeaderText}>{pos}</Text>
                    </View>

                    <View style={[styles.starterBox, isCompact ? { height: 8.5 } : {}]}>
                      <Text style={[styles.starterJerseyText, isCompact ? { fontSize: 5.5 } : {}]}>{starterJersey}</Text>
                    </View>

                    <View style={[styles.subBlock, isCompact ? { height: 16 } : {}]}>
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

        <BaseosPointGrid pointGrid={points} maxPoints={maxPts} isCompact={isCompact} />
      </View>
    );
  };

  return (
    <View style={[styles.setContainer, { height }]}>
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
