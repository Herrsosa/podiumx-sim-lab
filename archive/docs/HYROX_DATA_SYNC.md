# HYROX Web Data Sync

Athlyst can pull race data directly from the official HYROX results source instead of manual entry.

## Source priority

1. `https://results.hyrox.com/` (official race results + start lists)
2. `https://hyroxresults.com` (redirects to `results.hyrox.com`)

## Script

Use:

```bash
node scripts/fetch-hyrox-feed.cjs
```

or:

```bash
npm run hyrox:fetch
```

Optional flags:

```bash
# Limit completed races processed
node scripts/fetch-hyrox-feed.cjs --limit-completed 20

# Custom output path
node scripts/fetch-hyrox-feed.cjs --out artifacts/hyrox-feed.json

# Also write resolver-ready JSON files per race/sex
node scripts/fetch-hyrox-feed.cjs \
  --write-results-dir artifacts/hyrox-results
```

## One-shot sync (create + resolve)

This sync command pulls official data, creates missing upcoming markets, and resolves completed markets where possible.

```bash
# Preview only
npm run hyrox:sync -- --dry-run

# Apply changes
npm run hyrox:sync
```

Optional:

```bash
npm run hyrox:sync -- --limit-completed 30
```

## Output

The script writes:

- `upcoming`: race groups currently listed under HYROX start lists
- `completed`: race groups with top-3 Men Pro and Women Pro extracted from official list pages

When `--write-results-dir` is set, it also writes files in the same shape required by:

- `scripts/resolve-markets-from-results.ts`

## Recommended automation

1. Run `npm run hyrox:sync` on a schedule (e.g., hourly or every 6 hours).
2. Use `--dry-run` in CI first if you want preview logs before applying.
3. Keep `source_url` metadata on each market resolution for auditability.

## GitHub Actions schedule

This repo now includes:

- `.github/workflows/hyrox-market-sync.yml`

It runs every 6 hours and can also be triggered manually.

Required repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
