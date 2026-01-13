# Athlyst

## What is Athlyst?

Athlyst is a Web3 social network where any athlete—pro or not—issues personal "Athlete Tokens," builds a following, and grows their Market Cap through training activity. Supporters buy tokens to access the athlete's "Inner Circle" (token-gated chat and DMs).

**One-liner:** Turn training into a social asset: post Proof of Sweat, grow your community, and unlock token-gated access for your biggest supporters.

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

## Screen Specifications

### Own Athlete Profile

```
┌─────────────────────────────────────────┐
│ [Settings ⚙️]              [Share ↗]    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      YOUR MARKET CAP            │   │
│  │        $2,050                   │   │
│  │     ↑ 4.2% this week            │   │
│  │                                  │   │
│  │  47 holders · 82 Aura · 24d 🔥  │   │
│  │                                  │   │
│  │       [tap for details →]       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🔐 YOUR INNER CIRCLE            │   │
│  │                                  │   │
│  │  [Group Chat]     [DMs (3)]     │   │
│  │   47 members       3 unread     │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  PROOF OF SWEAT                        │
│  [Workout 1]                           │
│  [Workout 2]                           │
│  [Workout 3]                           │
│                                         │
│        [＋ Add Proof of Sweat]          │
│                                         │
│  ─────────────────────────────────      │
│  Feed | Market | Portfolio | Profile    │
└─────────────────────────────────────────┘
```

**Key rules:**
- Settings accessed via gear icon (top-right), NOT in main scroll
- Strava connection status should be near "Add Proof of Sweat" button or in Settings—NOT in Inner Circle
- Inner Circle contains ONLY Group Chat and DMs
- Tapping Market Cap card opens expanded detail view

### Own Profile - Expanded Detail View (tap Market Cap)

```
┌─────────────────────────────────────────┐
│  [← Back]                    [Trade]    │
│                                         │
│         YOUR MARKET CAP                 │
│            $2,050                       │
│         ↑ 4.2% this week                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                  │   │
│  │      [PRICE CHART]              │   │
│  │      1D | 1W | 1M | ALL         │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  AURA SCORE                            │
│  ┌────────┐ ┌────────┐ ┌────────┐     │
│  │Discpln │ │Momentm │ │ Output │     │
│  │   97   │ │  100   │ │   19   │     │
│  │ 29/30  │ │ 24d 🔥 │ │ 112min │     │
│  └────────┘ └────────┘ └────────┘     │
│                                         │
│  RECENT TRADES                         │
│  @runner42 bought · 2h ago · +$12      │
│  @hyroxfan sold · 1d ago · -$8         │
│  @speedster bought · 3d ago · +$25     │
│                                         │
│  HOLDERS (47)                   [See all]│
│  [avatar] [avatar] [avatar] [avatar]   │
│                                         │
└─────────────────────────────────────────┘
```

### View Other Athlete - Non-Holder (Conversion Target)

```
┌─────────────────────────────────────────┐
│  [← Back]                               │
│                                         │
│         [Profile Photo]                 │
│        Claudia Herrero                  │
│     @claudia · Running · Madrid         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     MARKET CAP: $97.11          │   │
│  │     ↑ 12% · 23 holders          │   │
│  │     [mini sparkline]            │   │
│  │                                  │   │
│  │  ┌─────────┐    ┌─────────┐    │   │
│  │  │   Buy   │    │  Sell   │    │   │
│  │  └─────────┘    └─────────┘    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🔒 INNER CIRCLE                 │   │
│  │                                  │   │
│  │  "23 supporters chatting"       │   │
│  │  "Last active 5 min ago"        │   │
│  │                                  │   │
│  │     [Buy to unlock access]      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────      │
│  [Proof of Sweat]        [Stats]       │
│  ─────────────────────────────────      │
│                                         │
│  [Workout 1 with map]                  │
│  [Workout 2 with map]                  │
│  [Workout 3 with map]                  │
│                                         │
│  ─────────────────────────────────      │
│  Feed | Market | Portfolio | Profile    │
└─────────────────────────────────────────┘
```

**Key rules for locked state:**
- Show activity happening inside to create FOMO
- "X supporters chatting", "Last active X min ago", "X online now"
- Clear CTA: "Buy to unlock access" or "Buy to unlock Chat + DMs"
- Consider blurring a preview of chat messages

### View Other Athlete - Token Holder

