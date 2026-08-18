import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthContext";
import { RequireAuth } from "./components/auth/RequireAuth";
import Index from "./pages/Index";
import MatchesPage from "./pages/MatchesPage";
import MatchSheetPage from "./pages/MatchSheetPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import TeamsPage from "./pages/TeamsPage";
import AthletesPage from "./pages/AthletesPage";
import RefereesPage from "./pages/RefereesPage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";
import CreateMatchPage from "./pages/CreateMatchPage";
import LoginPage from "./pages/LoginPage";
import { CompetitionRegistrationsPage } from "./pages/CompetitionRegistrationsPage";
import { TeamRosterRegistrationPage } from "./pages/TeamRosterRegistrationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Index />} />
            <Route path="/jogos" element={<MatchesPage />} />
            <Route path="/sumulas" element={<MatchSheetPage />} />
            <Route path="/sumulas/:matchId" element={<MatchSheetPage />} />
            <Route path="/equipe/inscricao/:token" element={<TeamRosterRegistrationPage />} />
            <Route path="/login" element={<LoginPage />} />

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
              path="/estatisticas"
              element={
                <RequireAuth roles={['organizer']}>
                  <StatisticsPage />
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
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
