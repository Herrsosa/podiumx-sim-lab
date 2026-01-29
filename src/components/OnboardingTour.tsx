/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useCallback } from 'react';
import { driver, type DriveStep, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { useUser } from '@/store/auth';

// Tour step definitions - 13 steps in order
const TOUR_STEPS: DriveStep[] = [
    // 1. My Athlete Profile - General intro
    {
        element: '[data-tour="profile-section"]',
        popover: {
            title: '👋 Welcome to Your Profile',
            description: 'This is your home base on Athlyst. Here you can manage your identity, track your progress, and connect with your community.',
            side: 'bottom',
            align: 'center',
        },
    },
    // 2. Athlete Profile identity
    {
        element: '[data-tour="profile-identity"]',
        popover: {
            title: '🏃 Your Athlete Identity',
            description: 'Customize your display name, sport, bio, and profile photo. This is how fans and other athletes will recognize you.',
            side: 'bottom',
            align: 'start',
        },
    },
    // 3. Market Cap - THE core metric
    {
        element: '[data-tour="market-cap"]',
        popover: {
            title: '💰 Your Market Cap',
            description: 'Your Market Cap is your social signal of momentum! It rises when supporters buy your Card and shows how much your community believes in you.',
            side: 'bottom',
            align: 'center',
        },
    },
    // 4. Proof of Sweat - workouts
    {
        element: '[data-tour="proof-of-sweat"]',
        popover: {
            title: '💪 Proof of Sweat',
            description: 'Log your workouts here! Every session you log builds your athlete story and shows your community you\'re putting in the work.',
            side: 'top',
            align: 'center',
        },
    },
    // 5. Aura Score Card
    {
        element: '[data-tour="aura-score"]',
        popover: {
            title: '✨ Your Aura Score',
            description: 'Your Aura Score reflects your consistency, output, and momentum. Keep training to boost your score and climb the leaderboard!',
            side: 'bottom',
            align: 'center',
        },
    },
    // 6. Athlete Card Chart
    {
        element: '[data-tour="card-chart"]',
        popover: {
            title: '📈 Your Athlete Card',
            description: 'Your Card price reflects your performance and engagement. Fans can buy and trade your Card — the more active you are, the more valuable it becomes!',
            side: 'bottom',
            align: 'center',
        },
    },
    // 6. Strava connections
    {
        element: '[data-tour="strava-card"]',
        popover: {
            title: '🔗 Strava Integration',
            description: 'Connect Strava to auto-import your workouts. Your training data syncs automatically as Proof of Sweat!',
            side: 'top',
            align: 'center',
        },
    },
    // 8. Inner Circle
    {
        element: '[data-tour="inner-circle"]',
        popover: {
            title: '🔐 Your Inner Circle',
            description: 'Only your Card holders can access this! Fans buy your Card to unlock group chat and DMs with you — your exclusive community space.',
            side: 'bottom',
            align: 'start',
        },
    },
    // 8. Marketplace
    {
        element: '[data-tour="marketplace"]',
        popover: {
            title: '🏪 Marketplace',
            description: 'Discover other athletes and buy their Cards. Build your portfolio by investing in talent you believe in!',
            side: 'bottom',
            align: 'center',
        },
    },
    // 9. Portfolio
    {
        element: '[data-tour="portfolio"]',
        popover: {
            title: '💼 Your Portfolio',
            description: 'Track your investments! See all the Athlete Cards you own and monitor your overall performance.',
            side: 'bottom',
            align: 'center',
        },
    },
    // 10. Feed
    {
        element: '[data-tour="feed"]',
        popover: {
            title: '📰 Community Feed',
            description: 'See workouts from athletes across the platform. Discover new talent and show support by "propping" their posts!',
            side: 'bottom',
            align: 'center',
        },
    },
    // 12. Rewards
    {
        element: '[data-tour="rewards"]',
        popover: {
            title: '🎁 Rewards',
            description: 'Earn Sweat Points by posting workouts, referring friends, and engaging with the community. Climb the leaderboard and unlock rewards!',
            side: 'bottom',
            align: 'center',
        },
    },
    // 13. Notifications
    {
        element: '[data-tour="notifications"]',
        popover: {
            title: '🔔 Notifications',
            description: 'Stay updated! You\'ll be notified when someone props your workouts, trades your Cards, or sends you a message.',
            side: 'bottom',
            align: 'end',
        },
    },
];

// Map tour element to navigation path (for clicking through during tour)
const NAVIGATION_MAP: Record<string, string> = {
    '[data-tour="marketplace"]': '/marketplace',
    '[data-tour="portfolio"]': '/portfolio',
    '[data-tour="feed"]': '/feed',
    '[data-tour="rewards"]': '/rewards',
};

interface OnboardingTourProps {
    onComplete?: () => void;
    onSkip?: () => void;
}

/**
 * Onboarding tour component using driver.js
 * Shows guided tour highlighting key UI elements
 */
export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
    const user = useUser();
    const { markTourCompleted } = useOnboardingTour();
    const driverRef = useRef<ReturnType<typeof driver> | null>(null);
    const hasStarted = useRef(false);

    const handleTourEnd = useCallback((completed: boolean) => {
        markTourCompleted();
        if (completed) {
            onComplete?.();
        } else {
            onSkip?.();
        }
    }, [markTourCompleted, onComplete, onSkip]);

    useEffect(() => {
        if (!user || hasStarted.current) return;

        // Small delay to ensure DOM elements are mounted
        const timer = setTimeout(() => {
            hasStarted.current = true;

            // Filter steps to only include elements that exist in DOM
            const availableSteps = TOUR_STEPS.filter((step) => {
                if (typeof step.element === 'string') {
                    return document.querySelector(step.element);
                }
                return false;
            });

            if (availableSteps.length === 0) {
                console.warn('[Tour] No tour elements found, skipping tour');
                handleTourEnd(false);
                return;
            }

            const driverConfig: Config = {
                showProgress: true,
                progressText: '{{current}} of {{total}}',
                allowClose: true,
                overlayColor: 'rgba(0, 0, 0, 0.75)',
                stagePadding: 8,
                stageRadius: 8,
                animate: true,
                steps: availableSteps,
                nextBtnText: 'Next →',
                prevBtnText: '← Back',
                doneBtnText: 'Done ✓',
                onDestroyStarted: () => {
                    handleTourEnd(true);
                },
                onCloseClick: () => {
                    driverRef.current?.destroy();
                    handleTourEnd(false);
                },
            };

            driverRef.current = driver(driverConfig);
            driverRef.current.drive();
        }, 500);

        return () => {
            clearTimeout(timer);
            if (driverRef.current) {
                driverRef.current.destroy();
            }
        };
    }, [user, handleTourEnd]);

    return null; // This component controls driver.js, no UI of its own
}

