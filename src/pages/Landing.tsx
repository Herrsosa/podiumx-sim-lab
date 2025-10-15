import { ArrowRight, Shield, Users, TrendingUp, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { H1, SectionTitle, Body } from "@/components/ui/typography";
import { usePaginatedAthletes } from "@/hooks/usePaginatedAthletes";
import { AthleteCard } from "@/components/AthleteCard";

export default function Landing() {
  const { data: athletes, isLoading } = usePaginatedAthletes();

  const handleScrollToExplore = () => {
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center lg:text-left lg:flex lg:items-center lg:justify-between">
        <div className="lg:w-1/2">
          <H1 className="mb-6 text-5xl md:text-7xl font-bold">
            Build Your Athlete Aura.
          </H1>
          <Body className="mb-8 mx-auto max-w-2xl text-xl md:text-2xl text-muted-foreground lg:mx-0">
            Log workouts, grow your market cap, and join a new layer of sports culture.
          </Body>
          <div className="flex justify-center lg:justify-start gap-4">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={handleScrollToExplore}>
              Explore Athletes
            </Button>
          </div>
        </div>
        <div className="hidden lg:block lg:w-1/2 mt-12 lg:mt-0">
          {/* Placeholder for data-driven visual */}
          <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Data-driven visual coming soon</p>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Dumbbell className="w-12 h-12 text-primary mb-4" />
              <SectionTitle className="text-xl">Proof of Sweat</SectionTitle>
              <Body className="text-sm text-muted-foreground">
                Athletes log workouts, providing tangible proof of their dedication and progress.
              </Body>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <SectionTitle className="text-xl">Market Cap Signal</SectionTitle>
              <Body className="text-sm text-muted-foreground">
                An athlete's market cap reflects their community's belief in their potential.
              </Body>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <SectionTitle className="text-xl">Token-Gated Access</SectionTitle>
              <Body className="text-sm text-muted-foreground">
                Unlock exclusive content and communities by holding an athlete's token.
              </Body>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Users className="w-12 h-12 text-primary mb-4" />
              <SectionTitle className="text-xl">Clean UX</SectionTitle>
              <Body className="text-sm text-muted-foreground">
                A beautifully designed, intuitive interface for a seamless experience.
              </Body>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16">
        <SectionTitle className="mb-12 text-center text-3xl md:text-4xl">How It Works</SectionTitle>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">1</div>
            <SectionTitle className="text-xl">Create Profile & Verify</SectionTitle>
            <Body className="text-sm text-muted-foreground">Create your account and complete your athlete profile.</Body>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">2</div>
            <SectionTitle className="text-xl">Log Proof of Sweat</SectionTitle>
            <Body className="text-sm text-muted-foreground">Log your workouts and share your progress with your supporters.</Body>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">3</div>
            <SectionTitle className="text-xl">Grow Your Athlete Aura & Community</SectionTitle>
            <Body className="text-sm text-muted-foreground">Grow your market cap and build a strong community around you.</Body>
          </div>
        </div>
      </section>

      {/* Top Athletes Section */}
      <section id="explore" className="container mx-auto px-4 py-16">
        <SectionTitle className="mb-12 text-center text-3xl md:text-4xl">Top Athletes</SectionTitle>
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="h-96 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {athletes?.slice(0, 8).map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} chartData={[]} />
            ))}
          </div>
        )}
        <div className="text-center mt-12">
          <Button size="lg" variant="outline" asChild>
            <a href="/marketplace">View All Athletes</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
