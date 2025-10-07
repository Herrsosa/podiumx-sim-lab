# Strava Integration Setup Guide

This guide explains how to set up the Strava integration for PodiumX.

## Prerequisites

- A Strava account
- A deployed PodiumX application (or local development environment)
- Access to your Supabase project dashboard

## Step 1: Create a Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Click "Create Application" or "My API Application"
3. Fill in the application details:
   - **Application Name**: PodiumX (or your preferred name)
   - **Category**: Choose the most appropriate category
   - **Club**: Optional
   - **Website**: Your application URL
   - **Authorization Callback Domain**: Your domain (e.g., `yourapp.lovable.app` or `localhost` for development)
   - **Application Description**: Brief description of your app

4. After creating, note down:
   - **Client ID** (public, can be in frontend code)
   - **Client Secret** (private, NEVER expose in frontend code)

## Step 2: Configure Supabase Secrets

The Strava Client Secret must be stored securely in Supabase Secrets:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Edge Functions** > **Secrets**
3. Click "Add new secret"
4. Add the secret:
   - Name: `STRAVA_CLIENT_SECRET`
   - Value: Your Strava Client Secret from Step 1

## Step 3: Update Application Code

Update the Strava Client ID in the following files:

### `src/components/StravaTraining.tsx`
```typescript
const STRAVA_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
```

### `src/pages/StravaCallback.tsx`
```typescript
const STRAVA_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
```

## Step 4: Configure Redirect URI

The redirect URI must match between your Strava app settings and your application code.

**For production:**
- Strava API settings: `https://yourapp.lovable.app`
- Redirect URI in code: `https://yourapp.lovable.app/strava/callback`

**For local development:**
- Strava API settings: `localhost`
- Redirect URI in code: `http://localhost:5173/strava/callback`

## Step 5: Test the Integration

1. Navigate to "My Page" in your application
2. You should see a "Strava Training" card
3. Click "Connect Strava"
4. You'll be redirected to Strava to authorize the application
5. After authorization, you'll be redirected back to your app
6. The "Strava Training" card should now show "Connected"
7. Click "Import Activities" to sync your Strava workouts

## Troubleshooting

### "STRAVA_CLIENT_SECRET not configured" error
- Make sure you've added the secret to Supabase Secrets
- Redeploy your edge functions after adding the secret

### OAuth redirect errors
- Check that your Authorization Callback Domain in Strava matches your actual domain
- Verify the redirect URI in your code matches the pattern: `https://yourdomain/strava/callback`

### "Strava not connected" error when importing
- Try disconnecting and reconnecting Strava
- Check the browser console for detailed error messages

## Security Notes

- **NEVER** commit your `STRAVA_CLIENT_SECRET` to version control
- The Client ID is safe to expose in frontend code
- The Client Secret should only exist in Supabase Secrets
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
