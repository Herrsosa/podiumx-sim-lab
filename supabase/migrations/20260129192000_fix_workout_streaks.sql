-- Migration: Calculate and fix workout streaks from actual posts data
-- This recalculates the streak for all users based on their actual workout posts
-- Note: posts table uses author_id, not user_id

-- Create a function to calculate streak from posts
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER, last_workout_date DATE) AS $$
DECLARE
    v_date DATE;
    v_prev_date DATE := NULL;
    v_current_streak INTEGER := 0;
    v_longest_streak INTEGER := 0;
    v_last_workout DATE := NULL;
    v_streak_count INTEGER := 0;
BEGIN
    -- Loop through all workout dates for the user (distinct dates, ordered descending)
    FOR v_date IN 
        SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') as workout_date
        FROM posts 
        WHERE author_id = p_user_id
        ORDER BY workout_date DESC
    LOOP
        v_last_workout := COALESCE(v_last_workout, v_date); -- Set first (most recent) date
        
        IF v_prev_date IS NULL THEN
            -- First iteration
            v_streak_count := 1;
        ELSIF v_prev_date - v_date = 1 THEN
            -- Consecutive day
            v_streak_count := v_streak_count + 1;
        ELSE
            -- Streak broken, record if longest
            IF v_streak_count > v_longest_streak THEN
                v_longest_streak := v_streak_count;
            END IF;
            v_streak_count := 1;
        END IF;
        
        v_prev_date := v_date;
    END LOOP;
    
    -- Final check for longest streak
    IF v_streak_count > v_longest_streak THEN
        v_longest_streak := v_streak_count;
    END IF;
    
    -- Recalculate current streak from most recent date
    v_streak_count := 0;
    v_prev_date := NULL;
    
    FOR v_date IN 
        SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') as workout_date
        FROM posts 
        WHERE author_id = p_user_id
        ORDER BY workout_date DESC
    LOOP
        IF v_prev_date IS NULL THEN
            -- Check if streak is still active
            IF v_date = CURRENT_DATE OR v_date = CURRENT_DATE - 1 THEN
                v_streak_count := 1;
            ELSE
                EXIT; -- No active streak
            END IF;
        ELSIF v_prev_date - v_date = 1 THEN
            v_streak_count := v_streak_count + 1;
        ELSE
            EXIT; -- Streak ended
        END IF;
        v_prev_date := v_date;
    END LOOP;
    
    v_current_streak := v_streak_count;
    
    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_last_workout;
END;
$$ LANGUAGE plpgsql;

-- Update streaks for all users with posts
UPDATE points_totals pt
SET 
    current_streak = streak_calc.current_streak,
    longest_streak = GREATEST(pt.longest_streak, streak_calc.longest_streak),
    last_workout_date = streak_calc.last_workout_date
FROM (
    SELECT 
        p.id as user_id,
        (calculate_user_streak(p.id)).*
    FROM profiles p
    WHERE EXISTS (SELECT 1 FROM posts WHERE author_id = p.id)
) AS streak_calc
WHERE pt.user_id = streak_calc.user_id;

-- Also ensure users without points_totals but with posts get their streaks
INSERT INTO points_totals (user_id, total_points, weekly_points, current_streak, longest_streak, last_workout_date)
SELECT 
    p.id,
    0,
    0,
    (calculate_user_streak(p.id)).current_streak,
    (calculate_user_streak(p.id)).longest_streak,
    (calculate_user_streak(p.id)).last_workout_date
FROM profiles p
WHERE EXISTS (SELECT 1 FROM posts WHERE author_id = p.id)
  AND p.id NOT IN (SELECT user_id FROM points_totals)
ON CONFLICT (user_id) DO NOTHING;
