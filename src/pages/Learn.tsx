import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { startTour } from '@/components/OnboardingTour';

const FAQ_ITEMS = [
    {
        id: 'proof-of-sweat',
        question: 'What is Proof of Sweat?',
        answer: 'Proof of Sweat is how athletes share their training on Athlyst. By posting workouts (automatically from Strava or manually), you prove you\'re putting in the work. This builds credibility and attracts supporters who want to invest in your journey.',
    },
    {
        id: 'buying-tokens',
        question: 'What does buying a Card mean?',
        answer: 'When you buy an athlete\'s Card, you\'re investing in their success. Card prices go up when more people buy, and down when they sell. As an athlete performs well and gains popularity, their Card value can increase. You can sell your Cards at any time.',
    },
    {
        id: 'props-notifications',
        question: 'How do Props and Notifications work?',
        answer: 'Props (❤️) are how you show appreciation for workouts. Tap the heart on any post to "prop" it. You\'ll get notifications when someone props your posts, trades your Cards, or sends you a message. Check the bell icon to see all your notifications.',
    },
    {
        id: 'safety-privacy',
        question: 'Safety & Privacy',
        answer: 'Your data is yours. We only display what you choose to share. Connected accounts (like Strava) sync automatically but you control what\'s public. Token transactions are transparent but your personal info stays private. You can disconnect integrations anytime from Settings.',
    },
    {
        id: 'getting-started',
        question: 'How do I get started as an athlete?',
        answer: '1. Complete your profile with a photo and bio. 2. Connect your Strava to auto-import workouts. 3. Post your first Proof of Sweat. 4. Share your profile to attract supporters. Your token is automatically created when you sign up!',
    },
];

export default function LearnPage() {
    const navigate = useNavigate();

    const handleStartTour = () => {
        startTour(navigate);
    };

    return (
        <div className="container mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Learn About Athlyst</h1>
                <p className="text-muted-foreground">
                    Everything you need to know to get started
                </p>
            </div>

            {/* Tour CTA */}
            <div className="mb-8 p-6 rounded-xl border bg-card/50">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Compass className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold">Interactive Tour</h3>
                        <p className="text-sm text-muted-foreground">
                            Get a quick walkthrough of the app
                        </p>
                    </div>
                    <Button onClick={handleStartTour} className="gap-2">
                        <Compass className="h-4 w-4" />
                        Start Tour
                    </Button>
                </div>
            </div>

            {/* FAQ Accordion */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full">
                    {FAQ_ITEMS.map((item) => (
                        <AccordionItem key={item.id} value={item.id}>
                            <AccordionTrigger className="text-left">
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            {/* Back link */}
            <div className="pt-4 border-t">
                <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
                    <Compass className="h-4 w-4" />
                    Go Back
                </Button>
            </div>
        </div>
    );
}
