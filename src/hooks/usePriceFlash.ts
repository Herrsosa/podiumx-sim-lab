import { useState, useEffect, useRef } from 'react';

type FlashDirection = 'up' | 'down' | null;

interface UsePriceFlashResult {
    /** Current flash direction for styling */
    flashDirection: FlashDirection;
    /** CSS class to apply for the flash effect */
    flashClass: string;
}

/**
 * Hook to detect price changes and trigger flash animations.
 * Returns the flash direction and CSS class to apply.
 * 
 * @param price - Current price value
 * @param duration - Flash duration in ms (default 600)
 */
export function usePriceFlash(price: number, duration = 600): UsePriceFlashResult {
    const [flashDirection, setFlashDirection] = useState<FlashDirection>(null);
    const prevPriceRef = useRef<number>(price);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Skip if price hasn't changed or it's the initial mount
        if (price === prevPriceRef.current) return;

        // Determine direction
        const direction: FlashDirection = price > prevPriceRef.current ? 'up' : 'down';

        // Update previous price
        prevPriceRef.current = price;

        // Set flash direction
        setFlashDirection(direction);

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Reset after duration
        timeoutRef.current = setTimeout(() => {
            setFlashDirection(null);
        }, duration);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [price, duration]);

    // Map direction to CSS class
    const flashClass = flashDirection === 'up'
        ? 'price-flash-up'
        : flashDirection === 'down'
            ? 'price-flash-down'
            : '';

    return { flashDirection, flashClass };
}
