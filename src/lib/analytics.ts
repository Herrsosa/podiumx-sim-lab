/**
 * Analytics tracking utility for Athlyst
 * Tracks user events to Supabase for marketing insights
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type AnalyticsEvent =
    | 'page_view'
    | 'signup_started'
    | 'signup_completed'
    | 'waitlist_joined'
    | 'strava_connected'
    | 'workout_posted'
    | 'workout_shared'
    | 'token_purchased'
    | 'token_sold'
    | 'profile_viewed'
    | 'referral_link_copied'
    | 'referral_link_shared'
    | 'inner_circle_joined'
    | 'dm_sent'
    | 'leaderboard_viewed';

export interface AnalyticsProperties {
    [key: string]: string | number | boolean | null | undefined;
}

export interface UTMData {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    referrer?: string;
}

// ============================================================================
// UTM STORAGE
// ============================================================================

const UTM_STORAGE_KEY = 'athlyst_utm_data';

/**
 * Capture UTM parameters from the current URL and store them
 */
export function captureUTMParams(): UTMData {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    const utmData: UTMData = {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
        referrer: document.referrer || undefined,
    };

    // Only store if we have actual UTM data
    if (utmData.utm_source || utmData.utm_medium || utmData.utm_campaign) {
        try {
            sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
        } catch {
            // Ignore storage errors
        }
    }

    return utmData;
}

/**
 * Get stored UTM data
 */
export function getStoredUTMData(): UTMData {
    if (typeof window === 'undefined') return {};

    try {
        const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Get or capture UTM data
 */
export function getUTMData(): UTMData {
    const stored = getStoredUTMData();
    if (stored.utm_source) return stored;
    return captureUTMParams();
}

// ============================================================================
// ANONYMOUS ID
// ============================================================================

const ANON_ID_KEY = 'athlyst_anon_id';

/**
 * Get or create anonymous ID for pre-signup tracking
 */
export function getAnonymousId(): string {
    if (typeof window === 'undefined') return '';

    try {
        let anonId = localStorage.getItem(ANON_ID_KEY);
        if (!anonId) {
            anonId = crypto.randomUUID();
            localStorage.setItem(ANON_ID_KEY, anonId);
        }
        return anonId;
    } catch {
        return crypto.randomUUID();
    }
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Track an analytics event
 */
export async function trackEvent(
    eventName: AnalyticsEvent,
    properties: AnalyticsProperties = {}
): Promise<void> {
    try {
        // Get current user if logged in
        const { data: { user } } = await supabase.auth.getUser();

        // Get UTM data
        const utmData = getUTMData();

        // Build event payload
        const eventPayload = {
            user_id: user?.id || null,
            anonymous_id: user?.id ? null : getAnonymousId(),
            event_name: eventName,
            properties,
            utm_source: utmData.utm_source || null,
            utm_medium: utmData.utm_medium || null,
            utm_campaign: utmData.utm_campaign || null,
            utm_content: utmData.utm_content || null,
            utm_term: utmData.utm_term || null,
            referrer: utmData.referrer || null,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        };

        // Insert into analytics_events table
        const { error } = await supabase
            .from('analytics_events')
            .insert(eventPayload);

        if (error) {
            console.error('Analytics tracking error:', error);
        }
    } catch (error) {
        // Silently fail - don't break the app for analytics
        console.error('Analytics tracking error:', error);
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Track a page view
 */
export function trackPageView(pageName: string, properties: AnalyticsProperties = {}): void {
    trackEvent('page_view', {
        page: pageName,
        url: typeof window !== 'undefined' ? window.location.href : '',
        ...properties,
    });
}

/**
 * Track signup started (user began signup flow)
 */
export function trackSignupStarted(method: 'email' | 'google' = 'email'): void {
    trackEvent('signup_started', { method });
}

/**
 * Track signup completed
 */
export function trackSignupCompleted(): void {
    trackEvent('signup_completed', {});
}

/**
 * Track waitlist joined
 */
export function trackWaitlistJoined(email: string): void {
    trackEvent('waitlist_joined', { email_domain: email.split('@')[1] });
}

/**
 * Track Strava connected
 */
export function trackStravaConnected(): void {
    trackEvent('strava_connected', {});
}

/**
 * Track workout posted
 */
export function trackWorkoutPosted(workoutType: string, isFromStrava: boolean = false): void {
    trackEvent('workout_posted', {
        workout_type: workoutType,
        source: isFromStrava ? 'strava' : 'manual',
    });
}

/**
 * Track workout shared
 */
export function trackWorkoutShared(platform: 'instagram' | 'twitter' | 'copy' | 'download'): void {
    trackEvent('workout_shared', { platform });
}

/**
 * Track token purchased
 */
export function trackTokenPurchased(athleteId: string, amount: number): void {
    trackEvent('token_purchased', {
        athlete_id: athleteId,
        amount,
    });
}

/**
 * Track token sold
 */
export function trackTokenSold(athleteId: string, amount: number): void {
    trackEvent('token_sold', {
        athlete_id: athleteId,
        amount,
    });
}

/**
 * Track profile viewed
 */
export function trackProfileViewed(athleteId: string, isOwnProfile: boolean = false): void {
    trackEvent('profile_viewed', {
        athlete_id: athleteId,
        is_own_profile: isOwnProfile,
    });
}

/**
 * Track referral link copied
 */
export function trackReferralLinkCopied(): void {
    trackEvent('referral_link_copied', {});
}

/**
 * Track referral link shared
 */
export function trackReferralLinkShared(platform: string): void {
    trackEvent('referral_link_shared', { platform });
}

/**
 * Track inner circle joined
 */
export function trackInnerCircleJoined(athleteId: string): void {
    trackEvent('inner_circle_joined', { athlete_id: athleteId });
}

/**
 * Track DM sent
 */
export function trackDMSent(athleteId: string): void {
    trackEvent('dm_sent', { athlete_id: athleteId });
}

/**
 * Track leaderboard viewed
 */
export function trackLeaderboardViewed(timeframe: 'all' | 'weekly' = 'all'): void {
    trackEvent('leaderboard_viewed', { timeframe });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize analytics - call this on app load
 */
export function initAnalytics(): void {
    // Capture UTM params on first load
    captureUTMParams();

    // Track initial page view
    if (typeof window !== 'undefined') {
        trackPageView(window.location.pathname);
    }
}

export default {
    trackEvent,
    trackPageView,
    trackSignupStarted,
    trackSignupCompleted,
    trackWaitlistJoined,
    trackStravaConnected,
    trackWorkoutPosted,
    trackWorkoutShared,
    trackTokenPurchased,
    trackTokenSold,
    trackProfileViewed,
    trackReferralLinkCopied,
    trackReferralLinkShared,
    trackInnerCircleJoined,
    trackDMSent,
    trackLeaderboardViewed,
    initAnalytics,
    getUTMData,
    getAnonymousId,
};
