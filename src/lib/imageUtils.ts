// Utilidades de imagem para upload de logos/escudos.
// Compressão em Canvas para manter o armazenamento local leve (< 200KB).

const MAX_DIMENSION = 256;
const TARGET_BYTES = 200 * 1024;

export type CompressedImage = {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Lê um arquivo de imagem, redimensiona para no máximo MAX_DIMENSION px e
 * converte para data URI base64 (JPEG). Tenta reduzir a qualidade até caber
 * em TARGET_BYTES.
 */
export function compressImageToDataUrl(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas não suportado neste navegador.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > TARGET_BYTES && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve({
          dataUrl,
          width,
          height,
          bytes: Math.round((dataUrl.length * 3) / 4),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}