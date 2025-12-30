/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useCallback } from 'react';
import { driver, type DriveStep, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { useUser } from '@/store/auth';

// Tour step definitions
const TOUR_STEPS: DriveStep[] = [
    {
        element: '[data-tour="profile-identity"]',
        popover: {
            title: '👋 Your Athlete Profile',
            description: 'This is your identity on Athlyst. Customize your display name, sport, and bio to stand out.',
            side: 'bottom',
            align: 'start',
        },
    },
    {
        element: '[data-tour="token-widget"]',
        popover: {
            title: '📈 Your Token',
            description: 'Your token price reflects your performance and engagement. Fans can buy and trade your token!',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '[data-tour="strava-card"]',
        popover: {
            title: '🏃 Strava Integration',
            description: 'Connect Strava to auto-import workouts as Proof of Sweat. Your training data becomes part of your athlete story!',
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '[data-tour="locker-tab"]',
        popover: {
            title: '🔐 Your Locker',
            description: 'The Locker is exclusive content for your token holders. Only fans who buy your token can access this area!',
            side: 'bottom',
            align: 'start',
        },
    },
    {
        element: '[data-tour="props-button"]',
        popover: {
            title: '❤️ Props',
            description: 'Tap the heart to "prop" workouts you love. It\'s how athletes show support for each other.',
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '[data-tour="notifications"]',
        popover: {
            title: '🔔 Notifications',
            description: 'Stay updated when someone props your workouts, trades your tokens, or sends you a message.',
            side: 'bottom',
            align: 'end',
        },
    },
    {
        element: '[data-tour="feed"]',
        popover: {
            title: '📰 Feed',
            description: 'Browse workouts from athletes across the platform. Discover new talent and prop their posts!',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '[data-tour="marketplace"]',
        popover: {
            title: '🏪 Marketplace',
            description: 'Discover other athletes, buy their tokens, and build your portfolio.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '[data-tour="portfolio"]',
        popover: {
            title: '💼 Portfolio',
            description: 'Track your investments! See all the athlete tokens you own and your overall performance.',
            side: 'bottom',
            align: 'center',
        },
    },
];

// Map tour element to navigation path (for clicking through during tour)
const NAVIGATION_MAP: Record<string, string> = {
    '[data-tour="feed"]': '/feed',
    '[data-tour="marketplace"]': '/marketplace',
    '[data-tour="portfolio"]': '/portfolio',
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
        // Navigate to My Athlete Personal tab where all tour elements are visible
        navigate('/my-athlete?tab=personal');

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


