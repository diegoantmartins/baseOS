import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Shield, FileText, Award, CheckCircle2, Lock, Scale, Mail, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-6 text-xs sm:text-sm text-muted-foreground leading-relaxed pr-2">
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
          <Shield className="w-4 h-4 text-amber-500" />
          <span>Conformidade com a LGPD (Lei Federal nº 13.709/2018)</span>
        </div>
        <p className="text-xs text-slate-300">
          O <strong>BaseOS — Sports Intelligence</strong> tem o compromisso inegociável de proteger a privacidade, a integridade e os dados pessoais de todos os atletas, dirigentes, árbitros e organizadores esportivos cadastrados na plataforma.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">1</span>
          Controlador e Finalidade do Tratamento
        </h3>
        <p>
          O <strong>BaseOS</strong> atua como operador e controlador conjunto com as comissões organizadoras das competições. Os dados pessoais coletados são utilizados <strong>estritamente para a finalidade de gestão desportiva</strong>, compreendendo:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
          <li>Inscrição e validação de elegibilidade de atletas em campeonatos;</li>
          <li>Controle de unicidade desportiva (prevenção de duplicidade de inscrição na mesma competição);</li>
          <li>Emissão de súmulas oficiais homologadas no padrão CBV/FIVB (A4);</li>
          <li>Geração de relatórios de súmula, escala de árbitros e controle disciplinar;</li>
          <li>Divulgação pública de tabelas, pontuações e estatísticas de jogo (sem expor dados sensíveis).</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">2</span>
          Dados Pessoais Coletados e Princípio da Minimização
        </h3>
        <p>
          Coletamos exclusivamente os dados necessários para o cumprimento das normas regulamentares do voleibol:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-1">
            <span className="font-bold text-foreground text-xs block">Atletas Participantes</span>
            <span className="text-[11px] block">
              Nome completo, número de inscrição/CPF (para conferência e validação da identidade desportiva), data de nascimento (para categorias de idade), número da camisa (1 a 99), posição em quadra e foto/escudo da equipe.
            </span>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-1">
            <span className="font-bold text-foreground text-xs block">Dirigentes e Organizadores</span>
            <span className="text-[11px] block">
              Nome completo, e-mail institucional, número de WhatsApp/telefone para contato oficial e credenciais de autenticação criptografadas.
            </span>
          </div>
        </div>
        <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
          <strong>Regra Inegociável de Proteção:</strong> O BaseOS <strong>NUNCA</strong> expõe publicamente CPF, telefone, e-mail ou dados de contato de atletas nas páginas abertas do portal.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">3</span>
          Segurança, Isolamento Multi-Tenant e Criptografia
        </h3>
        <p>
          Adotamos as melhores práticas técnicas mundiais de cibersegurança:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
          <li><strong>Criptografia em Trânsito:</strong> Toda comunicação é protegida por SSL/TLS 1.3 com criptografia de ponta a ponta;</li>
          <li><strong>Row-Level Security (RLS):</strong> Isolamento lógico rigoroso no banco de dados, garantindo que dirigentes acessem unicamente suas próprias equipes;</li>
          <li><strong>Políticas de Acesso (RBAC):</strong> Perfis restritos para organizadores, árbitros, apontadores e dirigentes com logs de auditoria operacional.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">4</span>
          Direitos do Titular dos Dados (Art. 18 da LGPD)
        </h3>
        <p>
          Qualquer atleta ou dirigente cadastrado pode, a qualquer momento:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
          <li>Confirmar o tratamento e acessar seus dados cadastrais;</li>
          <li>Solicitar correção de dados incompletos ou desatualizados via dirigente da equipe;</li>
          <li>Solicitar anonimização ou exclusão após o encerramento do torneio e quitação das obrigações desportivas.</li>
        </ul>
        <p className="text-xs pt-1">
          Para solicitações formais de privacidade, entre em contato com nosso Encarregado de Proteção de Dados (DPO) através do e-mail: <strong className="text-foreground">contato@baseos.online</strong>.
        </p>
      </div>
    </div>
  );
}

export function TermsOfUseContent() {
  return (
    <div className="space-y-6 text-xs sm:text-sm text-muted-foreground leading-relaxed pr-2">
      <div className="p-4 rounded-xl border border-border bg-zinc-900/40 space-y-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider font-mono">
          <Scale className="w-4 h-4 text-amber-400" />
          <span>Termos e Condições Gerais de Uso da Plataforma BaseOS</span>
        </div>
        <p className="text-xs text-slate-300">
          Bem-vindo ao <strong>BaseOS</strong>. Ao acessar o sistema, navegar pelas páginas públicas ou utilizar os portais dedicados de organizadores, equipes e arbitragem, você concorda expressamente com os seguintes termos.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">1</span>
          Natureza da Plataforma
        </h3>
        <p>
          O <strong>BaseOS</strong> é um software como serviço (SaaS) especializado no ecossistema esportivo de voleibol de quadra e praia. A plataforma fornece infraestrutura tecnológica para sorteios (Draw Arena), gestão de inscrições, geração de tabelas, apontamento de partidas e emissão de súmulas oficiais.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">2</span>
          Responsabilidades dos Organizadores
        </h3>
        <p>
          As comissões organizadoras de cada campeonato são responsáveis pela definição dos regulamentos específicos, homologação final dos elencos inscritos, confirmação dos chaveamentos da Draw Arena e designação do quadro de arbitragem.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">3</span>
          Responsabilidades dos Dirigentes de Equipe
        </h3>
        <p>
          Os dirigentes e técnicos que utilizam o link oficial de auto-inscrição de equipe responsabilizam-se civil e desportivamente pela veracidade dos dados informados no elenco (nomes, documentos, atestados e numeração de camisa), bem como pelo respeito aos limites de elenco e prazos limites estipulados pela organização.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">4</span>
          Validade e Fé Pública das Súmulas Oficiais
        </h3>
        <p>
          As súmulas oficiais emitidas pelo BaseOS em formato A4 oficial (PDF) reproduzem fidedignamente os eventos apontados em quadra pela equipe de arbitragem. Uma vez homologada pela organização, a súmula possui validade desportiva oficial para cômputo de pontuação, desempates e histórico estatístico.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">5</span>
          Propriedade Intelectual
        </h3>
        <p>
          A marca BaseOS, o layout da Draw Arena, os algoritmos matemáticos de desempate e a arquitetura visual da plataforma são de propriedade exclusiva do BaseOS. É estritamente vedada a reprodução ou engenharia reversa sem autorização prévia por escrito.
        </p>
      </div>
    </div>
  );
}

