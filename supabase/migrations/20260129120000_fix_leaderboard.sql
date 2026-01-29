-- Fix: Add get_points_leaderboard function for Rewards page
-- Also initializes points_totals for existing users

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_points_leaderboard(
    p_timeframe TEXT DEFAULT 'all',
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    points BIGINT,
    badge_type TEXT
) AS $$
BEGIN
    IF p_timeframe = 'weekly' THEN
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY pt.weekly_points DESC) as rank,
            pt.user_id,
            p.username,
            p.display_name,
            p.avatar_url,
            pt.weekly_points::BIGINT as points,
            (SELECT ub.badge_type FROM user_badges ub WHERE ub.user_id = pt.user_id ORDER BY ub.earned_at DESC LIMIT 1)
        FROM points_totals pt
        JOIN profiles p ON p.id = pt.user_id
        WHERE pt.weekly_points > 0
        ORDER BY pt.weekly_points DESC
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY pt.total_points DESC) as rank,
            pt.user_id,
            p.username,
            p.display_name,
            p.avatar_url,
            pt.total_points::BIGINT as points,
            (SELECT ub.badge_type FROM user_badges ub WHERE ub.user_id = pt.user_id ORDER BY ub.earned_at DESC LIMIT 1)
        FROM points_totals pt
        JOIN profiles p ON p.id = pt.user_id
        WHERE pt.total_points > 0
        ORDER BY pt.total_points DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Initialize points_totals for all existing users who don't have one
-- This ensures the Rewards page shows 0 instead of errors for existing users
INSERT INTO points_totals (user_id, total_points, weekly_points, current_streak, longest_streak)
SELECT id, 0, 0, 0, 0 FROM profiles
WHERE id NOT IN (SELECT user_id FROM points_totals)
ON CONFLICT (user_id) DO NOTHING;
