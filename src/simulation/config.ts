import { Sport } from '@/types';
import { athleteAvatarAssets } from '@/utils/athleteAvatars';
import type { StoryArc } from './storyArcs';

export interface SimulationProfile {
    id: string;
    name: string;
    sport: Sport;
    storyArcId: string; // Which narrative arc this athlete follows
    behavior: {
        tradeFrequency: 'high' | 'medium' | 'low'; // Trades per day: high=5-10, medium=2-5, low=0-2
        posFrequency: 'daily' | 'often' | 'rare'; // Posts per week: daily=7, often=3-4, rare=1
        messageFrequency: 'chatty' | 'normal' | 'quiet'; // DMs per day
        activeHours: { start: number; end: number }; // Hour of day (0-23)
    };
    preferredTokens?: string[]; // IDs of athletes they like to trade
    avatar?: string;
}

// Based on the seed data in src/utils/seedData.ts
// We use the same IDs to ensure we're acting as the existing test users
export const SIMULATION_PROFILES: SimulationProfile[] = [
    {
        id: '1', // Nils
        name: 'Nils Bergström',
        sport: 'Running',
        storyArcId: 'hyrox_journey',
        avatar: athleteAvatarAssets.nils.src,
        behavior: {
            tradeFrequency: 'medium',
            posFrequency: 'daily',
            messageFrequency: 'normal',
            activeHours: { start: 6, end: 22 },
        },
    },
    {
        id: '2', // Mara
        name: 'Mara Chen',
        sport: 'HYROX',
        storyArcId: 'hyrox_journey',
        avatar: athleteAvatarAssets.mara.src,
        behavior: {
            tradeFrequency: 'high',
            posFrequency: 'often',
            messageFrequency: 'chatty',
            activeHours: { start: 5, end: 23 },
        },
    },
    {
        id: '3', // Leo
        name: 'Leo Martinez',
        sport: 'Cycling',
        storyArcId: 'consistent_grinder',
        avatar: athleteAvatarAssets.leo.src,
        behavior: {
            tradeFrequency: 'low',
            posFrequency: 'often',
            messageFrequency: 'quiet',
            activeHours: { start: 7, end: 21 },
        },
    },
    {
        id: '4', // Ava
        name: 'Ava Thompson',
        sport: 'Triathlon',
        storyArcId: 'hyrox_journey',
        avatar: athleteAvatarAssets.ava.src,
        behavior: {
            tradeFrequency: 'medium',
            posFrequency: 'daily',
            messageFrequency: 'normal',
            activeHours: { start: 5, end: 21 },
        },
    },
    {
        id: '5', // Kai
        name: 'Kai Anderson',
        sport: 'CrossFit',
        storyArcId: 'comeback_story',
        avatar: athleteAvatarAssets.kai.src,
        behavior: {
            tradeFrequency: 'high',
            posFrequency: 'often',
            messageFrequency: 'chatty',
            activeHours: { start: 6, end: 22 },
        },
    },
    {
        id: '6', // Rio
        name: 'Rio Silva',
        sport: 'Swimming',
        storyArcId: 'consistent_grinder',
        avatar: athleteAvatarAssets.rio.src,
        behavior: {
            tradeFrequency: 'low',
            posFrequency: 'often',
            messageFrequency: 'quiet',
            activeHours: { start: 5, end: 20 },
        },
    },
    {
        id: '7', // Zara
        name: 'Zara Williams',
        sport: 'Trail Run',
        storyArcId: 'comeback_story',
        avatar: athleteAvatarAssets.zara.src,
        behavior: {
            tradeFrequency: 'medium',
            posFrequency: 'often',
            messageFrequency: 'normal',
            activeHours: { start: 6, end: 22 },
        },
    },
    {
        id: '8', // Max
        name: 'Max Jensen',
        sport: 'Rowing',
        storyArcId: 'consistent_grinder',
        avatar: athleteAvatarAssets.max.src,
        behavior: {
            tradeFrequency: 'low',
            posFrequency: 'rare',
            messageFrequency: 'quiet',
            activeHours: { start: 7, end: 21 },
        },
    },
];

export const SIMULATION_CONSTANTS = {
    TRADE_COUNTS: {
        high: { min: 3, max: 8 },
        medium: { min: 1, max: 4 },
        low: { min: 0, max: 2 },
    },
    POS_PROBABILITY: {
        daily: 0.9,
        often: 0.5,
        rare: 0.2,
    },
    MESSAGE_COUNTS: {
        chatty: { min: 3, max: 8 },
        normal: { min: 1, max: 4 },
        quiet: { min: 0, max: 1 },
    },
};
