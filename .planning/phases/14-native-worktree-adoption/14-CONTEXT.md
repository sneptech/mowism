# Phase 14: Native Worktree Adoption - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace custom worktree creation/destruction with Claude Code's native `isolation: worktree` and WorktreeCreate/WorktreeRemove hooks. Mowism's coordination layer (claiming, manifest, merge, DAG) is preserved — only the worktree lifecycle mechanism changes. Full-lifecycle workers and auto-advance pipeline are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Path migration
- Auto-detect on first `/mow:` command run: if `.worktrees/` exists with entries, offer to migrate
- No version number check — presence of `.worktrees/` directory is the trigger
- On migration: rename `.worktrees/` to `.worktrees.bak` (not deleted)
- Offer cleanup/deletion of `.worktrees.bak` when a milestone completes (tie into `/mow:complete-milestone`)

### Claude's Discretion
- Hook bootstrapping: what WorktreeCreate sets up (`.planning/` symlink/copy, STATUS.md, config propagation)
- Cleanup scope: what WorktreeRemove tears down (manifest, claims, dashboard, handling of uncommitted work)
- Code removal boundaries: which custom worktree code gets deleted vs which coordination code stays
- In-progress work handling during migration (warn-and-skip vs migrate-everything — pick safest approach)
- Path reference rewriting scope during migration (full rewrite vs directories-only)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-native-worktree-adoption*
*Context gathered: 2026-02-24*
