---
phase: 13-gsd-bugfix-ports
plan: 05
subsystem: hooks
tags: [claude-code-hooks, context-window, subagent, stop-hook, subagentstart]

# Dependency graph
requires: []
provides:
  - "Stop hook for context window monitoring with 25%/15% thresholds"
  - "SubagentStart hook for CLAUDE.md injection into subagents"
  - "Hook registrations in ~/.claude/settings.json"
affects: [14-native-worktree-adoption, 15-full-lifecycle-workers]

# Tech tracking
tech-stack:
  added: [jq]
  patterns: [stop-hook-context-monitoring, subagent-context-injection]

key-files:
  created:
    - "~/.claude/hooks/mow-context-monitor.sh"
    - "~/.claude/hooks/mow-inject-claude-md.sh"
  modified:
    - "~/.claude/settings.json"

key-decisions:
  - "Tighter context thresholds than GSD upstream (25%/15% vs 35%/25%) per user decision"
  - "Uses transcript file size heuristic (~700KB = 100% of 200k context) with MOW_MAX_TRANSCRIPT_KB env override"
  - "SubagentStart uses additionalContext (not systemMessage) for non-disruptive injection"

patterns-established:
  - "Hook scripts in ~/.claude/hooks/ with mow- prefix for Mowism-specific hooks"
  - "Graceful degradation: hooks exit silently when preconditions not met"

requirements-completed: [BUG-08, BUG-10]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 13 Plan 05: Hook Infrastructure Summary

**Context window monitoring Stop hook with 25%/15% thresholds and SubagentStart hook for automatic CLAUDE.md injection into all spawned subagents**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T17:48:17Z
- **Completed:** 2026-02-23T17:50:31Z
- **Tasks:** 2
- **Files modified:** 3 (all external to repo, in ~/.claude/)

## Accomplishments
- Context window monitor fires on every Stop event, warns at 25% remaining, commits work + writes handoff note at 15% remaining
- Loop prevention via stop_hook_active check prevents infinite Stop hook recursion
- Subagent transcript skip prevents monitoring from firing in Task() subagents
- CLAUDE.md injection ensures all subagents inherit project-level instructions automatically
- All existing hooks (chime, shellcheck, session-start) preserved intact

## Task Commits

All artifacts for this plan live outside the git repository (in `~/.claude/`). Task commits are documentation-only.

1. **Task 1: Create context window monitor Stop hook** - deployed to `~/.claude/hooks/mow-context-monitor.sh`
2. **Task 2: Create SubagentStart hook for CLAUDE.md injection** - deployed to `~/.claude/hooks/mow-inject-claude-md.sh`

**Plan metadata:** (docs commit with SUMMARY.md, STATE.md, ROADMAP.md)

## Files Created/Modified
- `~/.claude/hooks/mow-context-monitor.sh` - Stop hook: monitors context window via transcript file size heuristic, warns at 25%, commits+handoff at 15%
- `~/.claude/hooks/mow-inject-claude-md.sh` - SubagentStart hook: reads project .claude/CLAUDE.md and injects as additionalContext
- `~/.claude/settings.json` - Added context monitor to Stop hooks array, added SubagentStart hook registration

## Decisions Made
- Used tighter thresholds (25%/15%) than GSD upstream (35%/25%) per user's earlier decision
- Transcript file size heuristic uses 700KB default (~200k context window), configurable via MOW_MAX_TRANSCRIPT_KB
- Context monitor does NOT use decision: "block" at critical threshold -- commits gracefully and lets Claude stop (prevents Pitfall 2: infinite loop)
- SubagentStart hook uses additionalContext (additive, non-disruptive) rather than systemMessage
- Both hooks use `#!/bin/bash` (not fish) since hooks execute in their own shell

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all hook scripts deployed successfully and all verification tests passed.

## User Setup Required
None - hooks are deployed directly to `~/.claude/` and take effect on next Claude Code session.

## Next Phase Readiness
- All 5 plans in Phase 13 are now complete (01-05)
- Hook infrastructure ready for use by Phase 14 (native worktree adoption) and Phase 15 (full-lifecycle workers)
- Context monitoring will be active in all future long sessions

---
*Phase: 13-gsd-bugfix-ports*
*Completed: 2026-02-24*
