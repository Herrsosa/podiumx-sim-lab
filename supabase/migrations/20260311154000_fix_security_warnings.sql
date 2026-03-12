-- Fix Security Definer View warnings by setting security_invoker = true
-- This ensures the view executes with the privileges of the calling user
ALTER VIEW public.athlete_metrics_24h SET (security_invoker = true);
ALTER VIEW public.user_token_holdings SET (security_invoker = true);
ALTER VIEW public.founder_users SET (security_invoker = true);
ALTER VIEW public.trades_norm SET (security_invoker = true);
ALTER VIEW public.prediction_leaderboard SET (security_invoker = true);

-- Fix RLS Disabled in Public warnings by enabling RLS
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards_claimed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_config ENABLE ROW LEVEL SECURITY;
