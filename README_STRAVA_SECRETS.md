## Server Secrets required for Strava OAuth

These are Supabase function secrets (set via CLI or dashboard):

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI`
- `APP_URL`

Example commands:

```
supabase functions secrets set STRAVA_CLIENT_ID=your_client_id
supabase functions secrets set STRAVA_CLIENT_SECRET=your_client_secret
supabase functions secrets set STRAVA_REDIRECT_URI=https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange
supabase functions secrets set APP_URL=https://your-app-url
```
