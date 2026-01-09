import { useState, useRef, useCallback, useEffect } from 'react';
import { Share2, Download, Link, Instagram, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShareableAuraCard, type ShareableAuraCardRef } from './ShareableAuraCard';
import {
    generateShareImage,
    downloadBlob,
    shareImage,
    copyToClipboard,
    canShareFiles,
} from '@/utils/shareUtils';
import { toast } from 'sonner';
import type { IdentityKernel } from '@/hooks/useIdentityKernel';

interface ShareAuraModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    kernel: IdentityKernel;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
    athleteProfileUrl?: string;
}

export function ShareAuraModal({
    open,
    onOpenChange,
    kernel,
    athleteName,
    athleteHandle,
    athleteAvatar,
    athleteProfileUrl,
}: ShareAuraModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
    const cardRef = useRef<ShareableAuraCardRef>(null);

    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const supportsShare = canShareFiles();

    // Reset blob when modal opens/closes
    useEffect(() => {
        if (open) {
            setGeneratedBlob(null);
        }
    }, [open]);

    // Generate the image (lazy, on first action)
    const ensureImageGenerated = useCallback(async () => {
        if (generatedBlob) return generatedBlob;

        const element = cardRef.current?.getElement();
        if (!element) {
            throw new Error('Card element not available');
        }

        setIsGenerating(true);
        try {
            const blob = await generateShareImage(element);
            setGeneratedBlob(blob);
            return blob;
        } finally {
            setIsGenerating(false);
        }
    }, [generatedBlob]);

    // Share to Instagram (uses native share on mobile)
    const handleShareInstagram = async () => {
        try {
            const blob = await ensureImageGenerated();
            const success = await shareImage(
                blob,
                `${athleteName}'s Aura Score`,
                `Check out my Aura Score on Athlyst! ${athleteProfileUrl || ''}`
            );
            if (success) {
                toast.success('Opening share sheet...');
                onOpenChange(false);
            } else {
                // Fallback to download
                toast.info('Open Instagram and share the downloaded image');
                downloadBlob(blob, `${athleteHandle}-aura.png`);
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
            downloadBlob(blob, `${athleteHandle}-aura.png`);
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
                        Share Aura Score
                    </DialogTitle>
                </DialogHeader>

                {/* Preview - scaled down shareable card */}
                <div className="flex justify-center mb-4">
                    <div
                        className="rounded-lg overflow-hidden border border-white/10 shadow-lg"
                        style={{
                            width: '180px',
                            height: '320px',
                            transform: 'scale(1)',
                        }}
                    >
                        <div style={{
                            transform: 'scale(0.333)',
                            transformOrigin: 'top left',
                            width: '540px',
                            height: '960px',
                        }}>
                            <ShareableAuraCard
                                kernel={kernel}
                                athleteName={athleteName}
                                athleteHandle={athleteHandle}
                                athleteAvatar={athleteAvatar}
                            />
                        </div>
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

                {/* Hidden shareable card for image generation (full size) */}
                <div className="fixed -left-[9999px] -top-[9999px]">
                    <ShareableAuraCard
                        ref={cardRef}
                        kernel={kernel}
                        athleteName={athleteName}
                        athleteHandle={athleteHandle}
                        athleteAvatar={athleteAvatar}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
