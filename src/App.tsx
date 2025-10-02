import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useAppStore } from "@/store/useAppStore";
import Navigation from "@/components/Navigation";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import Marketplace from "./pages/Marketplace";
import AthleteDetail from "./pages/AthleteDetail";
import Portfolio from "./pages/Portfolio";
import MyAthlete from "./pages/MyAthlete";
import NotFound from "./pages/NotFound";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_ZGlzY3JlZXQtcmF0dGxlc25ha2UtMzMuY2xlcmsuYWNjb3VudHMuZGV2JA";

const queryClient = new QueryClient();

function AppContent() {
  const initializeStore = useAppStore((state) => state.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        <>
          <SignedOut>
            <Landing />
          </SignedOut>
          <SignedIn>
            <Navigation />
            <Marketplace />
          </SignedIn>
        </>
      } />
      <Route path="/sign-in/*" element={<SignIn />} />
      <Route path="/sign-up/*" element={<SignUp />} />
      
      {/* Protected routes */}
      <Route path="/onboarding" element={
        <SignedIn>
          <Onboarding />
        </SignedIn>
      } />
      <Route path="/marketplace" element={
        <SignedIn>
          <Navigation />
          <Marketplace />
        </SignedIn>
      } />
      <Route path="/athlete/:slug" element={
        <SignedIn>
          <Navigation />
          <AthleteDetail />
        </SignedIn>
      } />
      <Route path="/portfolio" element={
        <SignedIn>
          <Navigation />
          <Portfolio />
        </SignedIn>
      } />
      <Route path="/me" element={
        <SignedIn>
          <Navigation />
          <MyAthlete />
        </SignedIn>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

export default App;
