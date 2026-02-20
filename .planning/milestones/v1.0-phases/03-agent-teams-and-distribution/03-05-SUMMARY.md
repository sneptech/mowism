---
phase: 03-agent-teams-and-distribution
plan: 05
subsystem: workflows
tags: [agent-teams, workflows, nudge, new-project, resume, execute-phase]

requires:
  - phase: 03-agent-teams-and-distribution
    plan: 01
    provides: "checkAgentTeams(), agent_teams_enabled/agent_teams_nudge_dismissed in init outputs, config nudge-dismiss"
  - phase: 03-agent-teams-and-distribution
    plan: 02
    provides: "mowism/ repo directory with workflow files, install.sh for distribution"
provides:
  - "Agent Teams offer in new-project workflow (spawns mow-team-lead when enabled)"
  - "Prominent nudge in new-project workflow (always shown for new projects)"
  - "Team re-spawn offer in resume-project workflow (from STATE.md team activity)"
  - "Prominent nudge in execute-phase workflow (when not dismissed)"
  - "Lighter tooltip in execute-phase and resume-project (when dismissed)"
  - "Dismiss persistence via config nudge-dismiss"
affects:
  - "03-04 (mow-team-lead agent spawned by these workflows)"
  - "03-06 (validation should verify these workflow integrations)"

tech-stack:
  added: []
  patterns:
    - "Agent Teams offer/nudge at key workflow moments (new-project, resume, execute-phase)"
    - "Prominent nudge vs lighter tooltip based on dismiss state"
    - "New projects always get one nudge regardless of dismiss state"

key-files:
  created: []
  modified:
    - "mowism/workflows/new-project.md"
    - "mowism/workflows/resume-project.md"
    - "mowism/workflows/execute-phase.md"

key-decisions:
  - "New projects always show prominent nudge regardless of dismiss state (per locked decision)"
  - "Resume-project shows lighter tooltip (not full nudge) since new-project already nudged"
  - "Execute-phase shows prominent nudge when not dismissed, lighter tooltip when dismissed"
  - "Agent Teams offer only shown when roadmap has phases with 3+ plans (worth parallelizing)"

patterns-established:
  - "Workflow integration pattern: parse agent_teams fields from init JSON, branch on enabled/dismissed"
  - "Two-tier nudge system: prominent block with enable instructions vs one-line tooltip"

requirements-completed: [TEAM-01, TEAM-02]

duration: 3min
completed: 2026-02-19
---

# Phase 3 Plan 05: Workflow Agent Teams Integration Summary

**Agent Teams offers and nudges integrated into new-project (always-on nudge + team setup), resume-project (team re-spawn), and execute-phase (prominent nudge / tooltip)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T07:41:30Z
- **Completed:** 2026-02-19T07:44:29Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added Step 8.5 to new-project workflow: Agent Teams offer when enabled (spawns mow-team-lead), prominent nudge when not enabled (always shown for new projects per locked decision), "don't remind me" dismiss support
- Added agent_teams_check step to resume-project workflow: team re-spawn offer when enabled + previous team activity detected (spawns fresh mow-team-lead), lighter tooltip when not enabled and not dismissed
- Added agent_teams_nudge step to execute-phase workflow: prominent nudge with plan/wave counts when not dismissed, lighter tooltip when dismissed, support for "don't remind me" dismiss
- Updated all three init JSON parse lines to include agent_teams_enabled and agent_teams_nudge_dismissed
- Installed all three updated copies to ~/.claude/mowism/workflows/ (verified via diff)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Agent Teams offer and nudge to new-project workflow** - `96680be` (feat)
2. **Task 2: Add team re-spawn to resume-project and nudge to execute-phase** - `f2a6159` (feat)

## Files Created/Modified
- `mowism/workflows/new-project.md` - Added Step 8.5 with Agent Teams offer/nudge, updated init JSON parse line
- `mowism/workflows/resume-project.md` - Added agent_teams_check step with team re-spawn and tooltip, updated init JSON parse line
- `mowism/workflows/execute-phase.md` - Added agent_teams_nudge step with prominent nudge and tooltip, updated init JSON parse line

## Decisions Made
- New projects always show prominent nudge regardless of dismiss state (matches locked decision: "always nudge once at start of new project")
- Resume-project gets lighter tooltip (not full nudge block) since the user already saw the nudge at project creation
- Execute-phase shows prominent nudge (with plan/wave counts for context) when not dismissed, lighter tooltip when dismissed
- Agent Teams offer in new-project only triggers when roadmap has phases with 3+ plans (parallelization is only worthwhile with enough work to distribute)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three key workflow touchpoints now reference Agent Teams (ready for Plan 03-04 mow-team-lead)
- Nudge/dismiss system fully wired end-to-end (mow-tools.cjs config nudge-dismiss from Plan 03-01)
- Repo copies updated so install.sh (from Plan 03-02) distributes them correctly to new users

## Self-Check: PASSED

- FOUND: mowism/workflows/new-project.md
- FOUND: mowism/workflows/resume-project.md
- FOUND: mowism/workflows/execute-phase.md
- FOUND: commit 96680be
- FOUND: commit f2a6159
- FOUND: agent_teams_enabled in new-project.md (2 occurrences)
- FOUND: agent_teams_check step in resume-project.md
- FOUND: agent_teams_nudge step in execute-phase.md
- FOUND: nudge-dismiss in all three workflows

---
*Phase: 03-agent-teams-and-distribution*
*Completed: 2026-02-19*
