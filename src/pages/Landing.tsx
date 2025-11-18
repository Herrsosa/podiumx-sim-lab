import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, TrendingUp, Dumbbell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePaginatedAthletes } from "@/hooks/usePaginatedAthletes";
import { useMarketplaceCharts } from "@/hooks/useMarketplaceCharts";
import { AthleteCardNew } from "@/components/AthleteCardNew";
import { HeroAthleteCard } from "@/components/landing/HeroAthleteCard";
import { ProofOfSweatFeed } from "@/components/feed/ProofOfSweatFeed";

export default function Landing() {
  const { data: athletes, isLoading } = usePaginatedAthletes();
  const topAthletes = useMemo(() => athletes?.slice(0, 8) || [], [athletes]);
  const heroAthletes = useMemo(() => athletes?.slice(0, 4) || [], [athletes]);
  const athleteIds = useMemo(() => topAthletes.map((athlete) => athlete.id), [topAthletes]);
  const { data: chartData } = useMarketplaceCharts(athleteIds);

  const handleScrollToExplore = () => {
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="lg:hidden absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/15 via-background to-transparent pointer-events-none" />
        
        <div className="container relative mx-auto px-4 py-12 md:py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-primary" />
                Build Your Athlete Identity
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Train Hard.
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Build Your Athlete Identity.
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl font-semibold text-foreground/90 max-w-xl mx-auto lg:mx-0 mb-2">
                Back the athletes who actually put in the work.
              </p>
              
              <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Athletes log real workouts as Proof of Sweat. Supporters collect their tokens to unlock access, rewards, and a share in the journey.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="gap-2 text-base" asChild>
                  <Link to="/auth">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={handleScrollToExplore} className="text-base">
                  Explore Athletes
                </Button>
              </div>
            </div>

            {/* Right: Floating Athlete Cards */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-2 gap-3 max-w-md ml-auto animate-in fade-in duration-700">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-muted/20 animate-pulse" />
                  ))
                ) : (
                  heroAthletes.map((athlete, index) => (
                    <div 
                      key={athlete.id} 
                      className="transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <HeroAthleteCard athlete={athlete} index={index} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          <Card className="group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Proof of Sweat</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Athletes log workouts, providing tangible proof of their dedication and progress.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Athlete Card Cap Signal</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An athlete's card cap reflects their community's belief in their potential.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Token-Gated Access</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlock exclusive content and communities by holding an athlete's token.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to start building your athlete aura
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto relative before:absolute before:left-7 before:top-0 before:bottom-0 before:w-px before:bg-border/60 before:hidden md:before:block">
          {[
            {
              step: '1',
              title: 'Create Profile & Verify',
              description: 'Create your account and complete your athlete profile to get started.',
              gradient: 'from-primary to-primary/60',
              shadow: 'shadow-primary/20',
            },
            {
              step: '2',
              title: 'Log Proof of Sweat',
              description: 'Log your workouts and share your progress with your supporters.',
              gradient: 'from-accent to-accent/60',
              shadow: 'shadow-accent/20',
            },
            {
              step: '3',
              title: 'Grow Your Athlete Card Cap',
              description: 'Build your Athlete Card Cap and grow a strong community around you.',
              gradient: 'from-success to-success/60',
              shadow: 'shadow-success/20',
            },
          ].map(({ step, title, description, gradient, shadow }) => (
            <div key={step} className="relative">
              <div className="text-center space-y-4">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl sm:text-2xl font-bold text-white mx-auto shadow-lg ${shadow}`}>
                  {step}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Global Proof-of-Sweat Feed */}
      <section className="container mx-auto px-4 py-16">
        <ProofOfSweatFeed
          heading="Latest Proof-of-Sweat"
          subheading="See the most recent training drops across Athlyst."
          pageSize={6}
          showLoadMore={false}
          seeAllHref="/feed"
          maxVisible={3}
          scrollable
        />
      </section>

      {/* Top Athletes Section */}
      <section id="explore" className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Top Athletes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover other Athlysts early and benefit
            </p>
          </div>
          
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 max-w-7xl mx-auto">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-96 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 max-w-7xl mx-auto">
              {topAthletes.map((athlete) => (
                <AthleteCardNew
                  key={athlete.id}
                  athlete={athlete}
                  chartData={chartData?.[athlete.id] || []}
                />
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Button size="lg" className="hidden sm:inline-flex" asChild>
              <Link to="/marketplace">View All Athletes</Link>
            </Button>
          </div>
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 bg-background/95 border-t border-border/50 p-3 flex items-center gap-3 sm:hidden">
        <div>
          <p className="text-sm font-semibold text-foreground">Get started on Athlyst</p>
          <p className="text-xs text-muted-foreground">Collect, unlock access, and grow your athlete identity.</p>
        </div>
        <Button size="sm" asChild className="ml-auto">
          <Link to="/auth">Join Now</Link>
        </Button>
      </div>
    </div>
  );
}
