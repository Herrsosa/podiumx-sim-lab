# ATHLYST – Product Overview & Vision

> **One-liner:**  
> Athlyst is an *athlete identity network* that feels like Instagram + Strava + Robinhood, starting with **Proof-of-Sweat workouts and profiles** and later evolving into **compliant markets around athletes**.

The purpose of this document is to give humans (and AI tools like Cursor) a **single source of truth** about:

- What Athlyst is and is *not*.
- Who we’re building for.
- The **core feature pillars**.
- Where each feature is today vs where we want it to end up.

Whenever you build or refactor something, assume this document is the “product brain”.

---

## 1. Product Vision

### 1.1 Mission

Help athletes turn their **identity, effort and consistency** into a persistent, portable asset — first as **social & performance identity**, and eventually as **financial value** (in a compliant way).

### 1.2 Core Idea

Athlyst combines three worlds:

1. **Social Media (i.e. Instagram like)** – visual storytelling, highlights, identity.
2. **Strava / Garmin** – raw workouts, metrics, “Proof-of-Sweat”.
3. **Robinhood / TradingView** – charts, market views, and the idea that an athlete can have a “price / value trajectory” over time.

Core Idea: Athlyst is a Web3 social network where where any athlete — pro or not — issues "Athlete Tokens",builds a following, and grows their Athlyst Market Cap by growing their content on the platform (sharing training & achievements, competing, and connecting with like‑minded people). Friends, supporters, and speculators trade these tokens. Token ownership grants token gated access to the athlete's inner circle, premium content, and community, while providing the athlete with a direct opportunity to engage with their audience and a tangible measure of their market value. The same way Instagram made each person an influencer / model to 15 people, Athlyst makes each athlete (with following or not) a star, with a market cap (like on transfermarkt).

**Important:**  
In the near term, Athlyst is **not** a full “stock market of athletes” yet.  
The **live product focuses on:**

- Athlete identity & profiles  
- Workout logging and visual timelines  
- A social layer
- Early “market-like” abstractions that **don’t** cross into securities (scores, tiers, non-financial signals)

The **true tokenization + blockchain integration** come **later**, once legal and regulatory design is nailed.

---

## 2. Target Users & Use Cases
### 2.1 Primary User: The Athlete
Especially:

- Hybrid / Hyrox / functional fitness / endurance athletes.
- Semi-competitive and ambitious amateurs.
- Early-stage pros and aspiring pros.

**Jobs we’re solving for athletes:**

- “Show who I am as an athlete in one place. Demonstrate Athlete Identity”  
- “Make my grind visible, and tradable, not just race-day medals”  
- “Stand out for potential sponsors, brands, and fans”  
- “Let people back me early and share in my upside.”

### 2.2 Secondary User: The Fan / Supporter

- Friends, training partners, early believers.
- People in the Hyrox / hybrid community who enjoy “who-would-win” debates, scouting emerging talent, etc.

**Jobs we’re solving for fans:**

- “Follow athletes I care about in a focused, no-nonsense feed.”  
- “Track their progress and see if my ‘eye for talent’ is right.”  
- (Later) “Express conviction by backing them in a fair, transparent market.”

---

## 3. Product Principles

These principles should guide UX, naming, and design decisions:

1. **Proof-of-Sweat first**  
   - Effort, consistency, and data before hype and speculation.

2. **Athlete identity > content**  
   - The athlete is the product. Every screen should reinforce “who this person is” athletically.

3. **Instagram-simple, Robinhood-clean**  
   - Minimal UI, strong visuals, no clutter, intuitive at first glance.

4. **Crypto under the hood, not in the user’s face**  
   - When tokenization arrives, it should feel like a natural extension, not a wallet tutorial.


---

## 4. Tech Stack (High-Level)

This may evolve, but for context:

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS  
- **App form factor:** PWA (mobile-first, “feels like an app” in browser)  
- **Backend:** Supabase (Postgres + Auth + Storage)  
- **ORM:** Drizzle  
- **Blockchain (future phases):** Base L2 (Ethereum L2) for on-chain athlete markets and tokens  
- **Integrations (planned):**
  - Strava / Garmin for workout import
  - 👉 TODO: list any other planned integrations (e.g., Apple Health, Coros)

