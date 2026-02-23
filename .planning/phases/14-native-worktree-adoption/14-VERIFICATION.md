---
phase: 14-native-worktree-adoption
verified: 2026-02-24T08:30:00Z
status: gaps_found
score: 3/4 success criteria verified
re_verification: false
gaps:
  - truth: "All worktree path references across agents, workflows, and mow-tools.cjs resolve to native worktree locations (no references to old .worktrees/pNN paths remain)"
    status: partial
    reason: "Test suite (bin/mow-tools.test.cjs) was NOT updated — the 'worktree create command' describe block (lines 3939-4035) still tests old behavior expecting .worktrees/p09 paths and manifest.json at .worktrees/. Three tests fail at runtime with assertion errors and ENOENT."
    artifacts:
      - path: "bin/mow-tools.test.cjs"
        issue: "Lines 3976, 4002: assert .worktrees/p09 path. Lines 3980, 3983, 4010, 4020: access .worktrees/manifest.json. Tests for 'creates new worktree with correct structure', 'reuses existing worktree when directory exists', 'cleans stale manifest entry when directory is gone' all fail."
    missing:
      - "Update 'worktree create command' describe block (lines 3939-4035) to test 'worktree create-native --name phase-09' instead of 'worktree create 09'"
      - "Update expected path assertions from '.worktrees/p09' to '.claude/worktrees/phase-09'"
      - "Update manifest path reads from '.worktrees/manifest.json' to '.claude/worktrees/manifest.json'"
      - "Update manifest key assertions from 'p09' to 'phase-09'"
      - "Update afterEach cleanup to handle .claude/worktrees/ instead of .worktrees/"
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
**Verified:** 2026-02-24T08:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria (Observable Truths)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Spawning a phase worker creates worktree via `isolation: worktree` with `.planning/` and STATUS.md automatically present | ? HUMAN | Hook scripts exist and are substantive; create-native function copies .planning/ and inits STATUS.md (lines 6839-6859 mow-tools.cjs); end-to-end requires Claude Code AT runtime |
| 2 | When a worker completes and its worktree is removed, manifest entry, phase claim, and dashboard state are automatically cleaned up | ? HUMAN | mow-worktree-remove.sh calls release, remove-manifest, dashboard clear (lines 51-54); all three commands verified wired; end-to-end requires hook runtime |
| 3 | All worktree path references resolve to native worktree locations (no references to old .worktrees/pNN paths remain) | PARTIAL | Active code is clean: zero .worktrees/pNN in mow-tools.cjs, workflows, agents, commands. FAIL: bin/mow-tools.test.cjs lines 3976, 4002, 3980, 3983, 4010, 4020 still reference old paths; 3 tests fail at runtime |
| 4 | Users with existing `.worktrees/` directories can run a migration script that moves entries to native paths without losing state | VERIFIED | cmdWorktreeMigrate verified: detects .worktrees/, blocks on active worktrees, renames to .worktrees.bak, converts pNN keys to phase-NN, updates paths. `node bin/mow-tools.cjs worktree migrate --raw` returns `{"migrated":false,"reason":"no migration needed"}` on clean repo |

**Score:** 3/4 (1 verified, 1 partial/failed, 2 require human verification)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/settings.json` | Hook registration for WorktreeCreate and WorktreeRemove | VERIFIED | File exists (464 bytes). Contains WorktreeCreate and WorktreeRemove entries with correct `command` type. Registered hook paths use `$CLAUDE_PROJECT_DIR`. |
| `.claude/hooks/mow-worktree-create.sh` | WorktreeCreate hook script delegating to mow-tools.cjs | VERIFIED | 76 lines, executable (-rwxr-xr-x). Reads JSON stdin, parses name/cwd with jq/Node fallback, filters by `^phase-[0-9]+$`, delegates to `worktree create-native`, prints only path to stdout. Substantive. |
| `.claude/hooks/mow-worktree-remove.sh` | WorktreeRemove hook script for cleanup | VERIFIED | 59 lines, executable (-rwxr-xr-x). Reads stdin, extracts phase, calls release/remove-manifest/dashboard clear with `|| true`, always exits 0. Substantive. |
| `bin/mow-tools.cjs` (cmdWorktreeCreateNative) | Phase worktree creation at .claude/worktrees/phase-NN | VERIFIED | Function at line 6765. Creates worktree, copies .planning/, inits STATUS.md, writes manifest. Wired at lines 7874 (create alias) and 7903 (create-native dispatch). |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/mow-tools.cjs` | Updated path references and coordination layer | VERIFIED | readManifest (line 6725) checks .claude/worktrees/ first, falls back to .worktrees/ with warning. writeManifest (line 6741) always writes to .claude/worktrees/. getActiveWorktrees (line 7187) uses `git worktree list --porcelain`. |
| `mowism/workflows/execute-phase.md` | Updated worktree path references | VERIFIED | Lines 108, 464, 501 contain `.claude/worktrees/phase-NN`. No .worktrees/pNN references. |
| `agents/mow-team-lead.md` | Updated agent with native worktree paths | VERIFIED | Line 102: `claude --worktree phase-{NN}`. Line 117: `.claude/worktrees/phase-{NN}`. |

### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/mow-tools.cjs` (cmdWorktreeMigrate + checkMigrationNeeded) | Migration function and detection helper | VERIFIED | checkMigrationNeeded at line 7323 (definition) + lines 5935, 6023, 6128, 6194, 6278 (5 init function call sites). cmdWorktreeMigrate at line 7339 with active worktree detection, renameSync, key conversion. CLI dispatch at line 7909. |
| `commands/mow/complete-milestone.md` | Cleanup offer for .worktrees.bak | VERIFIED | Line 111: checks .worktrees.bak existence. Line 114: informational text. Line 117: `node bin/mow-tools.cjs worktree clean-backup`. |

### Plan 04 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/mow-tools.cjs` | Cleaned codebase without WorkTrunk dependency | VERIFIED | Zero matches for: requireWorkTrunk, ensureWtConfig, WT_CONFIG_CONTENT, WT_PLANNING_COPY_HOOK, checkWorkTrunk, cmdWorktreeStash, cmdWorktreeCreate (non-native). Net -284 lines (8768 to 8484). |
| `bin/install.sh` | Updated install script without WorkTrunk dependency check | VERIFIED | Zero WorkTrunk references. Lines 67-72: hook script installation added. Line 107: "Hooks: N hook scripts" in post-install summary. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.claude/hooks/mow-worktree-create.sh` | `bin/mow-tools.cjs` | `node "$TOOLS_PATH" worktree create-native --name "$NAME" --raw` | WIRED | Line 59: `node "$TOOLS_PATH" worktree create-native --name "$NAME" --raw` — exact pattern match |
| `.claude/hooks/mow-worktree-remove.sh` | `bin/mow-tools.cjs` | `node "$TOOLS_PATH" worktree release "$PHASE"` | WIRED | Lines 52-54: release, remove-manifest, dashboard clear all called with `|| true` |
| `bin/mow-tools.cjs readManifest` | `.claude/worktrees/manifest.json` | `path.join(root, '.claude', 'worktrees', 'manifest.json')` | WIRED | Line 6727: exact path join confirmed |
| `bin/mow-tools.cjs getActiveWorktrees` | `git worktree list` | `execSync('git worktree list --porcelain', ...)` | WIRED | Line 7189: execSync call confirmed, parses porcelain output |
| `bin/mow-tools.cjs CLI dispatch worktree create` | `cmdWorktreeCreateNative` | `if (subcommand === 'create') { cmdWorktreeCreateNative(...) }` | WIRED | Line 7870-7874: create subcommand routes to create-native |
| `checkMigrationNeeded` | 5 init functions | `const migration = checkMigrationNeeded(cwd)` | WIRED | Lines 5935, 6023, 6128, 6194, 6278 — all 5 init functions confirmed |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| WKT-01 | 14-01 | Agent spawns use `--worktree` flag or `isolation: worktree` frontmatter instead of custom cmdWorktreeCreate | VERIFIED | agents/mow-team-lead.md line 102 uses `claude --worktree phase-{NN}`; cmdWorktreeCreate removed; create routes to create-native |
| WKT-02 | 14-01 | WorktreeCreate hook copies `.planning/` directory and initializes STATUS.md in new worktrees | VERIFIED | mow-worktree-create.sh delegates to cmdWorktreeCreateNative which copies .planning/ (line 6844) and runs `status init` (line 6854) |
| WKT-03 | 14-01 | WorktreeRemove hook removes manifest entry, releases phase claim, and clears dashboard state | VERIFIED | mow-worktree-remove.sh lines 52-54 call all three cleanup commands with best-effort semantics |
| WKT-04 | 14-02 | All worktree path references updated from `.worktrees/pNN` to `.claude/worktrees/phase-NN` | PARTIAL | Active production code clean; bin/mow-tools.test.cjs not updated (3 failing tests) |
| WKT-05 | 14-02 | Coordination layer (claim, merge, manifest, status) works with native worktree paths | VERIFIED | readManifest/writeManifest target .claude/worktrees/; getActiveWorktrees uses git worktree list; manifest shows real phase-NN entries from test executions |
| WKT-06 | 14-03 | Migration script detects existing `.worktrees/` entries and offers migration to native paths | VERIFIED | cmdWorktreeMigrate functional; smoke test returns correct no-migration-needed response |
| WKT-07 | 14-04 | Redundant worktree creation code removed from mow-tools.cjs (net LOC reduction) | VERIFIED | All WorkTrunk code removed; net -284 lines; 8484 lines total vs pre-phase 8768 |

---

## Anti-Patterns Found

| File | Lines | Pattern | Severity | Impact |
|------|-------|---------|----------|--------|
| `bin/mow-tools.test.cjs` | 3976, 4002 | Assertions expecting `.worktrees/p09` path (old convention) | Blocker | 3 tests in "worktree create command" describe block fail at runtime; `assert.strictEqual(output.path, '.worktrees/p09')` and manifest reads at `.worktrees/manifest.json` — test suite partially broken |
| `bin/mow-tools.test.cjs` | 3939-4035 | Full "worktree create command" describe block tests old API behavior that no longer matches implementation | Blocker | `worktree create 09` now routes to `cmdWorktreeCreateNative` which outputs `.claude/worktrees/phase-09` path — test expects old output format with `created: true` field and old path |

---

## Human Verification Required

### 1. WorktreeCreate Hook End-to-End

**Test:** With `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, spawn a subagent with `claude --worktree phase-99`. After it starts, check: `ls .claude/worktrees/phase-99/.planning/` and `cat .claude/worktrees/phase-99/.planning/phases/.../STATUS.md`.
**Expected:** Directory exists with .planning/ copy and an initialized STATUS.md
**Why human:** Requires live Claude Code Agent Teams runtime to fire the WorktreeCreate hook; cannot mock hook invocation in static analysis

