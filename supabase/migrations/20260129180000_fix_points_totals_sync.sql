-- Fix: Sync points_totals with actual points_ledger data
-- This recalculates total_points and weekly_points from the ledger for accuracy

-- Recalculate total_points from ledger for all users
UPDATE public.points_totals pt
SET 
    total_points = COALESCE((
        SELECT SUM(points) 
        FROM public.points_ledger pl 
        WHERE pl.user_id = pt.user_id
    ), 0),
    weekly_points = COALESCE((
        SELECT SUM(points) 
        FROM public.points_ledger pl 
        WHERE pl.user_id = pt.user_id 
        AND pl.created_at >= date_trunc('week', CURRENT_DATE)
    ), 0),
    updated_at = now();

-- Insert points_totals for users who have ledger entries but no totals row
INSERT INTO public.points_totals (user_id, total_points, weekly_points, current_streak, longest_streak)
SELECT 
    pl.user_id,
    SUM(pl.points) as total_points,
    SUM(CASE WHEN pl.created_at >= date_trunc('week', CURRENT_DATE) THEN pl.points ELSE 0 END) as weekly_points,
    0,
    0
FROM public.points_ledger pl
WHERE pl.user_id NOT IN (SELECT user_id FROM public.points_totals)
GROUP BY pl.user_id
ON CONFLICT (user_id) DO NOTHING;
