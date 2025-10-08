import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Suspense, lazy } from "react";
import Navigation from "@/components/Navigation";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";
import StravaCallback from "./pages/StravaCallback";

// Lazy load heavy pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AthleteDetail = lazy(() => import("./pages/AthleteDetail"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const MyAthlete = lazy(() => import("./pages/MyAthlete"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    async function checkUserStatus() {
      if (!user) return;

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      // If no profile at all, they need onboarding
      if (!profile) {
        if (location.pathname !== '/onboarding') {
          setRedirectPath('/onboarding');
        } else {
          setRedirectPath(null); // Already on onboarding, no redirect needed
        }
        setAuthCheckComplete(true);
        return;
      }

      // Check if user is an athlete (has athlete_tokens)
      const { data: athleteToken } = await supabase
        .from('athlete_tokens')
        .select('athlete_id')
        .eq('athlete_id', user.id)
        .maybeSingle();

      // Check if user has any holdings
      const { data: holdings } = await supabase
        .from('holdings')
        .select('qty')
        .eq('user_id', user.id)
        .gt('qty', 0)
        .limit(1)
        .maybeSingle();

      // Determine if user needs onboarding (no athlete token AND no holdings)
      const needsOnboarding = !athleteToken && !holdings;

      if (needsOnboarding && location.pathname !== '/onboarding') {
        setRedirectPath('/onboarding');
      } else if (!needsOnboarding && location.pathname === '/onboarding') {
        // User completed onboarding, redirect to appropriate page
        if (athleteToken) {
          setRedirectPath('/me');
        } else {
          setRedirectPath('/marketplace');
        }
      } else {
        setRedirectPath(null);
      }

      setAuthCheckComplete(true);
    }

    checkUserStatus();
  }, [user, location.pathname]);

  if (loading || !authCheckComplete) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
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
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <Onboarding />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/marketplace" element={
        <>
          <Navigation />
          <Marketplace />
        </>
      } />
      <Route path="/athlete/:slug" element={
        <>
          <Navigation />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <AthleteDetail />
          </Suspense>
        </>
      } />
      <Route path="/portfolio" element={
        <ProtectedRoute>
          <Navigation />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <Portfolio />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/me" element={
        <ProtectedRoute>
          <Navigation />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <MyAthlete />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/strava/callback" element={
        <ProtectedRoute>
          <StravaCallback />
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
