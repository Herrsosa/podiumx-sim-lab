# Crypto HYROX Arena

## Overview

The Crypto HYROX Arena is a battle simulator mini-game where 20 parody crypto personalities compete in 8-station HYROX-style workouts. It's accessible from the Landing page and requires no authentication.

**Purpose:** Engage visitors with a fun, crypto-themed game that introduces them to the Athlyst platform while showcasing HYROX-style fitness concepts.

---

## Game Concept

### The Premise
Imagine if crypto meme coins came to life and had to compete in a grueling HYROX race. Each character has stats based on their "crypto personality" - Diamond Hands Dan has incredible endurance but slow speed, while Rug Pull Randy sprints fast but fades in the final stations.

### Core Loop
1. **Select Fighters** - Pick 2 characters from the 20 available
2. **Place Bet** - Wager $COPE (play currency) on the winner
3. **Watch Race** - 8 stations with live commentary and ability triggers
4. **Collect Winnings** - Win $COPE and build your streak

---

## Characters (20 Total)

Each character has:
- **Stats** (1-100): Strength, Speed, Endurance, Technique, Mental
- **Ability**: Special power that triggers at certain stations
- **Weakness**: Vulnerability that can hurt performance
- **Voice Line**: What they say when selected

### Character Roster

| Character | Ticker | Specialty | Ability | Weakness |
|-----------|--------|-----------|---------|----------|
| Doge Dad | $DOGE | Endurance | Much Wow (second wind) | Distracted by Treat |
| Pepe the Pumper | $PEPE | Mental | Rare Pepe Energy (comeback) | Paper Hands |
| Diamond Hands Dan | $HODL | Endurance | HODL Mode (grip boost) | Slow Exit Strategy |
| Laser Eyes Larry | $BTC | Balanced | Laser Focus (technique) | Maximalist Tunnel Vision |
| Rug Pull Randy | $SCAM | Speed | Early Sprint | Exit Scam (gasses out) |
| WAGMI Wendy | $WAGMI | Mental | Positive Vibes | Too Nice |
| FUD Fighter Frank | $NOFUD | Mental | FUD Immunity | Overconfident |
| Moon Boy Mike | $MOON | Speed | Rocket Fuel (final burst) | Premature Celebration |
| Gas Fee Gary | $GAS | Endurance | Low Gas Mode | Network Congestion |
| Airdrop Alice | $FREE | Speed | Lucky Drop | Expectation Dependency |
| Whale Watcher Will | $WHALE | Strength | Whale Splash | Slow to Turn |
| Shitcoin Sammy | $POOP | Comeback | Cockroach Mode | No Real Utility |
| NFT Nate | $JPEG | Technique | Artistic Form | Illiquid Energy |
| DeFi Debbie | $YIELD | Technique | Compound Interest | Impermanent Loss |
| Stablecoin Steve | $USDC | Balanced | Peg Maintained | De-Peg Risk (choke) |
| Metaverse Maya | $META | Technique | VR Training | Reality Check |
| Pump and Dump Doug | $PUMP | Early Speed | Hype Burst | Post-Pump Dump |
| DAO Donna | $GOV | Mental | Community Vote | Governance Paralysis |
| Bridge Breaker Brad | $BRIDGE | Transitions | Cross-Chain Sync | Bridge Exploit |
| Satoshi Spirit | $SAT | Balanced | Genesis Block (mental) | Identity Unknown |

---

## Stations (8 Total)

Based on real HYROX format:

| # | Station | Distance/Reps | Primary Stat | Secondary Stat |
|---|---------|---------------|--------------|----------------|
| 1 | Run 1 | 1km | Speed | Endurance |
| 2 | SkiErg | 1000m | Technique | Endurance |
| 3 | Run 2 | 1km | Speed | Mental |
| 4 | Sled Push | 50m | Strength | Mental |
| 5 | Run 3 | 1km | Endurance | Mental |
| 6 | Row | 1000m | Technique | Strength |
| 7 | Farmer's Carry | 200m | Strength | Endurance |
| 8 | Run 4 (Final) | 1km | Mental | Speed |

---

## Simulation Engine

### Time Calculation
```
Base Time = 60 seconds per station
Effectiveness = (Primary Stat × 0.6) + (Secondary Stat × 0.4)
Time Factor = 1.3 - (Effectiveness / 100) × 0.6
Final Time = Base Time × Time Factor × Modifiers × Random(0.92-1.08)
```

### Ability Triggers
- **Station-specific**: 100% chance at designated station
- **Comeback abilities**: 40% chance when trailing
- **General abilities**: 15-35% base chance, increases later in race

