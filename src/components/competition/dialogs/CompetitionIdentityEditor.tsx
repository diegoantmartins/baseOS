/**
 * BaseOS — CompetitionIdentityEditor
 *
 * Componente modular para gestão da identidade visual da competição
 * e dos seus apoiadores/patrocinadores oficiais.
 *
 * Fronteiras de Domínio:
 * 1. Pertence EXCLUSIVAMENTE à Competição.
 * 2. BaseOS NÃO é patrocinador (atribuição separada).
 * 3. Sanitiza URLs externas (http/https apenas).
 * 4. Reutiliza compressImageToDataUrl para logos leves.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Plus,
  Pencil,
  Trophy,
  Shield,
  Sparkles,
  Link as LinkIcon,
  Building2,
} from 'lucide-react';
import { compressImageToDataUrl } from '@/lib/imageUtils';
import { sanitizeExternalUrl } from '@/lib/security';
import type { CompetitionSupporter, CompetitionSupporterTier } from '@/types/entities';
import { toast } from 'sonner';

export interface CompetitionIdentityEditorProps {
  logoUrl?: string;
  onLogoChange: (url?: string) => void;
  supporters: CompetitionSupporter[];
  onSupportersChange: (supporters: CompetitionSupporter[]) => void;
  disabled?: boolean;
}

const TIER_CONFIG: Record<CompetitionSupporterTier, { label: string; badgeClass: string }> = {
  master: {
    label: 'Master',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  official: {
    label: 'Oficial',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  support: {
    label: 'Apoio',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  media: {
    label: 'Mídia',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
};

export function CompetitionIdentityEditor({
  logoUrl,
  onLogoChange,
  supporters,
  onSupportersChange,
  disabled = false,
}: CompetitionIdentityEditorProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Estado do formulário de apoiador (Adicionar / Editar)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [supporterName, setSupporterName] = useState('');
  const [supporterTier, setSupporterTier] = useState<CompetitionSupporterTier | 'none'>('none');
  const [supporterWebsite, setSupporterWebsite] = useState('');
  const [supporterLogoUrl, setSupporterLogoUrl] = useState<string | undefined>();
  const [uploadingSupporterLogo, setUploadingSupporterLogo] = useState(false);

  // Upload do Logo Oficial da Competição
  const handleLogoFile = async (file?: File) => {
    if (!file || disabled) return;
    setUploadingLogo(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      onLogoChange(compressed.dataUrl);
      toast.success('Logo oficial da competição carregado com sucesso!');
    } catch {
      toast.error('Não foi possível processar a imagem do logo.', {
        description: 'Envie um arquivo PNG, JPG, WebP ou SVG válido.',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Upload do Logo de Apoiador
  const handleSupporterLogoFile = async (file?: File) => {
    if (!file) return;
    setUploadingSupporterLogo(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setSupporterLogoUrl(compressed.dataUrl);
      toast.success('Logo do apoiador carregado!');
    } catch {
      toast.error('Erro ao processar logo do apoiador.');
    } finally {
      setUploadingSupporterLogo(false);
    }
  };

  // Abrir formulário para novo apoiador
  const handleOpenNewSupporter = () => {
    setEditingId(null);
    setSupporterName('');
    setSupporterTier('none');
    setSupporterWebsite('');
    setSupporterLogoUrl(undefined);
    setIsFormOpen(true);
  };

  // Abrir formulário para editar apoiador existente
  const handleOpenEditSupporter = (supporter: CompetitionSupporter) => {
    setEditingId(supporter.id);
    setSupporterName(supporter.name);
    setSupporterTier(supporter.tier || 'none');
    setSupporterWebsite(supporter.websiteUrl || '');
    setSupporterLogoUrl(supporter.logoUrl);
    setIsFormOpen(true);
  };

  const handleCancelSupporterForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  // Salvar apoiador (novo ou editado)
  const handleSaveSupporter = () => {
    const trimmedName = supporterName.trim();
    if (!trimmedName) {
      toast.error('O nome do apoiador é obrigatório.');
      return;
    }

    const cleanUrl = sanitizeExternalUrl(supporterWebsite);
    if (supporterWebsite.trim() && !cleanUrl) {
      toast.error('URL do apoiador inválida. Insira um endereço web válido (ex: https://empresa.com.br).');
      return;
    }

    const tierValue = supporterTier === 'none' ? undefined : supporterTier;

    if (editingId) {
      // Atualização
      const updated = supporters.map((s) => {
        if (s.id === editingId) {
          return {
            ...s,
            name: trimmedName,
            tier: tierValue,
            websiteUrl: cleanUrl,
            logoUrl: supporterLogoUrl,
          };
        }
        return s;
      });
      onSupportersChange(updated);
      toast.success(`Apoiador "${trimmedName}" atualizado!`);
    } else {
      // Novo apoiador
      const newSupporter: CompetitionSupporter = {
        id: `supporter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmedName,
        tier: tierValue,
        websiteUrl: cleanUrl,
        logoUrl: supporterLogoUrl,
        order: supporters.length,
      };
      onSupportersChange([...supporters, newSupporter]);
      toast.success(`Apoiador "${trimmedName}" adicionado!`);
    }

    setIsFormOpen(false);
    setEditingId(null);
  };

  // Remover apoiador
  const handleRemoveSupporter = (id: string) => {
    const target = supporters.find((s) => s.id === id);
    const updated = supporters.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx }));
    onSupportersChange(updated);
    toast.success(`Apoiador "${target?.name || ''}" removido.`);
  };

  // Reordenar apoiadores (Mover para cima)
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const items = [...supporters];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    const reordered = items.map((s, idx) => ({ ...s, order: idx }));
    onSupportersChange(reordered);
  };

  // Reordenar apoiadores (Mover para baixo)
  const handleMoveDown = (index: number) => {
    if (index >= supporters.length - 1) return;
    const items = [...supporters];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    const reordered = items.map((s, idx) => ({ ...s, order: idx }));
    onSupportersChange(reordered);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. IDENTIDADE VISUAL OFICIAL DA COMPETIÇÃO ── */}
      <div className="p-4 rounded-xl border border-border bg-zinc-900/60 space-y-3.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Logo Oficial da Competição
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          O logo oficial identifica a competição no cabeçalho operacional, no Portal Público do Espectador
          e no Portal das Equipes.
        </p>

        <div className="flex items-center gap-4 pt-1">
          {logoUrl ? (
            <div className="relative group">
              <img
                src={logoUrl}
                alt="Logo da competição"
                className="w-16 h-16 rounded-xl object-contain bg-zinc-950 p-1.5 border border-border"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-zinc-500">
              <Trophy className="w-6 h-6 opacity-60" />
              <span className="text-[9px] uppercase font-mono mt-1">Sem logo</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="competition-logo-input"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-zinc-900 text-xs font-medium text-foreground cursor-pointer hover:bg-zinc-800 transition-colors ${
                disabled || uploadingLogo ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-zinc-400" />
              {uploadingLogo ? 'Comprimindo...' : logoUrl ? 'Substituir logo' : 'Enviar logo oficial'}
            </Label>
            <input
              id="competition-logo-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={disabled || uploadingLogo}
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
            />

            {logoUrl && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onLogoChange(undefined)}
                className="block text-[11px] text-red-400 hover:text-red-300 hover:underline disabled:opacity-50"
              >
                Remover logo oficial
              </button>
            )}
            <p className="text-[10px] text-zinc-500">
              Formatos recomendados: PNG, JPG ou WebP (redimensionado automaticamente).
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. APOIADORES E PATROCINADORES DA COMPETIÇÃO ── */}
      <div className="p-4 rounded-xl border border-border bg-zinc-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Apoiadores e Patrocinadores do Evento
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Empresas e marcas patrocinadoras vinculadas exclusivamente a esta competição.
            </p>
          </div>

          {!isFormOpen && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={handleOpenNewSupporter}
              className="h-8 text-xs gap-1.5 border-border bg-zinc-900 text-foreground hover:bg-zinc-800 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Apoiador
            </Button>
          )}
        </div>

        {/* Formulário Embutido de Adição/Edição de Apoiador */}
        {isFormOpen && (
          <div className="p-3.5 rounded-xl border border-border bg-zinc-950 space-y-3.5 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                {editingId ? 'Editar Apoiador' : 'Novo Apoiador do Evento'}
              </span>
              <button
                type="button"
                onClick={handleCancelSupporterForm}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-zinc-400">
                  Nome da Marca / Empresa *
                </Label>
                <Input
                  value={supporterName}
                  onChange={(e) => setSupporterName(e.target.value)}
                  placeholder="Ex.: Banco do Vôlei"
                  className="h-8 text-xs bg-zinc-900 border-border"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-zinc-400">
                  Cota / Papel (Tier)
                </Label>
                <Select
                  value={supporterTier}
                  onValueChange={(val) => setSupporterTier(val as CompetitionSupporterTier | 'none')}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-border">
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-border">
                    <SelectItem value="none">Sem categoria específica</SelectItem>
                    <SelectItem value="master">Patrocinador Master</SelectItem>
                    <SelectItem value="official">Patrocinador Oficial</SelectItem>
                    <SelectItem value="support">Apoiador Institucional</SelectItem>
                    <SelectItem value="media">Parceiro de Mídia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-zinc-400 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3 text-zinc-400" /> Link do Website (Opcional)
                </Label>
                <Input
                  value={supporterWebsite}
                  onChange={(e) => setSupporterWebsite(e.target.value)}
                  placeholder="https://exemplo.com.br"
                  className="h-8 text-xs bg-zinc-900 border-border font-mono text-[11px]"
                />
                <span className="text-[10px] text-zinc-500 block">
                  Apenas links seguros (http/https) serão apresentados no portal.
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-zinc-400">
                  Logo da Marca (Opcional)
                </Label>
                <div className="flex items-center gap-2.5">
                  {supporterLogoUrl ? (
                    <img
                      src={supporterLogoUrl}
                      alt="Logo do apoiador"
                      className="w-8 h-8 rounded-lg object-contain bg-zinc-900 p-0.5 border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-border flex items-center justify-center text-zinc-500 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                  )}
                  <Label
                    htmlFor="supporter-logo-input"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-zinc-900 text-[11px] font-medium text-foreground cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <Upload className="w-3 h-3 text-zinc-400" />
                    {uploadingSupporterLogo ? 'Carregando...' : supporterLogoUrl ? 'Alterar' : 'Enviar logo'}
                  </Label>
                  <input
                    id="supporter-logo-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={uploadingSupporterLogo}
                    onChange={(e) => handleSupporterLogoFile(e.target.files?.[0])}
                  />
                  {supporterLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setSupporterLogoUrl(undefined)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelSupporterForm}
                className="h-7 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSupporter}
                className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
              >
                {editingId ? 'Salvar Alterações' : 'Adicionar Apoiador'}
              </Button>
            </div>
          </div>
        )}

        {/* Listagem Ordenada de Apoiadores */}
        {supporters.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-border bg-zinc-950/40">
            <Shield className="w-7 h-7 text-zinc-600 mx-auto mb-1.5 opacity-60" />
            <p className="text-xs font-medium text-foreground">Nenhum apoiador cadastrado</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
              Adicione patrocinadores para exibir suas marcas no portal público e nos boletins oficiais.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {supporters.map((sup, index) => {
              const tierInfo = sup.tier ? TIER_CONFIG[sup.tier] : null;
              const safeUrl = sanitizeExternalUrl(sup.websiteUrl);

              return (
                <div
                  key={sup.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-zinc-950 hover:border-zinc-700 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Botões de Reordenação */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={disabled || index === 0}
                        onClick={() => handleMoveUp(index)}
                        className="p-0.5 rounded text-zinc-500 hover:text-foreground disabled:opacity-20 transition-colors"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || index === supporters.length - 1}
                        onClick={() => handleMoveDown(index)}
                        className="p-0.5 rounded text-zinc-500 hover:text-foreground disabled:opacity-20 transition-colors"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Logo ou Ícone */}
                    {sup.logoUrl ? (
                      <img
                        src={sup.logoUrl}
                        alt={sup.name}
                        className="w-9 h-9 rounded-lg object-contain bg-zinc-900 p-0.5 border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-border flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                        {sup.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Nome e Metadados */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                          {sup.name}
                        </span>
                        {tierInfo && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] py-0 px-1.5 h-4 font-normal ${tierInfo.badgeClass}`}
                          >
                            {tierInfo.label}
                          </Badge>
                        )}
                      </div>

                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-amber-400 transition-colors mt-0.5 truncate max-w-[250px]"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{safeUrl.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Ações de Edição e Remoção */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => handleOpenEditSupporter(sup)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      title="Editar apoiador"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => handleRemoveSupporter(sup.id)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Remover apoiador"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