### 2. WorktreeRemove Hook End-to-End

**Test:** Remove the phase-99 worktree: `git worktree remove .claude/worktrees/phase-99`. Then check `node bin/mow-tools.cjs worktree list-manifest --raw` to see the phase-99 entry status.
**Expected:** Entry shows `"status": "removed_unmerged"` (since not merged); phase claim released from STATE.md; dashboard cleared
**Why human:** Requires live Claude Code hook runtime to fire mow-worktree-remove.sh; static wiring verified but fire sequence requires runtime

---

## Gaps Summary

One gap is blocking full goal achievement:

**WKT-04 partial failure — test suite not updated:** The plan description for Success Criterion 3 says "no references to old .worktrees/pNN paths remain." This is true for all production code but false for `bin/mow-tools.test.cjs`. The "worktree create command" describe block (lines 3939-4035) was written to test the old `cmdWorktreeCreate` which created worktrees at `.worktrees/p09`. Since Plan 04 removed `cmdWorktreeCreate` and redirected `worktree create` to `cmdWorktreeCreateNative`, the tests now: (1) call `worktree create 09` which routes to `cmdWorktreeCreateNative`, (2) get back a path of `.claude/worktrees/phase-09`, and (3) fail assertions expecting `.worktrees/p09`.

This is a test-suite regression introduced by the implementation changes. The fix requires updating the test describe block to use `create-native --name phase-09`, update expected paths, manifest key from `p09` to `phase-09`, and manifest location from `.worktrees/` to `.claude/worktrees/`.

Two success criteria (1 and 2) cannot be fully automated because they depend on Claude Code's Agent Teams hook-firing infrastructure. Static analysis confirms the hooks are correctly written and wired; end-to-end requires a human to run the live scenario.

---

_Verified: 2026-02-24T08:30:00Z_
_Verifier: Claude (mow-verifier)_
