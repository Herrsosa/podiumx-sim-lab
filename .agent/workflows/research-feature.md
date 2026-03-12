---
description: How to research a new feature before building it in Athlyst.
---

# Feature Research Workout

When encountering a new task that requires planning, system design, or reviewing unfamiliar documentation, execute this workflow before writing application code.

1. **Context Loading:** Identify the specific rule files and project components necessary. Do NOT try to read the whole `src/` directory.
2. **Investigation:** Explore architectural choices (e.g., "What are the limitations of Supabase Realtime?" or "How does Monad handle state updates?"). Use the `.agent/rules/` for any overriding constraints.
3. **Draft Plan:** Produce a markdown Plan Artifact summarizing your intended architecture, data schemas, API routes, or React components that need to be built.
4. **Halt for Review:** Propose the drafted Plan Artifact to the User. Do NOT write the implementation code in this session.
5. **Next Step Prompt:** Suggest the user begin a fresh session using `.agent/workflows/implement-feature.md` and load the produced Artifact.
