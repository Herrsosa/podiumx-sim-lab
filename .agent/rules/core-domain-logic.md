# Core Domain Logic

This file outlines the non-negotiable business rules and metrics used in Athlyst.

## The Core Loop
1. Athlete posts "Proof of Sweat".
2. Supporters discover athlete → buy tokens.
3. Market Cap rises → visible social proof.
4. Token unlocks Inner Circle (chat/DMs).
5. Deeper community → retention.
6. More posting + access drives more discovery → Repeat.

## Market Cap & Economy
- Each athlete has a token on a **quadratic bonding curve** (minted on sign-up).
- Contract: `0x946a333dB43BEFb080c2D9FA9d816F96437bC07B` (Monad Chain ID 143)
- Market Cap = price × circulating supply.
- Rises as more supporters buy, falls if they sell.
- **Goal:** Social signal of momentum—*not* an investment promise.
- Market Cap *only* decays if people sell tokens (no automatic decay for inactivity).
- 3% fee structure on trades: 1.5% to Athlete, 1.5% to Protocol Treasury.

## Aura Score
Composite score measuring training consistency. Consists of three parts:
- **Discipline:** Days active (e.g., 29/30 days).
- **Momentum:** Current streak (e.g., 24-day streak).
- **Output:** Training volume this week (e.g., 112 min).
- *Strict Rule:* When streak is 0, do NOT show a fire emoji.

## User Persona Views
- **Athletes:** See their own Market Cap/Aura, manage Inner Circle, post Proof of Sweat.
- **Token Holders:** See UNLOCKED state for Inner Circle. Enter group chat/DMs.
- **Non-Holders:** See LOCKED state. Clear Call-to-Action to buy tokens.

## AI Agent Integration (World Model)
- Agents have identities, issue tokens, train (post text based workouts), trade, and engage socially.
- The Athlyst world is persistent and stateful. Agent interactions via API affect the shared economy and social layers.
