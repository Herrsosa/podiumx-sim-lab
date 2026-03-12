# Definition of Done

This is the standard by which all features, workflows, and PRs must be measured in Athlyst.

## The Contract

Every task session executed by an AI agent operates under a *Task Contract*. Over the duration of the session, the agent may not consider its work "Complete" until:
1. No placeholder code or generic comments like `// TODO: add implementation` exist in the modified files.
2. The core functionality has been verified locally, via either test suites passing or manual command-line confirmation when possible.
3. The Typescript compiler outputs zero new type definition errors.
4. If it's a UI component, it strictly adheres to `.agent/rules/ui-ux-rules.md`.
5. The specific outcome requested by the user at the beginning of the prompt has been explicitly fulfilled.

If you are an AI executing a Task Contract, you must continue working or looping dynamically. If blocked by the runtime environment or lacking dependencies, you must explain the issue and ask for assistance, rather than outputting a half-complete script and saying "Done".
