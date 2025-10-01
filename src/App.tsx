import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import Navigation from "@/components/Navigation";
import Marketplace from "./pages/Marketplace";
import AthleteDetail from "./pages/AthleteDetail";
import Portfolio from "./pages/Portfolio";
import MyAthlete from "./pages/MyAthlete";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const initializeStore = useAppStore((state) => state.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Marketplace />} />
        <Route path="/athlete/:slug" element={<AthleteDetail />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/me" element={<MyAthlete />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
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
