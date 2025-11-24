import { useEffect, useState, RefObject } from 'react';

interface TiltState {
    rotateX: number;
    rotateY: number;
    scale: number;
}

export function use3DTilt(
    ref: RefObject<HTMLElement>,
    options: { maxTilt?: number; scale?: number; speed?: number } = {}
) {
    const { maxTilt = 15, scale = 1.05, speed = 400 } = options;
    const [tilt, setTilt] = useState<TiltState>({ rotateX: 0, rotateY: 0, scale: 1 });

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -maxTilt;
            const rotateY = ((x - centerX) / centerX) * maxTilt;

            setTilt({ rotateX, rotateY, scale });
        };

        const handleMouseLeave = () => {
            setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
        };

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [ref, maxTilt, scale]);

    return {
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
        transition: `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`,
    };
}
