import { useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, TrendingUp, Dumbbell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePaginatedAthletes } from "@/hooks/usePaginatedAthletes";
import { useMarketplaceCharts } from "@/hooks/useMarketplaceCharts";
import { AthleteCardNew } from "@/components/AthleteCardNew";
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

  const handleScrollToExplore = () => {
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full mix-blend-screen opacity-50" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 blur-[120px] rounded-full mix-blend-screen opacity-50" />
        </div>

        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Live Beta</span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]">
              Train Hard.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-400 to-blue-600 animate-gradient-x">
                Build Your Athlete Identity.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              The first athlete identity network powered by your sweat.
              Turn your workouts into a verifiable track record and trade on your potential.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300" asChild>
                <Link to="/auth">
                  Start Building <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={handleScrollToExplore} className="h-14 px-8 text-lg rounded-full border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm">
                View Marketplace
              </Button>
            </div>

            <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <span>Proof-of-Sweat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <span>On-Chain Identity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <span>Real Yield</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative h-[500px] lg:h-[700px] w-full flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
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
      </section>

      {/* Value Props Section */}
      <section className="container mx-auto px-4 py-24 relative">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,transparent,black,transparent)] pointer-events-none" />

        {/* Value Props - Horizontal Scroll on Mobile */}
        <div className="-mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex md:grid md:grid-cols-3 gap-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 md:pb-0 relative z-10">
            {[
              {
                icon: Dumbbell,
                title: "Proof of Sweat",
                desc: "Verifiable workout data directly from Strava. No fake metrics, just pure effort.",
                color: "text-primary",
                bg: "bg-primary/10"
              },
              {
                icon: TrendingUp,
                title: "Dynamic Pricing",
                desc: "Bonding curves ensure instant liquidity. Price moves based on supply and demand.",
                color: "text-accent",
                bg: "bg-accent/10"
              },
              {
                icon: Shield,
                title: "Token Utility",
                desc: "Hold tokens to unlock exclusive content, chat access, and future rewards.",
                color: "text-success",
                bg: "bg-success/10"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="min-w-[280px] md:min-w-0 snap-center"
              >
                <Card className="group h-full glass-card border-transparent hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <CardContent className="pt-8">
                    <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className={`w-7 h-7 ${item.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How It Works Steps */}
        <div className="mt-32 relative z-10">
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
              Three simple steps to start building your athlete aura
            </p>
          </div>

          {/* How It Works Steps - Horizontal Scroll on Mobile */}
          <div className="-mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex md:grid md:grid-cols-3 gap-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 md:pb-0">
              {[
                {
                  step: "1",
                  title: "Create Profile & Verify",
                  desc: "Create your account and complete your athlete profile to get started.",
                  color: "bg-success"
                },
                {
                  step: "2",
                  title: "Log Proof of Sweat",
                  desc: "Log your workouts and share your progress with your supporters.",
                  color: "bg-primary"
                },
                {
                  step: "3",
                  title: "Grow Your Athlete Card Cap",
                  desc: "Build your Athlete Card Cap and grow a strong community around you.",
                  color: "bg-success"
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="text-center space-y-6 relative min-w-[280px] md:min-w-0 snap-center"
                >
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <div className={`absolute inset-0 ${item.color} opacity-20 blur-2xl rounded-full`} />
                    <div className={`relative w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-${item.color}/20`}>
                      {item.step}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Global Proof-of-Sweat Feed */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
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
      </section>

      {/* Top Athletes Section */}
      <section id="explore" className="py-24">
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
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Discover the top performers making moves in the marketplace
            </p>
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
                    <AthleteCardNew
                      athlete={athlete}
                      chartData={chartData?.[athlete.id] || []}
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
      </section>
    </div>
  );
}
