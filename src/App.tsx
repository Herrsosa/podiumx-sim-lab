import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import Navigation from "@/components/Navigation";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import StravaCallback from "./pages/StravaCallback";
import StravaLinkedResult from "./pages/StravaLinkedResult";
import MarketplaceSkeleton from "@/components/skeletons/MarketplaceSkeleton";
import AthleteDetailSkeleton from '@/components/skeletons/AthleteDetailSkeleton';
import { PortfolioSkeleton } from '@/components/skeletons/PortfolioSkeleton';
import { FeedSkeleton } from '@/components/skeletons/FeedSkeleton';
import { queryClient } from "@/lib/queryClient";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { AuthProvider } from "@/providers/AuthProvider";
import { useAuthLoading, useUser } from "@/store/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Lazy load heavy pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AthleteDetail = lazy(() => import("./pages/AthleteDetail"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MyAthletePage = lazy(() => import("./pages/MyAthletePage"));
const MyAthleteLocker = lazy(() => import("./pages/MyAthlete/Locker"));
const GlobeDemo = lazy(() => import("./pages/GlobeDemo"));
const FeedPage = lazy(() => import("./pages/Feed"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

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
  const isVerifyRoute = location.pathname === '/verify-email';
  const isProtected = requireAuth;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user && onboardingIsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    if (isProtected) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // Check for email confirmation
  if (user && !user.email_confirmed_at && !isVerifyRoute) {
    return <Navigate to="/verify-email" replace />;
  }

  if (user && !user.email_confirmed_at && isVerifyRoute) {
    return <>{children}</>;
  }

  // If verified but on verify page, go to onboarding/app
  if (user && user.email_confirmed_at && isVerifyRoute) {
    return <Navigate to={onboardingCompleted ? "/portfolio" : "/onboarding"} replace />;
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
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/verify-email" element={
        <RouteGuard requireAuth>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <VerifyEmail />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/onboarding" element={
        <RouteGuard requireAuth>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }>
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
      <Route path="/feed" element={
        <RouteGuard>
          <Navigation />
          <Suspense fallback={<FeedSkeleton />}>
            <FeedPage />
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
          <Suspense fallback={<PortfolioSkeleton />}>
            <Portfolio />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/my-athlete" element={<Navigate to="/my-athlete/overview" replace />} />
      <Route path="/my-athlete/overview" element={
        <RouteGuard requireAuth>
          <Navigation />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <MyAthletePage />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/my-athlete/locker" element={
        <RouteGuard requireAuth>
          <Navigation />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <MyAthleteLocker />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/my-athlete/locker/:section" element={
        <RouteGuard requireAuth>
          <Navigation />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <MyAthleteLocker />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/my-athlete/locker/:section/:conversationId" element={
        <RouteGuard requireAuth>
          <Navigation />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <MyAthleteLocker />
          </Suspense>
        </RouteGuard>
      } />
      <Route path="/my-athlete-profile" element={<Navigate to="/my-athlete/overview" replace />} />
      <Route path="/strava/callback" element={
        <RouteGuard requireAuth>
          <StravaCallback />
        </RouteGuard>
      } />
      <Route path="/linked/strava" element={<StravaLinkedResult />} />
      <Route path="/globe-demo" element={
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <GlobeDemo />
        </Suspense>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import { LazyMotion, domAnimation } from "framer-motion";

import { BottomTabBar } from "@/components/BottomTabBar";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <LazyMotion features={domAnimation}>
            <BrowserRouter>
              <AppContent />
              <BottomTabBar />
            </BrowserRouter>
          </LazyMotion>
        </ErrorBoundary>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