```
┌─────────────────────────────────────────┐
│  [← Back]                               │
│                                         │
│         [Profile Photo]                 │
│        Claudia Herrero                  │
│     @claudia · Running · Madrid         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     MARKET CAP: $97.11          │   │
│  │     ↑ 12% · 23 holders          │   │
│  │     [mini sparkline]            │   │
│  │                                  │   │
│  │  ┌─────────┐    ┌─────────┐    │   │
│  │  │   Buy   │    │  Sell   │    │   │
│  │  └─────────┘    └─────────┘    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🔓 INNER CIRCLE (You're in!)   │   │
│  │                                  │   │
│  │  [Enter Chat]    [Send DM]      │   │
│  │   8 online                       │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────      │
│  [Proof of Sweat]        [Stats]       │
│  ─────────────────────────────────      │
│                                         │
│  [Workout 1 with map]                  │
│  [Workout 2 with map]                  │
│  [Workout 3 with map]                  │
│                                         │
│  ─────────────────────────────────      │
│  Feed | Market | Portfolio | Profile    │
└─────────────────────────────────────────┘
```

### Stats Tab (when user taps "Stats")

```
┌─────────────────────────────────────────┐
│  [← Back]                               │
│                                         │
│  [Profile Photo + Name + Market Cap]   │
│  [Inner Circle card - same as above]   │
│                                         │
│  ─────────────────────────────────      │
│  [Proof of Sweat]       [Stats ●]      │
│  ─────────────────────────────────      │
│                                         │
│  PRICE HISTORY                         │
│  ┌─────────────────────────────────┐   │
│  │                                  │   │
│  │      [PRICE CHART]              │   │
│  │                                  │   │
│  │      1D | 1W | 1M | ALL         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  AURA SCORE: 48                        │
│  ┌────────┐ ┌────────┐ ┌────────┐     │
│  │Discpln │ │Momentm │ │ Output │     │
│  │   24   │ │   3    │ │  -39%  │     │
│  └────────┘ └────────┘ └────────┘     │
│                                         │
│  HOLDERS (23)                   [View all]│
│  [avatar] [avatar] [avatar] [avatar]   │
│                                         │
└─────────────────────────────────────────┘
```

### Buy Modal (appears when user taps "Buy")

```
┌─────────────────────────────────────────┐
│                                    [X]  │
│                                         │
│         Buy @claudia                    │
│                                         │
│  Amount                                 │
│  ┌─────────────────────────────────┐   │
│  │  $                         USD  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  You'll receive: ~8.2 tokens           │
│  Price per token: $11.84               │
│                                         │
│  [▼ Advanced]  ← COLLAPSED BY DEFAULT  │
│  ┌─────────────────────────────────┐   │
│  │  Slippage tolerance: 1%         │   │
│  │  Price impact: 0.3%             │   │
│  │  Platform fee: $0.12            │   │
│  │  Athlete fee: $0.08             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       Confirm Purchase          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Key rules:**
- Trade details (slippage, fees, price impact) are hidden by default
- Only shown when user expands "Advanced" section
- Keep the main buy flow simple and unintimidating

### Portfolio Page

```
┌─────────────────────────────────────────┐
│  Portfolio                [$ Add Funds] │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  TOTAL PORTFOLIO VALUE          │   │
│  │  $64,760.83        ↑ 163.41%    │   │
│  │                                  │   │
│  │  Invested       All-time P&L    │   │
│  │  $24,865.59     +$40,631.90     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  USDC: $15,693.42    Positions: 7      │
│                                         │
│  ─────────────────────────────────      │
│                                         │
│  [Photo] Zara Williams        +$11.4   │
│          Trail Run            +31.99%  │
│                                         │
│  [Photo] Leo Byrne            +$53     │
│          HYROX                +328.27% │
│                                         │
│  [Photo] Claudia Herrero      +$39.3k  │
│          Running              +167.34% │
│                                         │
└─────────────────────────────────────────┘
```

**Key rules:**
- Show full athlete names, not truncated
- Tapping an athlete goes to their profile

### Proof-of-Sweat Feed

```
┌─────────────────────────────────────────┐
│  Proof-of-Sweat Feed                   │
│  ◉ LIVE PROOF-OF-SWEAT                 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [Photo] Claudia Herrero  1 day ago │
│  │         @claudia                    │
│  │                                     │
│  │  Morning Swim                       │
│  │  1km · 18min · RPE 6               │
│  │                                     │
│  │  $92.9k cap · 847 holders  [View →]│
│  │                                     │
│  │  ♡  💬  ↗                          │
│  └─────────────────────────────────┘   │
│                                         │
│  [Next workout card...]                │
│  [Next workout card...]                │
│                                         │
└─────────────────────────────────────────┘
```

**Key rules:**
- Add price/market cap to cards for discovery
- Add holder count as social proof
- Consider "Holding" badge for athletes user already has tokens for
- Keep workout details simple: distance, time, RPE—not every split and heart rate zone

### Market/Trending Page

```
┌─────────────────────────────────────────┐
│  Market                                 │
│                                         │
│  [Trending] [HYROX] [Running] [CrossFit]│
│                                         │
│  TRENDING NOW                           │
│  ┌───────┐ ┌───────┐ ┌───────┐   →    │
│  │ Photo │ │ Photo │ │ Photo │        │
│  │ Name  │ │ Name  │ │ Name  │        │
│  │$10.63 │ │ $4.94 │ │$15.74 │        │
│  │ ↑12%  │ │ ↑8%   │ │ ↑24%  │        │
│  └───────┘ └───────┘ └───────┘        │
│                                         │
│  ALL ATHLETES                          │
│  ┌─────────────────────────────────┐   │
│  │ [Photo] Max Jensen              │   │
│  │         HYROX · $10.63 · ↑12%   │   │
│  │         47 holders              │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ [Photo] Leo Byrne               │   │
│  │         Running · $4.94 · ↑8%   │   │
│  │         23 holders              │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Key rules:**
- Consistent card format throughout
- Remove price charts from list view (show on profile only)
- Don't show $0.00 athletes in "Trending"—filter for actual activity
- Add holder count as social proof
- Smaller, tighter cards to show more athletes

