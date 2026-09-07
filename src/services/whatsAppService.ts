/**
 * whatsAppService.ts — BaseOS
 *
 * Central Canônica de Comunicação e Mensageria via WhatsApp (Fase 2).
 *
 * Responsabilidades:
 *  1. Normalização estrita de números telefônicos (DDI 55 Brasil, DDD, remoção de caracteres inválidos).
 *  2. Montagem de templates canônicos de comunicação (convites de equipes, dados de acesso).
 *  3. Geração segura de URLs de abertura do WhatsApp Web / App (api.whatsapp.com).
 *  4. Abertura do mensageiro sob demanda (NUNCA envio automático; exige confirmação do operador).
 */

export interface TeamRegistrationWhatsAppMessageParams {
  managerName?: string;
  teamName: string;
  competitionName: string;
  portalUrl: string;
  managerEmail?: string;
  deadlineIso?: string;
}

/**
 * Normaliza número de telefone removendo pontuações e injetando DDI 55 do Brasil
 * quando o número possui 10 (fixo com DDD) ou 11 (celular com DDD) dígitos.
 */
export function normalizePhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // Se o número começa com '+' e não for '+55', é um número internacional com DDI explícito
  if (trimmed.startsWith('+') && !digits.startsWith('55')) {
    return digits;
  }

  // Se tem 10 ou 11 dígitos e ainda não tem o prefixo 55 internacional brasileiro
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Monta o template canônico de mensagem para envio ao gestor da equipe,
 * contendo link do portal, dados do torneio e prazo de envio de atletas.
 */
export function buildTeamRegistrationWhatsAppMessage(params: TeamRegistrationWhatsAppMessageParams): string {
  const manager = params.managerName?.trim() || 'Responsável';
  const deadlineFormatted = params.deadlineIso
    ? new Date(params.deadlineIso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Conforme regulamento da competição';

  const emailLine = params.managerEmail?.trim()
    ? `\nE-mail: ${params.managerEmail.trim()}`
    : '';

  return `Olá, ${manager}! 👋

A equipe *${params.teamName}* foi cadastrada na competição *${params.competitionName}* no BaseOS.

Você pode acessar o Portal da Equipe pelo link:

${params.portalUrl}

Dados de identificação:${emailLine}
Acesso: Link direto exclusivo com token de segurança (dispensa senha inicial).

No portal você poderá cadastrar os atletas da equipe dentro do prazo de inscrição e acompanhar jogos, resultados e classificação.

Prazo para cadastro dos atletas:
${deadlineFormatted}

Qualquer dúvida, entre em contato com a organização.`;
}

/**
 * Constrói a URL oficial de abertura do WhatsApp Web / App para o navegador.
 */
export function buildWhatsAppWebUrl(phone: string, text: string): string {
  const normalizedPhone = normalizePhoneNumber(phone);
  const encodedText = encodeURIComponent(text);

  if (normalizedPhone) {
    return `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Dispara a abertura do WhatsApp Web em nova aba do navegador com a mensagem pré-carregada.
 * NUNCA envia automaticamente.
 */
export function openWhatsAppWeb(phone: string, text: string): void {
  const url = buildWhatsAppWebUrl(phone, text);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
