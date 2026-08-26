import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { MatchSheetData } from './matchSheetPdf';

// Estilos normativos para súmula oficial A4 Paisagem ou Retrato (padrão federação A4 Retrato)
const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  // Cabeçalho Oficial
  headerBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 3,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#CCCCCC',
  },
  brandBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 115,
  },
  logoBarsContainer: {
    width: 14,
    height: 14,
    justifyContent: 'space-between',
  },
  logoBarTop: {
    height: 2.5,
    width: 10,
    backgroundColor: '#222222',
    borderRadius: 0.8,
  },
  logoBarMid: {
    height: 2.5,
    width: 14,
    marginLeft: 2.5,
    backgroundColor: '#000000',
    borderRadius: 0.8,
  },
  logoBarBot: {
    height: 2.5,
    width: 10,
    backgroundColor: '#444444',
    borderRadius: 0.8,
  },
  brandTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 4.5,
    color: '#555555',
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  centerHeaderBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  federationName: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#444444',
    textAlign: 'center',
    marginBottom: 0.5,
  },
  officialSheetTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalitySubtitle: {
    fontSize: 5.5,
    color: '#555555',
    textAlign: 'center',
    marginTop: 0.5,
  },
  sealBox: {
    width: 95,
    borderWidth: 0.8,
    borderColor: '#000000',
    backgroundColor: '#F5F5F5',
    paddingVertical: 1.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealTag: {
    fontSize: 4.5,
    fontWeight: 'bold',
    color: '#555555',
    textAlign: 'center',
  },
  sealMatchNum: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginVertical: 0.5,
  },
  sealModeText: {
    fontSize: 4.5,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
  },
  competitionBanner: {
    backgroundColor: '#EFEFEF',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 2,
    marginBottom: 2,
  },
  competitionTitleText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
  },
  categoryBadgeText: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#333333',
  },
  metaGrid: {
    flexDirection: 'row',
    paddingTop: 1,
  },
  metaCell: {
    flex: 1,
    paddingHorizontal: 2,
  },
  metaLabel: {
    fontSize: 5,
    color: '#555555',
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#000000',
  },

  // Equipes e Elenco
  teamsSection: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  teamBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000000',
  },
  teamHeader: {
    backgroundColor: '#E5E5E5',
    padding: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamTitle: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  athleteRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#CCCCCC',
    paddingVertical: 1,
    paddingHorizontal: 2,
  },
  athleteNum: {
    width: 14,
    fontSize: 6.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  athleteName: {
    flex: 1,
    fontSize: 6.5,
  },
  athletePos: {
    width: 40,
    fontSize: 6,
    color: '#444444',
  },

  // Sets e Rotação Oficial I a VI
  setsContainer: {
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 4,
  },
  sectionTitleBar: {
    backgroundColor: '#D4D4D4',
    padding: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    textAlign: 'center',
    fontSize: 7,
    fontWeight: 'bold',
  },
  setRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    minHeight: 24,
  },
  setInfoCol: {
    width: 38,
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
  },
  teamRotationCol: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    padding: 1,
  },
  rotationGrid: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: '#000000',
    marginTop: 1,
  },
  rotationCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    textAlign: 'center',
    paddingVertical: 1,
  },
  rotationCellLast: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 1,
  },
  posLabel: {
    fontSize: 5.5,
    fontWeight: 'bold',
    backgroundColor: '#EEEEEE',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingVertical: 0.5,
  },
  posPlayer: {
    fontSize: 6.5,
    fontWeight: 'bold',
    paddingVertical: 2,
  },

  // Régua Ponto a Ponto (1 a 45)
  tallyBox: {
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 4,
    padding: 2,
  },
  tallyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  tallyTeamLabel: {
    width: 45,
    fontSize: 6.5,
    fontWeight: 'bold',
  },
  tallyNumbersGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  tallyNumCell: {
    width: 8.5,
    height: 8.5,
    borderWidth: 0.5,
    borderColor: '#999999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tallyNumCellCrossed: {
    width: 8.5,
    height: 8.5,
    borderWidth: 0.5,
    borderColor: '#000000',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tallyNumText: {
    fontSize: 4.5,
  },
  tallyNumTextCrossed: {
    fontSize: 4.5,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Resumo Final, Sanções e Assinaturas
  bottomSection: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  bottomBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000000',
    padding: 3,
  },
  boxTitle: {
    fontSize: 6.5,
    fontWeight: 'bold',
    backgroundColor: '#EAEAEA',
    padding: 1.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: '#000000',
    padding: 3,
    marginTop: 2,
  },
  sigGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 4,
  },
  sigLine: {
    flex: 1,
    borderTopWidth: 0.5,
    borderTopColor: '#000000',
    paddingTop: 1,
    textAlign: 'center',
  },
  sigRole: {
    fontSize: 5.5,
    fontWeight: 'bold',
    color: '#333333',
  },
  sigName: {
    fontSize: 6,
    color: '#000000',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 5.5,
    color: '#777777',
    borderTopWidth: 0.5,
    borderTopColor: '#DDDDDD',
    paddingTop: 2,
  },
});

