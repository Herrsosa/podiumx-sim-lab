import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Prompt shown to users who have not yet launched their athlete token.
 * Redirects them to the onboarding flow to create their token.
 */
export function LaunchTokenPrompt() {
    const navigate = useNavigate();

    const handleLaunchToken = () => {
        // Navigate to onboarding with a flag to go directly to token step
        navigate('/onboarding?step=token');
    };

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Rocket className="h-5 w-5 text-primary" />
                    Launch Your Athlete Token
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    You haven't launched your athlete token yet. Create your token to appear
                    in the marketplace and let fans invest in your journey!
                </p>
                <div className="flex flex-col gap-2">
                    <Button onClick={handleLaunchToken} className="w-full">
                        <Rocket className="h-4 w-4 mr-2" />
                        Launch Token
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
