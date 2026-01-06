/**
 * Story Arcs System for Simulation
 * 
 * Each athlete follows a narrative arc that creates compelling,
 * Instagram-worthy content over time.
 */

export type StoryPhase =
    | 'training_block'    // Day-to-day grind
    | 'race_prep'         // Building to competition
    | 'race_day'          // Competition day
    | 'post_race'         // Victory lap / recovery
    | 'setback'           // Minor injury / rest
    | 'comeback';         // Return stronger

export interface StoryArc {
    id: string;
    name: string;
    phases: StoryPhaseConfig[];
    totalDays: number;
}

export interface StoryPhaseConfig {
    phase: StoryPhase;
    durationDays: number;
    postTemplates: string[];
    tradeMultiplier: number; // 1.0 = normal, 2.0 = double trades
    emotionalTone: 'grind' | 'excited' | 'triumphant' | 'vulnerable' | 'motivated';
}

// Narrative templates that reference the journey
export const STORY_POST_TEMPLATES: Record<StoryPhase, string[]> = {
    training_block: [
        "Week {weekNum} of training in the books 📚 {duration}min {type} done. Consistency > intensity.",
        "Day {dayNum}. Just showing up. {type} session complete ✅",
        "4am alarm. No excuses. {duration}min {type} before the world wakes up 🌅",
        "Building block by block 🧱 Another {type} session logged. Trust the process.",
        "The grind doesn't care about your feelings. {duration}min {type} ✅",
        "Nobody sees these sessions. But they're the ones that matter most. {type} done 💪",
        "Stacking days. {type} session #{sessionNum} this week.",
        "Felt like skipping today. Didn't. {duration}min {type} complete.",
        "Small improvements compound. {type} felt 1% better today 📈",
        "Training partner cancelled. Trained anyway. {duration}min solo {type} 🏃",
    ],

    race_prep: [
        "Race week approaching! Sharpening up with some {type} intervals 🔪",
        "T-minus {daysToRace} days. Taper mode activated. Easy {type} today.",
        "Race kit laid out. Visualization complete. {duration}min shakeout {type} ✅",
        "Nerves are good. Means you care. Light {type} to stay loose 🧘",
        "Final hard session before race day. {duration}min {type} - left it all out there 🔥",
        "Carb loading begins 🍝 Easy {type} and trust the training.",
        "Race briefing done. Course looks spicy 🌶️ Quick {type} to shake out the legs.",
        "Sleep. Hydrate. Visualize. Easy {type}. Repeat. Race is coming! 🎯",
        "Everything I've done has led to this. {daysToRace} days out. Ready.",
        "Gear check ✅ Nutrition plan ✅ {type} shakeout ✅ Let's do this! 🏆",
    ],

    race_day: [
        "🏁 RACE DAY! All the training comes down to this. LFG 🔥",
        "Start line vibes. Heart pounding. Let's see what we're made of 💪",
        "Halfway through! Digging deep. Every rep was for this moment 🔥",
        "FINISHED! Left everything on the course. Legs are destroyed but the heart is full 🏆",
        "PODIUM FINISH! 🥇 All those 4am sessions PAID OFF!! Thank you everyone who believed 🙏",
        "New PB! Couldn't have done it without this community backing me 📈🔥",
        "Crossed the line. Emotions hitting different right now. We did it! 🎉",
        "Race complete ✅ Not the result I wanted but learned so much. Next one! 💪",
        "Top 10! For a first timer, I'll take that all day! 🎯 Hungry for more.",
        "The crowd energy was INSANE. Thank you to everyone who came out! 🙌",
    ],

    post_race: [
        "Recovery day 1. Ice bath, mobility, and gratitude 🧊🙏",
        "48 hours post-race. Body feeling the aftermath 😅 Easy walk and stretch only.",
        "Race photos dropped! Looking strong out there 📸 Still processing the experience.",
        "Back to easy {type} today. Legs remembered they exist lol",
        "Reflecting on race day. So many lessons learned. Journal filled with notes 📝",
        "First real session since race. {duration}min easy {type}. Felt good to move again!",
        "Medal arrived in the mail! 🏅 Already eyeing the next challenge...",
        "Celebrating with the crew this weekend 🎉 Then back to work Monday.",
        "Recovery week complete. Grateful for the rest. Ready to build again 🧱",
        "Looking at the next goal on the calendar... 👀 Stay tuned.",
    ],

    setback: [
        "Taking a few days off. Body is asking for rest. Listening 🙏",
        "Minor niggle in the {bodyPart}. Playing it smart with some recovery work.",
        "Not every day is a training day. Rest is part of the process 💤",
        "Frustrating to miss a session but long-term thinking wins. Ice and elevation today.",
        "PT session done. Working on some imbalances. Grateful for the body check 🔧",
        "Easy mobility work only today. {bodyPart} needs some TLC.",
        "Setback is a setup for a comeback. Light movement, heavy patience.",
        "Week of rest prescribed. Using the time for mental training and visualization 🧠",
        "Sometimes the bravest thing is knowing when NOT to train 💪",
        "Cross-training only this week. Swimming and mobility. Keeping the engine ticking.",
    ],

    comeback: [
        "BACK! 🔥 First proper session in {daysOff} days. Felt amazing to move again!",
        "Rust is coming off. {duration}min {type} done. Body remembers 💪",
        "Comeback loading... 📈 Each session building confidence.",
        "Missed this feeling! {type} session complete. Grateful for movement.",
        "The hunger is REAL. {duration}min {type} - couldn't stop smiling 😊",
        "Stronger than before. The rest was the secret sauce all along! 🔑",
        "First full week back complete! Body and mind are aligned again 🧘",
        "That setback taught me so much. Coming back with new perspective and fire 🔥",
        "Time off made me fall in love with this again. Let's GO! 🚀",
        "Back in the arena. {type} session crushed. Watch this space 👀",
    ],
};

