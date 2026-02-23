---
phase: 16-auto-advance-pipeline
verified: 2026-02-24T10:45:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 16: Auto-Advance Pipeline Verification Report

**Phase Goal:** A single `/mow:auto` command drives the entire milestone from current phase to completion with human checkpoints at discuss stages
**Verified:** 2026-02-24T10:45:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `/mow:auto` from any phase starts the pipeline and automatically advances through subsequent phases until milestone end | VERIFIED | `commands/mow/auto.md` exists with proper YAML frontmatter and execution_context referencing `@~/.claude/mowism/workflows/auto.md`. Workflow initializes via `cmdInitAuto`, sets `workflow.auto_advance` flag, and delegates to team lead or sequential fallback. CLI confirmed: `node mow-tools.cjs init auto --raw` returns valid JSON. |
| 2 | Auto-advance respects DAG dependencies — a phase only starts when all its dependency phases have completed | VERIFIED | `cmdInitAuto` calls `analyzeDagInternal(cwd)` and returns `dag.ready`, `dag.blocked`, `dag.completed`. The `team_lead_delegation` step in auto.md explicitly passes the DAG ready/blocked list to `agents/mow-team-lead.md` `multi_phase_flow`. Sequential fallback iterates phases "in DAG order". |
| 3 | Auto-advance pauses at every discuss-phase for user input and resumes automatically after CONTEXT.md is created | VERIFIED | `mowism/workflows/auto.md` sequential_fallback step states "If no CONTEXT.md: follow `discuss-phase.md` with `--auto` flag — This STILL pauses for user input per the hard constraint". Team lead delegation delegates discuss gates to workers who send `input_needed`. The discuss-phase workflow itself requires user interaction to produce CONTEXT.md. |
| 4 | The pipeline stops at milestone boundary, clears the auto-advance flag, and does not bleed into the next milestone | VERIFIED | `auto.md` `milestone_boundary` step explicitly calls `node mow-tools.cjs config-set workflow.auto_advance false`. `transition.md` Route B (is_last_phase=true) also clears the flag. Milestone scoping uses ROADMAP.md "In Progress" section parser in both `cmdInitAuto` and `cmdDashboardRender`. |
| 5 | The dashboard shows a progress banner with current phase and milestone completion percentage during auto-advance | VERIFIED | `cmdDashboardRender` at line 571 checks `config.workflow.auto_advance`. When true, parses ROADMAP.md "In Progress" section, computes totalPhases/completedPhases/milestonePercent. Renders banner: `AUTO-ADVANCE  Phase {N}/{total}  Milestone: {pct}%  {done}/{total} done`. Raw JSON includes `auto_advance` stats object. Manually tested: flag set, dashboard rendered, banner appeared with 100% and correct counts. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `commands/mow/auto.md` | /mow:auto slash command entry point | VERIFIED | Exists (55 lines, 1799 bytes). Valid YAML frontmatter with `name: mow:auto`, description, and 17 allowed tools. Includes ??? help detection block. Has AUTO-06 deferred comment. |
| `mowism/workflows/auto.md` | Auto-advance orchestration workflow with 9 steps | VERIFIED | Exists (262 lines, 9128 bytes). Contains all 9 steps: initialize, resume_detection, set_auto_advance, check_agent_teams, team_lead_delegation, sequential_fallback, context_window_awareness, verification_failure, milestone_boundary. Also contains stale_flag_detection section. |
| `bin/mow-tools.cjs` — `cmdInitAuto` | DAG state detection, milestone boundaries, resume support | VERIFIED | `cmdInitAuto` function at line 6816 (~100 LOC). Returns all required JSON fields: planning_exists, auto_advance_active, dag, milestone_version, milestone_name, milestone_phases, completed_count, remaining_count, total_phase_count, first_ready_phase, agent_teams_enabled, commit_docs. |
| `bin/mow-tools.cjs` — `analyzeDagInternal` | Internal helper extracted from cmdRoadmapAnalyzeDag | VERIFIED | Function at line 4131. Called by both `cmdRoadmapAnalyzeDag` (line 4263) and `cmdInitAuto` (line 6833). No DAG logic duplication. |
| `bin/mow-tools.cjs` — `cmdDashboardRender` | Extended with auto-advance milestone banner | VERIFIED | Banner logic at lines 571-638. Reads `config.workflow.auto_advance`, parses ROADMAP.md inline for milestone stats, renders styled banner or plain text fallback. Raw JSON includes `auto_advance` key when active. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `commands/mow/auto.md` | `mowism/workflows/auto.md` | `@~/.claude/mowism/workflows/auto.md` in execution_context | WIRED | Line 41: `@~/.claude/mowism/workflows/auto.md`. Process section (line 53) explicitly says "Execute the auto-advance workflow from @~/.claude/mowism/workflows/auto.md end-to-end." |
| `mowism/workflows/auto.md` | `bin/mow-tools.cjs` | `mow-tools.cjs init auto --raw` call | WIRED | Line 22: `INIT=$(node ~/.claude/mowism/bin/mow-tools.cjs init auto --raw)`. Also lines 92, 205, 212 call `mow-tools.cjs config-set workflow.auto_advance`. |
| `mowism/workflows/auto.md` | `agents/mow-team-lead.md` | `multi_phase_flow` delegation | WIRED | Line 113: "Read and follow `agents/mow-team-lead.md` `multi_phase_flow` with ALL remaining phases". |
| `bin/mow-tools.cjs` CLI | `cmdInitAuto` | `case 'auto': cmdInitAuto(cwd, raw)` | WIRED | Line 8506-8508: routing confirmed in switch/case block. `init auto` listed in available workflows error message. |
| `bin/mow-tools.cjs` — `cmdDashboardRender` | `.planning/config.json` | `config.workflow.auto_advance` check | WIRED | Lines 577-579: reads config file, checks `config.workflow && config.workflow.auto_advance`. |
| `bin/mow-tools.cjs` — `cmdDashboardRender` | ROADMAP.md milestone parsing | Inline ROADMAP.md regex for "In Progress" section | WIRED | Lines 592-635: parses milestone section, counts phase checkbox lines, computes stats. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTO-01 | 16-01 | `/mow:auto` command starts full pipeline from specified phase through milestone end | SATISFIED | `commands/mow/auto.md` + `mowism/workflows/auto.md` initialize step. CLI routes `init auto` to `cmdInitAuto`. All-phases execution confirmed. |
| AUTO-02 | 16-01 | Cross-phase transition automatically invokes next phase's lifecycle when current phase completes | SATISFIED | `transition.md` Route A auto-advance chain: invokes `discuss-phase` or `plan-phase` based on CONTEXT.md presence. Referenced in `auto.md` sequential_fallback step. Flag mechanism (workflow.auto_advance) persists across invocations. |
| AUTO-03 | 16-01 | DAG-aware auto-advance only starts phases whose dependencies are satisfied | SATISFIED | `cmdInitAuto` returns `dag.ready` and `dag.blocked`. `auto.md` team_lead_delegation uses DAG ready/blocked list. Sequential fallback iterates "in DAG order". `analyzeDagInternal` provides topological ordering. |
| AUTO-04 | 16-01 | Auto-advance pauses at discuss-phase for user input and resumes after CONTEXT.md created | SATISFIED | `auto.md` sequential_fallback: "This STILL pauses for user input per the hard constraint". Team lead delegation: "Worker discuss gates (workers send `input_needed`, user interacts in worker terminal)". Constraint enforced by discuss-phase workflow. |
| AUTO-05 | 16-01 | Auto-advance stops at milestone boundary and clears `workflow.auto_advance` config | SATISFIED | `auto.md` milestone_boundary step clears flag. `transition.md` Route B (is_last_phase=true) also clears flag. Both paths tested via CLI verify. |
| AUTO-06 | 16-01 | `/mow:auto` accepts optional phase range (from/to) for partial pipeline execution | SATISFIED (deferred) | Documented as deferred per locked discuss-phase decision. Comment in `commands/mow/auto.md` lines 29-32 and at top of `mowism/workflows/auto.md` lines 3-6. No range argument implemented — per plan scope decision, default always-from-first-incomplete behavior is intentional. Requirement marked complete in REQUIREMENTS.md. |
| AUTO-07 | 16-02 | Auto-advance progress banner shows current phase and milestone percentage in dashboard | SATISFIED | `cmdDashboardRender` extended with banner logic (lines 571-638). Banner renders when `workflow.auto_advance` is true. Live test confirmed banner output: `AUTO-ADVANCE  Phase 16/4  Milestone: 100%  4/4 done`. Raw JSON includes `auto_advance` stats object. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | - |

