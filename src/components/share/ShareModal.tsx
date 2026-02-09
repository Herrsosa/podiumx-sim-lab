import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Download, Link, Instagram, Loader2, Twitter } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShareableWorkoutCard, type ShareableWorkoutCardRef } from './ShareableWorkoutCard';
import {
    generateShareImage,
    downloadBlob,
    shareImage,
    copyToClipboard,
    canShareFiles,
    getTrackableProfileUrl,
} from '@/utils/shareUtils';
import { trackWorkoutShared } from '@/lib/analytics';
import { useAwardPoints } from '@/hooks/usePoints';
import { toast } from 'sonner';
import type { Workout } from '@/types';

interface ShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workout: Workout;
    athleteName: string;
    athleteHandle: string;
    athleteAvatar?: string;
    imageUrl?: string;
    athleteProfileUrl?: string;
    location?: { lat: number; lng: number } | null;
    polyline?: string | null;
}

export function ShareModal({
    open,
    onOpenChange,
    workout,
    athleteName,
    athleteHandle,
    athleteAvatar,
    athleteProfileUrl,
    location,
    polyline,
}: ShareModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
    const [generationKey, setGenerationKey] = useState(0); // Used to force remount of hidden card
    const cardRef = useRef<ShareableWorkoutCardRef>(null);
    const awardPoints = useAwardPoints();

    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const supportsShare = canShareFiles();

    // Award points for social share (called after successful share)
    const awardSharePoints = useCallback(() => {
        awardPoints.mutate(
            { action: 'social_share' },
            {
                onSuccess: (result) => {
                    console.log('[ShareModal] Points award result:', result);
                    if (result.points_awarded > 0) {
                        toast.success(`+${result.points_awarded} points for sharing!`);
                    }
                },
                onError: (error) => {
                    console.error('[ShareModal] Points award error:', error);
                },
            }
        );
    }, [awardPoints]);

    // Generate caption text for sharing
    const getShareCaption = useCallback(() => {
        const parts = [`Just completed a ${workout.type} workout! 💪`];
        if (workout.distance) parts.push(`📏 ${workout.distance}km`);
        if (workout.duration) parts.push(`⏱️ ${workout.duration}min`);
        parts.push('');
        parts.push('#Athlyst #ProofOfSweat');
        return parts.join('\n');
    }, [workout]);

    // Reset blob when modal opens/closes or workout changes
    useEffect(() => {
        if (open) {
            setGeneratedBlob(null);
        }
    }, [open, workout.id]);

    // Generate the image (lazy, on first action)
    const ensureImageGenerated = useCallback(async () => {
        if (generatedBlob) return generatedBlob;

        const element = cardRef.current?.getElement();
        if (!element) {
            throw new Error('Card element not available');
        }

        setIsGenerating(true);
        try {
            // Add a small delay to ensure any paints are final, though usually not needed for visible elements
            await new Promise(resolve => setTimeout(resolve, 500));

            const blob = await generateShareImage(element);
            setGeneratedBlob(blob);
            return blob;
        } finally {
            setIsGenerating(false);
        }
    }, [generatedBlob]);

    // Share to Instagram (uses native share on mobile, download+copy on desktop)
    const handleShareInstagram = async () => {
        try {
            const blob = await ensureImageGenerated();
            const trackableUrl = getTrackableProfileUrl(athleteHandle, 'instagram');
            const caption = `${getShareCaption()}\n\n${trackableUrl}`;

            const success = await shareImage(
                blob,
                `${athleteName}'s Workout`,
                `Check out this workout on Athlyst! ${trackableUrl}`
            );
            if (success) {
                toast.success('Opening share sheet...');
                trackWorkoutShared('instagram');
                awardSharePoints();
                onOpenChange(false);
            } else {
                // Desktop fallback: download image + copy caption
                downloadBlob(blob, `${athleteHandle}-workout.png`);
                await copyToClipboard(caption);
                toast.success('Image downloaded & caption copied! Share to Instagram manually.');
                trackWorkoutShared('instagram');
                awardSharePoints();
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
            downloadBlob(blob, `${athleteHandle}-workout.png`);
            toast.success('Image downloaded!');
            trackWorkoutShared('download');
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to generate image');
        }
    };

    // Copy link
    const handleCopyLink = async () => {
        const trackableUrl = getTrackableProfileUrl(athleteHandle, 'copy');
        const success = await copyToClipboard(trackableUrl);
        if (success) {
            toast.success('Link copied!');
            trackWorkoutShared('copy');
        } else {
            toast.error('Failed to copy link');
        }
    };

    // Share to X/Twitter - download image + copy caption + open Twitter
    const handleShareX = async () => {
        try {
            // Generate and download image
            const blob = await ensureImageGenerated();
            downloadBlob(blob, `${athleteHandle}-workout.png`);

            // Copy caption to clipboard
            const caption = getShareCaption();
            const trackableUrl = getTrackableProfileUrl(athleteHandle, 'twitter');
            const fullCaption = `${caption}\n\n${trackableUrl}`;
            await copyToClipboard(fullCaption);

            // Open Twitter
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(trackableUrl)}`;
            window.open(twitterUrl, '_blank', 'width=550,height=420');

            toast.success('Image downloaded & caption copied! Paste in your tweet and attach the image.');
            trackWorkoutShared('twitter');
            awardSharePoints();
        } catch (error) {
            console.error('Share to X failed:', error);
            // Fallback: just open Twitter without image
            const caption = getShareCaption();
            const trackableUrl = getTrackableProfileUrl(athleteHandle, 'twitter');
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(trackableUrl)}`;
            window.open(twitterUrl, '_blank', 'width=550,height=420');
            toast.success('Opening X...');
            trackWorkoutShared('twitter');
            awardSharePoints();
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
                        Share Workout
                    </DialogTitle>
                </DialogHeader>

                {/* Preview - scaled down shareable card */}
                <div className="flex justify-center mb-4">
                    <div
                        className="rounded-lg overflow-hidden border border-white/10 shadow-lg"
                        style={{
                            width: '180px',
                            height: '320px',
                        }}
                    >
                        <div style={{
                            transform: 'scale(0.333)',
                            transformOrigin: 'top left',
                            width: '540px',
                            height: '960px',
                        }}>
                            <ShareableWorkoutCard
                                workout={workout}
                                athleteName={athleteName}
                                athleteHandle={athleteHandle}
                                athleteAvatar={athleteAvatar}
                                location={location}
                                polyline={polyline}
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

                    {/* Share to X/Twitter */}
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-12"
                        onClick={handleShareX}
                    >
                        <Twitter className="h-5 w-5" />
                        <span>Share to X</span>
                    </Button>

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

            {/* 
                Hidden shareable card for image generation (full size).
                Rendered via Portal to 'document.body' to escape Dialog's layout constraints (max-w-md, transforms).
                We use fixed positioning + opacity 0 + z-index -9999 to keep it "on screen" for Leaflet
                but invisible to the user.
            */}
            {createPortal(
                <div style={{ position: 'fixed', left: 0, top: 0, width: '540px', height: '960px', zIndex: -9999, opacity: 0, pointerEvents: 'none' }}>
                    <ShareableWorkoutCard
                        key={`hidden-card-${generationKey}`} // Force remount on generation
                        ref={cardRef}
                        workout={workout}
                        athleteName={athleteName}
                        athleteHandle={athleteHandle}
                        athleteAvatar={athleteAvatar}
                        location={location}
                        polyline={polyline}
                    />
                </div>,
                document.body
            )}
        </Dialog>
    );
}
