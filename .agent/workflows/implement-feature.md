---
description: How to implement a pre-planned feature robustly in Athlyst.
---

# Feature Implementation Workflow

When opening a fresh session to build a pre-defined plan or execute a clear requirement, operate under these strict constraints.

1. **Load Context:** Read the Plan Artifact created by the research workflow. Find the specific `.agent/rules/` documents related to your task (e.g. `core-domain-logic.md` or `ui-ux-rules.md`). Ignore rules that do not concern the current scope.
2. **Setup Contract:** Clearly state the definition of done bounding this task to the user before writing code. (e.g. "I will implement the `useWallet` hook. This session is complete when the component renders without TS errors or warnings and handles the `Disconnected` state explicitly.")
3. **Implement Feature:** Write the code directly, strictly adhering to `.agent/rules/coding-standards.md`.
4. **Validation:** Manually run checks (`npm run lint`, `npm run build`, testing frameworks) to verify the new feature logic natively. If errors occur, "step through" the log traces and iterate.
5. **Completion:** Announce that the initial task contract has been satisfied and ask if the user intends to push.
