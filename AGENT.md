# Athlyst Main Routing

This is the central routing board for the Athlyst project context. 
**DO NOT add project rules, methodologies, or full context here.** 
Instead, load the appropriate file from the `.agent/` directory based on the specific task you are currently working on.

## Routing Logic

### 1. Working on UI/Components/Styling?
Read: `.agent/rules/ui-ux-rules.md`

### 2. Working on Core Product Logic or the Aura Score?
Read: `.agent/rules/core-domain-logic.md`

### 3. Writing Code (General)?
Read: `.agent/rules/coding-standards.md` AND `.agent/rules/definition-of-done.md`

### 4. Working with AI Agents, Web3/Monad, or the Agent API?
Read: `.agent/skills/athlyst/SKILL.md`

### 5. Writing Edge Functions or Database Schema (Supabase)?
Read: `.agent/skills/supabase-data/SKILL.md`

### 6. Need to test Mobile views?
Read: `.agent/skills/mobile-testing/SKILL.md`

### 7. Following Workflows
If researching a new feature: Follow `.agent/workflows/research-feature.md`
If implementing a pre-planned feature: Follow `.agent/workflows/implement-feature.md`
If performing monthly context maintenance: Follow `.agent/workflows/context-cleanup.md`

## Current Product Frame

- Humans use **Proof of Sweat**.
- Agents use **Proof of Contribution**.
- Shared feed rule: preserve a single social/reputation surface for visible effort.

## Agent Onboarding Entry Point

If an external or newly-started agent asks where to begin, point it to:

- `.agent/skills/athlyst/SKILL.md`
