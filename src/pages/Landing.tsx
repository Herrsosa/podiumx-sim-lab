import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Users, TrendingUp, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { H1, SectionTitle, Body } from "@/components/ui/typography";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <H1 className="mb-6 text-5xl md:text-7xl bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          PodiumX
        </H1>
        <Body className="mb-8 mx-auto max-w-2xl text-xl md:text-2xl text-muted-foreground">
          The marketplace for athlete tokens. Invest in talent, share the journey.
        </Body>
        <Link to="/auth">
          <Button size="lg" className="gap-2">
            Get Started <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <Link to="/marketplace">
          <Button size="lg" variant="outline" className="gap-2 ml-4">
            Explore Marketplace
          </Button>
        </Link>
      </section>

      {/* What You Get Section */}
      <section className="container mx-auto px-4 py-16">
        <SectionTitle className="mb-12 text-center text-3xl md:text-4xl">
          What You Get
        </SectionTitle>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <SectionTitle className="text-xl">Create PodiumPass</SectionTitle>
              <Body className="text-sm text-muted-foreground">
                Launch your own athlete token and build your community
              </Body>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <SectionTitle className="text-xl">Access to Athletes</SectionTitle>
              <Body className="text-sm text-muted-foreground">
                Invest in rising stars and share their success
              </Body>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Users className="w-12 h-12 text-primary mb-4" />
              <SectionTitle className="text-xl">Community</SectionTitle>
              <Body className="text-sm text-muted-foreground">
                Connect with athletes and supporters worldwide
              </Body>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Dumbbell className="w-12 h-12 text-primary mb-4" />
              <SectionTitle className="text-xl">Discover Talent</SectionTitle>
              <Body className="text-sm text-muted-foreground">
                Find the next generation of champions early
              </Body>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16 mb-20">
        <SectionTitle className="mb-12 text-center text-3xl md:text-4xl">
          How It Works
        </SectionTitle>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">
              1
            </div>
            <SectionTitle className="text-xl">Sign Up</SectionTitle>
            <Body className="text-sm text-muted-foreground">
              Create your account and complete your athlete profile
            </Body>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">
              2
            </div>
            <SectionTitle className="text-xl">Launch Token</SectionTitle>
            <Body className="text-sm text-muted-foreground">
              Create your PodiumPass and set your initial supply
            </Body>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">
              3
            </div>
            <SectionTitle className="text-xl">Grow Together</SectionTitle>
            <Body className="text-sm text-muted-foreground">
              Share proof of sweat and watch your community grow
            </Body>
          </div>
        </div>

        <Card className="max-w-4xl mx-auto overflow-hidden">
          <CardContent className="p-0">
            <img 
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=600&fit=crop" 
              alt="HYROX athlete training" 
              className="w-full h-auto"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
