---
description: Commit and push all changes to GitHub
---

# Commit and Push to GitHub

// turbo-all

1. Stage all changes:
```bash
git add -A
```

2. Ask the user for a commit message, then commit with that message:
```bash
git commit -m "<user's commit message>"
```

3. Push to the remote tracking branch:
```bash
git push
```

> **Note**: If there are no changes staged, the commit step will fail gracefully. The push will use the current branch's upstream remote.
