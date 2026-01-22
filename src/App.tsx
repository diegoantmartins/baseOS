import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MatchesPage from "./pages/MatchesPage";
import MatchSheetPage from "./pages/MatchSheetPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import TeamsPage from "./pages/TeamsPage";
import AthletesPage from "./pages/AthletesPage";
import RefereesPage from "./pages/RefereesPage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/match-sheets" element={<MatchSheetPage />} />
          <Route path="/competitions" element={<CompetitionsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/athletes" element={<AthletesPage />} />
          <Route path="/referees" element={<RefereesPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
