---
phase: 01-fork-and-foundation
plan: 02
subsystem: infra
tags: [fork, rebranding, agents, templates, references, mowism]

# Dependency graph
requires:
  - phase: 01-fork-and-foundation/plan-01
    provides: mow-tools.cjs CLI tool in ~/.claude/mowism/bin/
provides:
  - 11 rebranded agent definition files (mow-*.md) in ~/.claude/agents/
  - 34 rebranded template files in ~/.claude/mowism/templates/ (including codebase/ and research-project/ subdirectories)
  - 13 rebranded reference files in ~/.claude/mowism/references/
  - VERSION file at ~/.claude/mowism/VERSION
affects: [01-fork-and-foundation/plan-03, 01-fork-and-foundation/plan-04, 01-fork-and-foundation/plan-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [ordered-string-replacement-for-fork-rebranding]

key-files:
  created:
    - ~/.claude/agents/mow-executor.md
    - ~/.claude/agents/mow-planner.md
    - ~/.claude/agents/mow-verifier.md
    - ~/.claude/agents/mow-phase-researcher.md
    - ~/.claude/agents/mow-project-researcher.md
    - ~/.claude/agents/mow-research-synthesizer.md
    - ~/.claude/agents/mow-debugger.md
    - ~/.claude/agents/mow-codebase-mapper.md
    - ~/.claude/agents/mow-plan-checker.md
    - ~/.claude/agents/mow-integration-checker.md
    - ~/.claude/agents/mow-roadmapper.md
    - ~/.claude/mowism/templates/config.json
    - ~/.claude/mowism/templates/state.md
    - ~/.claude/mowism/references/ui-brand.md
    - ~/.claude/mowism/references/model-profiles.md
    - ~/.claude/mowism/VERSION
  modified: []

key-decisions:
  - "Preserved original gsd-*.md agent files (coexistence per locked decision)"
  - "Applied ordered replacement table (most-specific-first) to prevent double-replacement artifacts"
  - "Files live in ~/.claude/ outside git repo -- tracked via planning artifacts only"

patterns-established:
  - "Fork rebranding: copy-then-sed with ordered replacements (absolute paths first, then general terms)"
  - "Coexistence model: mow-* files sit alongside gsd-* originals in ~/.claude/agents/"

requirements-completed: [CORE-03, CORE-04, CORE-05]

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 01 Plan 02: Agents, Templates, and References Summary

**Forked and rebranded 59 files (11 agents, 34 templates, 13 references, 1 VERSION) from GSD to Mowism with zero residual gsd strings**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T03:29:45Z
- **Completed:** 2026-02-19T03:33:27Z
- **Tasks:** 2
- **Files created:** 59

## Accomplishments
- All 11 agent definition files forked from gsd-*.md to mow-*.md with correct frontmatter names and path references
- All 34 template files (including codebase/ and research-project/ subdirectories) copied and rebranded
- All 13 reference files copied and rebranded, including ui-brand.md with MOW branding
- VERSION file copied (1.20.4)
- Zero "gsd" or "get-shit-done" strings remain in any forked file

## Task Commits

Files live outside the git repo (in ~/.claude/) so per-task commits track planning artifacts:

1. **Task 1: Fork and rebrand 11 agent definition files** - Work completed outside repo (11 mow-*.md files in ~/.claude/agents/)
2. **Task 2: Fork and rebrand templates, references, and VERSION** - Work completed outside repo (48 files in ~/.claude/mowism/)

**Plan metadata:** Committed with this SUMMARY.md

## Files Created/Modified
- `~/.claude/agents/mow-codebase-mapper.md` - Codebase analysis subagent definition
- `~/.claude/agents/mow-debugger.md` - Debugging subagent definition
- `~/.claude/agents/mow-executor.md` - Plan execution subagent definition
- `~/.claude/agents/mow-integration-checker.md` - Integration verification subagent
- `~/.claude/agents/mow-phase-researcher.md` - Phase research subagent
- `~/.claude/agents/mow-plan-checker.md` - Plan quality checking subagent
- `~/.claude/agents/mow-planner.md` - Plan creation subagent
- `~/.claude/agents/mow-project-researcher.md` - Project research subagent
- `~/.claude/agents/mow-research-synthesizer.md` - Research synthesis subagent
- `~/.claude/agents/mow-roadmapper.md` - Roadmap creation subagent
- `~/.claude/agents/mow-verifier.md` - Phase verification subagent
- `~/.claude/mowism/templates/` - 34 template files (22 root + 7 codebase/ + 5 research-project/)
- `~/.claude/mowism/references/` - 13 reference files
- `~/.claude/mowism/VERSION` - Version file (1.20.4)

## Decisions Made
- Preserved original gsd-*.md files per locked coexistence decision -- Mowism agents sit alongside GSD originals
- Applied ordered replacement table (absolute paths first, then shorter patterns) to prevent double-replacement artifacts like "mowism-tools" or "mow-mow-planner"
- Files reside in ~/.claude/ outside the git repo at /home/max/git/mowism -- this is by design (installation target vs planning repo)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed residual gsd strings in template examples**
- **Found during:** Task 2 (Template rebranding verification)
- **Issue:** Three files had `gsd` strings in example code/directory paths that weren't caught by the initial sed replacements (e.g., `gsd new-project`, `commands/gsd/`, `gsd/v1.0-mvp`)
- **Fix:** Manually replaced remaining instances in architecture.md, structure.md, and planning-config.md
- **Files modified:** ~/.claude/mowism/templates/codebase/architecture.md, ~/.claude/mowism/templates/codebase/structure.md, ~/.claude/mowism/references/planning-config.md
- **Verification:** `grep -rl 'gsd'` across all files returns empty

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup of edge cases in example content. No scope creep.

## Issues Encountered
- Files are outside the git repository boundary (/home/max/git/mowism). Per-task atomic commits cannot capture the actual file changes since they live in ~/.claude/. The SUMMARY.md and STATE.md commits serve as the tracking mechanism for this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All agent definitions in place for Wave 2 workflows to reference via `@~/.claude/agents/mow-*.md`
- All templates and references available at `~/.claude/mowism/templates/` and `~/.claude/mowism/references/`
- Wave 2 plans (03-workflows, 04-commands) can proceed with correct path references

## Self-Check: PASSED

All 21 verification checks passed:
- 11/11 agent files exist with mow-* names
- 4/4 directories exist (templates, templates/codebase, templates/research-project, references)
- 1/1 VERSION file exists
- File counts match expectations (11 agents, 34 templates, 13 references)
- 0 files contain residual 'gsd' strings
- SUMMARY.md exists

---
*Phase: 01-fork-and-foundation*
*Completed: 2026-02-19*
