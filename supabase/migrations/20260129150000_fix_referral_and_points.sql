-- Fix: Create referral codes and points_totals for all existing users
-- Run this to fix users created before the marketing migration

-- Create referral codes for all existing users who don't have one
INSERT INTO referral_codes (user_id, code)
SELECT p.id, upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
FROM profiles p
WHERE p.id NOT IN (SELECT user_id FROM referral_codes)
ON CONFLICT (user_id) DO NOTHING;

-- Initialize points_totals for all existing users who don't have one
INSERT INTO points_totals (user_id, total_points, weekly_points, current_streak, longest_streak)
SELECT id, 0, 0, 0, 0 FROM profiles
WHERE id NOT IN (SELECT user_id FROM points_totals)
ON CONFLICT (user_id) DO NOTHING;
