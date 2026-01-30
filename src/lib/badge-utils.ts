/**
 * Badge utility functions
 */

/**
 * Check if a badges array contains the founder badge
 */
export function hasFounderBadge(badges?: Array<{ badge_type: string }> | null): boolean {
    return badges?.some(b => b.badge_type === 'founder') ?? false;
}
