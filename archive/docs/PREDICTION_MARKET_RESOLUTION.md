# Prediction Market Resolution

Use `scripts/resolve-markets-from-results.ts` to resolve markets from official race results.

## 1) Prepare official results JSON

Example:

```json
[
  { "athleteName": "Alice Runner", "place": 1, "totalTime": "55:12" },
  { "athleteName": "Beth Strong", "place": 2, "totalTime": "55:44" },
  { "athleteName": "Cara Fast", "place": 3, "totalTime": "56:01" }
]
```

## 2) Resolve a full event

```bash
npx tsx scripts/resolve-markets-from-results.ts \
  --event-id london-2026-03 \
  --results-file ./secrets/london-men-pro-results.json \
  --source "HYROX Official" \
  --source-url "https://results.hyrox.com/..."
```

## 3) Resolve a single market

```bash
npx tsx scripts/resolve-markets-from-results.ts \
  --market-id 11111111-1111-1111-1111-111111111111 \
  --results-file ./secrets/london-men-pro-results.json
```

## 4) Dry run first

```bash
npx tsx scripts/resolve-markets-from-results.ts \
  --event-id london-2026-03 \
  --results-file ./secrets/london-men-pro-results.json \
  --dry-run
```

## Required environment variables

- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (or `VITE_SUPABASE_SERVICE_ROLE_KEY`)
