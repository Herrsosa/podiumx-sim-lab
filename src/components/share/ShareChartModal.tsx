import { useState, useCallback, useEffect, type RefObject } from 'react';
import { Share2, Download, Link, Instagram, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    generateShareImage,
    downloadBlob,
    shareImage,
    copyToClipboard,
    canShareFiles,
} from '@/utils/shareUtils';
import { toast } from 'sonner';

interface ShareChartModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Ref to the chart container element to capture */
    chartRef: RefObject<HTMLDivElement>;
    athleteName: string;
    athleteHandle: string;
    athleteProfileUrl?: string;
}

/**
 * Modal for sharing the actual chart element from the page.
 * Captures the exact chart as displayed, including PoS dots.
 */
export function ShareChartModal({
    open,
    onOpenChange,
    chartRef,
    athleteName,
    athleteHandle,
    athleteProfileUrl,
}: ShareChartModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const supportsShare = canShareFiles();

    // Generate preview when modal opens
    useEffect(() => {
        if (open && chartRef.current && !previewUrl) {
            // Generate a preview image when modal opens
            generateShareImage(chartRef.current)
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    setPreviewUrl(url);
                    setGeneratedBlob(blob);
                })
                .catch(err => {
                    console.error('Failed to generate preview:', err);
                });
        }

        // Cleanup preview URL when modal closes
        if (!open) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(null);
            setGeneratedBlob(null);
        }
    }, [open, chartRef, previewUrl]);

    // Generate the image from the actual chart element
    const ensureImageGenerated = useCallback(async () => {
        if (generatedBlob) return generatedBlob;

        const element = chartRef.current;
        if (!element) {
            throw new Error('Chart element not available');
        }

        setIsGenerating(true);
        try {
            const blob = await generateShareImage(element);
            setGeneratedBlob(blob);
            return blob;
        } finally {
            setIsGenerating(false);
        }
    }, [generatedBlob, chartRef]);

    // Share to Instagram (uses native share on mobile)
    const handleShareInstagram = async () => {
        try {
            const blob = await ensureImageGenerated();
            const success = await shareImage(
                blob,
                `${athleteName}'s Chart`,
                `Check out my Athlete Card on Athlyst! ${athleteProfileUrl || ''}`
            );
            if (success) {
                toast.success('Opening share sheet...');
                onOpenChange(false);
            } else {
                // Fallback to download
                toast.info('Open Instagram and share the downloaded image');
                downloadBlob(blob, `${athleteHandle}-chart.png`);
            }
        } catch (error) {
            console.error('Share failed:', error);
            toast.error('Failed to generate share image');
        }
    };

    // Download image
    const handleDownload = async () => {
        try {
            const blob = await ensureImageGenerated();
            downloadBlob(blob, `${athleteHandle}-chart.png`);
            toast.success('Image downloaded!');
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to generate image');
        }
    };

    // Copy link
    const handleCopyLink = async () => {
        const url = athleteProfileUrl || window.location.href;
        const success = await copyToClipboard(url);
        if (success) {
            toast.success('Link copied!');
        } else {
            toast.error('Failed to copy link');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-md"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        Share Chart
                    </DialogTitle>
                </DialogHeader>

                {/* Preview - captured chart image */}
                <div className="flex justify-center mb-4">
                    <div
                        className="rounded-lg overflow-hidden border border-white/10 shadow-lg bg-background"
                        style={{
                            width: '100%',
                            maxWidth: '360px',
                            aspectRatio: '16/9',
                        }}
                    >
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Chart preview"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading preview...
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Instagram / Native Share (mobile) */}
                    {(isMobile || supportsShare) && (
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3 h-12"
                            onClick={handleShareInstagram}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Instagram className="h-5 w-5 text-pink-500" />
                            )}
                            <span>Share to Instagram Stories</span>
                        </Button>
                    )}

                    {/* Download */}
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-12"
                        onClick={handleDownload}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Download className="h-5 w-5 text-blue-500" />
                        )}
                        <span>Download Image</span>
                    </Button>

                    {/* Copy Link */}
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-12"
                        onClick={handleCopyLink}
                    >
                        <Link className="h-5 w-5 text-green-500" />
                        <span>Copy Link</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
