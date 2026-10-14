import React from 'react';
import { Link } from 'react-router-dom';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, ArrowLeft, Printer, Shield } from 'lucide-react';
import { TermsOfUseContent } from '@/components/legal/LegalModals';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-100">
      {/* Header Institucional */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <BaseOsLogo size="md" showText variant="system" />
            </Link>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[10px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10 py-0.5 px-2"
            >
              TERMOS • CONTRATO DE USO
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs h-9 gap-1.5 border-zinc-800 hidden sm:inline-flex"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Imprimir</span>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs h-9 gap-1 text-muted-foreground hover:text-foreground"
            >
              <Link to="/">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Voltar ao Início</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full space-y-8">
        <div className="space-y-3 border-b border-border/60 pb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            <Scale className="w-4 h-4 text-amber-500" />
            <span>Condições Gerais de Serviço</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Termos e Condições de Uso da Plataforma BaseOS
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Última atualização: Outubro de 2026 • Plataforma SaaS BaseOS — Sports Intelligence
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <TermsOfUseContent />
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Saiba como tratamos seus dados pessoais em conformidade com a LGPD.</span>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs border-zinc-800 shrink-0">
            <Link to="/privacidade">Ver Política de Privacidade</Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-zinc-950 py-8 px-4 sm:px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} BaseOS — Sports Intelligence. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/privacidade" className="hover:text-foreground">Política de Privacidade</Link>
            <Link to="/" className="hover:text-foreground">Página Inicial</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
