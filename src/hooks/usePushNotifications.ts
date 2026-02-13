import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/store/auth';
import {
    VAPID_PUBLIC_KEY,
    isPushSupported,
    getNotificationPermission
} from '@/lib/config/pushConfig';
import { featureFlags } from '@/lib/config/featureFlags';

interface UsePushNotificationsResult {
    /** Whether push notifications are supported in this browser */
    isSupported: boolean;
    /** Current permission status: 'default' | 'granted' | 'denied' */
    permission: NotificationPermission;
    /** Whether user has an active push subscription */
    isSubscribed: boolean;
    /** Loading state */
    isLoading: boolean;
    /** Request permission and subscribe to push */
    subscribe: () => Promise<boolean>;
    /** Unsubscribe from push notifications */
    unsubscribe: () => Promise<void>;
}

/**
 * Hook for managing Web Push notification subscriptions
 */
export function usePushNotifications(): UsePushNotificationsResult {
    const user = useUser();
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const isSupported = isPushSupported() && !!featureFlags.enablePushNotifications;

    // Check initial permission and subscription status
    useEffect(() => {
        if (!isSupported) {
            setIsLoading(false);
            return;
        }

        setPermission(getNotificationPermission());

        // Check if already subscribed
        navigator.serviceWorker.ready.then(async (registration) => {
            try {
                const subscription = await (registration as any).pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (error) {
                console.error('[Push] Error checking subscription:', error);
            } finally {
                setIsLoading(false);
            }
        });
    }, [isSupported]);

    // Register service worker on mount
    useEffect(() => {
        if (!isSupported) return;

        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('[Push] Service worker registered:', registration.scope);
            })
            .catch((error) => {
                console.error('[Push] Service worker registration failed:', error);
            });
    }, [isSupported]);

    // Convert VAPID key to Uint8Array for subscription
    const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    // Subscribe to push notifications
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported || !user?.id) {
            console.warn('[Push] Cannot subscribe: not supported or no user');
            return false;
        }

        if (!VAPID_PUBLIC_KEY) {
            console.warn('[Push] Cannot subscribe: VAPID_PUBLIC_KEY not configured');
            return false;
        }

        try {
            setIsLoading(true);

            // Request notification permission
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result !== 'granted') {
                console.log('[Push] Permission denied');
                return false;
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            // TS DOM typings expect ArrayBuffer-backed views (not ArrayBufferLike).
            const applicationServerKey =
                urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as Uint8Array<ArrayBuffer>;
            const subscription = await (registration as any).pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });



            console.log('[Push] Subscription created:', subscription.endpoint);

            // Store subscription in Supabase
            const subscriptionJson = subscription.toJSON();
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    endpoint: subscription.endpoint,
                    p256dh: subscriptionJson.keys?.p256dh || '',
                    auth: subscriptionJson.keys?.auth || '',
                    created_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id,endpoint',
                });

            if (error) {
                console.error('[Push] Error storing subscription:', error);
                // Still mark as subscribed since browser has the subscription
            }

            setIsSubscribed(true);
            return true;
        } catch (error) {
            console.error('[Push] Subscription failed:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported, user?.id]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<void> => {
        if (!isSupported || !user?.id) return;

        try {
            setIsLoading(true);

            const registration = await navigator.serviceWorker.ready;
            const subscription = await (registration as any).pushManager.getSubscription();

            if (subscription) {
                // Remove from Supabase
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('endpoint', subscription.endpoint);

                // Unsubscribe from browser
                await subscription.unsubscribe();
                console.log('[Push] Unsubscribed successfully');
            }

            setIsSubscribed(false);
        } catch (error) {
            console.error('[Push] Unsubscribe failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isSupported, user?.id]);

    return {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    };
}