// Store navigate function for use in tour
let navigateFn: ((path: string) => void) | null = null;

/**
 * Starts tour programmatically (for Settings "Take the tour" button)
 * @param navigate - React Router navigate function
 * @param onComplete - Optional callback when tour completes
 */
export function startTour(navigate?: (path: string) => void, onComplete?: () => void) {
    // Store navigate function for use in onHighlightStarted
    navigateFn = navigate ?? null;

    // If we have a navigate function, go to My Athlete page first
    if (navigate) {
        // Navigate to My Athlete page where all tour elements are visible
        navigate('/my-athlete');

        // Wait for navigation and DOM to settle
        setTimeout(() => {
            runTour(onComplete);
        }, 800);
    } else {
        // No navigation, just run on current page
        runTour(onComplete);
    }
}

function runTour(onComplete?: () => void) {
    // Build steps: for navigation steps, add onHighlightStarted that navigates first
    const stepsWithNavigation = TOUR_STEPS.map((step) => {
        const elementSelector = step.element as string;
        const navPath = NAVIGATION_MAP[elementSelector];

        if (navPath && navigateFn) {
            return {
                ...step,
                onHighlightStarted: () => {
                    // Navigate to the page when this step is highlighted
                    if (!window.location.pathname.startsWith(navPath)) {
                        navigateFn?.(navPath);
                    }
                },
            };
        }
        return step;
    });

    // Filter steps: keep steps that EITHER have elements OR have navigation paths
    const availableSteps = stepsWithNavigation.filter((step) => {
        const elementSelector = step.element as string;
        const navPath = NAVIGATION_MAP[elementSelector];

        // If this step has a navigation path, include it regardless of current DOM
        if (navPath) {
            return true;
        }

        // Otherwise, only include if element exists in current DOM
        if (typeof step.element === 'string') {
            return document.querySelector(step.element);
        }
        return false;
    });

    if (availableSteps.length === 0) {
        console.warn('[Tour] No tour elements found');
        return;
    }

    tourDriverInstance = driver({
        showProgress: true,
        progressText: '{{current}} of {{total}}',
        allowClose: true,
        overlayColor: 'rgba(0, 0, 0, 0.75)',
        stagePadding: 8,
        stageRadius: 8,
        animate: true,
        steps: availableSteps,
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Done ✓',
        onDestroyStarted: () => {
            // Must call destroy() to actually close the tour
            tourDriverInstance?.destroy();
            tourDriverInstance = null;
            navigateFn = null;
            onComplete?.();
        },
    });

    tourDriverInstance.drive();
}

// Keep track of driver instance for navigation
let tourDriverInstance: ReturnType<typeof driver> | null = null;


