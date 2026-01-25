import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface LiveBetItem {
  id: string;
  username: string;
  amount: number;
  choiceTicker: string;
  choiceColor: string;
  timestamp: number;
}

interface LiveBetFeedProps {
  bets: LiveBetItem[];
  className?: string;
}

export function LiveBetFeed({ bets, className }: LiveBetFeedProps) {
  return (
    <div className={cn("arena-bet-feed", className)}>
      <div className="arena-bet-feed-header">
        <span className="live-indicator" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Live Bets</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {bets.length === 0 ? (
            <motion.div
              className="text-xs text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Waiting for the first degen...
            </motion.div>
          ) : (
            bets.slice(0, 6).map((bet) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-xs text-gray-300"
              >
                <span className="text-white">{bet.username}</span> just bet{" "}
                <span className="font-mono text-white">{bet.amount}</span> on{" "}
                <span className="font-bold" style={{ color: bet.choiceColor }}>
                  {bet.choiceTicker}
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
