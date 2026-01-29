-- Migration: Award Founder Badge to all early adopters
-- All users who signed up before this migration will receive the exclusive Founder badge

-- Award founder badge to all existing users who don't already have it
INSERT INTO public.user_badges (user_id, badge_type, earned_at)
SELECT 
    p.id,
    'founder',
    now()
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM user_badges ub 
    WHERE ub.user_id = p.id AND ub.badge_type = 'founder'
)
ON CONFLICT (user_id, badge_type) DO NOTHING;

-- Optional: Create a view to easily check founder status
CREATE OR REPLACE VIEW public.founder_users AS
SELECT 
    ub.user_id,
    p.username,
    p.display_name,
    ub.earned_at as founder_since
FROM user_badges ub
JOIN profiles p ON p.id = ub.user_id
WHERE ub.badge_type = 'founder';
