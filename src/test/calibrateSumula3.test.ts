import { describe, it } from 'vitest';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Calibration Exact Positions Test', () => {
  it('draws calibrated sample data onto sumula-3-sets.pdf', async () => {
    const filePath = join(process.cwd(), 'src/document-engine/templates/sumula-3-sets.pdf');
    const buffer = readFileSync(filePath);
    const bytes = new Uint8Array(buffer);
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const height = page.getHeight(); // 566

    // Helper: draw text at top-origin
    const draw = (text: string, x: number, yTop: number, size = 7.5, isBold = false) => {
      // In PDF-lib, Y is baseline from bottom.
      // If yTop is the top of the box/line, the baseline is roughly yTop + size * 0.85
      const baselineY = height - (yTop + size * 0.85);
      page.drawText(text, {
        x,
        y: baselineY,
        size,
        font: isBold ? boldFont : font,
        color: rgb(0, 0, 0.7),
      });
    };

    // 1. Header Left
    draw('SUPERLIGA MASCULINA DE VOLEIBOL 2026', 105, 46.0, 7.5, true);
    draw('CURITIBA', 55, 59.0, 7.0, false);
    draw('CLASSIFICATÓRIA', 230, 59.0, 6.5, false);
    draw('01', 332, 59.0, 7.5, true);
    draw('GINÁSIO DO TARUMÃ - QUADRA 1', 60, 71.5, 7.0, false);
    draw('X', 86, 84.0, 8.0, true); // MASC
    draw('ADULTO / PRINCIPAL', 190, 84.0, 7.0, false);

    // 2. Header Center (Data / Horário / Equipes)
    draw('26/08/2026', 365, 50.0, 7.5, true);
    draw('19:30', 505, 50.0, 7.5, true);
    draw('MINAS TÊNIS CLUBE', 362, 71.0, 7.5, true);
    draw('SADA CRUZEIRO VOLEI', 485, 71.0, 7.5, true);

    // 3. Tabela EQUIPES (Topo Direito)
    // Team A and Team B headers
    draw('MIN', 762, 70.0, 8.0, true);
    draw('SAD', 872, 70.0, 8.0, true);

    // 12 Jogadores da Equipe A e Equipe B
    const rowYs = [
      92.0, 102.5, 113.0, 123.5, 134.0, 144.5,
      155.0, 165.5, 176.0, 186.5, 197.0, 207.5
    ];

    rowYs.forEach((y, idx) => {
      // Equipe A
      draw(String(idx + 1).padStart(2, '0'), 752, y, 6.5, true);
      draw(`Jogador A ${idx + 1}${idx === 0 ? ' (C)' : ''}`, 766, y, 6.5, idx === 0);

      // Equipe B
      draw(String(idx + 1).padStart(2, '0'), 868, y, 6.5, true);
      draw(`Jogador B ${idx + 1}${idx === 0 ? ' (C)' : ''}`, 882, y, 6.5, idx === 0);
    });

    // Líberos
    draw('15', 752, 218.0, 6.5, true);
    draw('Libero A 1 (L)', 766, 218.0, 6.5, true);
    draw('16', 752, 229.0, 6.5, true);
    draw('Libero A 2 (L)', 766, 229.0, 6.5, true);

    draw('15', 868, 218.0, 6.5, true);
    draw('Libero B 1 (L)', 882, 218.0, 6.5, true);
    draw('16', 868, 229.0, 6.5, true);
    draw('Libero B 2 (L)', 882, 229.0, 6.5, true);

    // Comissão Técnica
    draw('Técnico Equipe A', 748, 245.0, 6.0, false);
    draw('Técnico Equipe B', 866, 245.0, 6.0, false);
    draw('Assistente A', 748, 255.0, 6.0, false);
    draw('Assistente B', 866, 255.0, 6.0, false);

    // Árbitros / Aprovação
    draw('Árbitro Principal CBV', 775, 442.0, 6.5, false);
    draw('Segundo Árbitro CBV', 775, 452.0, 6.5, false);
    draw('Apontador Oficial', 775, 462.0, 6.5, false);

    const outBytes = await doc.save();
    writeFileSync('/home/diego-martins/docker/tmp/opencode/fase2/calibrated-sample-3sets.pdf', outBytes);
  });
});
