import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CommentaryProps {
  lines: string[];
  className?: string;
  maxLines?: number;
}

// Single line with typewriter effect
function CommentaryLine({
  text,
  isNew,
  index,
}: {
  text: string;
  isNew: boolean;
  index: number;
}) {
  const [displayText, setDisplayText] = useState(isNew ? "" : text);

  useEffect(() => {
    if (!isNew) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 20); // 20ms per character for fast typewriter

    return () => clearInterval(interval);
  }, [text, isNew]);

  // Detect special commentary (ability/weakness triggers)
  const isAbility = text.includes("🔥") || text.includes("ACTIVATES");
  const isWeakness = text.includes("😰") || text.includes("struggling");
  const isWin = text.includes("🏆") || text.includes("WINS");
  const isFinal = text.includes("🏁") || text.includes("FINAL");

  return (
    <motion.div
      className={cn(
        "commentary-text",
        isAbility && "surge",
        isWeakness && "bonk",
        isWin && "lead-change",
        isFinal && "lead-change",
        isNew && "typewriter"
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="text-gray-500 mr-2 text-xs font-mono">
        {String(index + 1).padStart(2, "0")}
      </span>
      {displayText}
      {isNew && displayText.length < text.length && (
        <motion.span
          className="inline-block w-2 h-4 bg-white/70 ml-0.5"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

export function Commentary({ lines, className, maxLines = 8 }: CommentaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const prevLengthRef = useRef(0);
  const latestLine = lines[lines.length - 1];

  useEffect(() => {
    setDisplayedLines(lines.slice(-maxLines));
    prevLengthRef.current = lines.length;
  }, [lines, maxLines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines]);

  return (
    <div
      className={cn(
        "commentary-box",
        className
      )}
    >
      {/* Header */}
      <div className="commentary-header">
        <div className="live-indicator" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Live Commentary
        </span>
      </div>

      {/* Commentary feed */}
      <div
        ref={containerRef}
        className="h-[220px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {latestLine && (
          <div className="commentary-highlight">
            <span className="live-indicator" />
            {latestLine}
          </div>
        )}
        <AnimatePresence>
          {displayedLines.length === 0 ? (
            <motion.div
              className="h-full flex items-center justify-center text-gray-500 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Waiting for race to start...
            </motion.div>
          ) : (
            <div className="space-y-1">
              {displayedLines.map((line, index) => {
                const globalIndex = lines.length - displayedLines.length + index;
                const isNew =
                  globalIndex >= prevLengthRef.current - 1 &&
                  lines.length > prevLengthRef.current - 1;

                return (
                  <CommentaryLine
                    key={`${globalIndex}-${line}`}
                    text={line}
                    isNew={isNew && index === displayedLines.length - 1}
                    index={globalIndex}
                  />
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Floating commentary bubble for dramatic moments
export function CommentaryBubble({ text }: { text: string }) {
  return (
    <motion.div
      className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50"
      initial={{ opacity: 0, scale: 0.5, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -50 }}
      transition={{ type: "spring", duration: 0.5 }}
    >
      <div className="px-6 py-4 rounded-xl bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-black font-bold text-lg shadow-2xl">
        {text}
      </div>
    </motion.div>
  );
}
