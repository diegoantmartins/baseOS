import React from 'react';
import { Layers, Trophy, Dices, Shuffle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CompetitionTemplateService,
  type CompetitionTemplateMetadata,
} from '@/services/competitionTemplateService';
import { cn } from '@/lib/utils';

export interface FormatTemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  disabled?: boolean;
  className?: string;
}

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  'groups-knockout': Layers,
  'groups-play-in-knockout': Trophy,
  'knockout': Dices,
};

export const FormatTemplateSelector: React.FC<FormatTemplateSelectorProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  disabled = false,
  className = '',
}) => {
  const templates = CompetitionTemplateService.listTemplates();

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Modelos Prontos de Formato (Presets)</h3>
        <p className="text-xs text-muted-foreground">
          Selecione uma estrutura inicial recomendada. Você poderá customizar fases, feeds e regras em seguida.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {templates.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;
          const Icon = TEMPLATE_ICONS[tpl.formatType] || Layers;

          return (
            <button
              key={tpl.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTemplate(tpl.id)}
              className={cn(
                'relative flex flex-col text-left p-4 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                'bg-zinc-900/80 hover:bg-zinc-900 hover:border-amber-500/50',
                isSelected
                  ? 'border-amber-500 ring-1 ring-amber-500/50 bg-amber-500/10'
                  : 'border-border',
              )}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'p-2 rounded-lg',
                    isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-muted-foreground',
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{tpl.name}</h4>
                    <span className="text-[11px] text-zinc-500">
                      {tpl.recommendedTeamsMin} a {tpl.recommendedTeamsMax} equipes recomendadas
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2">
                {tpl.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/60">
                {tpl.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-zinc-500">
                    {tag}
                  </Badge>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
