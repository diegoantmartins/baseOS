import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthContext";
import { RequireAuth } from "./components/auth/RequireAuth";
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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Públicas */}
                <Route path="/" element={<ActiveCompetitionsPage />} />
                <Route path="/competicoes-ativas" element={<ActiveCompetitionsPage />} />
                <Route path="/dashboard" element={<Index />} />
                <Route path="/jogos" element={<MatchesPage />} />
                <Route path="/classificacao" element={<StandingsPage />} />
                <Route path="/standings" element={<StandingsPage />} />
                <Route path="/sumulas" element={<MatchSheetPage />} />
                <Route path="/sumulas/:matchId" element={<MatchSheetPage />} />
                <Route path="/equipe/inscricao/:token" element={<TeamRosterRegistrationPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/ajuda" element={<HelpCenterPage />} />
                <Route path="/help" element={<HelpCenterPage />} />

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
                      <CompetitionsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/competicoes/:id/inscricoes"
                  element={
                    <RequireAuth roles={['organizer']}>
                      <CompetitionRegistrationsPage />
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
                      <DrawPage />
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
                      <DocumentEditorPage />
                    </RequireAuth>
                  }
                />

                {/* Legacy routes (manutenção de redirecionamentos antigos) */}
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/match-sheets" element={<MatchSheetPage />} />
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
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
