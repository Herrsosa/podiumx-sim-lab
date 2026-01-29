-- Migration: Improve welcome email design v2
-- Creates a premium, email-client compatible welcome email with proper table layout
-- Uses background colors instead of gradients for better compatibility

UPDATE public.email_templates
SET html_template = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Athlyst</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #111111; border-radius: 16px; overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #222;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="background-color: #22c55e; padding: 10px 20px; border-radius: 10px;">
                    <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">Athlyst</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Headline -->
              <h1 style="margin: 0 0 24px; font-size: 32px; font-weight: 700; color: #ffffff; text-align: center; line-height: 1.2;">
                You''re on the list! 🎉
              </h1>
              
              <!-- Intro -->
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7; color: #a3a3a3;">
                Thanks for joining the Athlyst waitlist. You''re now in line to be one of the <strong style="color: #22c55e;">first athletes</strong> to build your market cap and turn your training into a social asset.
              </p>
              
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.7; color: #a3a3a3;">
                We''re building something special — a platform where your <strong style="color: #ffffff;">Proof of Sweat</strong> becomes your currency.
              </p>
              
              <!-- Feature Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #22c55e; text-transform: uppercase; letter-spacing: 1px;">What''s Coming</p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #d4d4d4; font-size: 15px; line-height: 1.8;">
                      <li>Post your workouts as Proof of Sweat</li>
                      <li>Build your personal athlete market cap</li>
                      <li>Let supporters join your Inner Circle</li>
                      <li>Earn rewards for staying consistent</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Follow CTA -->
              <p style="margin: 0 0 20px; font-size: 16px; color: #a3a3a3; text-align: center;">
                Follow us to see what we''re building:
              </p>
              
              <!-- Instagram Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-bottom: 32px;">
                <tr>
                  <td style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); background-color: #e6683c; border-radius: 8px;">
                    <a href="https://instagram.com/athlyst.fun" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      📸 Follow @athlyst.fun
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="border-top: 1px solid #333; padding-top: 32px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #a3a3a3; text-align: center;">
                      Got ideas? We''d love to hear from you:
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Feedback Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="background-color: #eab308; border-radius: 8px;">
                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSdH36iuEIlfB6ysZTGNhMl11VKWw5i6_v-UBibzclErHIoRxg/viewform" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #000000; text-decoration: none;">
                      💬 Share Your Feedback
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Signature -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="border-top: 1px solid #333; padding-top: 32px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #a3a3a3;">
                      See you on the starting line,<br>
                      <strong style="color: #ffffff;">Nils</strong><br>
                      <span style="color: #737373; font-size: 13px;">Founder, Athlyst</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0a0a0a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #525252;">
                © 2026 Athlyst · Building the athlete economy
              </p>
              <p style="margin: 8px 0 0; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #525252; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
text_template = 'You''re on the list! 🎉

Thanks for joining the Athlyst waitlist. You''re now in line to be one of the first athletes to build your market cap and turn your training into a social asset.

We''re building something special — a platform where your Proof of Sweat becomes your currency.

WHAT''S COMING:
• Post your workouts as Proof of Sweat
• Build your personal athlete market cap
• Let supporters join your Inner Circle
• Earn rewards for staying consistent

Follow us on Instagram to see what we''re building:
https://instagram.com/athlyst.fun

Got ideas? Share your feedback:
https://docs.google.com/forms/d/e/1FAIpQLSdH36iuEIlfB6ysZTGNhMl11VKWw5i6_v-UBibzclErHIoRxg/viewform

See you on the starting line,
Nils
Founder, Athlyst

---
© 2026 Athlyst · Building the athlete economy
Unsubscribe: {{unsubscribe_url}}'
WHERE sequence_id = (SELECT id FROM email_sequences WHERE name = 'waitlist_welcome')
  AND step_number = 1;
