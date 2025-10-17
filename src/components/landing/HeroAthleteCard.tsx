import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { Athlete } from "@/types";
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
        <div className="relative h-[60%]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
          <img src={athlete.avatar} alt={athlete.name} className="w-full h-full object-cover" />

          <div className="absolute top-2 right-2 backdrop-blur-xl bg-background/80 rounded-md px-2 py-1 border border-border/40">
            <div className="text-sm font-bold tracking-tight">{formatPrice(athlete.price)}</div>
            <div className="text-[8px] text-muted-foreground uppercase tracking-wider">per token</div>
          </div>

          {athlete.change24h !== 0 && (
            <div
              className={`absolute top-2 left-2 backdrop-blur-xl ${
                isPositive ? "bg-success/20" : "bg-destructive/20"
              } rounded-md px-2 py-1 border ${isPositive ? "border-success/40" : "border-destructive/40"}`}
            >
              <div className={`flex items-center gap-1 ${changeColor} font-bold text-xs`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>
                  {isPositive ? "+" : ""}
                  {athlete.change24h.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-2 flex flex-col justify-end h-[40%]">
          <h3 className="font-semibold text-xs truncate mb-0.5">{athlete.name}</h3>
          <div className="flex items-center justify-between text-[10px]">
            <p className="text-muted-foreground">{athlete.sport}</p>
            <div className="font-semibold">{formatPrice(athlete.marketCap)}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