export function TechnicalRegulationsContent() {
  return (
    <div className="space-y-6 text-xs sm:text-sm text-muted-foreground leading-relaxed pr-2">
      <div className="p-4 rounded-xl border border-border bg-zinc-900/40 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Critérios Canônicos de Voleibol CBV / FIVB</span>
        </div>
        <p className="text-xs text-slate-300">
          O <strong>BaseOS</strong> implementa com precisão matemática estrita os regulamentos desportivos oficiais da Confederação Brasileira de Voleibol (CBV) e da Federação Internacional de Voleibol (FIVB).
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">1</span>
          Sistema Oficial de Pontuação de Partidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <span className="font-bold text-emerald-400 block font-mono">Vitória por 3-0 ou 3-1:</span>
            <span>Vencedor: <strong>3 pontos</strong> | Perdedor: <strong>0 pontos</strong></span>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <span className="font-bold text-amber-400 block font-mono">Vitória por 3-2 (Tie-break):</span>
            <span>Vencedor: <strong>2 pontos</strong> | Perdedor: <strong>1 ponto</strong></span>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <span className="font-bold text-rose-400 block font-mono">Derrota por Não Comparecimento (W.O.):</span>
            <span>Equipe faltosa: <strong>0 pontos (0-3: 0-25, 0-25, 0-25)</strong></span>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <span className="font-bold text-blue-400 block font-mono">Competições em 3 Sets (2-0 / 2-1):</span>
            <span>Vitória 2-0: <strong>3 pontos</strong> | Vitória 2-1: <strong>2 pontos (1 pt ao perdedor)</strong></span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">2</span>
          Hierarquia Canônica de Desempate
        </h3>
        <p>
          Em caso de empate na classificação geral ou na fase de grupos, o BaseOS aplica a ordem estrita de desempate regulamentar:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs">
          <li><strong>Maior Número de Vitórias (V):</strong> A equipe com mais vitórias prevalece;</li>
          <li><strong>Maior Pontuação Acumulada (PTS):</strong> Cômputo dos pontos de vitória (3/2/1/0);</li>
          <li><strong>Set Average (Razão de Sets):</strong> Quociente entre total de sets ganhos e sets perdidos (Sets Pró / Sets Contra);</li>
          <li><strong>Points Average (Razão de Pontos):</strong> Quociente entre pontos marcados e pontos sofridos (Pontos Pró / Pontos Contra);</li>
          <li><strong>Confronto Direto:</strong> Resultado do confronto entre as equipes empatadas (em empate entre duas equipes);</li>
          <li><strong>Sorteio Determinístico Auditável:</strong> Caso o empate persista em todos os índices acima, utiliza-se sorteio auditável gravado.</li>
        </ol>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-zinc-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">3</span>
          Regulamentação de Atletas e Elenco
        </h3>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
          <li>Cada equipe deve designar obrigatoriamente <strong>1 Capitão de Quadra</strong>;</li>
          <li>Permitida a inscrição de até <strong>2 Líberos</strong> (com camisas de cor contrastante com o uniforme principal);</li>
          <li>Numeração de camisas autorizada entre <strong>1 e 99</strong>, sem duplicidade dentro da mesma equipe;</li>
          <li>Travamento automático do elenco a partir do momento em que o campeonato inicia ou no prazo estipulado pelo organizador.</li>
        </ul>
      </div>
    </div>
  );
}

export function PrivacyPolicyModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-6 rounded-2xl">
        <DialogHeader className="border-b border-border/60 pb-3">
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span>Política de Privacidade e Proteção de Dados (LGPD)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Conheça as diretrizes de tratamento e proteção de dados no BaseOS (Lei Federal nº 13.709/2018).
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <PrivacyPolicyContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TermsOfUseModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-6 rounded-2xl">
        <DialogHeader className="border-b border-border/60 pb-3">
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>Termos e Condições Gerais de Uso</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Direitos e deveres de organizadores, equipes, árbitros e usuários na plataforma BaseOS.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <TermsOfUseContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TechnicalRegulationsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800 p-6 rounded-2xl">
        <DialogHeader className="border-b border-border/60 pb-3">
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Critérios Técnicos e Regulamentares CBV / FIVB</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Parâmetros oficiais de pontuação, desempate e normas de voleibol implementados na plataforma.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <TechnicalRegulationsContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
