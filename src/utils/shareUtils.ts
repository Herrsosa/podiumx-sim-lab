import html2canvas from 'html2canvas';

/**
 * Generate a shareable image from an HTML element
 * Returns a Blob that can be downloaded or shared
 */
export async function generateShareImage(element: HTMLElement): Promise<Blob> {
    const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true, // Allow cross-origin images
        allowTaint: true,
        backgroundColor: '#0f172a', // slate-900
        logging: false,
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
