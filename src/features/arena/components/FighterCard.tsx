import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { ArenaCharacter, CharacterStats } from "../types";
import { ArenaAvatar } from "./ArenaAvatar";

interface FighterCardProps {
  character: ArenaCharacter;
  isSelected?: boolean;
  playerSlot?: 1 | 2;
  onClick?: () => void;
  showStats?: boolean;
  compact?: boolean;
  className?: string;
}

const STAT_LABELS: Record<keyof CharacterStats, { abbr: string; name: string }> = {
  strength: { abbr: "STR", name: "Strength" },
  speed: { abbr: "SPD", name: "Speed" },
  endurance: { abbr: "END", name: "Endurance" },
  technique: { abbr: "TEC", name: "Technique" },
  mental: { abbr: "MNT", name: "Mental" },
};

const STAT_COLORS: Record<keyof CharacterStats, string> = {
  strength: "#FF4444",
  speed: "#FFD700",
  endurance: "#44FF44",
  technique: "#4488FF",
  mental: "#AA44FF",
};

const STAT_ICONS: Record<keyof CharacterStats, string> = {
  strength: "💪",
  speed: "⚡",
  endurance: "🔥",
  technique: "🎯",
  mental: "🧠",
};

const STAT_TOOLTIPS: Record<keyof CharacterStats, { desc: string; stations: string[] }> = {
  strength: {
    desc: "Raw power for heavy movements.",
    stations: ["Pushing Bags", "Rug Pull Recovery", "Bag Holding", "Moon Balls"],
  },
  speed: {
    desc: "Explosive quickness and fast transitions.",
    stations: ["FOMO Jumps"],
  },
  endurance: {
    desc: "Stamina for long cardio efforts.",
    stations: ["Mining Rig", "Liquidity Rowing"],
  },
  technique: {
    desc: "Efficient form on technical movements.",
    stations: ["Stablecoin Lunges"],
  },
  mental: {
    desc: "Clutch performance under pressure.",
    stations: ["Close races", "Bag Holding"],
  },
};

const getRating = (value: number) => {
  if (value >= 90) return "ELITE";
  if (value >= 75) return "STRONG";
  if (value >= 55) return "AVERAGE";
  if (value >= 40) return "WEAK";
  return "POOR";
};