---

## UX Principles

### Visual Hierarchy
1. **One hero metric per screen:** Market Cap dominates profiles
2. **One card should dominate, others recede:** Don't give equal weight to everything
3. **Minimize boxes with equal visual weight:** Creates cognitive overload

### Inner Circle Rules
- Inner Circle is the CORE UTILITY—always visible and desirable
- Locked state must create FOMO (show activity, member count, recency)
- Unlocked state must provide clear entry points (Enter Chat, Send DM)
- NEVER mix settings/administrative functions into Inner Circle

### Trading UX
- Hide complexity by default (slippage, fees, price impact)
- Buy/Sell buttons appear ONCE per screen, not multiple times
- Trade details go in modals, not on main profile

### Workout Cards
- Keep simple: distance, time, RPE, optional map
- Don't show every split, heart rate zone, and metabolic detail
- Visitors want overview, not data dump

### Navigation
- Maximum 4-5 items in bottom nav
- Avoid multiple competing navigation systems on one screen
- Settings belong behind a gear icon, not in main scroll

---

## Information Architecture

### What goes WHERE:

| Element | Location |
|---------|----------|
| Market Cap | Hero card on profile |
| Aura Score | Compact on main, full breakdown in Stats tab |
| Price Chart | Inside Market Cap tap (expanded view) or Stats tab |
| Trades/Holders | Inside Market Cap tap (expanded view) or Stats tab |
| Inner Circle | Prominent card below Market Cap |
| Proof of Sweat | Main feed on profile (default tab) |
| Strava Connection | Settings OR small status near "Add Proof of Sweat" |
| Edit Profile | Inside Settings |
| Notifications | Inside Settings |
| Help/Onboarding | Inside Settings |

### What Inner Circle contains:
- ✅ Group Chat
- ✅ DMs
- ✅ (Future) Pinned exclusive content
- ❌ Strava settings
- ❌ Import/Disconnect buttons
- ❌ Workout management
- ❌ Any administrative functions

---

## The Core Loop

```
Athlete posts Proof of Sweat (imported automatically)
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

## Current Priorities

1. **Simplify "View Other Athlete" profile** - Clear locked/unlocked Inner Circle states, prominent Buy button, hide trading complexity
2. **Clean up Own Profile** - Remove Strava settings from Inner Circle, move to Settings
3. **Improve Market/Trending page** - Consistent card format, remove $0 athletes from trending
4. **Feed improvements** - Add price/market cap to workout cards for discovery

---

## Common Tasks Reference

When asked to:
- **"Simplify a screen"** = Reduce visual clutter, clearer hierarchy, fewer competing elements
- **"Add Inner Circle"** = Implement locked/unlocked states based on token ownership
- **"Improve conversion"** = Make Buy action prominent, show token utility clearly, create FOMO
- **"Clean up navigation"** = Remove redundant nav elements, consolidate into single system
- **"Simplify workout cards"** = Show only distance, time, RPE—remove detailed splits and zones
