# Strava Integration Setup Guide

This guide explains how to set up the Strava integration for Athlyst.

## Prerequisites

- A Strava account
- A deployed Athlyst application (or local development environment)
- Access to your Supabase project dashboard

## Step 1: Create a Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Click "Create Application" or "My API Application"
3. Fill in the application details:
   - **Application Name**: Athlyst (or your preferred name)
   - **Category**: Choose the most appropriate category
   - **Club**: Optional
   - **Website**: Your application URL
   - **Authorization Callback Domain**: Your domain (e.g., `yourapp.lovable.app` or `localhost` for development)
   - **Application Description**: Brief description of your app

4. After creating, note down:
   - **Client ID** (public, can be in frontend code)
   - **Client Secret** (private, NEVER expose in frontend code)

## Step 2: Configure Supabase Secrets

The Strava credentials must be stored securely as Supabase Edge Function secrets so that refresh logic can run server-side.

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Edge Functions** > **Secrets**
3. Click "Add new secret" and create the following entries:
   - Name: `STRAVA_CLIENT_ID` → Value: Your Strava Client ID from Step 1
   - Name: `STRAVA_CLIENT_SECRET` → Value: Your Strava Client Secret from Step 1
4. Redeploy your edge functions so they pick up the new secrets, for example:
   ```bash
   supabase functions deploy --project-ref <your-project-ref>
   ```

## Step 3: Set the Client ID in the frontend

The frontend now reads the Client ID from an environment variable.

- Edit `.env` (or `.env.local`) and set `VITE_STRAVA_CLIENT_ID=<your Strava Client ID>`
- The same value should be added to `.env.example` for reference only (do not commit secrets)

All Strava entry points (`StravaTraining`, `StravaCard`, `ConnectStravaButton`, etc.) share the helper at `src/utils/stravaAuth.ts`, so updating the environment variable is enough.

## Step 4: Configure Redirect URI

The OAuth redirect now flows through the Supabase Edge Function.

- Strava Authorization Callback Domain: `ssnehmposgsczoadycms.functions.supabase.co`
- Final redirect URI: `https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange`

This exact URI is hard coded in `src/utils/stravaAuth.ts` and in the Supabase function (`supabase/functions/strava-oauth-exchange/index.ts`), so the Strava developer settings must match it exactly.

## Step 5: Test the Integration

1. Navigate to "My Page" in your application
2. You should see a "Strava Training" card
3. Click "Connect Strava"
4. You'll be redirected to Strava to authorize the application
5. After authorization, Strava redirects to the Supabase edge function, which exchanges the code and then returns/redirects you back to the app
6. The "Strava Training" card should now show "Connected"
7. Click "Import Activities" to sync your Strava workouts

## Troubleshooting

### "STRAVA_CLIENT_SECRET not configured" or "Strava client credentials not configured" errors
- Make sure you've added the `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` secrets to Supabase
- Redeploy your edge functions after adding or changing secrets

### OAuth redirect errors
- Ensure the Strava Authorization Callback Domain is `ssnehmposgsczoadycms.functions.supabase.co`
- Confirm `STRAVA_REDIRECT_URI` in Supabase secrets matches `https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange`

### "Strava not connected" error when importing
- Try disconnecting and reconnecting Strava
- Check the browser console for detailed error messages

## Security Notes

- **NEVER** commit your `STRAVA_CLIENT_SECRET` to version control
- The Client ID is safe to expose in frontend code, but storing it in Supabase secrets keeps the server configuration in sync
- OAuth tokens are stored encrypted in the database

## API Rate Limits

Strava enforces rate limits:
- 100 requests every 15 minutes
- 1,000 requests per day

The import function fetches up to 50 activities at a time to stay within these limits.

## Database Schema

The integration uses these tables:
- `oauth_connections`: Stores Strava OAuth tokens
- `activities`: Stores imported workout data

All tables have Row Level Security (RLS) enabled - users can only access their own data.

