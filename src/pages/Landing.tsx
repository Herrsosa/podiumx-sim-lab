import { useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePaginatedAthletes } from "@/hooks/usePaginatedAthletes";
import { useMarketplaceCharts } from "@/hooks/useMarketplaceCharts";
import { useAthleteHolderCounts } from "@/hooks/useAthleteHolderCounts";
import { AthleteCard } from "@/components/AthleteCard";
import { ProofOfSweatFeed } from "@/components/feed/ProofOfSweatFeed";
import { motion } from "framer-motion";

// Lazy load MiniGlobe to avoid loading d3/topojson in main bundle
const MiniGlobe = lazy(() => import("@/components/MiniGlobe").then(module => ({ default: module.MiniGlobe })));

const samplePins = [
  { lon: -0.1276, lat: 51.5074, label: 'London' },
  { lon: -74.006, lat: 40.7128, label: 'NYC' },
  { lon: 139.6917, lat: 35.6895, label: 'Tokyo' },
  { lon: 151.2093, lat: -33.8688, label: 'Sydney' },
  { lon: -43.1729, lat: -22.9068, label: 'Rio' },
];

export default function Landing() {
  const { data: athletes, isLoading } = usePaginatedAthletes();
  const topAthletes = useMemo(() => athletes?.slice(0, 8) || [], [athletes]);
  const athleteIds = useMemo(() => topAthletes.map((athlete) => athlete.id), [topAthletes]);
  const { data: chartData } = useMarketplaceCharts(athleteIds);
  const { data: holderCounts } = useAthleteHolderCounts(athleteIds);

  const handleScrollToExplore = () => {
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[100vh] flex items-center pt-20 overflow-hidden">
        {/* Background Elements - Gritty Warehouse Style */}
        <div className="absolute inset-0 bg-background">
          <div
            className="absolute inset-0 bg-cover bg-[65%_center] md:bg-center bg-no-repeat opacity-50"
            style={{ backgroundImage: "url('/gym-background-v2.png')" }}
          />
          {/* Subtle overlay to ensure text readability without hiding the image */}
          <div className="absolute inset-0 bg-background/30" />
          {/* Gradient to fade into the next section */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 text-center lg:text-left relative z-20"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Live Beta</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] px-2 sm:px-0">
              Train Hard.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-400 to-blue-600 animate-gradient-x">
                Build Your Athlete Identity.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Post your training. Build your community. Unlock exclusive access for your supporters.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300" asChild>
                <Link to="/auth">
                  Start Building Identity <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={handleScrollToExplore} className="h-14 px-8 text-lg rounded-full border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm">
                View Marketplace
              </Button>
            </div>


          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative h-[400px] sm:h-[500px] lg:h-[700px] w-full flex items-center justify-center mt-8 lg:mt-0 z-10"
          >
            {/* Subtle glow behind the globe to separate it from the gritty background */}
            <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full transform scale-75" />
            <Suspense fallback={<div className="w-64 h-64 rounded-full bg-white/5 animate-pulse" />}>
              <MiniGlobe
                pins={samplePins}
                width={800}
                height={800}
                interactive={true}
                spinSpeedDegPerSec={5}
                className="w-full h-full max-w-[800px] max-h-[800px]"
              />
            </Suspense>
          </motion.div>
        </div>
      </section >

      {/* Value Props Section */}
      < section className="container mx-auto px-4 py-24 relative" >
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,transparent,black,transparent)] pointer-events-none" />

        {/* How It Works Steps */}
        <div className="relative z-10">
          <div className="text-center mb-16 space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold"
            >
              How It Works
            </motion.h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Three simple steps to start building your athlete identity
            </p>
          </div>

          {/* How It Works Steps - Vertical Stack on Mobile, Grid on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: "1",
                title: "Post Proof of Sweat",
                desc: "Share your training",
                color: "bg-success"
              },
              {
                step: "2",
                title: "Grow your Market Cap",
                desc: "Supporters buy your Card and watch it grow",
                color: "bg-primary"
              },
              {
                step: "3",
                title: "Unlock your Inner Circle",
                desc: "Card holders get exclusive chat & DM access to you",
                color: "bg-success"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex md:flex-col items-center md:text-center gap-4 md:gap-6 p-4 md:p-0 rounded-xl bg-white/5 md:bg-transparent border border-white/10 md:border-0"
              >
                <div className="relative shrink-0 w-14 h-14 md:w-24 md:h-24 md:mx-auto flex items-center justify-center">
                  <div className={`absolute inset-0 ${item.color} opacity-20 blur-xl md:blur-2xl rounded-full`} />
                  <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${item.color} flex items-center justify-center text-lg md:text-2xl font-bold text-white shadow-lg`}>
                    {item.step}
                  </div>
                </div>
                <div className="space-y-1 md:space-y-3 text-left md:text-center">
                  <h3 className="text-lg md:text-xl font-bold">{item.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed md:max-w-xs md:mx-auto">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* Arena CTA Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88]/5 via-[#00d4ff]/5 to-[#ff00ff]/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 mb-6">
              <Zap className="w-4 h-4 text-[#00ff88]" />
              <span className="text-xs font-medium tracking-wider uppercase text-[#00ff88]">New Mini-Game</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#ff00ff] bg-clip-text text-transparent">
                Crypto HYROX Arena
              </span>
            </h2>

            <p className="text-muted-foreground mb-8 text-lg">
              20 legendary crypto personalities battle it out in 8 brutal HYROX stations.
              Pick your fighter. Place your bets. May the best token win.
            </p>

            <Button
              size="lg"
              className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black hover:from-[#00ff88]/90 hover:to-[#00cc6a]/90 shadow-lg shadow-[#00ff88]/20 hover:shadow-[#00ff88]/40 transition-all duration-300 font-bold"
              asChild
            >
              <Link to="/arena">
                Enter the Arena <Zap className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Global Proof-of-Sweat Feed */}
      < section className="py-24 bg-muted/30 relative overflow-hidden" >
        <div className="absolute inset-0 bg-gradient-to-b from-background to-transparent h-24" />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background to-transparent h-24" />

        <div className="container mx-auto px-4 relative z-10">
          <ProofOfSweatFeed
            heading="Live Action"
            subheading="Real-time training drops from athletes across the globe."
            pageSize={6}
            showLoadMore={false}
            seeAllHref="/feed"
            maxVisible={3}
            scrollable
          />
        </div>
      </section >

      {/* Top Athletes Section */}
      < section id="explore" className="py-24" >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold"
            >
              Trending Athletes
            </motion.h2>
          </div>

          {/* Athletes Grid - Horizontal Scroll on Mobile */}
          <div className="-mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-4 md:pb-0">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[280px] md:min-w-0 snap-center">
                    <Card className="h-[400px] animate-pulse bg-muted" />
                  </div>
                ))
              ) : (
                topAthletes.map((athlete, i) => (
                  <motion.div
                    key={athlete.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="min-w-[280px] md:min-w-0 snap-center"
                  >
                    <AthleteCard
                      athlete={athlete}
                      chartData={chartData?.[athlete.id] || []}
                      holdersCount={holderCounts?.[athlete.id]}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-full" asChild>
              <Link to="/marketplace">
                View All Athletes <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section >
    </div >
  );
}
