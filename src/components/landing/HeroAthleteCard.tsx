import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Athlete } from "@/types";
import { formatPrice } from "@/lib/format";

interface HeroAthleteCardProps {
  athlete: Athlete;
  index: number;
}

export function HeroAthleteCard({ athlete, index }: HeroAthleteCardProps) {
  const isPositive = athlete.change24h >= 0;
  const changeColor = isPositive ? "text-success" : "text-destructive";
  
  return (
    <Link to={`/athlete/${athlete.slug}`}>
      <Card 
        className="group relative overflow-hidden border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-md hover:border-primary/60 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20 animate-fade-in aspect-square"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Large Background Image with Overlay */}
        <div className="relative h-[60%]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
          <img
            src={athlete.avatar}
            alt={athlete.name}
            className="w-full h-full object-cover"
          />
          
          {/* Price Badge - Top Right */}
          <div className="absolute top-3 right-3 backdrop-blur-xl bg-background/80 rounded-lg px-3 py-2 border border-border/40">
            <div className="text-2xl font-bold tracking-tight">{formatPrice(athlete.price)}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">per token</div>
          </div>
          
          {/* Change Badge - Top Left */}
          {athlete.change24h !== 0 && (
            <div className={`absolute top-3 left-3 backdrop-blur-xl ${isPositive ? 'bg-success/20' : 'bg-destructive/20'} rounded-lg px-3 py-2 border ${isPositive ? 'border-success/40' : 'border-destructive/40'}`}>
              <div className={`flex items-center gap-1.5 ${changeColor} font-bold`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-lg">{isPositive ? '+' : ''}{athlete.change24h.toFixed(1)}%</span>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">24h</div>
            </div>
          )}
        </div>

        {/* Compact Info Section */}
        <div className="p-3 flex flex-col justify-end h-[40%]">
          <h3 className="font-bold text-sm truncate mb-1">{athlete.name}</h3>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{athlete.sport}</p>
            <div className="text-xs font-semibold">{formatPrice(athlete.marketCap)}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
