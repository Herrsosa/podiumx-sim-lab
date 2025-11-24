import { useEffect, useRef } from 'react';

interface TiltOptions {
    maxTilt?: number;
    scale?: number;
    speed?: number;
    perspective?: number;
    easing?: string;
}

export function use3DTilt<T extends HTMLElement>(options: TiltOptions = {}) {
    const ref = useRef<T>(null);
    const {
        maxTilt = 15,
        scale = 1.05,
        speed = 400,
        perspective = 1000,
        easing = "cubic-bezier(0.03, 0.98, 0.52, 0.99)"
    } = options;

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        let animationFrameId: number;
        let leaveTimeoutId: NodeJS.Timeout;

        const handleMouseMove = (e: MouseEvent) => {
            if (leaveTimeoutId) clearTimeout(leaveTimeoutId);

            animationFrameId = requestAnimationFrame(() => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                // Calculate rotation based on mouse position
                const rotateX = ((y - centerY) / centerY) * -maxTilt;
                const rotateY = ((x - centerX) / centerX) * maxTilt;

                // Calculate glow position (0-100%)
                const glowX = (x / rect.width) * 100;
                const glowY = (y / rect.height) * 100;

                // Apply transform directly to the element
                element.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
                element.style.transition = 'none'; // Disable transition for instant follow

                // Update CSS variables for glow effects if needed
                element.style.setProperty('--glow-x', `${glowX}%`);
                element.style.setProperty('--glow-y', `${glowY}%`);
            });
        };

        const handleMouseLeave = () => {
            // Add transition back for smooth reset
            element.style.transition = `transform ${speed}ms ${easing}`;
            element.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`;

            // Optional: Reset glow to center or fade out
            element.style.setProperty('--glow-x', '50%');
            element.style.setProperty('--glow-y', '50%');
        };

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (leaveTimeoutId) clearTimeout(leaveTimeoutId);
        };
    }, [maxTilt, scale, speed, perspective, easing]);

    return ref;
}
