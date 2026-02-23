---
phase: 14-native-worktree-adoption
verified: 2026-02-24T09:15:00Z
status: human_needed
score: 4/4 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "All worktree path references resolve to native worktree locations — test suite updated, all 3 previously-failing worktree create tests now pass (173/173 total)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "WorktreeCreate hook fires correctly when claude --worktree phase-NN is invoked"
    expected: "Phase worktree created at .claude/worktrees/phase-NN with .planning/ directory and STATUS.md present"
    why_human: "Requires Claude Code Agent Teams (experimental feature, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1) to actually invoke the WorktreeCreate hook — cannot simulate in static analysis"
  - test: "WorktreeRemove hook fires cleanup correctly when worktree is removed"
    expected: "manifest entry marked removed, phase claim released, dashboard cleared"
    why_human: "Requires the live Claude Code hook infrastructure to fire mow-worktree-remove.sh — hook correctness verified statically but end-to-end fire requires the runtime"
---

# Phase 14: Native Worktree Adoption Verification Report

**Phase Goal:** Agent worktrees are created and destroyed via Claude Code native hooks with Mowism coordination preserved
**Verified:** 2026-02-24T09:15:00Z
**Status:** human_needed (all automated checks passed; two items require live Claude Code runtime)
**Re-verification:** Yes — after Plan 05 gap closure

## Goal Achievement

### Success Criteria (Observable Truths)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Spawning a phase worker creates worktree via `isolation: worktree` with `.planning/` and STATUS.md automatically present | ? HUMAN | Hook scripts exist, are substantive, and wired; `cmdWorktreeCreateNative` copies `.planning/` (line 6844) and runs `status init` (line 6854); end-to-end requires Claude Code AT runtime |
| 2 | When a worker completes and its worktree is removed, manifest entry, phase claim, and dashboard state are automatically cleaned up | ? HUMAN | `mow-worktree-remove.sh` lines 52-54 call all three cleanup commands with best-effort semantics; all three wired; end-to-end requires hook runtime |
| 3 | All worktree path references resolve to native worktree locations (no references to old .worktrees/pNN paths remain) | VERIFIED | Zero `.worktrees/p[0-9]` in production code; `bin/mow-tools.test.cjs` updated — "worktree create command" block now asserts `.claude/worktrees/phase-09` and `manifest.worktrees['phase-09']`; all 3 previously-failing tests now pass (173/173 total) |
| 4 | Users with existing `.worktrees/` directories can run a migration script that moves entries to native paths without losing state | VERIFIED | `cmdWorktreeMigrate` functional; `node bin/mow-tools.cjs worktree migrate --raw` returns `{"migrated":false,"reason":"no migration needed"}` on clean repo |

**Score:** 4/4 truths verified (2 by automated check, 2 pending human runtime verification)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/settings.json` | Hook registration for WorktreeCreate and WorktreeRemove | VERIFIED | File exists; 2 hook type matches for WorktreeCreate and WorktreeRemove confirmed |
| `.claude/hooks/mow-worktree-create.sh` | WorktreeCreate hook script delegating to mow-tools.cjs | VERIFIED | 76 lines, executable (-rwxr-xr-x). Reads JSON stdin, parses name/cwd with jq/Node fallback, filters by `^phase-[0-9]+$`, delegates to `worktree create-native`, prints path to stdout |
| `.claude/hooks/mow-worktree-remove.sh` | WorktreeRemove hook script for cleanup | VERIFIED | 59 lines, executable (-rwxr-xr-x). Reads stdin, extracts phase, calls release/remove-manifest/dashboard clear with `|| true`, always exits 0 |
| `bin/mow-tools.cjs` (cmdWorktreeCreateNative) | Phase worktree creation at .claude/worktrees/phase-NN | VERIFIED | Function at line 6765. Creates worktree, copies .planning/, inits STATUS.md, writes manifest. Wired at lines 7874 (create alias) and 7903 (create-native dispatch) |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/mow-tools.cjs` | Updated path references and coordination layer | VERIFIED | readManifest (line 6725) checks `.claude/worktrees/` first, falls back with warning; writeManifest (line 6741) always writes to `.claude/worktrees/`; getActiveWorktrees uses `git worktree list --porcelain` |
| `mowism/workflows/execute-phase.md` | Updated worktree path references | VERIFIED | Contains `.claude/worktrees/phase-NN`; zero `.worktrees/pNN` references |
| `agents/mow-team-lead.md` | Updated agent with native worktree paths | VERIFIED | Line 102: `claude --worktree phase-{NN}`; line 117: `.claude/worktrees/phase-{NN}` |

### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/mow-tools.cjs` (cmdWorktreeMigrate + checkMigrationNeeded) | Migration function and detection helper | VERIFIED | checkMigrationNeeded wired at 5 init function call sites (lines 5935, 6023, 6128, 6194, 6278); cmdWorktreeMigrate at line 7339 with active worktree detection, renameSync, key conversion; CLI dispatch at line 7909 |
| `commands/mow/complete-milestone.md` | Cleanup offer for .worktrees.bak | VERIFIED | Checks `.worktrees.bak` existence and offers `node bin/mow-tools.cjs worktree clean-backup` |

### Plan 04 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/mow-tools.cjs` | Cleaned codebase without WorkTrunk dependency | VERIFIED | Zero matches for requireWorkTrunk, WorkTrunk; net -284 lines vs pre-phase baseline |
| `bin/install.sh` | Updated install script without WorkTrunk dependency check | VERIFIED | Zero WorkTrunk references; hook script installation at lines 67-72 present |

### Plan 05 Artifacts (Gap Closure)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/mow-tools.test.cjs` ("worktree create command" describe block) | Tests updated to native API, `.claude/worktrees/phase-09` paths, and `manifest.worktrees['phase-09']` keys | VERIFIED | Lines 3970-4035: all path assertions updated; manifest reads from `.claude/worktrees/manifest.json`; manifest key `phase-09`; `afterEach` cleanup targets `.claude/worktrees/`; all 3 tests pass: "creates new worktree" (112ms), "reuses existing worktree" (214ms), "cleans stale manifest entry" (217ms) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.claude/hooks/mow-worktree-create.sh` | `bin/mow-tools.cjs` | `node "$TOOLS_PATH" worktree create-native --name "$NAME" --raw` | WIRED | Line 59: exact pattern match confirmed |
| `.claude/hooks/mow-worktree-remove.sh` | `bin/mow-tools.cjs` | release, remove-manifest, dashboard clear | WIRED | Lines 52-54: all three calls with `|| true` confirmed |
| `bin/mow-tools.cjs readManifest` | `.claude/worktrees/manifest.json` | `path.join(root, '.claude', 'worktrees', 'manifest.json')` | WIRED | Line 6727: exact path join confirmed |
| `bin/mow-tools.cjs getActiveWorktrees` | `git worktree list` | `execSync('git worktree list --porcelain', ...)` | WIRED | Line 7189: execSync call confirmed, parses porcelain output |
| `bin/mow-tools.cjs CLI dispatch worktree create` | `cmdWorktreeCreateNative` | `if (subcommand === 'create') { cmdWorktreeCreateNative(...) }` | WIRED | Lines 7870-7874: create subcommand routes to create-native |
| `checkMigrationNeeded` | 5 init functions | `const migration = checkMigrationNeeded(cwd)` | WIRED | Lines 5935, 6023, 6128, 6194, 6278: all 5 init functions confirmed |
| `bin/mow-tools.test.cjs` "worktree create command" | `bin/mow-tools.cjs worktree create 09` | `runMowTools('worktree create 09 --raw', tmpDir)` | WIRED | Tests call create command and assert `.claude/worktrees/phase-09` path and `manifest.worktrees['phase-09']` key; all assertions match implementation |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| WKT-01 | 14-01 | Agent spawns use `--worktree` flag or `isolation: worktree` frontmatter instead of custom cmdWorktreeCreate | VERIFIED | `agents/mow-team-lead.md` line 102 uses `claude --worktree phase-{NN}`; cmdWorktreeCreate removed; `worktree create` routes to create-native |
| WKT-02 | 14-01 | WorktreeCreate hook copies `.planning/` directory and initializes STATUS.md in new worktrees | VERIFIED | `mow-worktree-create.sh` delegates to `cmdWorktreeCreateNative` which copies `.planning/` (line 6844) and runs `status init` (line 6854) |
| WKT-03 | 14-01 | WorktreeRemove hook removes manifest entry, releases phase claim, and clears dashboard state | VERIFIED | `mow-worktree-remove.sh` lines 52-54 call all three cleanup commands with best-effort semantics |
| WKT-04 | 14-02 | All worktree path references updated from `.worktrees/pNN` to `.claude/worktrees/phase-NN` | VERIFIED | Zero `.worktrees/p[0-9]` in production code; test suite updated to match implementation; 173/173 tests pass |
| WKT-05 | 14-02 | Coordination layer (claim, merge, manifest, status) works with native worktree paths | VERIFIED | readManifest/writeManifest target `.claude/worktrees/`; getActiveWorktrees uses `git worktree list`; smoke test returns correct manifest structure |
| WKT-06 | 14-03 | Migration script detects existing `.worktrees/` entries and offers migration to native paths | VERIFIED | `cmdWorktreeMigrate` functional; `node bin/mow-tools.cjs worktree migrate --raw` returns `{"migrated":false,"reason":"no migration needed"}` |
| WKT-07 | 14-04 | Redundant worktree creation code removed from mow-tools.cjs (net LOC reduction) | VERIFIED | All WorkTrunk code removed; net -284 lines confirmed |

