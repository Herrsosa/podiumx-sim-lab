import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface CountUpProps {
    value: number;
    direction?: "up" | "down";
    delay?: number;
    duration?: number;
    className?: string;
    decimalPlaces?: number;
    prefix?: string;
    suffix?: string;
}

export function CountUp({
    value,
    direction = "up",
    delay = 0,
    duration = 2,
    className,
    decimalPlaces = 0,
    prefix = "",
    suffix = "",
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? value : 0);
    const springValue = useSpring(motionValue, {
        damping: 60,
        stiffness: 100,
        duration: duration * 1000,
    });
    const isInView = useInView(ref, { once: true, margin: "0px" });

    useEffect(() => {
        if (isInView) {
            setTimeout(() => {
                motionValue.set(direction === "down" ? 0 : value);
            }, delay * 1000);
        }
    }, [motionValue, isInView, delay, value, direction]);

    useEffect(() => {
        const formatter = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        });

        // Set initial value immediately
        if (ref.current) {
            const current = springValue.get();
            // Handle NaN or invalid numbers gracefully
            const safeValue = isNaN(current) ? 0 : current;
            ref.current.textContent = `${prefix}${formatter.format(safeValue)}${suffix}`;
        }

        return springValue.on("change", (latest) => {
            if (ref.current) {
                // Handle NaN or invalid numbers gracefully
                const safeLatest = isNaN(latest) ? 0 : latest;
                ref.current.textContent = `${prefix}${formatter.format(safeLatest)}${suffix}`;
            }
        });
    }, [springValue, decimalPlaces, prefix, suffix]);

    return <span ref={ref} className={className} />;
}