const StatBar = ({
  abbr,
  name,
  value,
  color,
  icon,
  tooltip,
}: {
  abbr: string;
  name: string;
  value: number;
  color: string;
  icon: string;
  tooltip: { desc: string; stations: string[] };
}) => (
  <div className="stat-row" style={{ "--stat-color": color } as CSSProperties}>
    <div
      className="stat-icon"
      style={{
        borderColor: color,
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        boxShadow: `0 0 10px ${color}44`,
      }}
    >
      {icon}
    </div>
    <div className="stat-label">
      <span className="stat-abbr">{abbr}</span>
      <span className="stat-name">{name}</span>
    </div>
    <div className="stat-bar-container">
      <motion.div
        className="stat-bar-fill"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          boxShadow: `0 0 10px ${color}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
    <div className="stat-value">
      <span className="stat-value-number">{value}</span>
      <span className={`stat-rating stat-rating-${getRating(value).toLowerCase()}`}>
        {getRating(value)}
      </span>
    </div>
    <div className="stat-tooltip">
      <div className="stat-tooltip-title">{abbr} · {name}</div>
      <div className="stat-tooltip-desc">{tooltip.desc}</div>
      <div className="stat-tooltip-stations">
        {tooltip.stations.join(", ")}
      </div>
    </div>
  </div>
);

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "255, 255, 255";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return "255, 255, 255";
  }
  return `${r}, ${g}, ${b}`;
};

export function FighterCard({
  character,
  isSelected = false,
  playerSlot,
  onClick,
  showStats = true,
  compact = false,
  className,
}: FighterCardProps) {
  const glowColor = playerSlot === 1 ? "#00ff88" : playerSlot === 2 ? "#ff00ff" : character.color;
  const glowRgb = playerSlot === 1
    ? "0, 255, 136"
    : playerSlot === 2
    ? "255, 0, 255"
    : hexToRgb(character.color);
  const portraitRgb = hexToRgb(character.color);

  return (
    <motion.div
      className={cn(
        "fighter-card cursor-pointer transition-all duration-300",
        playerSlot === 1 ? "fighter-card-p1" : playerSlot === 2 ? "fighter-card-p2" : "fighter-card-neutral",
        isSelected && "is-selected",
        compact ? "p-3" : "p-4",
        className
      )}
      style={{ "--glow-rgb": glowRgb } as CSSProperties}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02, rotateX: 2, rotateY: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : {}}
      layout
    >
      <span className="card-sweep" />
      {/* Player slot indicator */}
      {playerSlot && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold"
          style={{
            backgroundColor: glowColor,
            color: playerSlot === 1 ? "#000" : "#fff",
          }}
        >
          P{playerSlot}
        </div>
      )}

      {/* Header */}
      {compact ? (
        <div className="flex items-start gap-3">
          <ArenaAvatar
            value={character.avatar}
            alt={character.name}
            size={40}
            className="rounded-lg border border-white/10"
          />
          <div className="flex-1 min-w-0">
            <h3 className={cn("fighter-name text-white truncate", compact ? "text-sm" : "text-base")}>
              {character.name}
            </h3>
            <p
              className={cn(
                "font-mono",
                compact ? "text-xs" : "text-sm"
              )}
              style={{ color: character.color }}
            >
              {character.ticker}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="fighter-portrait"
            style={{ "--portrait-rgb": portraitRgb } as CSSProperties}
          >
            <ArenaAvatar
              value={character.avatar}
              alt={character.name}
              className="fighter-portrait-avatar"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="fighter-name text-white text-lg truncate">
              {character.name}
            </h3>
            <p className="font-mono text-sm" style={{ color: character.color }}>
              {character.ticker}
            </p>
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
              {character.tagline}
            </p>
          </div>
        </>
      )}

      {/* Stats */}
      {showStats && !compact && (
        <div className="mt-4 space-y-1.5">
          {(Object.keys(STAT_LABELS) as Array<keyof CharacterStats>).map(
            (stat) => (
              <StatBar
                key={stat}
                abbr={STAT_LABELS[stat].abbr}
                name={STAT_LABELS[stat].name}
                value={character.stats[stat]}
                color={STAT_COLORS[stat]}
                icon={STAT_ICONS[stat]}
                tooltip={STAT_TOOLTIPS[stat]}
              />
            )
          )}
        </div>
      )}

      {/* Ability & Weakness */}
      {showStats && !compact && (
        <div className="mt-4 space-y-2">
          {/* Ability */}
          <div className="ability-card">
            <div className="ability-header">
              <span className="ability-icon">⚡</span>
              <span className="ability-name">
                {character.ability.name}
              </span>
            </div>
            <p className="ability-description">
              {character.ability.description}
            </p>
          </div>

          {/* Weakness */}
          <div className="weakness-card">
            <div className="ability-header">
              <span className="ability-icon">💀</span>
              <span className="ability-name weakness-name">
                {character.weakness.name}
              </span>
            </div>
            <p className="ability-description">
              {character.weakness.description}
            </p>
          </div>
        </div>
      )}

      {/* Voice line on hover */}
      {!compact && (
        <motion.div
          className="mt-3 text-xs text-gray-500 italic text-center"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          "{character.voiceLine}"
        </motion.div>
      )}
    </motion.div>
  );
}

// Compact thumbnail version for grid selection
export function FighterThumbnail({
  character,
  isSelected,
  selectedBy,
  isTaken,
  isDisabled,
  onClick,
}: {
  character: ArenaCharacter;
  isSelected: boolean;
  selectedBy?: 1 | 2;
  isTaken?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}) {
  const bestStat = (Object.keys(character.stats) as Array<keyof CharacterStats>)
    .reduce((best, key) => {
      const value = character.stats[key];
      return value > best.value ? { key, value } : best;
    }, { key: "strength" as keyof CharacterStats, value: character.stats.strength });
  const bestStatLabel = STAT_LABELS[bestStat.key]?.abbr ?? "STAT";
  const bestStatColor = STAT_COLORS[bestStat.key] ?? "#ffffff";
  const bestStation = STAT_TOOLTIPS[bestStat.key]?.stations[0] ?? "Key station";

  return (
    <motion.button
      className={cn(
        "fighter-thumbnail",
        selectedBy === 1 && "selected-p1",
        selectedBy === 2 && "selected-p2",
        isTaken && "is-taken",
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
      title={character.name}
      aria-pressed={isSelected}
      data-selected={isSelected}
      onClick={isDisabled ? undefined : onClick}
      whileHover={isDisabled ? {} : { scale: 1.05 }}
      whileTap={isDisabled ? {} : { scale: 0.95 }}
      disabled={isDisabled}
    >
      <span className="tooltip">{character.name}</span>
      <div
        className="fighter-hover-stats"
        style={{ "--stat-color": bestStatColor } as CSSProperties}
      >
        <span className="hover-stat">
          {bestStatLabel}: {bestStat.value}
        </span>
        <span className="hover-note">Best at {bestStation}</span>
      </div>
      <ArenaAvatar
        value={character.avatar}
        alt={character.name}
        size={36}
        className="rounded-lg border border-white/10 mb-1"
      />
      <p className="ticker">{character.ticker}</p>
    </motion.button>
  );
}
