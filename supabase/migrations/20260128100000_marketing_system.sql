-- Marketing System: Referrals, Points, and Email Automation
-- This migration creates the complete infrastructure for automated marketing

-- ============================================================================
-- REFERRAL SYSTEM
-- ============================================================================

-- Referral codes table - each user gets a unique referral code
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Referrals table - tracks who referred whom
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    converted_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(referred_id) -- Each user can only be referred once
);

-- Referral rewards configuration
CREATE TABLE IF NOT EXISTS public.referral_reward_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_count INTEGER NOT NULL UNIQUE,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('early_access', 'points', 'badge', 'usdc')),
    reward_value TEXT NOT NULL, -- e.g., "500" for points, "founding" for badge
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default reward tiers
INSERT INTO public.referral_reward_tiers (referral_count, reward_type, reward_value, description) VALUES
    (1, 'early_access', 'skip_waitlist', 'Skip the waitlist and get early access'),
    (3, 'points', '500', '500 bonus Sweat Points'),
    (5, 'badge', 'founding', 'Founding Athlyst badge on your profile'),
    (10, 'usdc', '5', '$5 USDC airdrop')
ON CONFLICT (referral_count) DO NOTHING;

-- Claimed rewards tracking
CREATE TABLE IF NOT EXISTS public.referral_rewards_claimed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES public.referral_reward_tiers(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, tier_id)
);

-- ============================================================================
-- POINTS SYSTEM (Sweat Score)
-- ============================================================================

-- Points actions enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_action') THEN
        CREATE TYPE point_action AS ENUM (
            'profile_complete',
            'strava_connect',
            'first_workout',
            'daily_workout',
            'social_share',
            'referral_signup',
            'referral_workout',
            'token_purchase',
            'weekly_streak',
            'badge_earned',
            'manual_adjustment'
        );
    END IF;
END $$;

-- Points configuration
CREATE TABLE IF NOT EXISTS public.points_config (
    action point_action PRIMARY KEY,
    points INTEGER NOT NULL,
    daily_cap INTEGER, -- NULL means no cap
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default points configuration
INSERT INTO public.points_config (action, points, daily_cap, description) VALUES
    ('profile_complete', 100, NULL, 'Complete your profile'),
    ('strava_connect', 200, NULL, 'Connect your Strava account'),
    ('first_workout', 150, NULL, 'Post your first workout'),
    ('daily_workout', 50, 1, 'Post a workout (once per day)'),
    ('social_share', 25, 3, 'Share to social media'),
    ('referral_signup', 500, NULL, 'Referred friend signs up'),
    ('referral_workout', 250, NULL, 'Referred friend posts first workout'),
    ('token_purchase', 100, 5, 'Purchase an athlete token'),
    ('weekly_streak', 200, 1, '7-day workout streak'),
    ('badge_earned', 50, NULL, 'Earn a badge'),
    ('manual_adjustment', 0, NULL, 'Manual admin adjustment')
ON CONFLICT (action) DO NOTHING;

-- Points ledger - every point transaction
CREATE TABLE IF NOT EXISTS public.points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action point_action NOT NULL,
    points INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Points totals - cached for performance
CREATE TABLE IF NOT EXISTS public.points_totals (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_workout_date DATE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User badges
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_type)
);

-- ============================================================================
-- EMAIL AUTOMATION
-- ============================================================================

-- Email sequence definitions
CREATE TABLE IF NOT EXISTS public.email_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL, -- 'waitlist_signup', 'user_signup', 'strava_connect', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Email templates within sequences
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    delay_hours INTEGER DEFAULT 0, -- Hours after trigger/previous email
    subject TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sequence_id, step_number)
);

-- User email status - tracks where users are in sequences
CREATE TABLE IF NOT EXISTS public.user_email_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL, -- For waitlist users who don't have profiles yet
    sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMPTZ,
    next_email_at TIMESTAMPTZ,
    completed BOOLEAN DEFAULT false,
    unsubscribed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(email, sequence_id)
);

