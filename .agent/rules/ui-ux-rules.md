# UI/UX Rules and Guidelines

These are strict constraints for building user interfaces in Athlyst.

## Core Design DNA
- Instagram for fitness × Robinhood/Revolut dashboards.
- Welcoming, social, reinforces "Athlete identity".
- "Web2 UX with crypto under the hood" (Hide the blockchain complexity).

## Common Tasks Reference
When asked to:
- **"Simplify a screen"**: Reduce visual clutter, clearer hierarchy, fewer competing elements, remove redundant text.
- **"Add Inner Circle"**: Implement locked/unlocked states based on token ownership.
- **"Improve conversion"**: Make "Buy" action prominent, show token utility clearly, create FOMO.
- **"Clean up navigation"**: Remove redundant nav elements, consolidate into single system.

## Specific Component Constraints

### Workout Cards
- Show ONLY: Activity name, type, duration, and RPE (Rate of Perceived Exertion).
- NEVER show: Detailed splits, detailed heart rate zones, or map data directly unless explicitly opened.
- Do NOT mention "Strava specifically" on public-facing copy. Just say "Share your training".

### Market Cap & Stats
- "Fix the arrows": Don't show an up/down arrow when the change is 0%.
- "Aura Score": When momentum streak is 0, do NOT show a fire emoji. Either hide the emoji or show "No streak".

### Inner Circle (Token-Gated Access)
- The Inner Circle must ONLY contain: Group Chat + Direct Messages (DMs).
- Future additions can be pinned exclusive content.
- Inner Circle should NOT contain: User Settings, Strava connections, workout management, or any administrative functions.
