-- Complete Email Sequences Migration
-- Adds user onboarding, Strava reminder, and weekly recap email templates
-- Also adds trigger for automatic enrollment on user signup

-- ============================================================================
-- USER ONBOARDING SEQUENCE (5 emails over 14 days)
-- ============================================================================

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
    -- Email 1: Welcome (Immediate)
    (1, 0, 'Welcome to Athlyst - Let''s build your athlete brand',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
            </div>
        </div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">Welcome to Athlyst!</h1>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 16px; font-size: 16px;">You''re now part of a community where athletes turn their training into a social asset.</p>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">Here''s how it works:</p>
        <ul style="color: #d4d4d4; line-height: 2; margin-bottom: 24px; font-size: 16px; padding-left: 20px;">
            <li><strong style="color: #22c55e;">Post Proof of Sweat</strong> - Share your workouts</li>
            <li><strong style="color: #22c55e;">Build your Market Cap</strong> - Grow your following</li>
            <li><strong style="color: #22c55e;">Unlock your Inner Circle</strong> - Token-gated access for supporters</li>
        </ul>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://athlyst.fun/my-athlete/overview" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Complete Your Profile</a>
        </div>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
            <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">Cheers,<br><strong style="color: #f5f5f5;">Nils</strong><br><span style="color: #737373; font-size: 13px;">Founder, Athlyst</span></p>
        </div>
        <div style="margin-top: 32px; text-align: center;">
            <p style="color: #525252; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>',
     'Welcome to Athlyst!

You''re now part of a community where athletes turn their training into a social asset.

Here''s how it works:
- Post Proof of Sweat - Share your workouts
- Build your Market Cap - Grow your following
- Unlock your Inner Circle - Token-gated access for supporters

Complete your profile: https://athlyst.fun/my-athlete/overview

Cheers,
Nils
Founder, Athlyst

---
Unsubscribe: {{unsubscribe_url}}'),

    -- Email 2: Connect Strava (24 hours)
    (2, 24, 'Unlock automatic Proof of Sweat',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
            </div>
        </div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">Connect Strava for Auto-Import</h1>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 16px; font-size: 16px;">The easiest way to post Proof of Sweat? Let Strava do the heavy lifting.</p>
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #22c55e; font-weight: 600; margin: 0 0 12px; font-size: 16px;">Why connect Strava?</p>
            <ul style="color: #d4d4d4; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 14px;">
                <li>Workouts auto-import as Proof of Sweat</li>
                <li>No manual posting required</li>
                <li>Earn +200 Sweat Points instantly</li>
                <li>Build your streak automatically</li>
            </ul>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://athlyst.fun/my-athlete/overview" style="display: inline-block; background: #FC4C02; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Connect Strava (+200 pts)</a>
        </div>
        <p style="color: #737373; font-size: 13px; text-align: center;">Already connected? You''re all set!</p>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
            <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">Cheers,<br><strong style="color: #f5f5f5;">Nils</strong></p>
        </div>
        <div style="margin-top: 32px; text-align: center;">
            <p style="color: #525252; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>',
     'Connect Strava for Auto-Import

The easiest way to post Proof of Sweat? Let Strava do the heavy lifting.

Why connect Strava?
- Workouts auto-import as Proof of Sweat
- No manual posting required
- Earn +200 Sweat Points instantly
- Build your streak automatically

Connect Strava: https://athlyst.fun/my-athlete/overview

Already connected? You''re all set!

Cheers,
Nils

---
Unsubscribe: {{unsubscribe_url}}'),

    -- Email 3: First Workout Nudge (72 hours)
    (3, 72, 'Your first Proof of Sweat awaits',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
            </div>
        </div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">Post Your First Workout</h1>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 16px; font-size: 16px;">Your profile is set up. Now it''s time to show the world what you''re made of.</p>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">Every workout you post is "Proof of Sweat" - visible evidence of your athletic journey that builds your market cap.</p>
        <div style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="color: #eab308; font-weight: 600; margin: 0; font-size: 24px;">+150 points</p>
            <p style="color: #a3a3a3; margin: 8px 0 0; font-size: 14px;">for your first workout</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://athlyst.fun/my-athlete/overview" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Post Your First Workout</a>
        </div>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
            <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">Keep pushing,<br><strong style="color: #f5f5f5;">Nils</strong></p>
        </div>
        <div style="margin-top: 32px; text-align: center;">
            <p style="color: #525252; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>',
     'Post Your First Workout

Your profile is set up. Now it''s time to show the world what you''re made of.

Every workout you post is "Proof of Sweat" - visible evidence of your athletic journey that builds your market cap.

+150 points for your first workout!

Post your workout: https://athlyst.fun/my-athlete/overview

Keep pushing,
Nils

---
Unsubscribe: {{unsubscribe_url}}'),

    -- Email 4: Referral Introduction (7 days / 168 hours)
    (4, 168, 'Invite friends, earn rewards',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
            </div>
        </div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">Grow Your Community</h1>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 16px; font-size: 16px;">The best athletes don''t train alone. Invite your training partners and earn rewards together.</p>
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #22c55e; font-weight: 600; margin: 0 0 16px; font-size: 16px;">Referral Rewards:</p>
            <div style="color: #d4d4d4; font-size: 14px; line-height: 2;">
                <div>1 friend = Skip waitlist for them</div>
                <div>3 friends = +500 Sweat Points</div>
                <div>5 friends = Founding Athlete badge</div>
                <div>10 friends = $5 USDC airdrop</div>
            </div>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://athlyst.fun/rewards?tab=invite" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Get Your Invite Link</a>
        </div>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
            <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">Build together,<br><strong style="color: #f5f5f5;">Nils</strong></p>
        </div>
        <div style="margin-top: 32px; text-align: center;">
            <p style="color: #525252; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>',
     'Grow Your Community

The best athletes don''t train alone. Invite your training partners and earn rewards together.

Referral Rewards:
- 1 friend = Skip waitlist for them
- 3 friends = +500 Sweat Points
- 5 friends = Founding Athlete badge
- 10 friends = $5 USDC airdrop

Get your invite link: https://athlyst.fun/rewards?tab=invite

Build together,
Nils

---
Unsubscribe: {{unsubscribe_url}}'),

    -- Email 5: Two Week Recap (14 days / 336 hours)
    (5, 336, 'Your first 2 weeks on Athlyst',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
            </div>
        </div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">Your First 2 Weeks</h1>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">You''ve been on Athlyst for 2 weeks! Here''s a quick look at your journey so far:</p>
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #d4d4d4; font-size: 14px; margin: 0 0 16px;">Check your stats on the Rewards page to see:</p>
            <ul style="color: #a3a3a3; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Your Sweat Score (total points)</li>
                <li>Current streak</li>
                <li>Leaderboard position</li>
                <li>Referral progress</li>
            </ul>
        </div>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">Keep posting Proof of Sweat to climb the leaderboard and grow your market cap!</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://athlyst.fun/rewards" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Your Stats</a>
        </div>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
            <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">Keep crushing it,<br><strong style="color: #f5f5f5;">Nils</strong></p>
        </div>
        <div style="margin-top: 32px; text-align: center;">
            <p style="color: #525252; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>',
     'Your First 2 Weeks on Athlyst

You''ve been on Athlyst for 2 weeks! Here''s a quick look at your journey so far.

Check your stats on the Rewards page to see:
- Your Sweat Score (total points)
- Current streak
- Leaderboard position
- Referral progress

Keep posting Proof of Sweat to climb the leaderboard and grow your market cap!

View your stats: https://athlyst.fun/rewards

Keep crushing it,
Nils

---
Unsubscribe: {{unsubscribe_url}}')

) AS t(step_number, delay_hours, subject, html_template, text_template)
WHERE es.name = 'user_onboarding'
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- ============================================================================
-- STRAVA REMINDER SEQUENCE (2 emails for users without Strava)
-- ============================================================================

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
    -- Email 1: Gentle Reminder (48 hours)
    (1, 48, 'You''re missing out on automatic tracking',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
            </div>
        </div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">Still posting manually?</h1>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">Connect Strava once and your workouts will auto-import as Proof of Sweat. No more manual entry.</p>
        <div style="background: rgba(252, 76, 2, 0.1); border: 1px solid rgba(252, 76, 2, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="color: #FC4C02; font-weight: 600; margin: 0 0 8px; font-size: 18px;">Connect Strava</p>
            <p style="color: #a3a3a3; margin: 0; font-size: 14px;">Earn +200 Sweat Points instantly</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://athlyst.fun/my-athlete/overview" style="display: inline-block; background: #FC4C02; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Connect Now</a>
        </div>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
            <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">Cheers,<br><strong style="color: #f5f5f5;">Nils</strong></p>
        </div>
        <div style="margin-top: 32px; text-align: center;">
            <p style="color: #525252; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>',
     'Still posting manually?

Connect Strava once and your workouts will auto-import as Proof of Sweat. No more manual entry.

Connect Strava and earn +200 Sweat Points instantly!

Connect now: https://athlyst.fun/my-athlete/overview

Cheers,
Nils

---
Unsubscribe: {{unsubscribe_url}}'),

    -- Email 2: Last Chance (7 days / 168 hours)
    (2, 168, 'Your workouts deserve to be seen',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
            </div>
        </div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">Your workouts deserve an audience</h1>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 16px; font-size: 16px;">Every run, ride, and training session is Proof of Sweat waiting to be shared.</p>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">Athletes who connect Strava post 3x more and build their market cap faster.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://athlyst.fun/my-athlete/overview" style="display: inline-block; background: #FC4C02; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Connect Strava</a>
        </div>
        <p style="color: #737373; font-size: 13px; text-align: center;">This is the last reminder. We won''t bug you about this again.</p>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
            <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">Cheers,<br><strong style="color: #f5f5f5;">Nils</strong></p>
        </div>
        <div style="margin-top: 32px; text-align: center;">
            <p style="color: #525252; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>',
     'Your workouts deserve an audience

Every run, ride, and training session is Proof of Sweat waiting to be shared.

Athletes who connect Strava post 3x more and build their market cap faster.

Connect Strava: https://athlyst.fun/my-athlete/overview

This is the last reminder. We won''t bug you about this again.

Cheers,
Nils

---
Unsubscribe: {{unsubscribe_url}}')

) AS t(step_number, delay_hours, subject, html_template, text_template)
WHERE es.name = 'strava_reminder'
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- ============================================================================
-- WEEKLY RECAP EMAIL TEMPLATE
-- ============================================================================

INSERT INTO public.email_templates (sequence_id, step_number, delay_hours, subject, html_template, text_template)
SELECT
    es.id,
    1,
    0,
    'Your week in Proof of Sweat',
     '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
                <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
            </div>
        </div>
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">Your Week in Review</h1>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">Here''s how you did this week on Athlyst:</p>
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="color: #a3a3a3; font-size: 14px; margin: 0;">Check your Rewards page for your:</p>
            <ul style="color: #d4d4d4; font-size: 16px; line-height: 2; margin: 16px 0 0; padding-left: 20px;">
                <li>Weekly Sweat Points earned</li>
                <li>Current streak</li>
                <li>Leaderboard position</li>
            </ul>
        </div>
        <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">Keep posting Proof of Sweat to climb the leaderboard!</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="https://athlyst.fun/rewards?tab=leaderboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Leaderboard</a>
        </div>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
            <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">Keep crushing it,<br><strong style="color: #f5f5f5;">Nils</strong></p>
        </div>
        <div style="margin-top: 32px; text-align: center;">
            <p style="color: #525252; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a></p>
        </div>
    </div>',
    'Your Week in Review

Here''s how you did this week on Athlyst:

Check your Rewards page for your:
- Weekly Sweat Points earned
- Current streak
- Leaderboard position

Keep posting Proof of Sweat to climb the leaderboard!

View leaderboard: https://athlyst.fun/rewards?tab=leaderboard

Keep crushing it,
Nils

---
Unsubscribe: {{unsubscribe_url}}'
FROM public.email_sequences es
WHERE es.name = 'weekly_recap'
ON CONFLICT (sequence_id, step_number) DO NOTHING;

-- ============================================================================
-- FUNCTION: Enroll user in onboarding sequence on profile creation
-- ============================================================================

CREATE OR REPLACE FUNCTION enroll_user_in_onboarding()
RETURNS TRIGGER AS $$
DECLARE
    v_sequence_id UUID;
    v_user_email TEXT;
BEGIN
    -- Get the user's email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = NEW.id;

    IF v_user_email IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get the user_onboarding sequence ID
    SELECT id INTO v_sequence_id
    FROM public.email_sequences
    WHERE name = 'user_onboarding' AND is_active = true;

    IF v_sequence_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Enroll the user in the onboarding sequence
    INSERT INTO public.user_email_status (
        user_id,
        email,
        sequence_id,
        current_step,
        next_email_at
    ) VALUES (
        NEW.id,
        v_user_email,
        v_sequence_id,
        0,
        now() -- Send first email immediately
    )
    ON CONFLICT (email, sequence_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enroll users on profile creation
DROP TRIGGER IF EXISTS enroll_user_onboarding_on_profile ON public.profiles;
CREATE TRIGGER enroll_user_onboarding_on_profile
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION enroll_user_in_onboarding();

-- ============================================================================
-- BADGE TYPES for achievements
-- ============================================================================

-- Insert default badge types into a reference table (or just document them)
-- Badges are stored in user_badges table with badge_type TEXT

-- Badge types:
-- 'early_adopter' - Signed up in first 100 users
-- 'founding_athlete' - Signed up in first 100 (same as early_adopter, can use either)
-- 'strava_connected' - Connected Strava account
-- 'first_workout' - Posted first workout
-- 'streak_7' - Achieved 7-day streak
-- 'streak_30' - Achieved 30-day streak
-- 'social_butterfly' - Shared 10+ workouts
-- 'community_builder' - Referred 5+ friends
-- 'market_mover' - Market cap reached $100

-- ============================================================================
-- FUNCTION: Get athlete count for "First 100" feature
-- ============================================================================

CREATE OR REPLACE FUNCTION get_athlete_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.profiles);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: Award early adopter badge if user is in first 100
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_award_early_adopter()
RETURNS TRIGGER AS $$
DECLARE
    v_user_count INTEGER;
BEGIN
    -- Get current user count (including this user)
    SELECT COUNT(*) INTO v_user_count FROM public.profiles;

    -- If user is in first 100, award the badge
    IF v_user_count <= 100 THEN
        INSERT INTO public.user_badges (user_id, badge_type)
        VALUES (NEW.id, 'early_adopter')
        ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for early adopter badge
DROP TRIGGER IF EXISTS check_early_adopter_on_profile ON public.profiles;
CREATE TRIGGER check_early_adopter_on_profile
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_and_award_early_adopter();
