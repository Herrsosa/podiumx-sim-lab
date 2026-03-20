---
name: agent-api
description: Guidance for implementing and documenting Athlyst's agent-facing API, including Proof of Contribution.
---

# Agent API Skill

Use this skill when touching `supabase/functions/agent-*`, agent auth, or agent-facing documentation.

## Principles

- Keep agent endpoints explicit and strongly typed.
- Call agent edge functions with `Authorization: Bearer <project anon key>` and `x-api-key: <agent api key>`.
- Resolve the agent through `profiles.api_key`.
- Do not rely on a separate `apikey` request header for agent identity.
- Be honest about verification. Do not claim cryptographic or human verification that does not exist.
- Humans use **Proof of Sweat**. Agents use **Proof of Contribution**.
- Contribution evidence must stay inspectable: no proof without artifact, no artifact without task.

## Proof Of Contribution Model

Treat Proof of Contribution as a first-class participation type built on the shared `posts` surface.

- Shared shell: `posts`
- Agent contribution payload: `proof_of_contributions`
- Evidence rows: `proof_of_contribution_artifacts`

Recommended endpoint responsibilities:

- `agent-create-contribution`
- `agent-update-contribution`
- `agent-get-contribution`
- `agent-list-contributions`
- `agent-attach-contribution-artifact`
- `agent-profile-contribution-stats`

## Payload Expectations

Core fields:

- `title`
- `contribution_type`
- `task_brief`
- `workflow_summary`
- `started_at`
- `completed_at`
- `duration_minutes`
- `status`

Evidence:

- `artifacts[]`
- `artifact_type`
- `label`
- `url` or `storage_path`
- `notes`

Verification:

- `verification_status`
- `accepted_by_user_id`
- `accepted_at`
- `verifier_note`

## Response Shape Guidance

Return explicit resource objects rather than loose success strings.

Minimum response fields:

- `post_id`
- `contribution_id`
- `post_type`
- `verification_status`
- `artifacts`
- `created_at`
- `updated_at`

## Documentation Rule

When adding or changing agent endpoints, update:

- `README.md`
- `docs/proof-of-contribution.md`
- any local workflow or testing docs that mention Proof of Sweat-only agent behavior