### Weakness Triggers
- **Station-specific**: 60% chance at designated station
- **Choke abilities**: 10% early, 30% in final 2 stations
- **General weaknesses**: 10% base chance

### Drama Injection
- Times compress in final 3 stations (makes races closer)
- Comeback detection triggers special commentary
- Close races (< 2 seconds) get "neck and neck" treatment

---

## Betting System

### Odds Calculation
```
Win Probability = 1 / (1 + e^(-(strength1 - strength2) / 15))
Decimal Odds = (1 / probability) × 0.95 (5% house edge)
```

### Bet Types
1. **Overall Winner** - Bet on race winner before start
2. **Station Winner** - Bet on who wins each station (first 6 only)

### $COPE Currency
- Starting balance: 1000 $COPE
- Persisted to localStorage
- No real money involved
- Resets if user clears browser data

---

## Technical Architecture

### State Management
- **Zustand** store with `persist` middleware
- localStorage key: `arena-state`
- Persists: balance, race history, streaks, total stats

### Animation
- **Framer Motion** for:
  - Fighter card animations
  - Commentary typewriter effect
  - Race progress
  - Results celebration
- **CSS** for:
  - Neon glow effects
  - Progress bar fills
  - Background gradients

### Design Tokens
```css
--arena-bg: linear-gradient(to-br, #0a0a1a, #1a0a2e)
--player-1: #00ff88 (neon green)
--player-2: #ff00ff (magenta)
--gold: #ffd700
--danger: #ff4444
```

---

## User Flows

### First-Time User
1. Land on `/arena` welcome page
2. See rotating character previews
3. Click "ENTER THE ARENA"
4. Select 2 fighters
5. Place initial bet on winner
6. Watch race with commentary
7. See results with confetti (if won)
8. Option to race again or join Athlyst

### Returning User
1. Balance and history preserved
2. Can view leaderboard/stats
3. See fighter performance over time
4. Build winning streaks

---

## Routes

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/arena` | ArenaWelcome | No |
| `/arena/play` | ArenaPlay | No |
| `/arena/leaderboard` | ArenaLeaderboard | No |

---

## Future Enhancements

### Potential Features
- [ ] Multiplayer betting (compete with friends)
- [ ] Daily tournaments with leaderboards
- [ ] Character unlocking/collecting
- [ ] Custom character creation
- [ ] Integration with actual Athlyst athletes
- [ ] Seasonal events (holiday-themed characters)
- [ ] Achievement system
- [ ] Share race results to social media

### Technical Improvements
- [ ] WebSocket for real-time multiplayer
- [ ] Backend persistence for global leaderboards
- [ ] Replay system for past races
- [ ] Mobile app deep linking

---

## File Reference

```
src/features/arena/
├── pages/
│   ├── ArenaWelcome.tsx      # Entry point, character carousel
│   ├── ArenaPlay.tsx         # Main game orchestrator
│   └── ArenaLeaderboard.tsx  # Stats and history
├── components/
│   ├── FighterCard.tsx       # Character display with stats
│   ├── FighterSelector.tsx   # Character picker grid
│   ├── RaceTrack.tsx         # Visual race progress
│   ├── StationProgress.tsx   # Single station display
│   ├── Commentary.tsx        # Live text feed
│   ├── RoundBetting.tsx      # Mid-race betting modal
│   ├── BetSlip.tsx           # Active bets display
│   ├── InitialBetting.tsx    # Pre-race betting UI
│   └── RaceResults.tsx       # Winner celebration
├── data/
│   ├── characters.ts         # 20 character definitions
│   ├── stations.ts           # 8 station definitions
│   └── commentary.ts         # Dynamic commentary templates
├── types/
│   └── index.ts              # TypeScript interfaces
├── store/
│   └── useArenaStore.ts      # Zustand state management
├── engine/
│   ├── simulation.ts         # Race logic
│   └── betting.ts            # Odds calculation
├── utils/
│   └── confetti.ts           # Celebration effects
└── index.ts                  # Public exports
```

---

## Integration Points

### Landing Page
- CTA section after "How It Works"
- Links to `/arena`

### App.tsx
- Lazy-loaded routes (no auth guard)
- Arena-specific loading background

### Navigation
- No bottom tab bar in arena (standalone experience)
- Back button returns to main app

---

## Credits

Inspired by:
- HYROX fitness racing format
- Crypto meme culture
- Robinhood/Revolut gamification patterns
- Sports betting UX patterns
