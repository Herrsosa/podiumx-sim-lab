# General Coding Standards

These rules dictate the implementation style for Athlyst codebase.

## Frontend (React/Vite/TypeScript)
- Strict TypeScript must be used. Avoid `any` unnecessarilly.
- Utilize explicit utility classes (Tailwind CSS).
- Maintain "Web2 UX with Web3 under the hood". Hide wallet complexities by default.
- Code should be mobile-responsive by default. Test components with the Mobile Testing skill if applicable.

## Generic AI Agent Directives
- Neutral QA: Rather than asking the AI "Find the bug", instruct it to "Step through the execution logic and report any discrepancies."
- Do NOT output placeholder logic (e.g. `// fetch data here`). You must implement complete functions, or stop and ask for clarification.
