import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Athlete } from "@/types";
import { formatPrice } from "@/lib/format";

interface HeroAthleteCardProps {
  athlete: Athlete;
  index: number;
}

export function HeroAthleteCard({ athlete, index }: HeroAthleteCardProps) {
  const changeColor = athlete.change24h >= 0 ? "text-success" : "text-destructive";
  const changeBg = athlete.change24h >= 0 ? "bg-success/20" : "bg-destructive/20";
  
  return (
    <Link to={`/athlete/${athlete.slug}`}>
      <Card 
        className="group relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] animate-fade-in"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={athlete.avatar}
                alt={athlete.name}
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-border/20"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{athlete.name}</h3>
                {athlete.change24h !== 0 && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${changeBg} ${changeColor}`}>
                    <TrendingUp className="w-3 h-3" />
                    {athlete.change24h > 0 ? '+' : ''}{athlete.change24h.toFixed(1)}%
                  </div>
                )}
              </div>
              
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-xl font-bold">{formatPrice(athlete.price)}</span>
                <span className="text-xs text-muted-foreground">/ token</span>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {athlete.bio}
              </p>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30 text-xs">
            <div>
              <span className="text-muted-foreground">Market Cap</span>
              <div className="font-semibold mt-0.5">{formatPrice(athlete.marketCap)}</div>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">{athlete.sport}</span>
              <div className="font-semibold mt-0.5">{athlete.supply} tokens</div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
