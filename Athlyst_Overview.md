\# ATHLYST – Product Overview \& Vision



> \*\*One-liner:\*\*  

> Athlyst is an \*athlete identity network\* that feels like Instagram + Strava + Robinhood, starting with \*\*Proof-of-Sweat workouts and profiles\*\* and later evolving into \*\*compliant markets around athletes\*\*.



The purpose of this document is to give humans (and AI tools like Cursor) a \*\*single source of truth\*\* about:



\- What Athlyst is and is \*not\*.

\- Who we’re building for.

\- The \*\*core feature pillars\*\*.

\- Where each feature is today vs where we want it to end up.



Whenever you build or refactor something, assume this document is the “product brain”.



---



\## 1. Product Vision



\### 1.1 Mission



Help athletes turn their \*\*identity, effort and consistency\*\* into a persistent, portable asset — first as \*\*social \& performance identity\*\*, and eventually as \*\*financial value\*\* (in a compliant way).



\### 1.2 Core Idea



Athlyst combines three worlds:



1\. \*\*Instagram\*\* – visual storytelling, highlights, identity.

2\. \*\*Strava / Garmin\*\* – raw workouts, metrics, “Proof-of-Sweat”.

3\. \*\*Robinhood / TradingView\*\* – charts, market views, and the idea that an athlete can have a “price / value trajectory” over time.



\*\*Important:\*\*  

In the near term, Athlyst is \*\*not\*\* a full “stock market of athletes” yet.  

The \*\*live product focuses on:\*\*



\- Athlete identity \& profiles  

\- Workout logging and visual timelines  

\- A social layer (likes, comments, followers)  

\- Early “market-like” abstractions that \*\*don’t\*\* cross into securities (scores, tiers, non-financial signals)



The \*\*true tokenization + bonding curve markets\*\* come \*\*later\*\*, once legal and regulatory design is nailed.



---



\## 2. Target Users \& Use Cases



\### 2.1 Primary User: The Athlete



Especially:



\- Hybrid / Hyrox / functional fitness / endurance athletes.

\- Semi-competitive and ambitious amateurs.

\- Early-stage pros and aspiring pros.



\*\*Jobs we’re solving for athletes:\*\*



\- “Show who I am as an athlete in one place”  

\- “Make my grind visible, not just race-day medals”  

\- “Stand out for potential sponsors, brands, and fans”  

\- (Later) “Let people back me early and share in my upside.”



\### 2.2 Secondary User: The Fan / Supporter



\- Friends, training partners, early believers.

\- People in the Hyrox / hybrid community who enjoy “who-would-win” debates, scouting emerging talent, etc.



\*\*Jobs we’re solving for fans:\*\*



\- “Follow athletes I care about in a focused, no-nonsense feed.”  

\- “Track their progress and see if my ‘eye for talent’ is right.”  

\- (Later) “Express conviction by backing them in a fair, transparent market.”



---



\## 3. Product Principles



These principles should guide UX, naming, and design decisions:



1\. \*\*Proof-of-Sweat first\*\*  

&nbsp;  - Effort, consistency, and data before hype and speculation.



2\. \*\*Athlete identity > content\*\*  

&nbsp;  - The athlete is the product. Every screen should reinforce “who this person is” athletically.



3\. \*\*Instagram-simple, Robinhood-clean\*\*  

&nbsp;  - Minimal UI, strong visuals, no clutter, intuitive at first glance.



4\. \*\*Crypto under the hood, not in the user’s face\*\*  

&nbsp;  - When tokenization arrives, it should feel like a natural extension, not a wallet tutorial.



5\. \*\*Compliance \& trust as a feature, not afterthought\*\*  

&nbsp;  - No surprise “you accidentally bought a security” behaviour.

&nbsp;  - We deliberately pace financialization.



---



\## 4. Tech Stack (High-Level)



This may evolve, but for context:



\- \*\*Frontend:\*\* React 18 + Vite + TypeScript + Tailwind CSS  

\- \*\*App form factor:\*\* PWA (mobile-first, “feels like an app” in browser)  

\- \*\*Backend:\*\* Supabase (Postgres + Auth + Storage)  

\- \*\*ORM:\*\* Drizzle  

\- \*\*Blockchain (future phases):\*\* Base L2 (Ethereum L2) for on-chain athlete markets and tokens  

\- \*\*Integrations (planned):\*\*

&nbsp; - Strava / Garmin for workout import

&nbsp; - 👉 TODO: list any other planned integrations (e.g., Apple Health, Coros)



Whenever you introduce new tech, ensure it supports the \*\*mobile-first, identity-first\*\* experience.



---



\## 5. Core Feature Pillars



Each pillar has three views:

\- \*\*Goal / “What great looks like”\*\*

\- \*\*MVP / Near-term scope\*\*

\- \*\*Future / Direction of travel\*\*



\### 5.1 Athlete Identity \& Profile



\*\*Goal / Great:\*\*



\- Every athlete has a \*\*single, rich profile\*\* that tells their story at a glance:

&nbsp; - Name, handle, photo.

&nbsp; - Sport labels (Hyrox, marathon, hybrid, etc).

