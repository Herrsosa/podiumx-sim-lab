# Strava OAuth Exchange

## Set server secrets (run manually)

```
supabase functions secrets set STRAVA_CLIENT_ID=YOUR_ID
supabase functions secrets set STRAVA_CLIENT_SECRET=YOUR_SECRET
supabase functions secrets set STRAVA_REDIRECT_URI=https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange
supabase functions secrets list
```

## Deploy function (run manually)

```
pnpm deploy:function:strava
```

## Verify new handler is live

Expect HTTP/2 400 and JSON: `{"error":"Missing 'code' from Strava redirect."}`

```
curl -i "https://ssnehmposgsczoadycms.functions.supabase.co/strava-oauth-exchange"
```

## View logs live

```
pnpm logs:function:strava
```

## Strava app settings

- https://www.strava.com/settings/api
- Authorization Callback Domain: `ssnehmposgsczoadycms.functions.supabase.co`
