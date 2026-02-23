---
phase: 09-multi-phase-execution-engine
verified: 2026-02-20T07:50:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 9: Multi-Phase Execution Engine Verification Report

**Phase Goal:** Multiple independent phases execute simultaneously across worktrees with coordinated orchestration
**Verified:** 2026-02-20T07:50:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Phase Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Team lead can spawn workers for 2+ independent phases simultaneously, each in its own worktree | VERIFIED | `mow-team-lead.md` Step 4 spawns workers for all ready phases via `Task()` with `subagent_type: "general-purpose"` in `.worktrees/pNN` worktrees; worktree create subcommand wired in `mow-tools.cjs` |
| 2 | Phase workers are `general-purpose` teammates that independently orchestrate their own plan execution via Task() -- not micromanaged by the lead | VERIFIED | `mow-phase-worker.md` explicitly specifies `subagent_type: "general-purpose"`, runs full discuss/plan/execute lifecycle autonomously, spawns `mow-executor` subagents for plans via `Task()`, communicates with lead only at 5 phase-level milestones |
| 3 | Agent Teams task dependencies reflect the DAG from ROADMAP.md -- a phase task is blocked until all its `depends_on` phases complete | VERIFIED | `mow-team-lead.md` Step 3 reads DAG via `roadmap analyze-dag --raw`, creates tasks upfront, then calls `TaskUpdate({ taskId, addBlockedBy: [...] })` mapping DAG `depends_on` to Agent Teams blockers |

### Observable Truths (from Plan Must-Haves)

**Plan 01 Truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `worktree create <phase>` creates `.worktrees/pNN` with branch, copies `.planning/`, initializes STATUS.md | VERIFIED | `cmdWorktreeCreate` at line 6052 in `mow-tools.cjs`: creates dir, runs `git worktree add`, `cp -r .planning/`, runs `status init` |
| 2 | `worktree create <phase>` when `.worktrees/pNN` already exists reuses existing worktree and restores stashed changes | VERIFIED | Lines 6067-6089: checks manifest + `fs.existsSync(absWtPath)`, runs `git stash pop` if `stash_ref` exists, updates status to active |
| 3 | Manifest at `.worktrees/manifest.json` tracks all worktrees with status, branch, phase, stash ref, merge state | VERIFIED | `readManifest`/`writeManifest` at lines 6017-6036; manifest schema includes path, branch, phase, phase_name, status, stash_ref, last_commit, merged, merged_at |
| 4 | `.worktrees/` is gitignored | VERIFIED | `.gitignore` line 2: `.worktrees/` |
| 5 | Checkpoint template contains frontmatter for phase, plan, status, worker, worktree, timestamp, reason | VERIFIED | `mowism/templates/checkpoint.md` has all 8 frontmatter fields including `circuit_breaker_hit`; `template fill checkpoint` confirmed working via live test |
| 6 | Circuit breaker threshold is configurable via `.planning/config.json` | VERIFIED | `CONFIG_DEFAULTS` at line 904 in `mow-tools.cjs`: `multi_phase.circuit_breaker_threshold: 2`; `config-get multi_phase.circuit_breaker_threshold` returns `2` confirmed live |

**Plan 02 Truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Team lead reads DAG from `roadmap analyze-dag --raw`, creates Agent Teams tasks for selected phases, sets addBlockedBy reflecting the DAG | VERIFIED | `mow-team-lead.md` lines 61/119 |
| 8 | Team lead spawns phase workers as `general-purpose` teammates each in its own `.worktrees/pNN` worktree | VERIFIED | `mow-team-lead.md` Step 4, `subagent_type: "general-purpose"`, `worktree create {phase}` in Step 2 |
| 9 | Phase workers autonomously run full discuss/plan/execute lifecycle without micromanagement | VERIFIED | `mow-phase-worker.md` 5-step lifecycle with full autonomy |
| 10 | Workers send only phase-level structured messages (plan_started, plan_complete, phase_complete, error, blocker) | VERIFIED | `<messaging_protocol>` section in `mow-phase-worker.md` defines exactly 5 milestone types |
| 11 | Lead reacts to worker messages event-driven (no polling) | VERIFIED | `mow-team-lead.md` Step 5 event-driven monitoring; constraint "NEVER poll TaskList in a loop" |
| 12 | Circuit breaker trips after N failures (configurable) and halts remaining workers | VERIFIED | `mow-team-lead.md` reads threshold via `config-get multi_phase.circuit_breaker_threshold`; error handler in `<error_handling>` and Step 5 |

