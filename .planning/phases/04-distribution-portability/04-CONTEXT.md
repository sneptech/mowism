# Phase 4: Distribution Portability - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Make all distributed files use portable paths so Mowism installs and runs correctly on any user's machine. Fix hardcoded `/home/max/.claude/` paths, env var detection mismatch, and stale duplicate files. Closes gaps identified by v1.0 audit.

</domain>

<decisions>
## Implementation Decisions

### Cleanup scope
- Fix ALL files in the repo, including `.planning/` historical artifacts — not just distributed files
- Full consistency: zero occurrences of `/home/max/.claude/` anywhere in the repository
- Broader sweep beyond the 4 known audit gaps — check for any portability assumptions that would break on Ubuntu, macOS, or other environments (fish-isms, CachyOS-specific paths, etc.)

### Stale file handling
- Claude's discretion on whether to delete entire `mowism/bin/` directory or just stale files — check what lives there and act accordingly

### Validation approach
- Claude's discretion on whether grep sweep is sufficient or if Docker-based install testing is warranted — pick based on confidence level after making changes

### Claude's Discretion
- Path resolution method (`$HOME/.claude/` substitution vs runtime resolution vs PATH binary)
- Env var tolerance level for Agent Teams detection (strict vs relaxed matching)
- Stale file cleanup granularity (directory vs individual files)
- Validation depth (grep sweep vs Docker test)

</decisions>

<specifics>
## Specific Ideas

- 342 occurrences of `/home/max/.claude/` across 85 files identified in initial scan
- `mowism/bin/` contains `mow-tools.cjs` and `mow-tools.test.cjs` (duplicates of `bin/` originals)
- `checkAgentTeams()` currently only matches `=== '1'`, missing `'true'`
- User wants the repo to be clean enough that a non-developer on any platform can install and run without errors

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-distribution-portability*
*Context gathered: 2026-02-20*