All 7 requirements satisfied.

---

## Anti-Patterns Found

None. The previously-identified blocker anti-patterns in `bin/mow-tools.test.cjs` (stale `.worktrees/p09` path assertions) have been resolved by Plan 05.

---

## Human Verification Required

### 1. WorktreeCreate Hook End-to-End

**Test:** With `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, spawn a subagent with `claude --worktree phase-99`. After it starts, check: `ls .claude/worktrees/phase-99/.planning/` and `cat .claude/worktrees/phase-99/.planning/phases/.../STATUS.md`.
**Expected:** Directory exists with `.planning/` copy and an initialized STATUS.md
**Why human:** Requires live Claude Code Agent Teams runtime to fire the WorktreeCreate hook; cannot mock hook invocation in static analysis

### 2. WorktreeRemove Hook End-to-End

**Test:** Remove the phase-99 worktree: `git worktree remove .claude/worktrees/phase-99`. Then check `node bin/mow-tools.cjs worktree list-manifest --raw` to see the phase-99 entry status.
**Expected:** Entry shows `"status": "removed_unmerged"` (since not merged); phase claim released from STATE.md; dashboard cleared
**Why human:** Requires live Claude Code hook runtime to fire `mow-worktree-remove.sh`; static wiring verified but fire sequence requires runtime

---

## Re-Verification Summary

The single gap from the initial verification has been closed by Plan 05.

**Gap closed — WKT-04 test suite update:** The "worktree create command" describe block in `bin/mow-tools.test.cjs` was updated to match the native implementation:
- Path assertions changed from `.worktrees/p09` to `.claude/worktrees/phase-09`
- Manifest reads changed from `.worktrees/manifest.json` to `.claude/worktrees/manifest.json`
- Manifest key assertions changed from `p09` to `phase-09`
- `afterEach` cleanup now targets `.claude/worktrees/` instead of `.worktrees/`

All three previously-failing tests now pass. The full test suite runs at 173/173 (0 failures, 0 regressions introduced).

The two human verification items carry over from the initial verification. They require the live Claude Code Agent Teams runtime and cannot be resolved by static analysis. Static verification confirms the hook scripts are correctly written, registered in `.claude/settings.json`, and wired to the right `mow-tools.cjs` subcommands — only the end-to-end fire sequence requires human execution.

**Phase goal status:** All automated verification complete. All 7 requirements satisfied. Two items pending human runtime verification (hook fire end-to-end behavior).

---

_Verified: 2026-02-24T09:15:00Z_
_Verifier: Claude (mow-verifier)_
_Re-verification after: Plan 05 gap closure_