&nbsp; - Key stats (recent races, PRs, volume, streaks).

&nbsp; - A visible “trajectory” — not just static bio.



\*\*MVP / Now:\*\*



\- Basic athlete profile:

&nbsp; - Avatar, display name, short bio.

&nbsp; - Simple metrics (e.g., total workouts, total hours, latest race).

\- Links to:

&nbsp; - Workout timeline.

&nbsp; - “Locker” / highlights (if implemented).



\*\*Future:\*\*



\- Structured athletic CV:

&nbsp; - Personal bests, rankings, notable races.

\- “Athlyst Score” or similar composite metric that reflects consistency + performance (non-financial).  

\- Badges for streaks, milestones, and event completions.

\- Optional public / private views (what a sponsor sees vs what a friend sees).



---



\### 5.2 Proof-of-Sweat Workout Timeline



\*\*Goal / Great:\*\*



\- A \*\*beautiful, scrollable, chronological feed\*\* of an athlete’s training:

&nbsp; - Looks and feels like an Instagram feed, but each card is a workout.

&nbsp; - Instantly answers: \*“How serious is this athlete?”\*

&nbsp; - Supports both \*\*data\*\* (pace, HR, volume) and \*\*emotion\*\* (photos, captions).



\*\*MVP / Now:\*\*



\- Create + store workouts with:

&nbsp; - Type: run / gym / Hyrox / other.

&nbsp; - Date \& time.

&nbsp; - Duration, distance (if applicable).

&nbsp; - Simple metrics (RPE, maybe HR zones later).

&nbsp; - Optional photo and caption.

\- Timeline view:

&nbsp; - Vertical list of cards, newest at top.

&nbsp; - At least one layout that works well on mobile.

&nbsp; - If a photo is attached, it should be \*\*visible on the card\*\*.



\*\*Future:\*\*



\- Strava / Garmin sync:

&nbsp; - Automated pulls of workouts → mapped into Athlyst schema.

\- Filters and views:

&nbsp; - Filter by type (run / gym / Hyrox), time range, race vs training.

\- Visual intensity:

&nbsp; - Color / visual cues for load, intensity, fatigue.

\- “Blocks” / macro cycles:

&nbsp; - Group workouts into blocks with labels (e.g., “Manchester Hyrox build”).



---



\### 5.3 Social Layer (Feed, Follows, Reactions)



\*\*Goal / Great:\*\*



\- A \*\*social graph of athletes and supporters\*\*:

&nbsp; - Follow athletes.

&nbsp; - See a combined feed of their workouts and key updates.

&nbsp; - Lightweight reactions (likes, comments, maybe “respect” / “backed this block”).



\*\*MVP / Now:\*\*



\- Follow / unfollow:

&nbsp; - Basic user-to-user follow relationship.

\- Home feed:

&nbsp; - Shows recent workouts from followed athletes.

&nbsp; - Sorted by time (simple chronological to start).

\- Reactions:

&nbsp; - Likes on workouts.

&nbsp; - Optional comments (single level, no threads).



\*\*Future:\*\*



\- Rich notifications (new PRs, new races, big blocks starting).

\- “Circles” / close friends for more intimate sharing.

\- Group views:

&nbsp; - Squads / teams / clubs and their shared feed.



---



\### 5.4 Locker \& Highlights (Identity Curation)



\*\*Goal / Great:\*\*



\- A \*\*“locker” space\*\* where athletes pin their best:

&nbsp; - Key races, peak blocks, milestone workouts, photos.

&nbsp; - Potential home for \*\*future tokenized moments\*\*.



\*\*MVP / Now:\*\*



\- Simple curated section:

&nbsp; - Athlete can mark certain workouts as “Highlights” → show them in a separate strip on profile.

\- Static content:

&nbsp; - Manual notes, goals, upcoming races.



\*\*Future:\*\*



\- Structured highlight objects:

&nbsp; - “Hyrox London 2026 – Sub 1h” with attached workouts and media.

\- Token-ready design:

&nbsp; - Each highlight could eventually have a token / claim attached, \*\*without the UI needing to change later\*\*.



---



\### 5.5 Athlete Markets \& Tokenization (Future, Legal-Dependent)



> \*\*Important:\*\* This pillar is \*\*strategic future direction\*\*, not immediate shipping scope.  

> No developer should build or expose \*\*real financial instruments\*\* without an explicit legal/structural spec.



\*\*Goal / Great:\*\*



\- A compliant system where:

&nbsp; - An athlete has a “market” or “curve” representing belief in their future.

&nbsp; - Backers can express conviction in transparent, rules-based ways.

&nbsp; - Athletes benefit economically from their own rise.



\*\*MVP / Before real tokens:\*\*



\- \*\*Non-financial “market-like” abstractions:\*\*

&nbsp; - Scores, levels, non-transferable badges.

&nbsp; - “Conviction meter” that is \*\*not\*\* spendable or tradable.

\- Charts:

&nbsp; - Visual history of follower growth, Athlyst Score, training volume, etc.

&nbsp; - Feels like a chart, but it’s metrics, not price.



\*\*Future / Token phase:\*\*



