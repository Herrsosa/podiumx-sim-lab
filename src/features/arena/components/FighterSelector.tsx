import { useState } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArenaCharacter } from "../types";
import { ARENA_CHARACTERS } from "../data/characters";
import { FighterCard, FighterThumbnail } from "./FighterCard";
import { StatsExplainer } from "./StatsExplainer";
import { Button } from "@/components/ui/button";
import { Shuffle, X, Users, Coins, Zap } from "lucide-react";

interface FighterSelectorProps {
  selectedFighters: [ArenaCharacter | null, ArenaCharacter | null];
  onSelect: (slot: 0 | 1, character: ArenaCharacter | null) => void;
  onConfirm: () => void;
  autoMode?: boolean;
  autoCountdown?: number;
  className?: string;
}

const SPARKS = [
  { top: "10%", left: "20%", randX: 0.2, randY: 0.9 },
  { top: "25%", left: "70%", randX: 0.8, randY: 0.2 },
  { top: "40%", left: "35%", randX: 0.3, randY: 0.7 },
  { top: "60%", left: "65%", randX: 0.7, randY: 0.4 },
  { top: "75%", left: "45%", randX: 0.5, randY: 0.8 },
  { top: "30%", left: "50%", randX: 0.6, randY: 0.1 },
];

function VSElement() {
  return (
    <div className="vs-container">
      <div className="vs-glow" />
      <div className="vs-lightning" />
      <div className="vs-text">VS</div>
      <div className="vs-flare" />
      <div className="vs-sparks">
        {SPARKS.map((spark, i) => (
          <div
            key={i}
            className={`spark spark-${i}`}
            style={
              {
                top: spark.top,
                left: spark.left,
                "--rand-x": spark.randX,
                "--rand-y": spark.randY,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

export function FighterSelector({
  selectedFighters,
  onSelect,
  onConfirm,
  autoMode = false,
  autoCountdown,
  className,
}: FighterSelectorProps) {
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);

  const handleCharacterClick = (character: ArenaCharacter) => {
    if (autoMode) return;
    // If character is already selected in either slot, deselect it
    if (selectedFighters[0]?.id === character.id) {
      onSelect(0, null);
      return;
    }
    if (selectedFighters[1]?.id === character.id) {
      onSelect(1, null);
      return;
    }

    // Select for active slot
    onSelect(activeSlot, character);

    // Auto-advance to next empty slot
    if (activeSlot === 0 && !selectedFighters[1]) {
      setActiveSlot(1);
    } else if (activeSlot === 1 && !selectedFighters[0]) {
      setActiveSlot(0);
    }
  };

  const handleRandomize = () => {
    if (autoMode) return;
    const shuffled = [...ARENA_CHARACTERS].sort(() => Math.random() - 0.5);
    onSelect(0, shuffled[0]);
    onSelect(1, shuffled[1]);
  };

  const bothSelected = selectedFighters[0] && selectedFighters[1];

  return (
    <div className={cn("space-y-6", className)}>
      {autoMode && (
        <div className="auto-matchup-banner">
          <span className="auto-matchup-pill">AUTO MATCHUP</span>
          <span>Random competitors selected</span>
          {typeof autoCountdown === "number" && (
            <span className="auto-matchup-countdown">Next race in {autoCountdown}s</span>
          )}
        </div>
      )}
      {/* Selected fighters display */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player 1 slot */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-bold"
              style={{ color: "#00ff88" }}
            >
              PLAYER 1
            </span>
            <div className="flex items-center gap-2">
              {autoMode && selectedFighters[0] && (
                <span className="auto-selected-pill">AUTO-SELECTED</span>
              )}
              {!autoMode && selectedFighters[0] && (
                <button
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={() => onSelect(0, null)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <motion.div
            className={cn(
              "min-h-[220px] rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm transition-all cursor-pointer",
              activeSlot === 0 && !selectedFighters[0]
                ? "border-[#00ff88] shadow-[0_0_25px_rgba(0,255,136,0.25)]"
                : "border-white/10"
            )}
            onClick={() => setActiveSlot(0)}
          >
            <AnimatePresence mode="wait">
              {selectedFighters[0] ? (
                <motion.div
                  key={selectedFighters[0].id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <FighterCard
                    character={selectedFighters[0]}
                    isSelected
                    playerSlot={1}
                    showStats
                  />
                </motion.div>
              ) : (
                <motion.div
                  className="h-full min-h-[200px] flex items-center justify-center text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-sm">Select Fighter</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* VS divider */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex z-10">
          <VSElement />
        </div>

        {/* Player 2 slot */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-bold"
              style={{ color: "#ff00ff" }}
            >
              PLAYER 2
            </span>
            <div className="flex items-center gap-2">
              {autoMode && selectedFighters[1] && (
                <span className="auto-selected-pill">AUTO-SELECTED</span>
              )}
              {!autoMode && selectedFighters[1] && (
                <button
                  className="text-gray-400 hover:text-white transition-colors"
                  onClick={() => onSelect(1, null)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <motion.div
            className={cn(
              "min-h-[220px] rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm transition-all cursor-pointer",
              activeSlot === 1 && !selectedFighters[1]
                ? "border-[#ff00ff] shadow-[0_0_25px_rgba(255,0,255,0.25)]"
                : "border-white/10"
            )}
            onClick={() => setActiveSlot(1)}
          >
            <AnimatePresence mode="wait">
              {selectedFighters[1] ? (
                <motion.div
                  key={selectedFighters[1].id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <FighterCard
                    character={selectedFighters[1]}
                    isSelected
                    playerSlot={2}
                    showStats
                  />
                </motion.div>
              ) : (
                <motion.div
                  className="h-full min-h-[200px] flex items-center justify-center text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-sm">Select Fighter</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Action buttons */}
      {!autoMode ? (
        <div className="fighter-actions">
          <Button
            variant="outline"
            onClick={handleRandomize}
            className="btn-secondary"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Randomize
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!bothSelected}
            className={cn("btn-primary px-8", !bothSelected && "opacity-50 cursor-not-allowed")}
          >
            PLACE BET & RACE
          </Button>
        </div>
      ) : (
        <div className="fighter-actions auto-mode">
          <div className="auto-mode-note">Auto mode active · betting stays live during the race</div>
        </div>
      )}

      <div className="arena-collapsible-group">
        <details className="arena-collapsible">
          <summary>How It Works</summary>
          <div className="arena-how">
            <div className="arena-how-item">
              <span className="arena-how-icon">
                <Users size={16} />
              </span>
              <div>
                <div className="arena-how-title">Pick 2 Fighters</div>
                <div className="arena-how-text">Choose your head-to-head matchup.</div>
              </div>
            </div>
            <div className="arena-how-item">
              <span className="arena-how-icon">
                <Coins size={16} />
              </span>
              <div>
                <div className="arena-how-title">Bet Each Station</div>
                <div className="arena-how-text">Predict the round winner before the horn.</div>
              </div>
            </div>
            <div className="arena-how-item">
              <span className="arena-how-icon">
                <Zap size={16} />
              </span>
              <div>
                <div className="arena-how-title">Build Streaks</div>
                <div className="arena-how-text">Ride momentum through 8 brutal stations.</div>
              </div>
            </div>
          </div>
        </details>

        <details className="arena-collapsible">
          <summary>Stat Guide</summary>
          <StatsExplainer />
        </details>
      </div>

      {/* Character grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Choose Your Fighters ({ARENA_CHARACTERS.length} available)
        </h3>
        <div className="fighter-grid">
          {ARENA_CHARACTERS.map((character) => {
            const isSelectedP1 = selectedFighters[0]?.id === character.id;
            const isSelectedP2 = selectedFighters[1]?.id === character.id;
            const isSelected = isSelectedP1 || isSelectedP2;
            const selectedBy = isSelectedP1 ? 1 : isSelectedP2 ? 2 : undefined;
            const isTakenByOther =
              selectedBy !== undefined &&
              ((activeSlot === 0 && selectedBy === 2) || (activeSlot === 1 && selectedBy === 1));

            return (
              <FighterThumbnail
                key={character.id}
                character={character}
                isSelected={isSelected}
                selectedBy={selectedBy}
                isTaken={isTakenByOther}
                onClick={() => handleCharacterClick(character)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