-- Email send log
CREATE TABLE IF NOT EXISTS public.email_send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email_status_id UUID REFERENCES public.user_email_status(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    resend_id TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default email sequences
INSERT INTO public.email_sequences (name, description, trigger_event) VALUES
    ('waitlist_welcome', 'Welcome sequence for waitlist signups', 'waitlist_signup'),
    ('user_onboarding', 'Onboarding sequence for new users', 'user_signup'),
    ('strava_reminder', 'Reminder to connect Strava', 'user_signup_no_strava'),
    ('weekly_recap', 'Weekly stats and engagement', 'weekly_cron')
ON CONFLICT (name) DO NOTHING;

-- Insert default email templates for waitlist sequence
INSERT INTO public.email_templates (sequence_id, step_number, delay_hours, subject, html_template, text_template)
SELECT
    es.id,
    t.step_number,
    t.delay_hours,
    t.subject,
    t.html_template,
    t.text_template
FROM public.email_sequences es
CROSS JOIN (VALUES
    (1, 0, 'Welcome to the Athlyst Waitlist!',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">You''re on the list!</h1>
        <p>Thanks for joining the Athlyst waitlist. You''re now in line to be one of the first athletes to build your market cap.</p>
        <p>In the meantime, follow us on Instagram: <a href="https://instagram.com/athlyst.fun">@athlyst.fun</a></p>
        <p style="color: #666; font-size: 14px;">The Athlyst Team</p>
      </div>',
     'You''re on the list! Thanks for joining the Athlyst waitlist.'),
    (2, 72, 'What is Proof of Sweat?',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Proof of Sweat: Your Training, Your Asset</h1>
        <p>On Athlyst, every workout you log becomes "Proof of Sweat" - visible evidence of your athletic journey.</p>
        <p>This is what drives your market cap. Real training. Real progress. Real community.</p>
        <p>Stay tuned for your invite!</p>
        <p style="color: #666; font-size: 14px;">The Athlyst Team</p>
      </div>',
     'Proof of Sweat: Your Training, Your Asset. On Athlyst, every workout becomes visible evidence of your athletic journey.'),
    (3, 168, 'Athletes are building their market caps...',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">The community is growing</h1>
        <p>Athletes are already building their market caps on Athlyst. Here''s what''s happening:</p>
        <ul>
          <li>Athletes posting daily Proof of Sweat</li>
          <li>Supporters joining Inner Circles</li>
          <li>Market caps rising with every workout</li>
        </ul>
        <p>Your spot is reserved. We''ll send your invite link soon.</p>
        <p style="color: #666; font-size: 14px;">The Athlyst Team</p>
      </div>',
     'Athletes are building their market caps on Athlyst. Your spot is reserved.')
) AS t(step_number, delay_hours, subject, html_template, text_template)
WHERE es.name = 'waitlist_welcome'
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- ============================================================================
-- ANALYTICS EVENTS
-- ============================================================================

-- Analytics events table for tracking user actions
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    anonymous_id TEXT, -- For pre-signup tracking
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON public.points_ledger(user_id, created_at DESC);
-- Index for action date lookups removed (created_at::date cast is not immutable)
CREATE INDEX IF NOT EXISTS idx_user_email_status_next ON public.user_email_status(next_email_at) WHERE NOT completed AND NOT unsubscribed;
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name, created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create referral code for new user
CREATE OR REPLACE FUNCTION create_user_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (NEW.id, generate_referral_code())
    ON CONFLICT (user_id) DO NOTHING;

    -- Also initialize points totals
    INSERT INTO public.points_totals (user_id, total_points)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create referral code when profile is created
DROP TRIGGER IF EXISTS create_referral_code_on_profile ON public.profiles;
CREATE TRIGGER create_referral_code_on_profile
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_user_referral_code();

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(
    p_user_id UUID,
    p_action point_action,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    v_points INTEGER;
    v_daily_cap INTEGER;
    v_today_count INTEGER;
BEGIN
    -- Get points config
    SELECT points, daily_cap INTO v_points, v_daily_cap
    FROM public.points_config
    WHERE action = p_action;

    IF v_points IS NULL THEN
        RETURN 0;
    END IF;

    -- Check daily cap if applicable
    IF v_daily_cap IS NOT NULL THEN
        SELECT COUNT(*) INTO v_today_count
        FROM public.points_ledger
        WHERE user_id = p_user_id
          AND action = p_action
          AND created_at::date = CURRENT_DATE;

        IF v_today_count >= v_daily_cap THEN
            RETURN 0; -- Cap reached
        END IF;
    END IF;

    -- Insert into ledger
    INSERT INTO public.points_ledger (user_id, action, points, metadata)
    VALUES (p_user_id, p_action, v_points, p_metadata);

    -- Update totals
    INSERT INTO public.points_totals (user_id, total_points, weekly_points, updated_at)
    VALUES (p_user_id, v_points, v_points, now())
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = points_totals.total_points + v_points,
        weekly_points = points_totals.weekly_points + v_points,
        updated_at = now();

    RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's referral stats
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE (
    referral_code TEXT,
    total_referrals BIGINT,
    completed_referrals BIGINT,
    next_reward_at INTEGER,
    next_reward_type TEXT,
    next_reward_value TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_refs AS (
        SELECT COUNT(*) as total,
               COUNT(*) FILTER (WHERE status = 'completed' OR status = 'rewarded') as completed
        FROM public.referrals
        WHERE referrer_id = p_user_id
    ),
    next_tier AS (
        SELECT rt.referral_count, rt.reward_type, rt.reward_value
        FROM public.referral_reward_tiers rt
        LEFT JOIN public.referral_rewards_claimed rc
            ON rc.tier_id = rt.id AND rc.user_id = p_user_id
        WHERE rc.id IS NULL
        ORDER BY rt.referral_count
        LIMIT 1
    )
    SELECT
        rc.code,
        ur.total,
        ur.completed,
        nt.referral_count,
        nt.reward_type,
        nt.reward_value
    FROM public.referral_codes rc
    CROSS JOIN user_refs ur
    LEFT JOIN next_tier nt ON true
    WHERE rc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_points_leaderboard(
    p_timeframe TEXT DEFAULT 'all', -- 'all', 'weekly', 'monthly'
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
            p.id as user_id,
            p.username,
            p.display_name,
            p.avatar_url,
            pt.weekly_points::BIGINT as points,
            (SELECT ub.badge_type FROM public.user_badges ub WHERE ub.user_id = p.id ORDER BY earned_at DESC LIMIT 1)
        FROM public.profiles p
        JOIN public.points_totals pt ON pt.user_id = p.id
        WHERE pt.weekly_points > 0
        ORDER BY pt.weekly_points DESC
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY pt.total_points DESC) as rank,
            p.id as user_id,
            p.username,
            p.display_name,
            p.avatar_url,
            pt.total_points::BIGINT as points,
            (SELECT ub.badge_type FROM public.user_badges ub WHERE ub.user_id = p.id ORDER BY earned_at DESC LIMIT 1)
        FROM public.profiles p
        JOIN public.points_totals pt ON pt.user_id = p.id
        WHERE pt.total_points > 0
        ORDER BY pt.total_points DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_status ENABLE ROW LEVEL SECURITY;

-- Referral codes: users can read their own
CREATE POLICY "Users can view own referral code" ON public.referral_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Referrals: users can view referrals they made
CREATE POLICY "Users can view own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id);

-- Points ledger: users can view their own
CREATE POLICY "Users can view own points" ON public.points_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Points totals: anyone can view (for leaderboard)
CREATE POLICY "Anyone can view points totals" ON public.points_totals
    FOR SELECT USING (true);

-- User badges: anyone can view
CREATE POLICY "Anyone can view badges" ON public.user_badges
    FOR SELECT USING (true);

-- Analytics: users can insert their own events
CREATE POLICY "Users can insert own events" ON public.analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Email status: users can view their own
CREATE POLICY "Users can view own email status" ON public.user_email_status
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- CRON JOBS (pg_cron) - Requires Supabase Pro
-- ============================================================================

-- Reset weekly points every Monday at midnight UTC
-- SELECT cron.schedule('reset-weekly-points', '0 0 * * 1', $$
--     UPDATE public.points_totals SET weekly_points = 0, updated_at = now();
-- $$);

-- Process email queue every 15 minutes
-- SELECT cron.schedule('process-email-queue', '*/15 * * * *', $$
--     SELECT net.http_post(
--         url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-queue',
--         headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
--     );
-- $$);
