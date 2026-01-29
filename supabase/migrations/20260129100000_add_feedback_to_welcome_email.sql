-- Migration: Add feedback link to waitlist welcome email
-- This updates the welcome email template to include a "Share Feedback" button
-- linking to the Google Form for user feedback collection

UPDATE public.email_templates
SET html_template = '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #f5f5f5;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #f5f5f5;">You''re on the list!</h1>
  </div>
  <p style="color: #a3a3a3; line-height: 1.6; margin-bottom: 16px;">Thanks for joining the Athlyst waitlist. You''re now in line to be one of the first athletes to build your market cap.</p>
  <p style="color: #a3a3a3; line-height: 1.6; margin-bottom: 24px;">In the meantime, follow us on Instagram: <a href="https://instagram.com/athlyst.fun" style="color: #3b82f6; text-decoration: none;">@athlyst.fun</a></p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="https://docs.google.com/forms/d/e/1FAIpQLSdH36iuEIlfB6ysZTGNhMl11VKWw5i6_v-UBibzclErHIoRxg/viewform" style="display: inline-block; background: #eab308; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Share Your Feedback</a>
  </div>
  <p style="color: #666; margin-top: 32px; font-size: 14px;">The Athlyst Team</p>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #333; text-align: center;">
    <p style="color: #666; font-size: 12px; margin: 0;"><a href="{{unsubscribe_url}}" style="color: #666; text-decoration: underline;">Unsubscribe</a></p>
  </div>
</div>',
text_template = 'You''re on the list!

Thanks for joining the Athlyst waitlist. You''re now in line to be one of the first athletes to build your market cap.

In the meantime, follow us on Instagram: @athlyst.fun
https://instagram.com/athlyst.fun

Share Your Feedback:
https://docs.google.com/forms/d/e/1FAIpQLSdH36iuEIlfB6ysZTGNhMl11VKWw5i6_v-UBibzclErHIoRxg/viewform

The Athlyst Team

Unsubscribe: {{unsubscribe_url}}'
WHERE sequence_id = (SELECT id FROM email_sequences WHERE name = 'waitlist_welcome')
  AND step_number = 1;
