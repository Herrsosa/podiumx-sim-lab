import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";

interface LiveCommentaryOverlayProps {
  lines: string[];
  maxLines?: number;
  autoHideDelay?: number;
}

export function LiveCommentaryOverlay({
  lines,
  maxLines = 3,
  autoHideDelay = 8000,
}: LiveCommentaryOverlayProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const lastLineRef = React.useRef<string | null>(null);

  // Get the most recent lines
  const recentLines = lines.slice(-maxLines);
  const latestLine = recentLines[recentLines.length - 1];

  // Reset visibility timer when new commentary arrives
  React.useEffect(() => {
    if (latestLine && latestLine !== lastLineRef.current) {
      lastLineRef.current = latestLine;
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [latestLine, autoHideDelay]);

  if (recentLines.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-20 left-6 z-40 max-w-md pointer-events-none"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-black/80 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Live Commentary
              </span>
              <motion.div
                className="ml-auto w-2 h-2 rounded-full bg-red-500"
                animate={{
                  opacity: [1, 0.3, 1],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>

            {/* Commentary lines */}
            <div className="px-4 py-3 space-y-2">
              <AnimatePresence mode="popLayout">
                {recentLines.map((line, index) => {
                  const isLatest = index === recentLines.length - 1;
                  return (
                    <motion.div
                      key={`${line}-${index}`}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{
                        opacity: isLatest ? 1 : 0.6,
                        y: 0,
                        scale: 1
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className={`text-sm leading-relaxed ${
                        isLatest ? 'text-white font-medium' : 'text-gray-400'
                      }`}
                    >
                      {line}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
