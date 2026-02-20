# Phase 1: Fork and Foundation - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Fork GSD into Mowism: rebrand all commands from `/gsd:*` to `/mow:*`, rename all internal agents and tooling, port all quality skills into the repo, and provide a migration path from existing GSD projects. This phase delivers a working Mowism installation — no new capabilities, just a clean rebrand and reorganization of existing GSD functionality.

</domain>

<decisions>
## Implementation Decisions

### Rebrand depth
- Full rename of everything — command names, agent names, internal tooling, file paths, template output
- Not hiding the GSD origin, but not prominently branding as GSD either. It's a clearly forked, independently developing project
- All agent types renamed: `gsd-planner` → `mow-planner`, `gsd-executor` → `mow-executor`, etc.
- Internal tooling renamed: `gsd-tools.cjs` → `mow-tools.cjs`
- Install directory: `~/.claude/mowism/` (not `~/.claude/get-shit-done/`)
- Output text uses short prefix: `MOW ▶` in banners and status messages (not "Mowism" spelled out)

### GSD coexistence
- Mowism supersedes GSD — if someone's using `/mow:*` commands, it replaces GSD
- Both can technically coexist (same kinds of commands), but Mowism is the active one
- No special conflict detection or deconfliction needed

### Migration behavior
- `/mow:migrate` copies `.planning/` to a backup first, then modifies originals in-place
- Leaves existing GSD skill registrations untouched — user can remove `/gsd:*` manually if they want
- Auto-commits after migration completes (single commit with all changes)

### Claude's Discretion
- How to handle partial migrations (mid-phase `.planning/` directories) — pick the safest approach
- Exact string replacement strategy (regex vs literal, order of operations)
- Backup naming convention and cleanup
- Error recovery if migration fails partway through

</decisions>

<specifics>
## Specific Ideas

- The rebrand is thorough but pragmatic — "gsd" strings should not appear in any user-visible output, but a comment in source acknowledging the GSD origin is fine
- Migration should feel safe — copy-then-modify approach means the user can always recover from the backup

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-fork-and-foundation*
*Context gathered: 2026-02-19*