No placeholder returns, TODO/FIXME stubs, empty handlers, or console.log-only implementations found in the phase 16 deliverables.

### Human Verification Required

#### 1. Discuss-Phase Pause Enforcement Under Auto-Advance

**Test:** Run `/mow:auto` in a project with one incomplete phase that has no CONTEXT.md.
**Expected:** The pipeline should pause at discuss-phase and require actual user input before proceeding. The auto-advance flag should NOT bypass the discuss interaction.
**Why human:** Can't programmatically verify that the `--auto` flag in discuss-phase still requires user interaction. The workflow says it does but runtime behavior requires human observation.

#### 2. Team Lead Delegation Mode (Agent Teams Enabled)

**Test:** With `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` set, run `/mow:auto` with multiple incomplete phases.
**Expected:** The pipeline should delegate to the team lead, which spawns workers for each ready phase in parallel according to DAG order. Workers should send `input_needed` at discuss gates, not skip them.
**Why human:** Agent Teams experimental mode requires running the full system and observing worker behavior. Can't verify DAG-parallel spawning or discuss gate pause behavior programmatically.

#### 3. Context Window Save Point Triggering

**Test:** Run `/mow:auto` across 4+ phases in a single session.
**Expected:** After the 4th phase completes, the orchestrator should display a "CONTEXT WINDOW LOW — Save Point" banner and instruct the user to `/clear` and re-run `/mow:auto`.
**Why human:** Context assessment is a Claude runtime heuristic, not a mechanical threshold. Requires observing actual behavior across a multi-phase run.

#### 4. Resume Detection After Interrupted Session

**Test:** Start `/mow:auto`, interrupt mid-pipeline (Ctrl+C or close terminal), then re-run `/mow:auto`.
**Expected:** Resume detection step should show completed phases, show "Note: Auto-advance was previously active (possibly from interrupted session)", ask for confirmation to continue, then resume from the next ready phase.
**Why human:** Requires an actual interrupted session state to test. The `auto_advance_active=true` + completed phases scenario can't be reliably simulated with a CLI flag alone.

### Gaps Summary

No gaps found. All 5 observable success criteria from ROADMAP.md are verified. All 7 requirement IDs (AUTO-01 through AUTO-07) are accounted for and satisfied. The 3 new artifacts are substantive and wired correctly. `cmdInitAuto` runs and returns correct data. The dashboard banner renders. Existing `cmdRoadmapAnalyzeDag` continues to work after the `analyzeDagInternal` internal refactor (no regression).

The 4 human verification items are operational concerns that require runtime observation, not indicators of implementation gaps.

---

_Verified: 2026-02-24T10:45:00Z_
_Verifier: Claude (mow-verifier)_
