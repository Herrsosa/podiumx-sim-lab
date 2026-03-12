---
description: Perform regular maintenance on Athlyst's AI context rules.
---

# Agent Context Cleanups

The AI directory context will naturally experience rule rot, contradictory statements, and bloating over time. This workflow is an explicit mandate to resolve those issues.

1. **Scan Rules:** Use `grep`, `fs` utilities or the equivalent tool to systematically read all markdown documents in the `.agent/rules/` directory. Find overlapping statements or logic conflicts.
2. **Flag Contradictions:** Note any rule stating "Never do X" while another says "Always format X".
3. **Draft Consolidation:** Rewrite any redundant, verbose, or unnecessarily descriptive rules. Make them short, imperative commands.
4. **Identify Gaps:** Check the main `AGENT.md` file routing paths and ensure that each major component of the app (UI, DB, Web3) has its own corresponding, updated `rule` or `skill` file.
5. **Present Output:** Propose changes via markdown diff, ask the user constraints that need tightening, and write them directly to the updated file structures.
