import html2canvas from 'html2canvas';

// ============================================================================
// UTM TRACKING
// ============================================================================

export interface UTMParams {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
}

/**
 * Add UTM parameters to a URL
 */
export function addUTMParams(url: string, params: UTMParams): string {
    const urlObj = new URL(url);

    if (params.utm_source) urlObj.searchParams.set('utm_source', params.utm_source);
    if (params.utm_medium) urlObj.searchParams.set('utm_medium', params.utm_medium);
    if (params.utm_campaign) urlObj.searchParams.set('utm_campaign', params.utm_campaign);
    if (params.utm_content) urlObj.searchParams.set('utm_content', params.utm_content);
    if (params.utm_term) urlObj.searchParams.set('utm_term', params.utm_term);

    return urlObj.toString();
}

/**
 * Get default UTM params for different share platforms
 */
export function getShareUTMParams(platform: 'instagram' | 'twitter' | 'copy' | 'download'): UTMParams {
    const baseParams: UTMParams = {
        utm_source: platform,
        utm_medium: 'social',
        utm_campaign: 'proof_of_sweat',
    };

    switch (platform) {
        case 'instagram':
            return { ...baseParams, utm_content: 'story_share' };
        case 'twitter':
            return { ...baseParams, utm_content: 'tweet' };
        case 'copy':
            return { ...baseParams, utm_medium: 'referral', utm_content: 'link_copy' };
        case 'download':
            return { ...baseParams, utm_medium: 'referral', utm_content: 'image_download' };
        default:
            return baseParams;
    }
}

/**
 * Generate a trackable profile URL with UTM params
 */
export function getTrackableProfileUrl(
    athleteHandle: string,
    platform: 'instagram' | 'twitter' | 'copy' | 'download'
): string {
    const baseUrl = `https://athlyst.fun/athlete/${athleteHandle}`;
    return addUTMParams(baseUrl, getShareUTMParams(platform));
}

/**
 * Generate a trackable referral URL
 */
export function getReferralUrl(referralCode: string): string {
    const baseUrl = 'https://athlyst.fun/auth';
    return addUTMParams(`${baseUrl}?invite=${referralCode}`, {
        utm_source: 'referral',
        utm_medium: 'invite_link',
        utm_campaign: 'user_referral',
    });
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generate a shareable image from an HTML element
 * Returns a Blob that can be downloaded or shared
 */
export async function generateShareImage(element: HTMLElement): Promise<Blob> {
    // Wait for map tiles to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true, // Allow cross-origin images
        allowTaint: true,
        backgroundColor: '#0f172a', // slate-900
        logging: false,
        // Wait for map tiles to load
        onclone: (document) => {
            const maps = document.querySelectorAll('.leaflet-container');
            maps.forEach(map => {
                // Force map tiles to be visible if they were somehow hidden
                (map as HTMLElement).style.visibility = 'visible';
            });
        }
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to generate image'));
                }
            },
            'image/png',
            1.0
        );
    });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Check if Web Share API with files is supported
 */
export function canShareFiles(): boolean {
    return (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function'
    );
}

/**
 * Convert a blob to a data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Convert a data URL to a blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Share an image using the Web Share API
 * Returns true if successful, false if user cancelled or not supported
 * 
 * Note: Safari/WebKit has issues with blobs created directly from canvas.toBlob().
 * Converting to data URL and back creates a more stable blob reference.
 */
export async function shareImage(
    blob: Blob,
    title: string,
    text?: string
): Promise<boolean> {
    if (!canShareFiles()) {
        return false;
    }

    try {
        // Convert blob to data URL and back to create a stable blob for Safari
        // This fixes WebKitBlobResource error 1 on iOS Safari
        const dataUrl = await blobToDataUrl(blob);
        const stableBlob = dataUrlToBlob(dataUrl);

        const file = new File([stableBlob], 'workout.png', { type: 'image/png' });

        // Check if we can share this file
        if (!navigator.canShare({ files: [file] })) {
            return false;
        }

        await navigator.share({
            files: [file],
            title,
            text,
        });
        return true;
    } catch (error) {
        // User cancelled or error
        if ((error as Error).name === 'AbortError') {
            return false; // User cancelled
        }
        console.error('Share failed:', error);
        return false;
    }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
