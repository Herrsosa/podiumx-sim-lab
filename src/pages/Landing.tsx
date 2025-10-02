import { Link } from "react-router-dom";
import { ArrowRight, Shield, Users, TrendingUp, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          PodiumX
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          The marketplace for athlete tokens. Invest in talent, share the journey.
        </p>
        <Link to="/sign-up">
          <Button size="lg" className="gap-2">
            Join the Community <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </section>

      {/* What You Get Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          What You Get
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Create PodiumPass</h3>
              <p className="text-muted-foreground">
                Launch your own athlete token and build your community
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Access to Athletes</h3>
              <p className="text-muted-foreground">
                Invest in rising stars and share their success
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Community</h3>
              <p className="text-muted-foreground">
                Connect with athletes and supporters worldwide
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <Dumbbell className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Discover Talent</h3>
              <p className="text-muted-foreground">
                Find the next generation of champions early
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16 mb-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
            <p className="text-muted-foreground">
              Create your account and complete your athlete profile
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Launch Token</h3>
            <p className="text-muted-foreground">
              Create your PodiumPass and set your initial supply
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Grow Together</h3>
            <p className="text-muted-foreground">
              Share proof of sweat and watch your community grow
            </p>
          </div>
        </div>

        <Card className="max-w-4xl mx-auto overflow-hidden">
          <CardContent className="p-0">
            <img 
              src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=600&fit=crop" 
              alt="PodiumX Platform Preview" 
              className="w-full h-auto"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
