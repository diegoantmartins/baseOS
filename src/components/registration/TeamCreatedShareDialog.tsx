import { useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, Shield, User, Link as LinkIcon, Users, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TeamRecord } from '@/types/entities';

interface Props {
  team: TeamRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildWhatsAppMessage(team: TeamRecord, portalUrl: string): string {
  const manager = team.managerName || 'Responsável';
  const username = team.managerEmail || team.managerName || team.name;
  const password = team.managerPassword || 'Acesso Direto via Link';

  return `🏐 *VOLLEYPRO — ACESSO DA EQUIPE* 🏐

Olá, *${manager}*!
Sua equipe *${team.name}* (${team.shortName}) foi cadastrada no sistema oficial de competições de voleibol.

🔗 *Link de Inscrição / Envio de Elenco:*
${portalUrl}

👤 *Usuário / Login:* ${username}
🔑 *Senha de Acesso:* ${password}

📱 Acesse o link acima para cadastrar a relação de atletas e membros da comissão técnica da sua equipe. Em caso de dúvidas, contate a organização.`;
}

export function TeamCreatedShareDialog({ team, open, onOpenChange }: Props) {
  const [copied, setCopied] = useState(false);

  if (!team) return null;

  const token = team.registrationToken || team.id;
  const portalUrl = `${window.location.origin}/equipe/inscricao/${token}`;
  const whatsappMessage = buildWhatsAppMessage(team, portalUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopied(true);
      toast.success('Mensagem completa copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copie a mensagem abaixo:', whatsappMessage);
    }
  };

  const handleOpenWhatsApp = () => {
    const phone = team.managerPhone ? team.managerPhone.replace(/\D/g, '') : '';
    const phoneWithCountry = phone.length === 10 || phone.length === 11 ? `55${phone}` : phone;
    const url = phoneWithCountry
      ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(whatsappMessage)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Equipe Cadastrada com Sucesso!
              </DialogTitle>
              <DialogDescription className="text-xs">
                Envie o link de inscrição para o gestor preencher o elenco da equipe.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo da Equipe & Link */}
          <Card className="border-border/80 bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt="" className="w-8 h-8 rounded-full object-contain bg-background p-0.5 border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {team.shortName.slice(0, 3)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.city ? `${team.city} · ` : ''}{team.modality === 'beach' ? 'Vôlei de Praia' : 'Vôlei de Quadra'}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-bold uppercase">{team.shortName}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t text-xs">
                <div className="space-y-1 p-2 rounded-lg bg-background border">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Gestor / Responsável:
                  </span>
                  <span className="font-semibold text-foreground block truncate">
                    {team.managerName || 'Não informado'}
                  </span>
                </div>

                {team.managerPhone && (
                  <div className="space-y-1 p-2 rounded-lg bg-background border">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Contato / Telefone:
                    </span>
                    <span className="font-semibold text-foreground block truncate">
                      {team.managerPhone}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                {team.managerEmail && (
                  <div className="space-y-1 p-2 rounded-lg bg-background border">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      Usuário / Login:
                    </span>
                    <span className="font-medium text-foreground block truncate">{team.managerEmail}</span>
                  </div>
                )}
                {team.managerPassword && (
                  <div className="space-y-1 p-2 rounded-lg bg-background border">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      Senha de Acesso:
                    </span>
                    <span className="font-mono font-bold text-foreground block truncate">
                      {team.managerPassword}
                    </span>
                  </div>
                )}
              </div>

              {/* Link Único */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-primary" />
                  Link Único de Inscrição:
                </span>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background border font-mono text-[11px] text-primary truncate">
                  <span className="truncate flex-1 select-all">{portalUrl}</span>
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                    title="Testar Link em nova aba"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prévia da Mensagem do WhatsApp */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              Mensagem Pronta para WhatsApp:
            </span>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs font-sans text-foreground whitespace-pre-line max-h-36 overflow-y-auto leading-relaxed">
              {whatsappMessage}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs flex-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar Mensagem'}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleOpenWhatsApp}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
