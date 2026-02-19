# Phase 6: Cleanup Orphaned Workflows - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove dead workflow files (discovery-phase.md, verify-phase.md) and fix stale ROADMAP metadata (Phase 4/5 checkboxes and plan counts) so the codebase matches its documented state. Closes INT-02, INT-03 from v1.0 audit.

</domain>

<decisions>
## Implementation Decisions

### Orphaned workflow fate
- Archive both discovery-phase.md and verify-phase.md to `mowism/workflows/_archive/`
- Do NOT delete — keep for reference in case future work draws from their designs
- Add an archive header to each file explaining why it was archived and what replaced it
  - verify-phase.md → replaced by refine-phase.md (implements the same tiered quality chain)
  - discovery-phase.md → never wired into plan-phase.md; research-phase/mow-phase-researcher covers its purpose
- Clean up BOTH repo source (mowism/workflows/) AND installed copies (~/.claude/mowism/workflows/)

### ROADMAP metadata sweep
- Fix only what's broken — Phase 4 and 5 specifically
- Mark Phase 4 and 5 plan entries with `[x]` checkboxes (currently `[ ]`)
- Verify and fix plan counts by cross-checking against actual plan files in each phase directory
- Phase 6 plan should self-update its own ROADMAP entry when complete

### Cleanup verification
- Run the full test suite after changes
- If any cleanup scenario isn't covered by existing tests, write new tests for it
- Full reference sweep: grep for "discovery-phase" and "verify-phase" across the entire codebase and fix/remove references
- Help files (??? suffix) should also be checked for stale references
- Installed files under ~/.claude/ must be updated alongside repo files

### Claude's Discretion
- Planning doc references (.planning/ files): Claude decides whether to update or leave as historical record based on whether they're historical artifacts vs active documentation
- Archive header wording and format
- Test coverage decisions for edge cases

</decisions>

<specifics>
## Specific Ideas

- The RECOMMENDED-WORKFLOW-CHAIN.md from ai-agent-tools-and-tips repo documents the verification chain that refine-phase.md implements — verify-phase.md was the earlier attempt at the same thing
- Both orphaned files are well-written but were superseded during development — archive preserves them as design references

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-cleanup-orphaned-workflows*
*Context gathered: 2026-02-20*
