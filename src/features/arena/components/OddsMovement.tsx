import { cn } from "@/lib/utils";
import { ArenaCharacter } from "../types";

interface OddsPoint {
  fighter1Odds: number;
  fighter2Odds: number;
}

interface OddsMovementProps {
  fighter1: ArenaCharacter;
  fighter2: ArenaCharacter;
  history: OddsPoint[];
  className?: string;
}

const buildPath = (points: number[], width: number, height: number) => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const y = height - points[0];
    return `M0 ${y} L${width} ${y}`;
  }

  const step = width / (points.length - 1);
  return points
    .map((value, index) => {
      const x = index * step;
      const y = height - value;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

export function OddsMovement({ fighter1, fighter2, history, className }: OddsMovementProps) {
  const points = history.slice(-20);
  if (points.length === 0) {
    return (
      <div className={cn("arena-odds-card", className)}>
        <div className="arena-odds-header">
          <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Odds Movement</span>
        </div>
        <div className="text-xs text-gray-500">Waiting for odds...</div>
      </div>
    );
  }

  const values1 = points.map((p) => p.fighter1Odds);
  const values2 = points.map((p) => p.fighter2Odds);
  const logValues1 = values1.map((value) => Math.log(value));
  const logValues2 = values2.map((value) => Math.log(value));
  const minLog = Math.min(...logValues1, ...logValues2);
  const maxLog = Math.max(...logValues1, ...logValues2);
  const logRange = Math.max(0.15, maxLog - minLog);

  const height = 70;
  const width = 220;

  const scale = (logValue: number) => ((logValue - minLog) / logRange) * (height - 10) + 5;
  const path1 = buildPath(logValues1.map(scale), width, height);
  const path2 = buildPath(logValues2.map(scale), width, height);

  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : last;

  const trend1 = last.fighter1Odds >= prev.fighter1Odds ? "up" : "down";
  const trend2 = last.fighter2Odds >= prev.fighter2Odds ? "up" : "down";

  const tickLogs = [maxLog, (maxLog + minLog) / 2, minLog];
  const lastX = points.length > 1 ? width : width;
  const lastY1 = height - scale(Math.log(last.fighter1Odds));
  const lastY2 = height - scale(Math.log(last.fighter2Odds));

  return (
    <div className={cn("arena-odds-card", className)}>
      <div className="arena-odds-header">
        <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Odds Movement</span>
      </div>
      <svg width="100%" height="96" viewBox={`0 0 ${width} ${height}`} className="mt-2">
        <g className="odds-grid">
          {tickLogs.map((logValue, index) => {
            const y = height - scale(logValue);
            const label = Math.exp(logValue);
            return (
              <g key={`tick-${index}`}>
                <line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <text x={0} y={y - 2} fill="rgba(255,255,255,0.4)" fontSize="8">
                  {label.toFixed(2)}x
                </text>
              </g>
            );
          })}
        </g>
        <path d={path1} fill="none" stroke="#00ff88" strokeWidth="2" />
        <path d={path2} fill="none" stroke="#ff00ff" strokeWidth="2" />
        <circle cx={lastX} cy={lastY1} r="3" fill="#00ff88" />
        <circle cx={lastX} cy={lastY2} r="3" fill="#ff00ff" />
        <text x={width - 2} y={lastY1 - 6} fill="#00ff88" fontSize="9" textAnchor="end">
          {last.fighter1Odds.toFixed(2)}x
        </text>
        <text x={width - 2} y={lastY2 + 12} fill="#ff00ff" fontSize="9" textAnchor="end">
          {last.fighter2Odds.toFixed(2)}x
        </text>
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between rounded-lg bg-black/40 px-2 py-1">
          <span style={{ color: "#00ff88" }}>{fighter1.ticker}</span>
          <span className={trend1 === "up" ? "text-green-400" : "text-red-400"}>
            {last.fighter1Odds.toFixed(2)}x {trend1 === "up" ? "↑" : "↓"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-black/40 px-2 py-1">
          <span style={{ color: "#ff00ff" }}>{fighter2.ticker}</span>
          <span className={trend2 === "up" ? "text-green-400" : "text-red-400"}>
            {last.fighter2Odds.toFixed(2)}x {trend2 === "up" ? "↑" : "↓"}
          </span>
        </div>
      </div>
    </div>
  );
}
