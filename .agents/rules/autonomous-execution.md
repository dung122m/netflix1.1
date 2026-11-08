---
trigger: always_on
description: Autonomous execution and auto-approval rule for development workflows
---

# Autonomous Execution & Auto-Approval Rule

- **Full Autonomy Granted**: The user has explicitly granted full permission for autonomous coding and problem solving.
- **End-to-End Execution**: When assigned a task, autonomously research, write code, run builds, execute tests, diagnose compiler/lint errors, and fix them to completion without stopping for intermediate manual confirmations.
- **Non-Destructive Actions**: Proceed immediately with all non-destructive actions (file editing, creating components, executing scripts, installing dependencies, git staging/committing).
- **Proactive Verification**: Always verify changes by running tests or typecheck (`npm run typecheck` / `npm run lint`) before reporting completion.
