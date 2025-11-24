import { useRef, useEffect } from 'react';

interface HolographicShineProps {
    className?: string;
}

export function HolographicShine({ className = '' }: HolographicShineProps) {
    const shineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const shine = shineRef.current;
        if (!shine) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = shine.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            shine.style.setProperty('--mouse-x', `${x}px`);
            shine.style.setProperty('--mouse-y', `${y}px`);
        };

        const parent = shine.parentElement;
        if (parent) {
            parent.addEventListener('mousemove', handleMouseMove);
            return () => parent.removeEventListener('mousemove', handleMouseMove);
        }
    }, []);

    return (
        <div
            ref={shineRef}
            className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${className}`}
            style={{
                background: `
          radial-gradient(
            600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(255,255,255,0.15),
            transparent 40%
          )
        `,
            }}
        />
    );
}
