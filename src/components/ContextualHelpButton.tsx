import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { HELP_CONTENT, type ScreenKey } from '@/lib/help-content';

interface ContextualHelpButtonProps {
    screen: ScreenKey;
    className?: string;
}

/**
 * Small "?" button that opens contextual help dialog for the current screen
 */
export function ContextualHelpButton({ screen, className }: ContextualHelpButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const content = HELP_CONTENT[screen];

    if (!content) return null;

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className={cn('h-8 w-8 rounded-full', className)}
                aria-label="Help"
            >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{content.title}</DialogTitle>
                        <DialogDescription>{content.description}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <h4 className="text-sm font-medium mb-2">What to do first</h4>
                            <p className="text-sm text-muted-foreground">{content.whatToDo}</p>
                        </div>
                        {content.commonMistakes && (
                            <div>
                                <h4 className="text-sm font-medium mb-2">Common mistakes</h4>
                                <p className="text-sm text-muted-foreground">{content.commonMistakes}</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
