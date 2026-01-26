---
name: commit-push
description: Stage all changes, commit with a message, and push to main branch
---

# Commit and Push to Main

Follow these steps to commit and push changes:

1. **Check current status**
   - Run `git status` to see all changed files
   - Run `git diff --staged` and `git diff` to understand changes
   - Run `git log -3 --oneline` to see recent commit style

2. **Stage changes**
   - Stage specific files (preferred) or use `git add -A` for all changes
   - Never stage sensitive files (.env, credentials, etc.)

3. **Create commit**
   - Write a concise commit message (1-2 sentences) focusing on "why" not "what"
   - Follow conventional commit style if the repo uses it
   - End with: `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`
   - Use HEREDOC format for the commit message

4. **Push to main**
   - Ensure you're on the main branch: `git checkout main`
   - Push: `git push origin main`

5. **Verify**
   - Run `git status` to confirm clean working tree
   - Confirm push succeeded

**Important:**
- If not on main branch, ask user before switching
- If there are merge conflicts, stop and explain
- Never force push without explicit user permission