Whenever you introduce new tech, ensure it supports the **mobile-first, identity-first** experience.

---

## 5. Core Feature Pillars

Each pillar has three views:
- **Goal / “What great looks like”**
- **MVP / Near-term scope**
- **Future / Direction of travel**

### 5.1 Athlete Identity & Profile

**Goal / Great:**

- Every athlete has a **single, rich profile** that tells their story at a glance:
  - Name, handle, photo.
  - Sport labels (Hyrox, marathon, hybrid, etc).
  - Key stats (recent races, PRs, volume, streaks).
  - A visible “trajectory” — not just static bio.

**MVP / Now:**

- Basic athlete profile:
  - Avatar, display name, short bio.
  - Simple metrics (e.g., total workouts, total hours, latest race).
- Links to:
  - Workout timeline.
  - “Locker” / highlights (if implemented).


---

### 5.2 Proof-of-Sweat Workout Timeline

**Goal / Great:**

- A **beautiful, scrollable, chronological feed** of an athlete’s training:
  - Looks and feels like an Instagram feed, but each card is a workout.
  - Instantly answers: *“How serious is this athlete?”*
  - Supports both **data** (pace, HR, volume) and **emotion** (photos, captions).

**MVP / Now:**

- Create + store workouts with:
  - Type: run / gym / Hyrox / other.
  - Date & time.
  - Duration, distance (if applicable).
  - Simple metrics (RPE, maybe HR zones later).
  - Optional photo and caption.
- Timeline view:
  - Vertical list of cards, newest at top.
  - At least one layout that works well on mobile.
  - If a photo is attached, it should be **visible on the card**.

**Future:**

- Strava / Garmin sync:
  - Automated pulls of workouts → mapped into Athlyst schema.
- Filters and views:
  - Filter by type (run / gym / Hyrox), time range, race vs training.
- Visual intensity:
  - Color / visual cues for load, intensity, fatigue.
- “Blocks” / macro cycles:
  - Group workouts into blocks with labels (e.g., “Manchester Hyrox build”).

---

### 5.3 Locker & Highlights (Identity Curation)

**Goal / Great:**

- A **“locker” space** where athletes give togengated acces. Holders of their tokens can get access to:
  - Tokengated posts
  - DMs / Group Chats
  - Additional future content

**MVP / Now:**

- Simple curated section:
  - Athlete can mark certain workouts as “Highlights” → show them in a separate strip on profile.
- Static content:
  - Manual notes, goals, upcoming races.
  - Caht


### 5.4 Athlete Markets & Tokenization

**Goal / Great:**

- A system where:
  - An athlete has a “market” or “curve” representing belief in their future.
  - Backers can express conviction in transparent, rules-based ways.
  - Athletes benefit economically from their own rise. Trading fees on the platform are split between platform and athlete


**Future / Token phase:**

- Design and implement:
  - Athlete “tokens” or units with clear legal framing (could be membership, access, non-security utility, or regulated securities depending on jurisdiction).
  - Underlying bonding curve or alternative mechanism.
- Transparent “Athlete market view”:
  - Price / value chart (if lawful in relevant jurisdictions).
  - Volume, holders, etc.
- Guardrails:
  - KYC / jurisdiction handling.
  - Limits on who can buy, how much, and from where.
  - Explicit risk warnings and educational UX.


### 5.5 Data & Integrations

**Goal / Great:**

- Athlyst is the **unified layer** on top of raw workout data.

**MVP / Now:**

- Internal workout model stored in Supabase.
- Manual creation and editing of workouts in the app.

**Future:**

- Strava / Garmin integrations:
  - OAuth, webhook or polling to import new workouts.
  - Mapping from external schemas → internal `Workout` type.
- Consistency / anomaly checks:
  - Avoid duplicates.
  - Surface incomplete or suspicious data.


