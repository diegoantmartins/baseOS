/**
 * TeamRegistrationSuccessModal — BaseOS
 *
 * Modal de confirmação e compartilhamento após o cadastro unificado da equipe na competição (Fase 2).
 *
 * Recursos:
 * - Exibição do resumo da equipe, responsável e prazo regulamentar.
 * - Link seguro do portal (/equipe/inscricao/:token) com botão de cópia.
 * - Prévia da mensagem do WhatsApp formatada conforme o template oficial.
 * - Ação oficial de abertura do WhatsApp Web / App (NUNCA envio automático).
 */

import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Link as LinkIcon,
  User,
  Phone,
  Mail,
  CalendarClock,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  buildTeamRegistrationWhatsAppMessage,
  openWhatsAppWeb,
} from '@/services/whatsAppService';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: CompetitionRecord | null;
  team: TeamRecord | null;
  competitionTeam: CompetitionTeam | null;
}

export function TeamRegistrationSuccessModal({
  open,
  onOpenChange,
  competition,
  team,
  competitionTeam,
}: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!team || !competition || !competitionTeam) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = `${origin}/equipe/inscricao/${competitionTeam.accessToken}`;

  const whatsappMessage = buildTeamRegistrationWhatsAppMessage({
    managerName: team.managerName,
    teamName: team.name,
    competitionName: competition.name,
    portalUrl,
    managerEmail: team.managerEmail,
    managerPassword: team.managerPassword,
    deadlineIso: competitionTeam.registrationDeadline,
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedLink(true);
      toast.success('Link do portal copiado!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      window.prompt('Copie o link do portal abaixo:', portalUrl);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedMessage(true);
      toast.success('Mensagem completa copiada para a área de transferência!');
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      window.prompt('Copie a mensagem abaixo:', whatsappMessage);
    }
  };

  const handleOpenWhatsApp = () => {
    openWhatsAppWeb(team.managerPhone || '', whatsappMessage);
  };

  const deadlineFormatted = competitionTeam.registrationDeadline
    ? new Date(competitionTeam.registrationDeadline).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Conforme regulamento';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Equipe Cadastrada com Sucesso!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                A agremiação foi oficialmente inscrita em <strong>{competition.name}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {/* Card Resumo da Equipe & Competição */}
          <Card className="border-border/80 bg-zinc-900/50">
            <CardContent className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt=""
                      className="w-9 h-9 rounded-lg object-contain bg-zinc-950 p-0.5 border border-zinc-800"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs font-mono">
                      {team.shortName}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{team.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {competition.name} · {competition.modality === 'beach' ? 'Praia' : 'Quadra'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-xs font-mono font-bold uppercase border-zinc-800 bg-zinc-900">
                    {team.shortName}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Inscrita
                  </Badge>
                </div>
              </div>

              {/* Informações do Responsável & Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs">
                <div className="space-y-1 p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3 text-primary" />
                    Responsável da Equipe:
                  </span>
                  <span className="font-semibold text-foreground block truncate">
                    {team.managerName || 'Não informado'}
                  </span>
                  {team.managerPhone && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {team.managerPhone}
                    </span>
                  )}
                  {team.managerEmail && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 text-zinc-400" />
                      {team.managerEmail}
                    </span>
                  )}
                </div>

                <div className="space-y-1 p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="w-3 h-3 text-amber-400" />
                    Prazo Limite de Envio do Elenco:
                  </span>
                  <span className="font-mono font-bold text-foreground block text-xs tabular-nums text-amber-300">
                    {deadlineFormatted}
                  </span>
                  <span className="text-[10px] text-muted-foreground block leading-tight pt-1">
                    Após esta data o elenco é bloqueado para edição pela equipe.
                  </span>
                </div>
              </div>

              {/* Link Único do Portal */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5 text-primary" />
                    Link Exclusivo do Portal da Equipe:
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Token de Acesso Seguro
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-primary truncate">
                  <span className="truncate flex-1 select-all">{portalUrl}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyLink}
                    className="h-6 text-[11px] px-2 gap-1 rounded hover:bg-zinc-800 text-zinc-300 shrink-0"
                    title="Copiar Link"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedLink ? 'Copiado!' : 'Copiar'}
                  </Button>
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded hover:bg-zinc-800 text-muted-foreground hover:text-foreground shrink-0"
                    title="Testar Link em nova aba"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Credenciais de Acesso (Usuário & Senha) */}
              {(team.managerEmail || team.managerPassword) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
                  {team.managerEmail && (
                    <div className="space-y-1 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                        <Mail className="w-3 h-3 text-primary" />
                        Usuário / Login:
                      </span>
                      <span className="font-medium text-foreground block truncate">{team.managerEmail}</span>
                    </div>
                  )}
                  {team.managerPassword && (
                    <div className="space-y-1 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-500" />
                        Senha de Acesso:
                      </span>
                      <span className="font-mono font-bold text-foreground block truncate">{team.managerPassword}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prévia da Mensagem do WhatsApp */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              Mensagem Pronta para o WhatsApp:
            </span>
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-sans text-foreground whitespace-pre-line max-h-36 overflow-y-auto leading-relaxed">
              {whatsappMessage}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMessage}
            className="gap-1.5 text-xs flex-1 h-8 rounded-md border-border hover:bg-zinc-800/60"
          >
            {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedMessage ? 'Copiado!' : 'Copiar Mensagem'}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenWhatsApp}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-8 rounded-md font-semibold shadow-none"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar pelo WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
