---
description: Show active OpenSpec changes and where each one is in the /dev:work flow
---

Show where in-flight work stands. Read-only.

1. Run `openspec list --json` and `git branch --show-current`, then `git status --short`.
2. For each active change, read `openspec/changes/<id>/tasks.md` and the tail of `worklog.md` (if
   present). Run `openspec status --change <id> --json`.
3. Print a compact table: change id · tasks done/total · last worklog phase · next step (the phase
   `/dev:work <id>` would resume at).
4. If the working tree has changes no active change explains, say so in one line.
