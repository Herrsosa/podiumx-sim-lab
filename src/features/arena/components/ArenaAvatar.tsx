import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const isImageAvatar = (value: string) =>
  value.startsWith("data:image") ||
  value.startsWith("http") ||
  value.startsWith("/") ||
  value.endsWith(".png") ||
  value.endsWith(".jpg") ||
  value.endsWith(".jpeg") ||
  value.endsWith(".webp") ||
  value.endsWith(".svg");

interface ArenaAvatarProps {
  value: string;
  alt?: string;
  size?: number;
  className?: string;
}

export function ArenaAvatar({ value, alt = "Avatar", size, className }: ArenaAvatarProps) {
  const style = size ? { width: size, height: size } : undefined;
  const isPixelArt = value.startsWith("data:image/svg+xml") || value.includes("/portraits/");
  const [currentSrc, setCurrentSrc] = useState(value);
  const [fallbackTried, setFallbackTried] = useState(false);

  useEffect(() => {
    setCurrentSrc(value);
    setFallbackTried(false);
  }, [value]);

  const resolveFallback = (src: string) => {
    if (src.endsWith(".png")) return src.replace(/\.png$/, ".svg");
    if (src.endsWith(".svg")) return src.replace(/\.svg$/, ".png");
    return "";
  };

  const fallbackLabel = isImageAvatar(value) ? alt?.charAt(0) ?? "?" : value;

  return (
    <span className={cn("arena-avatar", className)} style={style}>
      {isImageAvatar(value) && currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          className={cn("arena-avatar-img", isPixelArt && "pixelated")}
          onError={() => {
            if (!fallbackTried) {
              const fallback = resolveFallback(currentSrc);
              if (fallback) {
                setCurrentSrc(fallback);
                setFallbackTried(true);
                return;
              }
            }
            setCurrentSrc("");
          }}
        />
      ) : (
        <span className="arena-avatar-emoji">{fallbackLabel}</span>
      )}
    </span>
  );
}
