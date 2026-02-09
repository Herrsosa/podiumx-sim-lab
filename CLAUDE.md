# Athlyst

## What is Athlyst?

Athlyst is a Web3 social network where any athlete—pro or not—issues personal "Athlete Tokens," builds a following, and grows their Market Cap through training activity. Supporters buy tokens to access the athlete's "Inner Circle" (token-gated chat and DMs).

**One-liner:** Turn training into a social asset: post Proof of Sweat, grow your community, and unlock access for your biggest supporters.

**Design DNA:** Instagram for fitness × Robinhood/Revolut dashboards—welcoming, social, reinforces Athlete identity, Web2 UX with crypto under the hood.

**Core insight:** The same way Instagram made everyone an "influencer to 15 people," Athlyst makes every athlete a star to their token holders.

---

## Why Now

- Endurance and hybrid sports are exploding (HYROX, running, CrossFit)
- Athletes increasingly identify with their "Athlete Identity" and want belonging
- Consumer behavior shifting toward "interactive finance" (prediction markets, memecoins, sports betting)
- People want belonging & identity showcase—not just likes
- No existing platform combines: credible Proof of Sweat + visible community metric + token-gated utility

---

## Core Concepts

### Proof of Sweat
- Athletes post training activities (auto-imported from Strava, Garmin later)
- This is the content that drives the platform
- Credibility comes from real athletic output, not vanity metrics
- Early on, credibility comes from linking activity feed—not heavy verification
- **Note:** On landing page and public-facing copy, say "Share your training" — don't mention Strava specifically

### Market Cap
- Each athlete has a token on a bonding curve (minted on sign-up)
- Market Cap = price × circulating supply
- Rises as more supporters buy, falls if they sell
- **Social signal of momentum and community depth—not an investment promise**
- Market Cap only decays if people sell tokens (no automatic decay for inactivity)
- Different athletes having different Market Caps is acceptable and expected

### Inner Circle (Token-Gated Access)
- The PRIMARY utility of holding tokens
- Contains: Group Chat + Direct Messages (DMs)
- Non-holders see LOCKED state with FOMO messaging
- Holders see UNLOCKED state with access to chat/DMs
- Future expansion: pinned exclusive content (training plans, voice memos, discount codes)
- **Inner Circle should NOT contain:** Settings, Strava connection, workout management, or any administrative functions

### Aura Score
- Composite score measuring training consistency
- Three components:
  - **Discipline:** Days active (e.g., 29/30 days)
  - **Momentum:** Current streak (e.g., 24-day streak)
  - **Output:** Training volume this week (e.g., 112 min)
- Secondary metric to Market Cap
- Displayed compactly on profile, full breakdown in Stats tab
- **Important:** When streak is 0, do NOT show fire emoji. Either hide emoji or show "No streak"

---

## User Types & Views

### 1. Athletes (Own Profile View)
- See their own Market Cap, holders, Aura score
- Manage their Inner Circle (view chat, respond to DMs)
- Post Proof of Sweat
- Access settings (separate from Inner Circle)

### 2. Token Holders (Viewing Other Athlete)
- See athlete's Market Cap and stats
- Inner Circle shows UNLOCKED state
- Can enter Group Chat and send DMs
- Can buy more tokens or sell

### 3. Non-Holders (Viewing Other Athlete)
- See athlete's Market Cap and stats
- Inner Circle shows LOCKED state with FOMO messaging
- Clear CTA to buy tokens and unlock access
- This is the primary conversion target

---


## The Core Loop

```
Athlete posts Proof of Sweat
           ↓
Supporters discover athlete → buy tokens
           ↓
Market Cap rises → visible social proof
           ↓
Token unlocks Inner Circle (chat/DMs)
           ↓
Deeper community → retention
           ↓
More posting + access drives more discovery
           ↓
Repeat
```

---

## Business Model

- **Transaction fees:** Small fee on collects/sells; split between athlete earnings and platform treasury
- **Premium athlete tools (later):** Advanced analytics, community management, merch links, paid programs
- **Brand & event partnerships (later):** Sponsored challenges, race activations, affiliate commerce

---

## Go-to-Market: HYROX & Runners First

### Target Users
- Sub-elite runners
- HYROX competitors
- Club captains
- Athletes with small but real followings (500-5k) who want to grow

### Experimental Validation Approach

Rather than cold outreach (Instagram comments), run structured cohort experiments:

**Phase 1: Recruit closed cohort (15-20 athletes)**
- Warm intros, not strangers
- Look for "prolific posters" already sharing on Strava/Instagram
- Frame as collaboration: "Help shape something new"
- Consider compensating ($50-100 for 3 weeks)

**Phase 2: Seed the network**
- Every athlete gets 5+ token holders on day 1
- Pre-populate some Proof of Sweat
- Create cohort leaderboard

**Phase 3: Run structured challenge (21 days)**
- Post Proof of Sweat daily
- Track: posting retention, token purchases, chat activity
- Weekly check-ins for qualitative feedback

**Phase 4: The stranger test**
- Share top athletes in external communities (Reddit, Facebook groups, Strava clubs)
- See if strangers buy tokens
- This validates the discovery/growth model

### Key Metrics to Watch
- Day-over-day posting retention
- Token purchases (by whom? strangers or friends?)
- Market Cap checking frequency
- Inner Circle chat activity
- Unprompted external sharing

---

## Competitive Positioning

| Competitor | Strength | Weakness | Athlyst Advantage |
|------------|----------|----------|-------------------|
| Strava | Best for logging/segments | Weak social, no ownership | Community ownership + Inner Circle |
| Instagram/TikTok | Best for reach | No Proof of Sweat, no committed community | Credible athletic output + token-gated access |
| Fantasy/Betting | Strong engagement | Detached from real effort | Anchored to actual training |
| Crypto social apps | Speculation mechanics | Speculation-first, no utility | Training-anchored + real utility (chat/DMs) |

**Why Athlyst wins:** Combines (1) credible Proof of Sweat, (2) visible community metric, and (3) utility (token-gated access) into one tight loop.


---

## Common Tasks Reference

When asked to:
- **"Simplify a screen"** = Reduce visual clutter, clearer hierarchy, fewer competing elements, remove redundant text
- **"Add Inner Circle"** = Implement locked/unlocked states based on token ownership
- **"Improve conversion"** = Make Buy action prominent, show token utility clearly, create FOMO
- **"Clean up navigation"** = Remove redundant nav elements, consolidate into single system
- **"Simplify workout cards"** = Show only activity name, type, duration, RPE—remove detailed splits and zones
- **"Fix the arrows"** = Don't show up/down arrow when change is 0%