// Pre-defined story arcs that athletes can follow
export const STORY_ARCS: StoryArc[] = [
    {
        id: 'hyrox_journey',
        name: 'HYROX Race Journey',
        totalDays: 28,
        phases: [
            { phase: 'training_block', durationDays: 10, postTemplates: STORY_POST_TEMPLATES.training_block, tradeMultiplier: 1.0, emotionalTone: 'grind' },
            { phase: 'race_prep', durationDays: 5, postTemplates: STORY_POST_TEMPLATES.race_prep, tradeMultiplier: 1.5, emotionalTone: 'excited' },
            { phase: 'race_day', durationDays: 1, postTemplates: STORY_POST_TEMPLATES.race_day, tradeMultiplier: 3.0, emotionalTone: 'triumphant' },
            { phase: 'post_race', durationDays: 7, postTemplates: STORY_POST_TEMPLATES.post_race, tradeMultiplier: 2.0, emotionalTone: 'triumphant' },
            { phase: 'training_block', durationDays: 5, postTemplates: STORY_POST_TEMPLATES.training_block, tradeMultiplier: 1.0, emotionalTone: 'grind' },
        ],
    },
    {
        id: 'comeback_story',
        name: 'Setback to Comeback',
        totalDays: 21,
        phases: [
            { phase: 'training_block', durationDays: 5, postTemplates: STORY_POST_TEMPLATES.training_block, tradeMultiplier: 1.0, emotionalTone: 'grind' },
            { phase: 'setback', durationDays: 7, postTemplates: STORY_POST_TEMPLATES.setback, tradeMultiplier: 0.5, emotionalTone: 'vulnerable' },
            { phase: 'comeback', durationDays: 9, postTemplates: STORY_POST_TEMPLATES.comeback, tradeMultiplier: 2.0, emotionalTone: 'motivated' },
        ],
    },
    {
        id: 'consistent_grinder',
        name: 'The Consistent Grinder',
        totalDays: 30,
        phases: [
            { phase: 'training_block', durationDays: 30, postTemplates: STORY_POST_TEMPLATES.training_block, tradeMultiplier: 1.0, emotionalTone: 'grind' },
        ],
    },
];

// Track where each athlete is in their story
export interface AthleteStoryState {
    athleteId: string;
    arcId: string;
    currentDay: number;
    sessionCount: number;
    lastPostDate: string | null;
}

/**
 * Get the current phase for an athlete based on their story progress
 */
export function getCurrentPhase(arc: StoryArc, dayInArc: number): StoryPhaseConfig {
    let daysAccumulated = 0;

    for (const phase of arc.phases) {
        daysAccumulated += phase.durationDays;
        if (dayInArc <= daysAccumulated) {
            return phase;
        }
    }

    // Loop back to start if we exceed total days
    return arc.phases[0];
}

/**
 * Get a contextual post for the current story phase
 */
export function getStoryPost(
    phase: StoryPhaseConfig,
    context: {
        type: string;
        duration: number;
        weekNum: number;
        dayNum: number;
        sessionNum: number;
        daysToRace?: number;
        bodyPart?: string;
        daysOff?: number;
    }
): string {
    const templates = phase.postTemplates;
    let template = templates[Math.floor(Math.random() * templates.length)];

    // Replace all placeholders
    template = template
        .replace('{type}', context.type)
        .replace('{duration}', context.duration.toString())
        .replace('{weekNum}', context.weekNum.toString())
        .replace('{dayNum}', context.dayNum.toString())
        .replace('{sessionNum}', context.sessionNum.toString())
        .replace('{daysToRace}', (context.daysToRace ?? 3).toString())
        .replace('{bodyPart}', context.bodyPart ?? 'knee')
        .replace('{daysOff}', (context.daysOff ?? 7).toString());

    return template;
}

/**
 * Assign a random story arc to an athlete
 */
export function assignRandomArc(): StoryArc {
    return STORY_ARCS[Math.floor(Math.random() * STORY_ARCS.length)];
}
