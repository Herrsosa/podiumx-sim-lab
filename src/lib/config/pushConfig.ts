/**
 * Push notification configuration
 * VAPID keys are used for Web Push authentication
 */

// Public VAPID key - safe to include in client code
// This should match the public key generated with web-push library
// Generate with: npx web-push generate-vapid-keys
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Check if push is supported
export function isPushSupported(): boolean {
    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.permission;
}