**Plan 03 Truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 13 | `/mow:close-shop` triggers graceful shutdown: checks worker status, runs pending merges, captures deferred items, updates STATE.md, sends shutdown requests | VERIFIED | `mowism/workflows/close-shop.md` 6 steps; `commands/mow/close-shop.md` command entry wired to workflow |
| 14 | `execute-phase.md` in multi-phase mode delegates to team lead rather than running plans directly | VERIFIED | `<step name="multi_phase_check">` at line 92 of `execute-phase.md` detects `--multi-phase` flag or `.worktrees/` context and delegates |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `bin/mow-tools.cjs` | -- | 7550 | VERIFIED | Contains `cmdWorktreeCreate`, `cmdWorktreeListManifest`, `cmdWorktreeMerge`, `cmdWorktreeStash`, `readManifest`, `writeManifest`, `getRepoRoot`, `CONFIG_DEFAULTS` |
| `bin/mow-tools.test.cjs` | -- | 4061 | VERIFIED | 6 new tests for worktree create/reuse/stale/manifest; all 150 tests pass (0 failures) |
| `.gitignore` | -- | 2 | VERIFIED | Line 2: `.worktrees/` |
| `mowism/templates/checkpoint.md` | -- | 40 | VERIFIED | Frontmatter + 5 sections (Completed Plans, Current Plan State, Uncommitted Changes, Stashed Changes, Error Context, Resume Instructions) |
| `agents/mow-team-lead.md` | 200 | 446 | VERIFIED | Contains `<multi_phase_flow>` (8 steps), `<single_phase_flow>` (backward compat), circuit breaker, `general-purpose` spawning, `addBlockedBy` DAG mapping |
| `agents/mow-phase-worker.md` | 80 | 286 | VERIFIED | Contains `<lifecycle>` (5 steps), `<failure_handling>`, `<messaging_protocol>`, constraint: never write STATE.md |
| `mowism/workflows/close-shop.md` | 60 | 121 | VERIFIED | 6 steps: check_status, pending_merges, capture_context, update_state, shutdown_workers, report |
| `mowism/workflows/execute-phase.md` | -- | 562 | VERIFIED | Contains `<step name="multi_phase_check">`, worktree guards in `update_roadmap` and `offer_next`, pause-work signal support |
| `commands/mow/close-shop.md` | -- | 43 | VERIFIED | YAML frontmatter with name/description/allowed-tools, help detection block, references `close-shop.md` workflow |
| `help/close-shop.md` | -- | 35 | VERIFIED | Standard help format: usage, what-happens (6 steps), examples, related commands. Note: plan specified `mowism/help/close-shop.md` -- file correctly placed at `help/close-shop.md` matching existing convention |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/mow-tools.cjs` | `.worktrees/manifest.json` | `readManifest`/`writeManifest` + `fs.readFileSync`/`writeFileSync` | WIRED | `manifest.json` pattern confirmed at lines 6017-6036; path joins `getRepoRoot()` output with `.worktrees/manifest.json` |
| `bin/mow-tools.cjs` | `git worktree add` | `execSync` | WIRED | Line 6105: `execSync(\`git worktree add ${wtPath} -b ${branch} ${base}\`, ...)` |
| `agents/mow-team-lead.md` | `bin/mow-tools.cjs` | `roadmap analyze-dag --raw`, `worktree create`, `worktree merge` | WIRED | Lines 61, 97, merge step; pattern `mow-tools.cjs` present in file |
| `agents/mow-team-lead.md` | `agents/mow-phase-worker.md` | `Task()` spawn with `subagent_type: "general-purpose"` | WIRED | Step 4 references `agents/mow-phase-worker.md` in spawn prompt; `general-purpose` confirmed at line 129 |
| `agents/mow-phase-worker.md` | `mowism/workflows/execute-phase.md` | Skill invocation of `/mow:execute-phase` | WIRED | Phase worker step 4 invokes execute-phase workflow; `execute-phase` pattern confirmed in file |
| `mowism/workflows/close-shop.md` | `agents/mow-team-lead.md` | Invoked by lead or user; references `SendMessage` | WIRED | `SendMessage` at line 85 for shutdown_request; `team-lead` context via `mow-tools.cjs team-update` |
| `mowism/workflows/execute-phase.md` | `agents/mow-team-lead.md` | Multi-phase delegation via `multi_phase_check` step | WIRED | Line 103: "Read and follow `agents/mow-team-lead.md` multi_phase_flow" |
| `commands/mow/close-shop.md` | `mowism/workflows/close-shop.md` | `@~/.claude/mowism/workflows/close-shop.md` reference | WIRED | Line 30 of command file: `@~/.claude/mowism/workflows/close-shop.md` |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXEC-01 | 09-01, 09-02, 09-03 | Team lead can execute multiple independent phases simultaneously across worktrees | SATISFIED | Worktree lifecycle infrastructure (Plan 01) + team lead multi_phase_flow that spawns workers per-worktree (Plan 02) + execute-phase delegation (Plan 03) collectively enable this |
| EXEC-02 | 09-02, 09-03 | Phase workers are `general-purpose` teammates that independently orchestrate their own wave executors via Task() | SATISFIED | `mow-phase-worker.md` is spawned as `general-purpose`; its `<lifecycle>` Step 4 spawns `mow-executor` subagents via `Task()` for each plan wave |
| EXEC-03 | 09-01, 09-02 | Phase-level task dependencies in Agent Teams task list reflect the DAG from ROADMAP.md | SATISFIED | `mow-team-lead.md` Step 3 reads DAG via `roadmap analyze-dag --raw` and maps `depends_on` to `TaskUpdate({ addBlockedBy: [...] })` |

All 3 requirements are covered by plans. No orphaned requirements found (REQUIREMENTS.md shows EXEC-01/02/03 all mapped to Phase 9).

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `agents/mow-team-lead.md` | `{downstream_task_id}` placeholder literals in code blocks | Info | These are template examples, not implementation stubs -- appropriate for an agent instruction file |
| `mowism/templates/checkpoint.md` | `{List of plans...}` placeholder text | Info | Expected -- checkpoint.md is a template, not an implementation |
| `mowism/workflows/close-shop.md` | `{N}`, `{M}`, `{K}` placeholders in report template | Info | Expected -- workflow documentation, not code stubs |

No blockers or warnings found. All placeholders are intentional template syntax in agent instruction files.

### Human Verification Required

The following items require runtime observation that cannot be verified statically:

#### 1. Multi-phase simultaneous execution

**Test:** With two independent phases in ROADMAP.md, run `/mow:execute-phase --multi-phase` from a project repo, confirm two Agent Teams tasks are created with appropriate DAG blocking, and two `general-purpose` workers spawn simultaneously, each in their own `.worktrees/pNN` directory.
**Expected:** Two terminal sessions, each running their phase lifecycle independently. Lead only receives phase-milestone messages.
**Why human:** Requires an actual Agent Teams runtime environment with multiple phases available.

#### 2. Circuit breaker behavior

**Test:** Configure `multi_phase.circuit_breaker_threshold: 1` in `.planning/config.json`, induce a worker failure, confirm lead halts remaining workers and reports cascade impact.
**Expected:** After 1 failure, lead broadcasts halt and lists which downstream phases are now blocked.
**Why human:** Requires live agent orchestration with a real failure condition.

#### 3. Worker stays alive after phase_complete signal

**Test:** Complete a phase in a multi-phase session. Confirm the worker terminal remains open and responsive, not auto-terminated.
**Expected:** Worker terminal stays open; user must run `/mow:close-shop` to shut it down.
**Why human:** Requires observing live agent behavior -- cannot be verified from static file inspection.

#### 4. Graceful cancel and checkpoint recovery

**Test:** Cancel an in-progress phase worker, confirm a CHECKPOINT.md is written to `.planning/phases/XX/`, then resume from that checkpoint in a new worker session.
**Expected:** New worker reads checkpoint, runs smoke tests on completed plans, and continues from the interrupted plan/task.
**Why human:** Requires live cancel signal and new session with checkpoint file.

### Gaps Summary

No gaps found. All 14 must-have truths are verified, all 10 key artifacts exist with substantive content, all 8 key links are wired, all 3 requirements are satisfied. The one path deviation (help file at `help/` vs `mowism/help/`) was correctly auto-fixed to match existing project conventions -- the artifact exists and is substantive.

---

_Verified: 2026-02-20T07:50:00Z_
_Verifier: Claude (mow-verifier)_
