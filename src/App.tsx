import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Marketplace from "./pages/Marketplace";
import AthleteDetail from "./pages/AthleteDetail";
import Portfolio from "./pages/Portfolio";
import MyAthlete from "./pages/MyAthlete";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [isAthlete, setIsAthlete] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      if (!user) return;

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      // Check if user is an athlete (has athlete token)
      const { data: athleteToken } = await supabase
        .from('athlete_tokens')
        .select('athlete_id')
        .eq('athlete_id', user.id)
        .maybeSingle();

      setIsAthlete(!!athleteToken);
      setNeedsOnboarding(!profile);
    }

    checkOnboarding();
  }, [user]);

  if (loading || needsOnboarding === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to onboarding if no profile exists
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Restrict /me to athletes only
  if (location.pathname === '/me' && !isAthlete) {
    return <Navigate to="/marketplace" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const initializeStore = useAppStore((state) => state.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />
      <Route path="/marketplace" element={
        <ProtectedRoute>
          <Navigation />
          <Marketplace />
        </ProtectedRoute>
      } />
      <Route path="/athlete/:slug" element={
        <ProtectedRoute>
          <Navigation />
          <AthleteDetail />
        </ProtectedRoute>
      } />
      <Route path="/portfolio" element={
        <ProtectedRoute>
          <Navigation />
          <Portfolio />
        </ProtectedRoute>
      } />
      <Route path="/me" element={
        <ProtectedRoute>
          <Navigation />
          <MyAthlete />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