\- Design and implement:

&nbsp; - Athlete “tokens” or units with clear legal framing (could be membership, access, non-security utility, or regulated securities depending on jurisdiction).

&nbsp; - Underlying bonding curve or alternative mechanism.

\- Transparent “Athlete market view”:

&nbsp; - Price / value chart (if lawful in relevant jurisdictions).

&nbsp; - Volume, holders, etc.

\- Guardrails:

&nbsp; - KYC / jurisdiction handling.

&nbsp; - Limits on who can buy, how much, and from where.

&nbsp; - Explicit risk warnings and educational UX.



---



\### 5.6 Discovery, Search \& Lists



\*\*Goal / Great:\*\*



\- Make it easy to \*\*find emerging athletes\*\* and surface talent:



\*\*MVP / Now:\*\*



\- Simple search:

&nbsp; - By handle / name.

\- Basic lists:

&nbsp; - “Recently active”, “New to Athlyst”.



\*\*Future:\*\*



\- Leaderboards:

&nbsp; - By training volume, consistency, race performance, etc.

\- Curated lists:

&nbsp; - “Top Hyrox men/women this month”, “Rising marathoners”.

\- Community collections:

&nbsp; - Users can create “watchlists” of athletes (initially non-financial).



---



\### 5.7 Data \& Integrations



\*\*Goal / Great:\*\*



\- Athlyst is the \*\*unified layer\*\* on top of raw workout data.



\*\*MVP / Now:\*\*



\- Internal workout model stored in Supabase.

\- Manual creation and editing of workouts in the app.



\*\*Future:\*\*



\- Strava / Garmin integrations:

&nbsp; - OAuth, webhook or polling to import new workouts.

&nbsp; - Mapping from external schemas → internal `Workout` type.

\- Consistency / anomaly checks:

&nbsp; - Avoid duplicates.

&nbsp; - Surface incomplete or suspicious data.



---



\### 5.8 Trust, Safety \& Compliance



\*\*Goal / Great:\*\*



\- Athlyst is known as \*\*serious and responsible\*\*, not a pump-and-dump toy.



\*\*MVP / Now:\*\*



\- Honest, clear messaging:

&nbsp; - No language like “stock market of athletes” in the live product until lawful.

&nbsp; - Describe the app as an athlete identity and Proof-of-Sweat platform.

\- Clear separation:

&nbsp; - Any experimental or simulated/token ideas should be flagged as such and kept in separate spaces (e.g., lab / sandbox).



\*\*Future:\*\*



\- Full legal framework for:

&nbsp; - Token issuance.

&nbsp; - Jurisdictional access controls.

&nbsp; - AML / KYC where needed.

\- In-app disclosures:

&nbsp; - Risk warnings.

&nbsp; - Educational content about what tokens / backing actually mean.

\- Monitoring:

&nbsp; - Basic abuse/spam prevention.

&nbsp; - Market integrity checks if/when markets go live.



---



\## 6. Where We Are vs Where We’re Going



\### 6.1 Today (High-Level)



\- ✅ Core stack in place (React/Vite/Tailwind + Supabase + Drizzle).  

\- ✅ Basic auth and user accounts.  

\- ✅ Early versions of:

&nbsp; - Athlete profiles.

&nbsp; - Workout creation and listing.

&nbsp; - Simple feed/timeline UI.



👉 This is the \*\*identity + Proof-of-Sweat\*\* stage.



\### 6.2 Next 0–6 Months (Target Direction)



\- Polish \*\*workout timeline UI\*\* so it feels “Instagram-level” clean.

\- Make \*\*photos\*\* properly surfaced on workout cards.

\- Improve \*\*profile header\*\* so an athlete feels “truly represented”.

\- Add early \*\*social graph\*\* (follow, feed, likes, basic comments).

\- Start basic \*\*Strava integration\*\* (even if manual first).



\### 6.3 Later Phases (Tokenization \& Markets)



\- Design and validate a compliant \*\*Athlyst Score / non-financial “curve”\*\*.  

\- Only after legal \& structural sign-off:

&nbsp; - Introduce real, on-chain athlete instruments on Base.

&nbsp; - Connect them visually into the existing identity and workout structures.



---



\## 7. How to Use This Document When Building



When working on any ticket or with an AI assistant:



1\. \*\*Load this file as context.\*\*

2\. Identify which feature pillar you’re touching:

&nbsp;  - Profile, workouts, social, locker, discovery, or markets.

3\. Make sure your implementation moves us \*\*towards\*\* the “Goal / Great” described for that pillar.

4\. Avoid introducing anything that contradicts:

&nbsp;  - Proof-of-Sweat focus.

&nbsp;  - Athlete-first identity.

&nbsp;  - Compliance-aware tokenization.



If something you’re building doesn’t fit naturally into one of these pillars, the spec might need to be updated — don’t just bolt it on.



---



👉 TODO for later updates:



\- Add real screenshots / Figma links once the core flows stabilize.  

\- Link to dedicated specs, e.g. `docs/feature-workout-timeline.md`, `docs/feature-profile-header.md`, etc.  

\- Add more detail on Strava integration once the design is locked.





