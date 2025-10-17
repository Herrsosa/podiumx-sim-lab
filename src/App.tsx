import { useEffect, useState, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import Navigation from "@/components/Navigation";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import StravaCallback from "./pages/StravaCallback";
import MarketplaceSkeleton from "@/components/skeletons/MarketplaceSkeleton";
import AthleteDetailSkeleton from "@/components/skeletons/AthleteDetailSkeleton";
import { queryClient } from "@/lib/queryClient";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { AuthProvider } from "@/providers/AuthProvider";
import { useAuthLoading, useUser } from "@/store/auth";

// Lazy load heavy pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AthleteDetail = lazy(() => import("./pages/AthleteDetail"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const MyAthlete = lazy(() => import("./pages/MyAthletePage"));
const Marketplace = lazy(() => import("./pages/Marketplace"));

interface RouteGuardProps {
  requireAuth?: boolean;
  children: React.ReactNode;
}

function RouteGuard({ requireAuth = false, children }: RouteGuardProps) {
  const user = useUser();
  const loading = useAuthLoading();
  const location = useLocation();
  const { onboardingCompleted, needsOnboarding, isLoading: onboardingIsLoading } = useOnboardingStatus();

  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const isProtected = requireAuth;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user && onboardingIsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    if (isProtected) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  if (!onboardingCompleted && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (onboardingCompleted && isOnboardingRoute) {
    return <Navigate to="/portfolio" replace />;
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
        <RouteGuard requireAuth>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <Onboarding />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/marketplace" element={
        <RouteGuard>
          <Navigation />
          <Suspense fallback={<MarketplaceSkeleton />}>
            <Marketplace />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/athlete/:slug" element={
        <RouteGuard>
          <Navigation />
          <Suspense fallback={<AthleteDetailSkeleton />}>
            <AthleteDetail />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/portfolio" element={
        <RouteGuard requireAuth>
          <Navigation />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <Portfolio />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/my-athlete-profile" element={
        <RouteGuard requireAuth>
          <Navigation />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <MyAthlete />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/strava/callback" element={
        <RouteGuard requireAuth>
          <StravaCallback />
        </RouteGuard>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