export interface OfficialScoresheetPdfProps {
  data: MatchSheetData;
}

export function OfficialScoresheetDocument({ data }: OfficialScoresheetPdfProps) {
  const isIndoor = data.modality === 'indoor';
  const totalSets = data.format === '5-sets' ? 5 : data.format === '3-sets' ? 3 : data.sets.length || 3;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ===== 1. CABEÇALHO OFICIAL COM IDENTIDADE BASEOS ===== */}
        <View style={styles.headerBox}>
          {/* Linha 1: Branding BaseOS + Federação Organizadora + Selo do Documento */}
          <View style={styles.headerTopRow}>
            {/* Brand BaseOS (Esquerda) */}
            <View style={styles.brandBox}>
              <View style={styles.logoBarsContainer}>
                <View style={styles.logoBarTop} />
                <View style={styles.logoBarMid} />
                <View style={styles.logoBarBot} />
              </View>
              <View style={{ marginLeft: 3 }}>
                <Text style={styles.brandTitle}>BaseOS</Text>
                <Text style={styles.brandSubtitle}>GESTÃO DE COMPETIÇÕES</Text>
              </View>
            </View>

            {/* Centro: Título do Documento e Federação */}
            <View style={styles.centerHeaderBlock}>
              <Text style={styles.federationName}>
                {data.orgName ? data.orgName.toUpperCase() : 'FEDERAÇÃO / ENTIDADE ORGANIZADORA'}
              </Text>
              <Text style={styles.officialSheetTitle}>
                SÚMULA OFICIAL DE VOLEIBOL
              </Text>
              <Text style={styles.modalitySubtitle}>
                {isIndoor ? 'VÔLEI DE QUADRA' : 'VÔLEI DE PRAIA'} • {data.playerFormat} • MELHOR DE {totalSets} SETS
              </Text>
            </View>

            {/* Selo / Identificador Oficial (Direita) */}
            <View style={styles.sealBox}>
              <Text style={styles.sealTag}>PADRÃO CBV / FIVB</Text>
              <Text style={styles.sealMatchNum}>JOGO Nº {data.matchNumber}</Text>
              <Text style={styles.sealModeText}>
                {data.sheetMode === 'pre' ? 'PRÉ-JOGO (MESA)' : 'RESULTADO FINAL'}
              </Text>
            </View>
          </View>

          {/* Linha 2: Banner de Destaque da Competição e Categoria */}
          <View style={styles.competitionBanner}>
            <Text style={styles.competitionTitleText}>
              {data.competition.toUpperCase()}
            </Text>
            <Text style={styles.categoryBadgeText}>
              CATEGORIA: {data.category.toUpperCase()} {data.genderCategory ? `• ${data.genderCategory.toUpperCase()}` : ''}
            </Text>
          </View>

          {/* Linha 3: Grid Técnico de Metadados da Partida */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>JOGO Nº</Text>
              <Text style={styles.metaValue}>{data.matchNumber}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>FASE / CHAVE</Text>
              <Text style={styles.metaValue}>{data.phase || `Rodada ${data.round}`} {data.groupName ? `(${data.groupName})` : ''}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>DATA E HORÁRIO</Text>
              <Text style={styles.metaValue}>{data.date} às {data.time}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>GINÁSIO / LOCAL</Text>
              <Text style={styles.metaValue}>{data.venue} {data.court ? `(${data.court})` : ''}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>CIDADE / UF</Text>
              <Text style={styles.metaValue}>{data.city || 'Local'}</Text>
            </View>
          </View>
        </View>

        {/* ===== 2. ELENCO NOMINAL DAS EQUIPES (A vs B) ===== */}
        <View style={styles.teamsSection}>
          {/* Equipe A */}
          <View style={styles.teamBox}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamTitle}>EQUIPE A: {data.teamA.name.toUpperCase()}</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold' }}>[{data.teamA.shortName}]</Text>
            </View>
            {data.teamA.athletes.slice(0, 14).map((ath, idx) => (
              <View key={idx} style={styles.athleteRow}>
                <Text style={styles.athleteNum}>
                  {ath.jerseyNumber !== undefined ? String(ath.jerseyNumber).padStart(2, '0') : '--'}
                </Text>
                <Text style={styles.athleteName}>
                  {ath.name} {ath.captain ? '(C)' : ''} {ath.libero ? '(L)' : ''}
                </Text>
                <Text style={styles.athletePos}>{ath.position || '-'}</Text>
              </View>
            ))}
            {data.teamA.coach && (
              <View style={[styles.athleteRow, { backgroundColor: '#F7F7F7', borderBottomWidth: 0 }]}>
                <Text style={[styles.athleteNum, { fontSize: 5.5 }]}>TÉC</Text>
                <Text style={[styles.athleteName, { fontWeight: 'bold' }]}>{data.teamA.coach}</Text>
              </View>
            )}
          </View>

          {/* Equipe B */}
          <View style={styles.teamBox}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamTitle}>EQUIPE B: {data.teamB.name.toUpperCase()}</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold' }}>[{data.teamB.shortName}]</Text>
            </View>
            {data.teamB.athletes.slice(0, 14).map((ath, idx) => (
              <View key={idx} style={styles.athleteRow}>
                <Text style={styles.athleteNum}>
                  {ath.jerseyNumber !== undefined ? String(ath.jerseyNumber).padStart(2, '0') : '--'}
                </Text>
                <Text style={styles.athleteName}>
                  {ath.name} {ath.captain ? '(C)' : ''} {ath.libero ? '(L)' : ''}
                </Text>
                <Text style={styles.athletePos}>{ath.position || '-'}</Text>
              </View>
            ))}
            {data.teamB.coach && (
              <View style={[styles.athleteRow, { backgroundColor: '#F7F7F7', borderBottomWidth: 0 }]}>
                <Text style={[styles.athleteNum, { fontSize: 5.5 }]}>TÉC</Text>
                <Text style={[styles.athleteName, { fontWeight: 'bold' }]}>{data.teamB.coach}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ===== 3. FORMAÇÃO INICIAL E ROTAÇÃO OFICIAL (I a VI) POR SET ===== */}
        <View style={styles.setsContainer}>
          <Text style={styles.sectionTitleBar}>
            FORMAÇÃO INICIAL DE QUADRA E ORDEM DE ROTAÇÃO DE SAQUE (I A VI)
          </Text>

          {Array.from({ length: totalSets }).map((_, setIdx) => {
            const setNum = setIdx + 1;
            const setResult = data.sets.find((s) => s.setNumber === setNum);

            return (
              <View key={setNum} style={styles.setRow}>
                {/* Coluna do Set */}
                <View style={styles.setInfoCol}>
                  <Text style={{ fontSize: 8, fontWeight: 'bold' }}>SET {setNum}</Text>
                  {setResult && (
                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#000000', marginTop: 1 }}>
                      {setResult.scoreA} × {setResult.scoreB}
                    </Text>
                  )}
                </View>

                {/* Formação Equipe A */}
                <View style={styles.teamRotationCol}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>{data.teamA.shortName} (A)</Text>
                  <View style={styles.rotationGrid}>
                    {['I', 'II', 'III', 'IV', 'V', 'VI'].map((pos, pIdx) => (
                      <View key={pos} style={pIdx === 5 ? styles.rotationCellLast : styles.rotationCell}>
                        <Text style={styles.posLabel}>{pos}</Text>
                        <Text style={styles.posPlayer}>--</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Formação Equipe B */}
                <View style={[styles.teamRotationCol, { borderRightWidth: 0 }]}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>{data.teamB.shortName} (B)</Text>
                  <View style={styles.rotationGrid}>
                    {['I', 'II', 'III', 'IV', 'V', 'VI'].map((pos, pIdx) => (
                      <View key={pos} style={pIdx === 5 ? styles.rotationCellLast : styles.rotationCell}>
                        <Text style={styles.posLabel}>{pos}</Text>
                        <Text style={styles.posPlayer}>--</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ===== 4. RÉGUA PONTO A PONTO DA MESA (1 a 40) ===== */}
        <View style={styles.tallyBox}>
          <Text style={styles.boxTitle}>PONTUAÇÃO CORRIDA / PONTO A PONTO (MESA DE CONTROLE)</Text>
          
          {/* Equipe A Tally */}
          <View style={styles.tallyRow}>
            <Text style={styles.tallyTeamLabel}>{data.teamA.shortName} (A):</Text>
            <View style={styles.tallyNumbersGrid}>
              {Array.from({ length: 35 }).map((_, i) => {
                const pt = i + 1;
                const isCrossed = data.sets[0] && pt <= data.sets[0].scoreA;
                return (
                  <View key={pt} style={isCrossed ? styles.tallyNumCellCrossed : styles.tallyNumCell}>
                    <Text style={isCrossed ? styles.tallyNumTextCrossed : styles.tallyNumText}>{pt}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Equipe B Tally */}
          <View style={styles.tallyRow}>
            <Text style={styles.tallyTeamLabel}>{data.teamB.shortName} (B):</Text>
            <View style={styles.tallyNumbersGrid}>
              {Array.from({ length: 35 }).map((_, i) => {
                const pt = i + 1;
                const isCrossed = data.sets[0] && pt <= data.sets[0].scoreB;
                return (
                  <View key={pt} style={isCrossed ? styles.tallyNumCellCrossed : styles.tallyNumCell}>
                    <Text style={isCrossed ? styles.tallyNumTextCrossed : styles.tallyNumText}>{pt}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ===== 5. SANÇÕES, OBSERVAÇÕES E ASSINATURAS ===== */}
        <View style={styles.bottomSection}>
          {/* Sanções e Conduta */}
          <View style={styles.bottomBox}>
            <Text style={styles.boxTitle}>SANÇÕES E CONDUTA</Text>
            {data.sanctions.length > 0 ? (
              data.sanctions.map((s, idx) => (
                <Text key={idx} style={{ fontSize: 6 }}>
                  • Set {s.set} ({s.team}): {s.player} - {s.type}
                </Text>
              ))
            ) : (
              <Text style={{ fontSize: 6, color: '#666666', textAlign: 'center', marginTop: 4 }}>
                Nenhuma sanção disciplinar registrada na partida.
              </Text>
            )}
          </View>

          {/* Observações / Protestos */}
          <View style={styles.bottomBox}>
            <Text style={styles.boxTitle}>OBSERVAÇÕES E PROTESTO FORMAL DO CAPITÃO</Text>
            <Text style={{ fontSize: 6, color: '#333333' }}>
              {data.observations || 'Sem observações adicionais relatadas pela equipe de arbitragem.'}
            </Text>
          </View>
        </View>

        {/* ===== 6. ASSINATURAS FORMAIS ===== */}
        <View style={styles.signatureBox}>
          <Text style={styles.boxTitle}>APROVAÇÃO E ASSINATURAS DA EQUIPE DE ARBITRAGEM E CAPITÃES</Text>
          <View style={styles.sigGrid}>
            <View style={styles.sigLine}>
              <Text style={styles.sigRole}>1º ÁRBITRO</Text>
              <Text style={styles.sigName}>
                {data.referees.find((r) => r.role.includes('1'))?.name || '___________________'}
              </Text>
            </View>
            <View style={styles.sigLine}>
              <Text style={styles.sigRole}>2º ÁRBITRO</Text>
              <Text style={styles.sigName}>
                {data.referees.find((r) => r.role.includes('2'))?.name || '___________________'}
              </Text>
            </View>
            <View style={styles.sigLine}>
              <Text style={styles.sigRole}>APONTADOR</Text>
              <Text style={styles.sigName}>
                {data.referees.find((r) => r.role.toLowerCase().includes('apontador'))?.name || '___________________'}
              </Text>
            </View>
            <View style={styles.sigLine}>
              <Text style={styles.sigRole}>CAPITÃO {data.teamA.shortName}</Text>
              <Text style={styles.sigName}>___________________</Text>
            </View>
            <View style={styles.sigLine}>
              <Text style={styles.sigRole}>CAPITÃO {data.teamB.shortName}</Text>
              <Text style={styles.sigName}>___________________</Text>
            </View>
          </View>
        </View>

        {/* Rodapé Oficial */}
        <View style={styles.footer}>
          <Text>VolleyPro • Sistema Homologado de Gestão de Voleibol</Text>
          <Text>Súmula Padrão CBV / FIVB • Impressão Oficial A4</Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Gera os bytes da Súmula Oficial usando @react-pdf/renderer
 */
export async function generateOfficialScoresheetPdfBlob(data: MatchSheetData): Promise<Blob> {
  return await pdf(<OfficialScoresheetDocument data={data} />).toBlob();
}

/**
 * Faz download direto da Súmula Oficial em PDF
 */
export async function downloadOfficialScoresheetPdf(data: MatchSheetData, filename?: string): Promise<void> {
  const blob = await generateOfficialScoresheetPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = filename || `sumula_oficial_cbv_${data.teamA.shortName}_vs_${data.teamB.shortName}.pdf`;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
