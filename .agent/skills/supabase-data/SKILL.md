---
name: supabase-data
description: Rules and implementation guidelines for Supabase Edge Functions, database schema definitions, and backend data access in Athlyst.
---

# Supabase Edge Functions & Database Layer

## Edge Functions
- Always define explicit request and response types.
- Require `x-api-key` or standard JWT authentication for executing sensitive logic.
- Avoid placing heavy UI processing in functions; they should operate primarily as a data coordination layer.
- Rely on native Postgres functions for complex aggregations where possible, rather than pulling all data to the Edge Function memory.

## Schema Types
- Always keep the local `types/supabase.ts` or equivalent file synced.
- After running schema modifications, ensure `npm run typegen` or the required local command updates the TypeScript definitions.
- Treat `users` or `athletes` table structures carefully. The primary identifier should be mapped via the `wallet_address` or a central UUID linked from auth.
