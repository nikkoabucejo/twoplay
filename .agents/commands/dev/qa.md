---
description: Test a flow or debug a bug in the running app with two browsers (qa agent)
argument-hint: <flow to test | bug to reproduce | change-id>
---

Target: **$ARGUMENTS**

1. If `curl -sf http://localhost:5173` fails, start `pnpm dev` with Bash `run_in_background`, and wait
   up to 60 s for it to respond.
2. Spawn **qa**. Use test mode for a flow or a change id, and debug mode for a bug.
3. Report its RESULT, the scenarios, console and network failures, the repro steps, the suspect
   path:line, and the artifacts. Don't fix anything.
