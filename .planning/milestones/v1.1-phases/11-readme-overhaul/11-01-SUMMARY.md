---
phase: 11-readme-overhaul
plan: 01
subsystem: documentation
tags: [readme, lifecycle, brownfield, progressive-disclosure, markdown]

# Dependency graph
requires:
  - phase: 10-live-feedback
    provides: "multi-agent features to document (DAG scheduling, live feedback, color terminals)"
provides:
  - "README scaffold with opening, install, requirements, quick start"
  - "Full lifecycle narrative (8 stages, single-agent + multi-agent)"
  - "Dedicated brownfield entry section with map-codebase flow"
affects: [11-02 commands reference, 11-03 config/security/troubleshooting]

# Tech tracking
tech-stack:
  added: []
  patterns: [progressive-disclosure readme structure, numbered lifecycle walkthrough]

key-files:
  created: []
  modified: [README.md]

key-decisions:
  - "Lifecycle uses numbered walkthrough with exact command names, not abstract descriptions"
  - "Multi-agent presented as opt-in after single-agent default (progressive disclosure)"
  - "Brownfield is a top-level section, not nested under lifecycle"
  - "ASCII flow diagram chosen over Mermaid for universal compatibility"

patterns-established:
  - "Progressive disclosure: hook -> install -> quick start -> lifecycle -> brownfield -> [commands] -> [config]"
  - "Each lifecycle stage shows command name, what it does, and what files it creates"

requirements-completed: [DOC-01, DOC-03]

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 11 Plan 01: README Scaffold, Lifecycle, and Brownfield Summary

**README rewritten from scratch with progressive-disclosure structure: opening hook, install, requirements, quick start, 8-stage lifecycle narrative (single-agent + multi-agent), and dedicated brownfield entry section**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-20T09:45:38Z
- **Completed:** 2026-02-20T09:48:36Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Rewrote README.md from scratch replacing the 104-line v1.0 skeleton with comprehensive content
- Lifecycle narrative covers all 8 stages from new-project through complete-milestone with exact command names
- Multi-agent parallel execution documented as progressive disclosure (DAG scheduling, live feedback, color-coded terminals)
- Brownfield section with map-codebase flow and 7-document table is a top-level section, not buried in lifecycle

## Task Commits

Each task was committed atomically:

1. **Task 1: Write README scaffold with opening, install, and quick start** - `30f6a0d` (feat)
2. **Task 2: Write lifecycle narrative and brownfield entry sections** - `8e5eadf` (feat)

## Files Created/Modified
- `README.md` - Complete rewrite: title, description, install, requirements, quick start, lifecycle narrative (single-agent 8 stages + multi-agent parallel), brownfield entry, placeholder comments for Plans 02/03

## Decisions Made
- Lifecycle uses numbered walkthrough format with exact `/mow:*` command names at each stage, showing what each command produces (files created, artifacts generated)
- Multi-agent section presented as "When you're ready to parallelize" -- opt-in progressive disclosure, not the default workflow
- Brownfield Projects is a top-level `##` section, not a subsection of the lifecycle, so users with existing codebases can find it immediately from the table of contents
- ASCII flow diagram chosen over Mermaid for compatibility with `cat README.md` and terminals that don't render Mermaid
- Removed all stale content: "30+ commands" claim, partial command tables, Features section with incorrect counts

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- README scaffold complete with placeholder comments for Plan 02 (commands reference) and Plan 03 (config/security/troubleshooting)
- Plans 02 and 03 can insert their sections at the marked placeholders without restructuring
- License and Attribution section preserved at the bottom

## Self-Check: PASSED

All files and commits verified:
- FOUND: README.md
- FOUND: 11-01-SUMMARY.md
- FOUND: 30f6a0d (Task 1)
- FOUND: 8e5eadf (Task 2)

---
*Phase: 11-readme-overhaul*
*Completed: 2026-02-20*
