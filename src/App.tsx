import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import Navigation from "@/components/Navigation";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Marketplace from "./pages/Marketplace";
import AthleteDetail from "./pages/AthleteDetail";
import Portfolio from "./pages/Portfolio";
import MyAthlete from "./pages/MyAthlete";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const initializeStore = useAppStore((state) => state.initializeStore);
  const userProfile = useAppStore((state) => state.userProfile);
  const hasCompletedOnboarding = userProfile.displayName && userProfile.isAthlete;

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/marketplace" element={
        <>
          <Navigation />
          <Marketplace />
        </>
      } />
      <Route path="/athlete/:slug" element={
        <>
          <Navigation />
          <AthleteDetail />
        </>
      } />
      <Route path="/portfolio" element={
        <>
          <Navigation />
          <Portfolio />
        </>
      } />
      <Route path="/me" element={
        <>
          <Navigation />
          <MyAthlete />
        </>
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
