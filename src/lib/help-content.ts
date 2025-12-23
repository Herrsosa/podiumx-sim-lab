export type ScreenKey = 'feed' | 'portfolio' | 'myAthlete' | 'marketplace' | 'notifications' | 'watchlist';

interface HelpContent {
    title: string;
    description: string;
    whatToDo: string;
    commonMistakes?: string;
}

export const HELP_CONTENT: Record<ScreenKey, HelpContent> = {
    feed: {
        title: 'Proof of Sweat Feed',
        description: 'See workouts and training updates from athletes you follow.',
        whatToDo: 'Scroll through to discover new athletes. Tap the heart to "prop" workouts you love.',
        commonMistakes: 'Forgetting to follow athletes! Follow their profiles to see more of their content.',
    },
    portfolio: {
        title: 'Your Portfolio',
        description: 'Track the tokens you own and your overall performance.',
        whatToDo: 'Review your holdings. Click an athlete to see their full profile and recent performance.',
        commonMistakes: 'Selling too quickly. Token prices can fluctuate — consider holding for athletes you believe in.',
    },
    myAthlete: {
        title: 'My Athlete Profile',
        description: 'Your public identity on Athlyst. This is what others see.',
        whatToDo: 'Complete your profile. Upload workouts to build credibility and attract supporters.',
        commonMistakes: 'Not connecting Strava! Automatic workout imports save time and look more authentic.',
    },
    marketplace: {
        title: 'Marketplace',
        description: 'Discover athletes and buy their tokens.',
        whatToDo: 'Browse athletes by sport or trending. Click "Buy" to support an athlete you believe in.',
        commonMistakes: 'Only looking at price. Also check their workout history and engagement.',
    },
    notifications: {
        title: 'Notifications',
        description: 'Stay updated on activity related to your profile.',
        whatToDo: 'Click a notification to go to the relevant page. Mark all as read to clear the badge.',
    },
    watchlist: {
        title: 'Watchlist',
        description: 'Track athletes you are interested in without buying tokens.',
        whatToDo: 'Add athletes by clicking the star icon on their profile. Click an athlete to view their page.',
        commonMistakes: 'Forgetting to check back! Keep an eye on price movements for athletes you are watching.',
    },
};
