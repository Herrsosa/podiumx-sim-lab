import { useState, useRef, useCallback, useEffect } from 'react';
import { Share2, Download, Link, Instagram, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShareableWorkoutCard, type ShareableWorkoutCardRef } from './ShareableWorkoutCard';
import {
    type ShareTheme,
    SHARE_THEMES,
    getDefaultThemeForWorkout,
} from './shareThemes';
import {
    generateShareImage,
    downloadBlob,
    shareImage,
    copyToClipboard,
    canShareFiles,
} from '@/utils/shareUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
}

export function ShareModal({
    open,
    onOpenChange,
    workout,
    athleteName,
    athleteHandle,
    athleteAvatar,
    imageUrl,
    athleteProfileUrl,
    location,
}: ShareModalProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
    const [selectedTheme, setSelectedTheme] = useState<ShareTheme>(() =>
        getDefaultThemeForWorkout(workout.type)
    );
    const cardRef = useRef<ShareableWorkoutCardRef>(null);

    // DEBUG: Log location data
    console.log('[ShareModal] Location received:', location);

    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const supportsShare = canShareFiles();

    // Reset theme and blob when modal opens/closes or workout changes
    useEffect(() => {
        if (open) {
            setSelectedTheme(getDefaultThemeForWorkout(workout.type));
            setGeneratedBlob(null);
        }
    }, [open, workout.type]);

    // Clear generated blob when theme changes
    const handleThemeChange = (theme: ShareTheme) => {
        setSelectedTheme(theme);
        setGeneratedBlob(null); // Force regeneration with new theme
    };

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
                `${athleteName}'s Workout`,
                `Check out this workout on Athlyst! ${athleteProfileUrl || ''}`
            );
            if (success) {
                toast.success('Opening share sheet...');
                onOpenChange(false);
            } else {
                // Fallback to download
                toast.info('Open Instagram and share the downloaded image');
                downloadBlob(blob, `${athleteHandle}-workout.png`);
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
                className="max-w-sm"
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

                {/* Theme Picker */}
                <div className="pb-2">
                    <p className="text-sm text-muted-foreground mb-3">Choose theme:</p>
                    <div className="flex items-center gap-2">
                        {SHARE_THEMES.map((theme) => (
                            <button
                                key={theme.id}
                                type="button"
                                onClick={() => handleThemeChange(theme)}
                                className={cn(
                                    'w-8 h-8 rounded-full transition-all duration-200',
                                    'ring-offset-2 ring-offset-background',
                                    selectedTheme.id === theme.id
                                        ? 'ring-2 ring-primary scale-110'
                                        : 'hover:scale-105 opacity-70 hover:opacity-100'
                                )}
                                style={{
                                    background: `linear-gradient(135deg, ${theme.previewColor}, ${theme.previewColor}88)`,
                                    boxShadow: selectedTheme.id === theme.id
                                        ? `0 0 12px ${theme.previewColor}66`
                                        : undefined
                                }}
                                title={theme.name}
                                aria-label={`${theme.name} theme`}
                            />
                        ))}
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

                {/* Hidden shareable card for image generation */}
                <div className="fixed -left-[9999px] -top-[9999px]">
                    <ShareableWorkoutCard
                        ref={cardRef}
                        workout={workout}
                        athleteName={athleteName}
                        athleteHandle={athleteHandle}
                        athleteAvatar={athleteAvatar}
                        imageUrl={imageUrl}
                        theme={selectedTheme}
                        location={location}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
