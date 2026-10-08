/**
 * BaseOS — Landing Page Pública
 *
 * Entrada comercial da plataforma.
 * Design: Branco / Slate / Navy + Âmbar (#F59E0B)
 * Sem dados inventados. Sem clientes falsos. Sem estatísticas fictícias.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import {
  Trophy,
  Users,
  ClipboardList,
  Shield,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Volleyball,
  Building2,
  LogIn,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';

// ─── Dados Conceituais (sem invenção de clientes/números) ─────────────────────

const FEATURES = [
  {
    icon: Trophy,
    title: 'Campeonatos',
    description:
      'Crie e gerencie competições de voleibol com fases, sorteio, brackets e classificação automática.',
  },
  {
    icon: Users,
    title: 'Equipes e Elencos',
    description:
      'Cadastro completo de equipes, responsáveis e elenco. Portal exclusivo para cada equipe.',
  },
  {
    icon: ClipboardList,
    title: 'Súmulas Digitais',
    description:
      'Registro de partidas, sets e pontuação em tempo real. Geração de súmula em PDF com um clique.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard Operacional',
    description:
      'Visão centralizada de partidas, classificação e estatísticas. Sem planilha, sem papel.',
  },
  {
    icon: Shield,
    title: 'Multi-Organização',
    description:
      'Cada organização tem seu próprio ambiente isolado. Dados, usuários e permissões separados.',
  },
  {
    icon: Building2,
    title: 'Portais por Perfil',
    description:
      'Organizadores, árbitros e equipes acessam exatamente o que precisam. Sem complexidade desnecessária.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Crie sua organização',
    description: 'Registre sua federação, liga ou clube em minutos. Configure o ambiente da sua organização.',
  },
  {
    step: '02',
    title: 'Monte seu campeonato',
    description: 'Defina fases, inscreva equipes, configure o sorteio e a tabela de jogos.',
  },
  {
    step: '03',
    title: 'Opere em tempo real',
    description: 'Gerencie partidas, súmulas e classificação durante a competição, de qualquer dispositivo.',
  },
];

const FOR_WHO = [
  {
    title: 'Organizadores',
    description: 'Gerencie toda a competição: equipes, partidas, súmulas, arbitragem e relatórios.',
    badge: 'Organizador',
    badgeColor: 'bg-blue-950 text-white',
  },
  {
    title: 'Equipes e Responsáveis',
    description: 'Portal exclusivo para sua equipe: elenco, inscrições e acompanhamento das partidas.',
    badge: 'Equipe',
    badgeColor: 'bg-amber-500 text-white',
  },
  {
    title: 'Árbitros e Apontadores',
    description: 'Acesso direto às súmulas digitais e às partidas do dia, sem necessidade de papel.',
    badge: 'Árbitro',
    badgeColor: 'bg-emerald-600 text-white',
  },
];

// ─── Componentes Internos ─────────────────────────────────────────────────────

function NavBar() {
  const { session } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md">
          <BaseOsLogo size="md" showText showSubtitle={false} />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#como-funciona" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Como funciona
          </a>
          <a href="#recursos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Recursos
          </a>
          <a href="#para-quem" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Para quem
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <Button
              asChild
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm h-9 px-5 rounded-full shadow-sm transition-all"
            >
              <Link to={session.user.isPlatformAdmin ? '/master' : '/dashboard'}>
                Acessar plataforma
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900 text-sm font-medium h-9">
                <Link to="/login">
                  <LogIn className="w-4 h-4 mr-1.5" />
                  Entrar
                </Link>
              </Button>
              <Button
                asChild
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm h-9 px-5 rounded-full shadow-sm transition-all"
              >
                <Link to="/login">Começar agora</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto text-center">
        <Badge className="mb-6 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
          Gestão de Competições Esportivas
        </Badge>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
          Gerencie suas competições{' '}
          <span className="text-amber-500">com precisão.</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          BaseOS é a plataforma profissional para organizações esportivas. Do campeonato ao elenco, tudo em um único sistema.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-base h-12 px-8 rounded-full shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
          >
            <Link to="/login">
              Começar agora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 font-semibold text-base h-12 px-8 rounded-full w-full sm:w-auto"
          >
            <Link to="/competicoes-ativas">Ver competições ativas</Link>
          </Button>
        </div>

        {/* Indicadores visuais de credibilidade (sem inventar números) */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          {[
            'Multi-organização',
            'Isolamento de dados (RLS)',
            'Súmulas em PDF',
            'Portal por perfil',
            'Sem limite de equipes',
          ].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Como funciona</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Da criação ao resultado final
          </h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">
            Três etapas para colocar sua competição no ar com o BaseOS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="relative">
              <div className="flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-mono text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
              {/* Conector visual entre steps */}
              <div className="hidden md:block absolute top-6 right-0 w-8 h-px bg-slate-200 translate-x-4" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="recursos" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Recursos</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tudo que uma competição profissional precisa
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-amber-200 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-amber-50 flex items-center justify-center mb-4 transition-colors duration-200">
                  <Icon className="w-5 h-5 text-slate-700 group-hover:text-amber-600 transition-colors duration-200" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ForWhoSection() {
  return (
    <section id="para-quem" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Para quem</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Uma plataforma. Três experiências.
          </h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">
            Cada perfil acessa exatamente o que precisa. Sem complexidade extra.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FOR_WHO.map((item) => (
            <div
              key={item.title}
              className="border border-slate-200 rounded-2xl p-6 hover:border-amber-200 hover:shadow-sm transition-all"
            >
              <Badge className={`${item.badgeColor} text-xs font-semibold mb-4 px-2.5 py-1 rounded-full`}>
                {item.badge}
              </Badge>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-6">
          <Volleyball className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
          Pronto para começar?
        </h2>
        <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
          Acesse o BaseOS e comece a organizar sua próxima competição hoje mesmo.
        </p>
        <Button
          asChild
          size="lg"
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-base h-12 px-10 rounded-full shadow-lg transition-all"
        >
          <Link to="/login">
            Acessar o BaseOS
            <ChevronRight className="w-5 h-5 ml-1.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0A0F1D] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 pb-8 border-b border-white/10">
          <div>
            <BaseOsLogo size="sm" showText showSubtitle={false} />
            <p className="mt-3 text-sm text-slate-500 max-w-xs">
              Plataforma de gestão profissional de competições esportivas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Plataforma</p>
              <ul className="space-y-2">
                {[
                  { label: 'Competições ativas', to: '/competicoes-ativas' },
                  { label: 'Classificação', to: '/classificacao' },
                  { label: 'Entrar', to: '/login' },
                ].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-slate-500 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Suporte</p>
              <ul className="space-y-2">
                {[{ label: 'Central de ajuda', to: '/ajuda' }].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-slate-500 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            2024 BaseOS. Todos os direitos reservados.
          </p>
          <p className="text-xs text-slate-600 font-mono">
            v2.5.0
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <NavBar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <ForWhoSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
