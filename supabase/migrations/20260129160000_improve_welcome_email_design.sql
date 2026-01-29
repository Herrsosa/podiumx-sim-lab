-- Migration: Improve welcome email design
-- Updates the waitlist welcome email with better branding, gradient background,
-- Instagram button, and personal signature from Nils

UPDATE public.email_templates
SET html_template = '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%); color: #f5f5f5;">

  <!-- Logo -->
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 12px 20px; border-radius: 12px;">
      <span style="font-size: 20px; font-weight: bold; color: white;">Athlyst</span>
    </div>
  </div>

  <!-- Heading -->
  <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 24px; color: #f5f5f5; text-align: center;">
    You''re on the list!
  </h1>

  <!-- Body -->
  <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 16px; font-size: 16px;">
    Thanks for joining the Athlyst waitlist. You''re now in line to be one of the first athletes to build your market cap and turn your training into a social asset.
  </p>

  <p style="color: #d4d4d4; line-height: 1.8; margin-bottom: 24px; font-size: 16px;">
    In the meantime, follow us on Instagram to see what we''re building:
  </p>

  <!-- Instagram Button -->
  <div style="text-align: center; margin: 28px 0;">
    <a href="https://instagram.com/athlyst.fun" style="display: inline-block; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Follow @athlyst.fun
    </a>
  </div>

  <p style="color: #d4d4d4; line-height: 1.8; margin: 24px 0 16px; font-size: 16px; text-align: center;">
    Got ideas or feedback? We''d love to hear from you:
  </p>

  <!-- Feedback Button -->
  <div style="text-align: center; margin: 20px 0 32px;">
    <a href="https://docs.google.com/forms/d/e/1FAIpQLSdH36iuEIlfB6ysZTGNhMl11VKWw5i6_v-UBibzclErHIoRxg/viewform" style="display: inline-block; background: #eab308; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Share Your Feedback
    </a>
  </div>

  <!-- Signature -->
  <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333;">
    <p style="color: #a3a3a3; font-size: 15px; margin: 0; line-height: 1.6;">
      Cheers,<br>
      <strong style="color: #f5f5f5;">Nils</strong><br>
      <span style="color: #737373; font-size: 13px;">Founder, Athlyst</span>
    </p>
  </div>

  <!-- Footer -->
  <div style="margin-top: 32px; text-align: center;">
    <p style="color: #525252; font-size: 12px; margin: 0;">
      <a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
</div>',
text_template = 'You''re on the list!

Thanks for joining the Athlyst waitlist. You''re now in line to be one of the first athletes to build your market cap and turn your training into a social asset.

In the meantime, follow us on Instagram to see what we''re building:
https://instagram.com/athlyst.fun

Got ideas or feedback? We''d love to hear from you:
https://docs.google.com/forms/d/e/1FAIpQLSdH36iuEIlfB6ysZTGNhMl11VKWw5i6_v-UBibzclErHIoRxg/viewform

Cheers,
Nils
Founder, Athlyst

---
Unsubscribe: {{unsubscribe_url}}'
WHERE sequence_id = (SELECT id FROM email_sequences WHERE name = 'waitlist_welcome')
  AND step_number = 1;
