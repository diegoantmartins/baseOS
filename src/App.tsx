import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthContext";
import { RequireAuth } from "./components/auth/RequireAuth";
import { useAuth } from "./components/auth/useAuth";
import { TeamContextRedirector } from "./components/auth/TeamContextRedirector";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { RouteLoadingFallback } from "./components/layout/RouteLoadingFallback";

// Lazy-loaded routes para otimização de code-splitting e performance inicial
const Index = lazy(() => import("./pages/Index"));
const MatchesPage = lazy(() => import("./pages/MatchesPage"));
const MatchSheetPage = lazy(() => import("./pages/MatchSheetPage"));
const CompetitionsPage = lazy(() => import("./pages/CompetitionsPage"));
const ActiveCompetitionsPage = lazy(() => import("./pages/ActiveCompetitionsPage"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const VenuesPage = lazy(() => import("./pages/VenuesPage"));
const AthletesPage = lazy(() => import("./pages/AthletesPage"));
const RefereesPage = lazy(() => import("./pages/RefereesPage"));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const DrawPage = lazy(() => import("./pages/DrawPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CreateMatchPage = lazy(() => import("./pages/CreateMatchPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const StandingsPage = lazy(() => import("./pages/StandingsPage"));
const ModalitiesPage = lazy(() => import("./pages/ModalitiesPage"));
const PeoplePage = lazy(() => import("./pages/PeoplePage"));
const CompetitionRegistrationsPage = lazy(() =>
  import("./pages/CompetitionRegistrationsPage").then((m) => ({ default: m.CompetitionRegistrationsPage }))
);
const TeamRosterRegistrationPage = lazy(() => import("./pages/TeamRosterRegistrationPage"));
const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage"));
const DocumentEditorPage = lazy(() => import("./pages/DocumentEditorPage"));
const PublicCompetitionPage = lazy(() => import("./pages/PublicCompetitionPage"));
const OrganizationsPage = lazy(() => import("./pages/OrganizationsPage"));
const OrganizationDetailPage = lazy(() => import("./pages/OrganizationDetailPage"));
const OrganizationPortalPage = lazy(() => import("./pages/OrganizationPortalPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Portal Unificado por Perfil (Fase 10)
const PortalRouter = lazy(() =>
  import("./components/portal/PortalRouter").then((m) => ({ default: m.PortalRouter }))
);
const TeamPortalGuard = lazy(() =>
  import("./components/portal/TeamPortalGuard").then((m) => ({ default: m.TeamPortalGuard }))
);
const TeamPortalLayout = lazy(() =>
  import("./components/portal/TeamPortalLayout").then((m) => ({ default: m.TeamPortalLayout }))
);
const TeamPortalPage = lazy(() =>
  import("./pages/portal/TeamPortalPage").then((m) => ({ default: m.TeamPortalPage }))
);

const queryClient = new QueryClient();

import { RootRedirector } from "./components/routing/RootRedirector";
import { TenantRouteGuard } from "./components/routing/TenantRouteGuard";
import { TenantProvider } from "./contexts/TenantContext";
import { RequirePlatformAdmin } from "./components/auth/RequirePlatformAdmin";

const MasterDashboard = lazy(() => import("./pages/master/MasterDashboard"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <TenantProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Públicas: resultados, classificação, portal da equipe */}
                <Route path="/c/:slug" element={<PublicCompetitionPage />} />
                <Route path="/" element={<RootRedirector />} />
                <Route path="/competicoes-ativas" element={<ActiveCompetitionsPage />} />
                <Route path="/classificacao" element={<StandingsPage />} />
                <Route path="/standings" element={<StandingsPage />} />
                {/* Rota Central de Entrada por Perfil (Fase 10) */}
                <Route path="/portal" element={<PortalRouter />} />

                {/* Portal Exclusivo da Equipe (Fase 10) */}
                <Route
                  path="/portal/equipe"
                  element={
                    <TeamPortalGuard>
                      <TeamPortalLayout>
                        <TeamPortalPage />
                      </TeamPortalLayout>
                    </TeamPortalGuard>
                  }
                />
                <Route
                  path="/portal/equipe/*"
                  element={
                    <TeamPortalGuard>
                      <TeamPortalLayout>
                        <TeamPortalPage />
                      </TeamPortalLayout>
                    </TeamPortalGuard>
                  }
                />

                {/* Team Context Redirector e Links canônicos por token (Gate 2A.3) */}
                <Route path="/equipe" element={<TeamContextRedirector />} />
                <Route path="/equipe/:token" element={<TeamRosterRegistrationPage />} />
                <Route path="/equipe/inscricao/:token" element={<TeamRosterRegistrationPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/ajuda" element={<HelpCenterPage />} />
                <Route path="/help" element={<HelpCenterPage />} />

                {/* Operacionais: /dashboard exclusivo para administradores e organizadores */}
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth roles={['admin', 'organizer']}>
                      <Index />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/jogos"
                  element={
                    <RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>
                      <MatchesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/sumulas"
                  element={
                    <RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>
                      <MatchSheetPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/sumulas/:matchId"
                  element={
                    <RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>
                      <TenantRouteGuard>
                        <MatchSheetPage />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />

                {/* Gestão (apenas organizador) */}
                <Route
                  path="/jogos/novo"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <CreateMatchPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/competicoes"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TenantRouteGuard>
                        <CompetitionsPage />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/competicoes/:id"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TenantRouteGuard>
                        <CompetitionsPage />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/competicoes/:id/*"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TenantRouteGuard>
                        <CompetitionsPage />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/competicoes/:id/inscricoes"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TenantRouteGuard>
                        <CompetitionRegistrationsPage />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/organizacoes"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <OrganizationsPage />
                    </RequireAuth>
                  }
                />
                {/* Master Control Layer (Exclusivo Platform Admin) */}
                <Route
                  path="/master"
                  element={
                    <RequireAuth roles={['admin']}>
                      <RequirePlatformAdmin>
                        <MasterDashboard />
                      </RequirePlatformAdmin>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/organizacoes/:organizationId"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TenantRouteGuard>
                        <OrganizationDetailPage />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />
                {/* Portal da Organização — /org/:organizationId */}
                <Route
                  path="/org/:organizationId"
                  element={
                    <RequireAuth roles={['admin', 'organizer']}>
                      <OrganizationPortalPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/organizacoes/:organizationId/membros"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TenantRouteGuard>
                        <OrganizationDetailPage defaultTab="members" />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/equipes"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TeamsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/modalidades"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <ModalitiesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/pessoas"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <PeoplePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/locais"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <VenuesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/venues"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <VenuesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/atletas"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <AthletesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/arbitros"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <RefereesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/arbitragem"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <RefereesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/estatisticas"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <StatisticsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/relatorios"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <ReportsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <ReportsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/sorteio"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <DrawPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/sorteio/:competitionId"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TenantRouteGuard>
                        <DrawPage />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/configuracoes"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <SettingsPage />
                    </RequireAuth>
                  }
                />

                {/* Rotas do Editor de Documentos (comprovadamente existentes) */}
                <Route
                  path="/documentos/editor"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <DocumentEditorPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/documentos/editor/:matchId"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TenantRouteGuard>
                        <DocumentEditorPage />
                      </TenantRouteGuard>
                    </RequireAuth>
                  }
                />

                {/* Legacy routes (manutenção de redirecionamentos antigos) */}
                {/* /matches: operacional — bloqueia role='team' */}
                <Route
                  path="/matches"
                  element={
                    <RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>
                      <MatchesPage />
                    </RequireAuth>
                  }
                />
                {/* /match-sheets: operacional — súmulas digitais exigem papel operacional */}
                <Route
                  path="/match-sheets"
                  element={
                    <RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>
                      <MatchSheetPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/competitions"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <CompetitionsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/teams"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <TeamsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/athletes"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <AthletesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/referees"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <RefereesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/statistics"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <StatisticsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <SettingsPage />
                    </RequireAuth>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </TenantProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
