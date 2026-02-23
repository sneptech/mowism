# Domain Pitfalls: v1.2 Native Worktrees, Full-Lifecycle Workers, Auto-Advance, GSD Cherry-Pick

**Domain:** Adding native worktree isolation, full-lifecycle workers, nested agent delegation, auto-advance pipeline, and upstream bugfix cherry-picks to an existing multi-agent CLI orchestration system (Mowism)
**Researched:** 2026-02-24
**Supersedes:** v1.1 PITFALLS.md (2026-02-20) -- v1.1 pitfalls (concurrent state, context exhaustion, DAG cycles, etc.) remain valid and are not repeated here. This document covers NEW pitfalls specific to v1.2's changes.
**Overall confidence:** HIGH (grounded in codebase analysis, official Claude Code docs, pre-existing delegation/upstream research, and v1.1 operational experience)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken coordination, or data loss. Each targets a specific v1.2 feature area.

---

### Pitfall 1: Native Worktree Isolation Creates Worktrees in a Different Location Than Mowism Expects

**What goes wrong:**
Claude Code's `isolation: worktree` creates worktrees at `.claude/worktrees/<name>`. Mowism's entire coordination layer -- manifest tracking, claim table, merge orchestration, stash/restore, STATUS.md initialization -- assumes worktrees live at `.worktrees/p{NN}` in the repo root. After switching to native worktree isolation, the manifest JSON tracks paths in `.worktrees/` but actual worktrees exist in `.claude/worktrees/`. The `worktree claim` function reads from manifest, finds a path that does not exist on disk, and treats the claim as stale. The `worktree merge` function tries to merge branch `phase-{NN}` but the branch was created by Claude Code with a different naming convention (auto-generated slug, not `phase-{NN}`). The `close-shop` workflow tries to iterate `.worktrees/` to find phase worktrees, finds nothing, and reports "no active worktrees."

**Why it happens:**
`cmdWorktreeCreate` in mow-tools.cjs (line 6610-6724) hardcodes the path pattern `.worktrees/p{NN}` and the branch naming convention `phase-{NN}`. It also runs `cp -r .planning/` and `status init` in the new worktree. Claude Code's native `isolation: worktree` handles worktree creation entirely on its own -- different path, different branch name, no planning copy, no STATUS.md init. The two systems have incompatible assumptions about where worktrees live and how they are named.

Additionally, `isolation: worktree` in subagent frontmatter means the worktree is created AND cleaned up automatically when the subagent finishes. If the subagent makes no changes, the worktree is auto-deleted. This conflicts with Mowism's pattern of keeping worktrees alive after phase completion for inspection, deferred context capture, and manual merge.

**Consequences:**
- Manifest JSON is out of sync with actual worktree locations -- every manifest-based operation fails
- `worktree merge`, `worktree release`, `worktree-status`, `close-shop` all break
- `.planning/` is not copied to native worktrees -- workers start without phase plans, STATE.md, or config
- STATUS.md is not initialized -- worker messaging protocol that depends on STATUS.md breaks
- Auto-cleanup deletes worktrees before close-shop can capture deferred items or merge
- Branch naming mismatch means merge operations target nonexistent branches

**Prevention:**
1. **Use WorktreeCreate/WorktreeRemove hooks, not `isolation: worktree` frontmatter.** The hooks (v2.1.50) receive `{name, path}` via stdin JSON and let Mowism control the worktree lifecycle. The WorktreeCreate hook runs Mowism's creation logic (create at `.worktrees/p{NN}`, copy `.planning/`, init STATUS.md, update manifest) and outputs the worktree path to stdout. Claude Code then uses that path. This preserves native integration while keeping Mowism's coordination intact.
2. **Alternatively, update `cmdWorktreeCreate` to accept arbitrary paths.** If we want subagents to use `isolation: worktree`, adapt the manifest system to track whatever path Claude Code provides. The WorktreeCreate hook bridges the gap: it receives the path from Claude Code and registers it in the manifest. But this requires refactoring every function that hardcodes `.worktrees/p{NN}`.
3. **Do NOT use `isolation: worktree` on subagent YAML frontmatter for phase workers.** Phase workers need long-lived worktrees that survive the subagent lifecycle. `isolation: worktree` auto-cleans up. Instead, create worktrees BEFORE spawning the teammate (current pattern) and point the teammate at the pre-created worktree.
4. **For plan-level executor subagents inside a phase worker,** `isolation: worktree` is fine IF the executor only needs temporary isolation within the phase worker's branch. But currently executors work within the phase worker's worktree (not their own) -- they share the worker's workspace. Adding worktree-per-executor would create 6 phases x 4 plans = 24 worktrees, which is the disk space explosion from v1.1 Pitfall 12.

**Detection:**
- `node mow-tools.cjs worktree list-manifest` shows entries but `ls .worktrees/` is empty
- Workers report "phase directory not found" or "no plans found" at startup
- `close-shop` reports "no active worktrees to merge"
- `git worktree list` shows worktrees at `.claude/worktrees/` not tracked by manifest

**Phase to address:** First phase (native worktree adoption). This must be resolved before any other v1.2 feature can work. The WorktreeCreate/WorktreeRemove hook approach is recommended.

**Confidence:** HIGH -- verified by reading `cmdWorktreeCreate` (hardcoded paths at line 6616), official Claude Code docs (isolation: worktree creates at `.claude/worktrees/`), and WorktreeCreate hook docs (v2.1.50, receives JSON with path).

---

### Pitfall 2: Removing Too Much Custom Worktree Code (Simplification Overshoot)

**What goes wrong:**
The simplification pass sees that Claude Code now handles worktree creation natively and removes `cmdWorktreeCreate`, the manifest system, and the `.planning/` copy hook. But the native feature ONLY creates git worktrees -- it does not: track phase-to-worktree mapping (manifest), prevent duplicate claims (claim table in STATE.md), merge worktrees back with conflict detection (`worktree merge`), stash/restore interrupted work (`worktree stash`), initialize per-phase STATUS.md, copy `.planning/` context files, or coordinate close-shop cleanup. After the simplification, workers get clean worktrees with no project state, no one tracks which worktree runs which phase, merge requires manual git commands, and crash recovery loses the stash/restore path.

**Why it happens:**
The simplification goal ("remove redundant worktree code where Claude Code handles natively") is ambiguous about what counts as "redundant." The temptation is to replace the entire `cmdWorktreeCreate` function (and its 100+ lines) with a one-liner `isolation: worktree`. But `cmdWorktreeCreate` does 5 things: (1) create git worktree, (2) copy `.planning/`, (3) init STATUS.md, (4) update manifest, (5) handle reuse/stash-restore. Only step (1) is redundant with native support. Steps 2-5 are the coordination layer that has no native equivalent.

**Consequences:**
- Phase-to-worktree mapping is lost -- orchestrator cannot track which phase runs where
- No duplicate phase prevention -- two workers can claim the same phase
- Merge workflow breaks -- `worktree merge` depends on manifest entries
- Crash recovery degrades -- no stash/restore capability for interrupted work
- STATUS.md not initialized -- worker messaging protocol breaks from first message

**Prevention:**
1. **Enumerate every function the custom code provides.** Before removing anything, create a capabilities matrix:

   | Capability | Custom code | Native support | Gap |
   |-----------|------------|---------------|-----|
   | Create git worktree | cmdWorktreeCreate | isolation: worktree | None |
   | Copy .planning/ | cmdWorktreeCreate | None | KEEP |
   | Init STATUS.md | cmdWorktreeCreate | None | KEEP |
   | Track in manifest | cmdWorktreeCreate + manifest | None | KEEP |
   | Claim prevention | worktree claim | None | KEEP |
   | Merge orchestration | worktree merge | None | KEEP |
   | Stash/restore | worktree stash | None | KEEP |

2. **Remove ONLY the git worktree creation step.** Replace `git worktree add` (line 6663) with delegation to Claude Code's native mechanism via hooks. Keep everything else.
3. **Ship the simplification as a separate phase from the feature additions.** If simplification and new features ship together, regressions from over-removal are masked by new code. Simplify first, verify coordination still works, then add new features.
4. **Write integration tests before removing code.** The test creates a worktree, verifies manifest, verifies `.planning/` copy, verifies STATUS.md, verifies claim, verifies merge. Run after simplification to catch regressions.

**Detection:**
- `worktree list-manifest` returns empty or stale data
- Workers cannot find `.planning/` directory at startup
- Two workers execute the same phase simultaneously
- `close-shop` merge step fails because manifest has no entries

**Phase to address:** Simplification pass phase. Must happen AFTER native worktree adoption phase establishes the hook bridge, and BEFORE full-lifecycle workers depend on the coordination layer.

**Confidence:** HIGH -- the capabilities matrix can be built directly from reading `cmdWorktreeCreate` (lines 6610-6724), `cmdWorktreeClaim` (line 6928), `cmdWorktreeMerge` (line 6731), and `cmdWorktreeStash` (line 6769).

---

### Pitfall 3: Full-Lifecycle Workers Accumulate 200k+ Tokens Across 4-5 Subagent Chains

**What goes wrong:**
A phase worker (teammate) runs the full lifecycle: discuss -> research -> plan -> execute -> refine. Each stage spawns 1+ Task() subagents. Each subagent returns its results to the parent worker's context. After 4-5 stages:
- Discuss returns a CONTEXT.md (~2k tokens)
- Research returns a RESEARCH.md (~5k tokens)
- Planning returns 3-4 PLAN.md files (~15k tokens total)
- Execution returns 3-4 SUMMARY.md files (~8k tokens) plus intermediate reasoning
- Refinement returns quality assessment (~3k tokens)

The worker accumulates ~33k tokens of subagent return content plus its own reasoning (~20k per stage), tool call overhead (~5k per subagent spawn), and the initial system prompt + agent definition (~10k). Total: ~110k-150k tokens before the last stage (refinement) even starts. Auto-compaction kicks in and lossily compresses earlier stages. The worker forgets decisions made during discussion, plans created during planning, or commit hashes from execution. The refinement stage operates with degraded context and produces incoherent quality assessments.

**Why it happens:**
Subagent return values flow into the parent's context window. The nested delegation research (v1.2-NESTED-DELEGATION.md) flagged this: "collecting results from 4+ subagents across full lifecycle grows context." The v1.1 system avoided this because workers only executed (1 stage). Full-lifecycle workers make context accumulation 4-5x worse. Each stage NEEDS the results from prior stages (the planner needs discuss decisions; the executor needs plans; the refiner needs execution results). You cannot simply discard prior stage results.

Anthropic's own multi-agent research system uses 15x token usage vs single-agent chat. With 6 phase workers doing full lifecycle, token usage could reach 6 * 15x = 90x, or approximately $60-180 per milestone run depending on model mix.

**Consequences:**
- Workers make decisions inconsistent with earlier stages (forgot discuss decisions during execution)
- Quality assessment in refinement is incoherent (forgot what was executed)
- Token cost explodes: 30 subagent spawns at Opus rates = ~$15-30 per phase, ~$90-180 per milestone
- Auto-compaction noise: workers repeatedly re-read files they already processed because context was compressed

**Prevention:**
1. **Minimize subagent return content.** Subagents write their outputs to DISK (CONTEXT.md, RESEARCH.md, PLAN.md, SUMMARY.md) and return only a 1-2 line summary + file path. The worker reads from disk when it needs detail for the next stage. This keeps subagent returns at ~500 tokens each instead of ~5k-15k.
2. **Route read-only stages to Haiku.** Research subagents do not modify code. Use `model: haiku` for research and planning stages. Only execution and refinement need Opus/Sonnet. The nested delegation research confirms this: "Use Haiku for read-only research."
3. **Checkpoint between stages.** After each lifecycle stage, the worker writes a summary to STATUS.md and reads it back at the next stage. If auto-compaction triggers, the worker can reconstruct its state from STATUS.md + the files on disk. This is the disk-first pattern from v1.1 Pitfall 2.
4. **Consider breaking full-lifecycle into 2 workers.** Instead of 1 worker doing all 5 stages, use 2 workers per phase: Worker A (discuss + research + plan) and Worker B (execute + refine). Worker A completes and its worktree is available for Worker B to read. This halves per-worker context accumulation. The downside: 2x more workers, higher orchestration overhead.
5. **Set `maxTurns` on each subagent.** Prevent research subagents from running 50+ turns exploring tangential code. Cap research at 20 turns, planning at 30, execution per plan at 50.

**Detection:**
- Worker's later-stage outputs reference wrong files or outdated decisions
- Worker re-reads files it already processed (sign of post-compaction confusion)
- Token usage per milestone exceeds $100 (with Opus-heavy workers)
- Workers take >30 minutes per phase (context degradation causes thrashing)

**Phase to address:** Full-lifecycle workers phase. The "minimize return content" and "route to Haiku" strategies must be baked into the worker agent definition from the start.

**Confidence:** HIGH -- token math is straightforward, and the v1.2-NESTED-DELEGATION.md research explicitly flagged this risk with the same analysis.

---

### Pitfall 4: Discuss Phase Skipped or Auto-Approved in Autonomous Pipeline

**What goes wrong:**
The v1.2 HARD CONSTRAINT says "discuss phase ALWAYS pauses for user input." But the full-lifecycle worker runs discuss -> plan -> execute autonomously. If the phase has no CONTEXT.md, the worker spawns a discuss subagent. The discuss workflow uses `AskUserQuestion` to present gray areas. But the subagent is a Task() call from the worker, which cannot relay `AskUserQuestion` prompts to the user in the same way an interactive session can.

Two failure modes:
1. **AskUserQuestion fails silently in Task() subagent.** The subagent cannot ask the user questions (it's not in an interactive terminal), so it either skips the discussion, fabricates answers, or blocks indefinitely.
2. **Auto-advance config is set to `true` (from a previous session).** The `workflow.auto_advance` flag in config.json persists across sessions. The discuss workflow checks `AUTO_CFG` and, if true, spawns plan-phase as Task() without waiting for user input. The pipeline proceeds without discuss-phase ever pausing.

The user's v1.2 scope explicitly says this must never happen: "HARD CONSTRAINT: discuss phase ALWAYS pauses for user input."

**Why it happens:**
The discuss-phase workflow (discuss-phase.md, lines 430-476) has an `auto_advance` step that chains directly to plan-phase when `--auto` flag or `AUTO_CFG` is true. This was designed for the v1.0 single-session flow where the user is present. In the v1.2 multi-agent flow, the worker is autonomous -- there is no user watching the discuss terminal unless explicitly routed there.

Additionally, `AskUserQuestion` behavior inside Task() subagents is defined by the subagent's execution context. The mow-phase-worker already handles this (step 2 sends `input_needed` to lead and waits), but if the discuss WORKFLOW is invoked as a subagent rather than inline by the worker, the `input_needed` protocol may not fire.

**Consequences:**
- Discuss phase produces no CONTEXT.md or a fabricated one, leading to plans that miss user intent
- User discovers the problem only after execution, requiring a replan and re-execute
- The "full-lifecycle autonomous workers" feature undermines the core user input guarantee
- Trust erosion: if auto-advance bypasses the discuss gate once, users lose confidence in the pipeline

**Prevention:**
1. **Clear `workflow.auto_advance` at team startup.** When the team lead starts a multi-phase session, explicitly disable auto-advance: `config-set workflow.auto_advance false`. Auto-advance is a single-session feature; it must not persist into multi-agent sessions.
2. **Discuss runs INLINE in the worker, not as a subagent.** The worker follows the discuss-phase workflow directly (not via Task()) so that `AskUserQuestion` becomes `input_needed` message to lead -> worker pauses -> user switches to terminal -> user answers. This is the pattern already in mow-phase-worker.md step 2.
3. **Add a guard in discuss-phase workflow.** Check for multi-agent context (e.g., STATUS.md exists, or `$AGENT_TEAMS_ACTIVE` is set). If in multi-agent mode, NEVER auto-advance from discuss. Always pause for user input, regardless of `--auto` flag.
4. **Validate CONTEXT.md is human-authored.** After discuss completes, the worker checks that CONTEXT.md contains actual decisions (not just "Claude's Discretion" for every area). If all decisions are "Claude's Discretion," flag this as a potential auto-skip and send `input_needed`.
5. **Implement a discuss-phase bypass register.** If a phase's ROADMAP.md description indicates "pure infrastructure" or "no user-facing decisions," the roadmapper can annotate `discuss: skip` in the phase metadata. This is the ONLY way to bypass discuss, and it's set at roadmap creation time, not at runtime.

**Detection:**
- CONTEXT.md created without any `input_needed` message in the lead's event log
- CONTEXT.md has "Claude's Discretion" for every decision area
- Phase timeline shows discuss-phase completed in <1 minute (too fast for real user interaction)
- `config.json` shows `auto_advance: true` during a multi-agent session

**Phase to address:** Auto-advance pipeline phase, with guards also added during full-lifecycle workers phase. The `auto_advance` clearing must happen in the team lead's startup sequence.

**Confidence:** HIGH -- the auto-advance logic is clearly visible in discuss-phase.md (lines 430-476) and the HARD CONSTRAINT is explicit in the v1.2 scope.

---

### Pitfall 5: Subagents in Task() Cannot Resolve /mow: Skills or Slash Commands

**What goes wrong:**
The full-lifecycle worker needs to run discuss-phase, plan-phase, and execute-phase. If it delegates these as Task() subagents, the subagents cannot invoke `/mow:discuss-phase` or `/mow:plan-phase` as slash commands. Skills and slash commands are resolved in the main Claude Code session context, not inside Task() subagents. The subagent sees the command as plain text, not an executable workflow.

The v1.2-NESTED-DELEGATION.md research confirmed this: "Skills don't resolve in Task() subagents -- must use @file references, not `/mow:` commands."

**Why it happens:**
Claude Code slash commands (`/mow:*`) are defined in `commands/mow/*.md` which Claude Code discovers and registers at session startup. Subagents spawned via Task() do not inherit this command registry. They are isolated execution contexts with only the tools, skills, and system prompt specified in their definition. The `@file` reference mechanism does work in Task() prompts (it inlines the file content), but `/mow:command` does not.

**Consequences:**
- Subagent attempts to run `/mow:plan-phase 7` and it fails or is treated as literal text
- The subagent may try to "interpret" the command by reading the workflow file itself and following it step-by-step, but this is fragile and misses initialization logic from mow-tools.cjs
- The worker falls back to ad-hoc implementation of workflow steps, producing inconsistent results

**Prevention:**
1. **Use @file references for workflow injection.** Instead of telling the subagent to "run /mow:plan-phase", include `@~/.claude/mowism/workflows/plan-phase.md` in the Task() prompt. The workflow content is inlined into the subagent's context.
2. **Workers run lifecycle stages INLINE, not via nested Task().** The worker reads the workflow file directly and follows it, using Task() only for leaf-level operations (spawning mow-executor, mow-verifier, mow-phase-researcher). This is the pattern already used in execute-phase.md: the orchestrator follows the workflow, spawning executor subagents for individual plans.
3. **Define dedicated subagent types for each lifecycle stage.** Create `mow-discuss-driver`, `mow-plan-driver`, etc. as agent YAML files with the relevant workflow content as the system prompt. The worker spawns `Task(subagent_type="mow-plan-driver")` instead of trying to invoke a slash command.
4. **The mow-phase-worker agent definition (agents/mow-phase-worker.md) already handles this correctly** for execution (spawns mow-executor). Extend the same pattern to discuss and plan stages.

**Detection:**
- Worker logs show "/mow:plan-phase" as plain text, not as command invocation
- Worker output includes "command not found" or "unknown skill" errors
- Worker tries to manually replicate workflow logic and misses critical steps (like `mow-tools.cjs init`)

**Phase to address:** Full-lifecycle workers phase. The worker agent definition must specify how each lifecycle stage is invoked (inline workflow vs subagent type), and this must be validated during the planning of that phase.

**Confidence:** HIGH -- confirmed in v1.2-NESTED-DELEGATION.md: "Skills don't resolve in Task() subagents."

---

### Pitfall 6: Runaway Auto-Advance Pipeline Without Cost or Duration Limits

**What goes wrong:**
The auto-advance pipeline chains: discuss -> plan -> execute -> transition -> next discuss -> ... for each phase. With full-lifecycle workers running autonomously, the pipeline can run for hours across 6+ phases, consuming millions of tokens, without any human checkpoint. The user starts `/mow:new-project --auto` expecting to review progress periodically, goes to lunch, and returns to find $200+ in API charges and a codebase full of hallucinated code from late-stage context degradation.

The current auto-advance mechanism has no cost limit, no duration limit, no phase count limit, and no periodic "are you still there?" check. The only stop point is milestone completion (transition.md line 456 clears auto_advance at milestone boundary) or a verification failure with gaps.

**Why it happens:**
The auto-advance was designed for supervised use: the user watches the session and intervenes when needed. In v1.2, with full-lifecycle workers running in the background, the pipeline can run unsupervised for extended periods. The chain propagates via `--auto` flag through discuss -> plan -> execute -> transition -> discuss, with each workflow reading `workflow.auto_advance` from config.json and proceeding.

Additionally, verification failure is the only automatic stop mechanism. If verification passes (even incorrectly -- the verifier may miss issues due to context degradation), the pipeline continues to the next phase.

**Consequences:**
- Uncontrolled token spend: 6 phases * 30 subagent spawns * ~5k tokens/spawn = 900k tokens minimum, potentially 2-5M tokens with context accumulation
- Late-phase quality degradation: context degradation syndrome means later phases produce worse code
- Difficult to roll back: 6 phases of committed code, potentially 20+ commits, that need review
- User trust erosion: "I can't leave it running because it might burn $200"

**Prevention:**
1. **Add cost estimation before auto-advance start.** Before entering auto-advance mode, estimate the total cost: `phases_remaining * avg_subagents_per_phase * avg_tokens_per_subagent * cost_per_token`. Present to user: "Estimated cost: $X-Y for N phases. Continue?"
2. **Add per-phase cost tracking.** Track cumulative token usage per phase (Claude Code does not expose this natively, but the worker can estimate by counting subagent spawns). If cumulative cost exceeds a configurable threshold (default: $50), pause and notify user.
3. **Add duration limit.** If a single phase takes >30 minutes, pause the pipeline and notify user. Phase execution durations from v1.0/v1.1 averaged 2-5 minutes per plan, so >30 minutes suggests something is wrong.
4. **Add periodic checkpoint.** Every 3 phases (configurable), pause auto-advance and present a summary to user: "Completed phases X, Y, Z. Total estimated cost: $N. Results look reasonable? Continue?"
5. **Separate auto-advance from autonomous workers.** Auto-advance is a SINGLE-SESSION feature that chains workflows. Full-lifecycle workers are a MULTI-AGENT feature. They should not both be active simultaneously. When workers run autonomously, the lead coordinates phase transitions -- not auto-advance config. Clear `auto_advance` when entering multi-agent mode.

**Detection:**
- Session running for >1 hour with no user interaction
- Token usage counter (if available) exceeding threshold
- Multiple phases completing without any user checkpoint
- Late-phase commit quality visibly worse than early-phase commits

**Phase to address:** Auto-advance pipeline phase. Cost estimation and duration limits must be part of the auto-advance design. The separation from multi-agent mode must be enforced in the team lead startup.

**Confidence:** HIGH -- the auto-advance chain is fully traceable through the codebase: discuss-phase.md auto_advance -> plan-phase -> execute-phase auto_advance -> transition.md -> discuss-phase --auto.

---

## Moderate Pitfalls

Mistakes that cause significant rework or degraded quality, but not full architectural breaks.

---

### Pitfall 7: GSD Cherry-Pick Introduces Regressions Due to Diverged Code Patterns

**What goes wrong:**
The v1.2-GSD-UPSTREAM-DIFF.md identifies 9 must-port bugs. Several reference specific line numbers and function names in `gsd-tools.cjs`. But Mowism's `mow-tools.cjs` has diverged significantly: renamed functions, restructured sections, different variable names, added capabilities (worktree management, DAG scheduling, team tracking, color assignment). A cherry-pick from GSD's PR does not apply cleanly. Manual porting requires understanding both codebases' patterns and translating between them.

Specific risks:
- **PR #701 (dollar sign corruption):** The fix uses callback replacers in `String.replace()`. Mowism may have already applied the same pattern in some places but not others, or may have additional `replace()` calls that GSD doesn't have.
- **PR #702 (requirement IDs):** GSD's `cmdInitPlanPhase` and `cmdInitExecutePhase` were refactored in Mowism to support DAG scheduling. The fix location in GSD may not correspond to the same function structure in Mowism.
- **PR #512 (feature branch timing):** Mowism's branching strategy handling was modified for worktree-per-phase. The "create branch earlier" fix may conflict with the worktree branching model.
- **v1.19.2 (executor attempt limit):** Mowism's executor subagent is defined differently (mow-executor agent YAML, not inline). Adding an attempt limit requires modifying the agent definition, not just a workflow file.

**Why it happens:**
24 releases of GSD in February 2026 while Mowism diverged on a different architectural path. The codebases share an ancestor but no longer share code patterns. Line numbers, function signatures, and even the module structure (GSD split gsd-tools into 11 modules; Mowism kept a monolith) are different. Cherry-picking assumes the target codebase has similar structure to the source.

**Consequences:**
- Patch applies but breaks adjacent functionality due to surrounding code differences
- Variable name mismatches cause silent failures (bug "fixed" but using wrong variable)
- Tests from GSD don't apply (Mowism has no test suite for mow-tools.cjs)
- Regressions discovered only during execution, not during porting

**Prevention:**
1. **Port the BUG FIX LOGIC, not the code.** For each GSD fix, understand what was broken and why. Then find the corresponding code in Mowism and apply the same fix pattern. Do not `git cherry-pick` from GSD -- write new code in Mowism's idioms.
2. **Create a test case for each bug BEFORE fixing it.** For PR #701 (dollar sign): create a state entry with `$1` in the text, run the state mutator, verify the output is correct. For PR #715 (progress bar): create an orphaned SUMMARY file, run progress bar computation, verify no RangeError. The test verifies the bug exists, then verifies the fix works.
3. **Port in priority order, not batch.** Fix the easiest bugs first (progress bar RangeError, dollar sign corruption) to build confidence. Save the harder ones (requirement IDs, executor attempt limit) for later when the pattern is established.
4. **Review each fix in isolation.** One commit per bug. Each commit message references the GSD PR number and describes what was ported. This creates a clear audit trail for debugging regressions.

**Detection:**
- `String.replace()` calls in mow-tools.cjs that don't use callback replacers (dollar sign vulnerability)
- `Math.min()` absent from percent computation sites (progress bar vulnerability)
- Running `grep -n 'replace(' bin/mow-tools.cjs` and auditing each site

**Phase to address:** GSD cherry-pick phase. Should be its own phase, not mixed with other feature work.

**Confidence:** HIGH -- the v1.2-GSD-UPSTREAM-DIFF.md provides specific bug descriptions and file locations, and the divergence is confirmed by comparing mow-tools.cjs structure against GSD's modularized codebase.

---

### Pitfall 8: Worktree Hooks Fire for ALL Subagent Worktrees, Not Just Phase Workers

**What goes wrong:**
If Mowism installs a WorktreeCreate hook that copies `.planning/` and initializes STATUS.md, this hook fires for EVERY subagent that uses `isolation: worktree` -- not just phase workers. If a research subagent, plan-checker subagent, or any other subagent uses worktree isolation, it gets the full `.planning/` copy and STATUS.md initialization. This wastes time, disk space, and potentially confuses subagents that see `.planning/` state they should not be reading.

Worse: the WorktreeRemove hook runs when subagents complete. If the hook updates the manifest to remove the worktree entry, it may remove a phase worker's entry if the subagent happened to reuse a similar name.

**Why it happens:**
WorktreeCreate/WorktreeRemove hooks "do NOT support matchers and fire once per worktree lifecycle event." There is no way to filter by subagent type or purpose. Every worktree creation triggers the hook. The hook receives `{name, path}` but cannot distinguish "this is a phase worker worktree" from "this is a temporary research subagent worktree."

**Consequences:**
- Research subagents get `.planning/` copy they don't need (wasted disk, wasted copy time)
- STATUS.md initialized for non-worker worktrees (confusing state)
- Manifest bloated with entries for temporary subagent worktrees
- WorktreeRemove hook might accidentally delete manifest entries for long-lived phase worktrees

**Prevention:**
1. **Use a naming convention to distinguish phase worktrees.** Phase worker worktrees are named `p{NN}` (e.g., `p07`). The WorktreeCreate hook checks the `name` field: if it matches `p\d+`, run the full initialization. Otherwise, skip.
2. **Do NOT install WorktreeCreate hooks globally.** Only install them in the team lead's session configuration, not in project-level settings. This limits the hook to multi-agent contexts where Mowism is orchestrating.
3. **Keep phase worktree creation in `cmdWorktreeCreate`.** Do NOT rely on the hook mechanism for phase worktrees. Create them explicitly before spawning workers (current pattern). Use `isolation: worktree` ONLY for subagents that need temporary isolation (if at all).
4. **Manifest write operations should be idempotent and conflict-safe.** The WorktreeRemove hook should only remove entries that the WorktreeCreate hook created (tracked by a `source: hook` field in the manifest entry).

**Detection:**
- `worktree list-manifest` shows entries for temporary subagent worktrees (not just phase worktrees)
- Disk usage grows unexpectedly during research/planning stages
- WorktreeRemove errors when trying to clean up entries that don't exist

**Phase to address:** Native worktree adoption phase. The naming convention and hook filtering must be established before any subagent uses `isolation: worktree`.

**Confidence:** MEDIUM -- the hook behavior (no matchers, fires for all worktrees) is confirmed in official docs. The naming convention mitigation is a design choice that needs validation.

---

### Pitfall 9: Nested Subagent Spawn Attempts Cause OOM Crashes

**What goes wrong:**
A full-lifecycle worker (teammate) spawns a Task() subagent for planning. The planning subagent, following the plan-phase workflow, tries to spawn its own Task() subagent for research or plan-checking. Since "subagents CANNOT spawn subagents" (enforced since v1.0.64), this causes an OOM crash or silent failure. The planning workflow in plan-phase.md explicitly spawns researcher and checker subagents -- this works when plan-phase runs in the main session, but fails when plan-phase runs INSIDE a Task() subagent.

**Why it happens:**
The plan-phase workflow (plan-phase.md, line 1+) is designed to run as the main session orchestrator. It spawns: (1) mow-phase-researcher via Task(), (2) mow-planner via Task(), (3) mow-plan-checker via Task(). When a phase worker runs plan-phase as a subagent, these nested Task() calls fail. The v1.2-NESTED-DELEGATION.md confirms: "Subagents CANNOT spawn subagents (enforced since v1.0.64, causes OOM if attempted)."

But phase workers are TEAMMATES, not subagents. Teammates CAN use Task(). The risk is if the worker delegates plan-phase to a Task() subagent instead of running it inline. The mow-phase-worker.md currently says "If no PLAN files exist: run the plan-phase workflow" without specifying whether to run it inline or as a subagent. If implemented as Task(), the nested spawn fails.

**Consequences:**
- OOM crash kills the phase worker
- Partial state: some plans may have been created before the crash
- The orchestrator receives no `phase_complete` message and the phase is stuck in "executing" state
- Recovery requires manual intervention: kill the worker, release the claim, resume from checkpoint

**Prevention:**
1. **Workers run lifecycle workflows INLINE, always.** The mow-phase-worker must follow discuss-phase.md, plan-phase.md, and execute-phase.md directly -- reading the workflow content and executing each step. Only leaf-level operations (mow-executor for individual plans, mow-verifier for verification) are delegated as Task().
2. **Modify plan-phase.md for worker context.** When running inside a worker (detected by STATUS.md existence), the plan-phase workflow should NOT spawn research/checker subagents via Task(). Instead, the worker spawns them directly (worker is a teammate, so Task() works at the worker level, just not from worker's subagents).
3. **Add a guard in Task() spawning.** Before spawning a subagent, check if the current context is already a subagent. If yes, raise a clear error instead of OOM: "Cannot spawn subagent from within a subagent. Run this workflow inline instead."
4. **Document the hierarchy clearly in the worker agent definition:** Level 0 = user session (team lead), Level 1 = teammates (phase workers), Level 2 = subagents (executors, researchers, checkers). Level 2 CANNOT spawn Level 3.

**Detection:**
- Worker process dies unexpectedly during planning stage
- Worker log shows "out of memory" or abrupt termination
- Phase stuck in "executing" with no further messages from worker
- CHECKPOINT.md not written (crash was too sudden for graceful failure)

**Phase to address:** Full-lifecycle workers phase. The inline vs subagent decision for each lifecycle stage must be made explicit in the worker agent definition.

**Confidence:** HIGH -- the OOM behavior is confirmed in v1.2-NESTED-DELEGATION.md and official Claude Code docs ("Subagents cannot spawn other subagents").

---

### Pitfall 10: Auto-Advance Config Persists Across Sessions, Causing Unexpected Behavior

**What goes wrong:**
User runs `/mow:new-project --auto` which sets `workflow.auto_advance: true` in config.json. The session completes or crashes. Later, the user starts a new session with `/mow:resume-work` or `/mow:execute-phase` -- but auto_advance is still `true` in config.json. The discuss-phase workflow reads the config and auto-advances to plan-phase without pausing for user input. The user did not request auto-advance for this session but gets it anyway because the config persisted.

This is especially dangerous in v1.2 where full-lifecycle workers check `auto_advance` config. A stale `true` value from a previous session could cause workers to skip discuss pauses entirely.

**Why it happens:**
`workflow.auto_advance` is stored in `.planning/config.json`, which persists on disk. It is set to `true` by new-project.md (line 197) and discuss-phase.md (line 441). It is cleared to `false` by transition.md (line 456) at milestone boundary. But if the session crashes, is manually stopped, or the user exits before reaching a milestone boundary, the flag stays `true` indefinitely.

**Consequences:**
- Unexpected auto-advance in new sessions
- Discuss phase skipped silently in multi-agent mode
- User confusion: "I didn't ask for auto mode, why is it running without pausing?"
- Difficult to debug: the flag is in a JSON config file, not visible in the UI

**Prevention:**
1. **Clear auto_advance at session start.** When `/mow:resume-work` or `/mow:execute-phase` starts, reset `auto_advance` to `false` unless `--auto` flag is explicitly present in the current invocation.
2. **Make auto_advance session-scoped, not persistent.** Instead of writing to config.json, use an environment variable (`MOW_AUTO_ADVANCE=true`) or a transient file (`.planning/.auto_advance_active`). The environment variable dies with the session. The transient file can be cleaned up at session start.
3. **Add a TTL (time-to-live) to auto_advance.** When setting `auto_advance: true`, also set `auto_advance_set_at: <ISO timestamp>`. If the timestamp is older than 1 hour, clear auto_advance automatically. This prevents stale flags from affecting future sessions.
4. **Display auto-advance status prominently.** When any workflow reads `auto_advance: true`, print a visible banner: "AUTO-ADVANCE ACTIVE (set at {timestamp}). Press Ctrl+C to disable." This makes the state visible even if it was set by a previous session.

**Detection:**
- User runs `/mow:execute-phase` and discuss phase is skipped without `--auto` flag
- `config.json` contains `auto_advance: true` but user did not pass `--auto`
- Phase completes without any user interaction in a session that was not started with `--auto`

**Phase to address:** Auto-advance pipeline phase. Session cleanup logic is a prerequisite for the pipeline being safe.

**Confidence:** HIGH -- the persistence mechanism is directly visible in config.json writes across discuss-phase.md, new-project.md, and transition.md.

---

### Pitfall 11: Phase Worker Worktree Contains Stale .planning/ From Creation Time

**What goes wrong:**
This is a v1.2-specific variant of v1.1 Pitfall 5 (.planning/ copy semantics). In v1.2, phase workers run the FULL lifecycle (discuss -> plan -> execute). The worker creates CONTEXT.md during discuss, RESEARCH.md and PLAN.md files during plan, and SUMMARY.md during execute. All of these are written to the worktree's LOCAL copy of `.planning/`. Meanwhile, other workers are doing the same in their worktrees. The team lead in the main worktree sees none of these changes until merge-back.

The new wrinkle: in v1.2, the worker needs to read ROADMAP.md to determine phase goals, read REQUIREMENTS.md for traceability, and read config.json for settings. These were copied at worktree creation time. If another worker's merged changes modified ROADMAP.md or config.json (e.g., cleared auto_advance), the current worker has stale copies.

For the DISCUSS stage specifically: if two phases need discussion simultaneously, both workers create CONTEXT.md independently. At merge, there is no conflict (they are in different phase directories). But if one worker's discuss decisions affect another phase's approach, the isolation means this cross-phase context is invisible.

**Why it happens:**
The `cp -r .planning/` pattern in cmdWorktreeCreate (line 6670-6681) creates a snapshot. Workers operate on this snapshot. In v1.1, this was mitigated by the single-writer pattern (workers only write per-phase files, lead writes shared state). In v1.2, the full-lifecycle pattern means workers need to READ shared state during discuss and plan stages -- not just write per-phase files during execution.

**Consequences:**
- Workers read stale ROADMAP.md goals or REQUIREMENTS.md (minor if phases are well-defined in the snapshot)
- Config changes (auto_advance, model profiles) not propagated to active workers
- Cross-phase discuss decisions not visible to concurrent workers
- Workers may make decisions that conflict with changes already merged by other workers

**Prevention:**
1. **Workers read shared files from main worktree, not local copy.** For ROADMAP.md, REQUIREMENTS.md, and config.json, use absolute paths to the main worktree: `{repo_root}/.planning/ROADMAP.md`. Keep the local `.planning/` copy for phase-specific files only.
2. **Copy ROADMAP.md and config.json as read-only symlinks.** Instead of `cp -r`, selectively symlink shared files: `ln -s {main}/.planning/ROADMAP.md {wt}/.planning/ROADMAP.md`. This ensures reads always get the latest version. Write operations on shared files will fail (they are symlinks to main), which enforces the single-writer pattern.
3. **Accept the staleness for discuss.** The discuss workflow reads ROADMAP.md for phase goals, which do not change during execution. The CONTEXT.md it creates is phase-specific and does not conflict. The staleness is acceptable for this stage.
4. **For config.json specifically:** Pass critical config values (model profiles, auto_advance) via the worker spawn prompt rather than having workers read config.json. This ensures the lead controls the configuration, not the stale copy.

**Detection:**
- Worker reads outdated phase goals from ROADMAP.md (unlikely to cause problems since goals are set at roadmap creation)
- Worker uses stale model profile after lead changed it mid-session
- Auto-advance flag in worker's config.json disagrees with lead's config.json

**Phase to address:** Native worktree adoption phase (for the copy strategy) and full-lifecycle workers phase (for the shared file read pattern).

**Confidence:** MEDIUM -- the copy semantics are verified, but the practical impact depends on how frequently shared files change during execution. In most cases, ROADMAP.md and REQUIREMENTS.md are stable during a milestone run.

---

## Minor Pitfalls

Issues that cause friction but are recoverable with low effort.

---

### Pitfall 12: WorktreeCreate Hook Stdout Convention Mismatch

**What goes wrong:**
The WorktreeCreate hook must output the absolute path to the created worktree directory on stdout. If the hook prints anything else to stdout (debug messages, status updates, JSON output from mow-tools.cjs), Claude Code interprets the entire stdout as the worktree path. The `cd` to the worktree fails silently or errors with "directory not found."

**Why it happens:**
Claude Code's WorktreeCreate hook protocol is strict: "Input to the command is JSON with name (suggested worktree slug), and stdout should contain the absolute path to the created worktree directory." Any other stdout content breaks the protocol. The mow-tools.cjs `worktree create` command outputs JSON to stdout. If the hook calls `mow-tools.cjs worktree create` and pipes its stdout, Claude Code receives JSON instead of a path.

**Prevention:**
1. **Redirect all mow-tools.cjs output to stderr.** The hook script calls mow-tools.cjs with stdout redirected: `node mow-tools.cjs worktree create {phase} 2>&1 >/dev/null`. Extract the path from the JSON result separately.
2. **Write the hook as a dedicated script, not a mow-tools.cjs wrapper.** The hook reads JSON from stdin, extracts the `name`, runs mow-tools.cjs quietly, and echoes ONLY the absolute path to stdout.
3. **Test the hook in isolation.** `echo '{"name":"p07","path":"/tmp/test"}' | ./hook-script.sh` should output exactly one line: the absolute path.

**Phase to address:** Native worktree adoption phase.

**Confidence:** HIGH -- the stdout convention is explicitly documented and easy to violate accidentally.

---

### Pitfall 13: GSD Executor Attempt Limit Fix Conflicts with Mowism's Subagent Architecture

**What goes wrong:**
GSD's executor attempt limit fix (v1.19.2) adds a max retry count to the executor workflow. In GSD, the executor is an inline workflow. In Mowism, the executor is a subagent (`mow-executor` agent type) spawned via Task(). The subagent has `maxTurns` as a frontmatter field (configurable), which already limits execution length. Adding the GSD-style attempt counter inside the executor's system prompt may conflict with `maxTurns`, creating two competing limits that interact unpredictably.

**Prevention:**
1. **Use `maxTurns` as the primary limit.** Set `maxTurns: 50` (or configurable) in the mow-executor agent definition. This is the native Claude Code mechanism and does not require custom loop logic.
2. **Add the attempt limit as a SECONDARY guard in the executor workflow.** The executor workflow tracks task attempts internally. If a task fails 3 times, the executor writes a failure to SUMMARY.md and returns -- it does not retry. This catches infinite-retry loops that `maxTurns` alone might not prevent (the executor might try different approaches within its turn limit).
3. **Do not apply the GSD fix verbatim.** Translate the intent (prevent infinite loops) to Mowism's architecture (maxTurns + per-task attempt counter).

**Phase to address:** GSD cherry-pick phase.

**Confidence:** MEDIUM -- the interaction between maxTurns and custom attempt limits is implementation-specific.

---

### Pitfall 14: Full-Lifecycle Workers Block Team Lead Context on Long Discuss Phases

**What goes wrong:**
Phase worker 3 needs user discussion. It sends `input_needed` to the lead. The lead displays the notification. The user does not switch to the worker's terminal for 10 minutes (busy, or did not see the notification). During this time, the lead receives messages from other workers (plan completions, commits, stage transitions). The lead's context fills with coordination traffic while Worker 3 remains blocked. If the lead's context compresses, it may lose track of Worker 3's `input_needed` state.

When the user finally responds to Worker 3, the lead may no longer remember that Worker 3 was blocked, and may not know how to route the completion message. Or the lead may have already sent a duplicate `input_needed` notification, causing user confusion.

**Prevention:**
1. **Write blocked state to disk.** When the lead receives `input_needed`, immediately update Active Phases table: `state update-phase-row {phase} --status blocked-input`. On every re-read of STATE.md, the lead can see which phases are blocked without relying on message history.
2. **Periodic reminder.** If a worker has been in `blocked-input` state for >5 minutes, the lead prints a reminder notification: "Worker 3 still waiting for input in Terminal 2."
3. **Workers self-recover.** If a worker sends `input_needed` and receives no response for 15 minutes, it can re-send the message with an updated timestamp. The lead processes the re-send idempotently.

**Phase to address:** Full-lifecycle workers phase and auto-advance pipeline phase.

**Confidence:** MEDIUM -- the severity depends on how often users delay responding to discuss prompts.

---

## Phase-Specific Warnings

Mapping v1.2 pitfalls to implementation phases.

| Phase Topic | Likely Pitfalls | Severity | Mitigation Strategy |
|-------------|----------------|----------|---------------------|
| Native worktree adoption | Pitfall 1 (path mismatch), 8 (hook fires for all subagents), 12 (stdout convention) | CRITICAL | WorktreeCreate/WorktreeRemove hooks with naming convention filter; keep cmdWorktreeCreate for coordination |
| Simplification pass | Pitfall 2 (removing too much) | CRITICAL | Capabilities matrix before removal; only remove git worktree creation step; integration tests |
| Full-lifecycle workers | Pitfall 3 (context accumulation), 5 (skills don't resolve), 9 (nested OOM), 14 (blocked workers) | CRITICAL | Minimize subagent returns; workers run workflows inline; leaf-only Task() delegation |
| Auto-advance pipeline | Pitfall 4 (discuss skip), 6 (runaway execution), 10 (stale config) | CRITICAL | Clear auto_advance at team startup; cost/duration limits; session-scoped flag |
| GSD cherry-pick | Pitfall 7 (regression from divergence), 13 (attempt limit conflict) | MODERATE | Port logic not code; test before fix; one commit per bug; use maxTurns for attempt limit |
| Nested delegation | Pitfall 9 (nested OOM) | CRITICAL | Level 0/1/2 hierarchy enforced; workers run workflows inline |

## What Breaks When Moving From v1.1 to v1.2

| v1.1 Assumption | Why It Worked | What Breaks in v1.2 |
|-----------------|---------------|---------------------|
| Worktrees created by cmdWorktreeCreate at `.worktrees/p{NN}` | Custom code controls creation, path, naming | Native `isolation: worktree` creates at `.claude/worktrees/` with different naming (Pitfall 1) |
| Workers only execute (single lifecycle stage) | Context accumulation bounded to execution stage | Full-lifecycle workers accumulate 4-5x more context (Pitfall 3) |
| Workers invoke execute-phase workflow directly | No skill resolution needed | Full-lifecycle workers need discuss-phase, plan-phase too -- skills don't resolve in Task() (Pitfall 5) |
| Auto-advance is user-supervised | User sees and can intervene | Autonomous workers + auto-advance = unsupervised pipeline (Pitfall 6) |
| Plan-phase runs in main session or teammate | Teammates can spawn Task() subagents | If plan-phase runs AS a Task() subagent, its nested Task() calls fail (Pitfall 9) |
| config.json read once at session start | Single session, config doesn't change | Multi-agent with stale config.json copies in worktrees (Pitfall 10, 11) |
| GSD upstream is parallel context (no code sharing) | Awareness only, no integration | Cherry-picking from diverged codebase requires pattern translation (Pitfall 7) |

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Path mismatch (1) | MEDIUM | Refactor manifest to support arbitrary paths. Or install WorktreeCreate hook to bridge. |
| Simplification overshoot (2) | HIGH | Re-implement removed coordination layer. Git revert if caught early. |
| Context accumulation (3) | LOW | Switch to disk-first returns (subagents write to files, return paths). Reduce model tier for read-only stages. |
| Discuss skip (4) | LOW | Clear auto_advance config. Re-run discuss for affected phases. CONTEXT.md is independent per phase so other phases are unaffected. |
| Skills not resolving (5) | LOW | Convert Task() subagent calls to inline workflow execution. Change worker agent definition. |
| Runaway pipeline (6) | MEDIUM | Kill the session. Review committed code. Cost cannot be recovered. Add limits for future runs. |
| GSD regression (7) | LOW | Revert the specific bugfix commit. Re-port with proper testing. |
| Hook fires for all (8) | LOW | Add naming convention filter to hook script. Clean up spurious manifest entries. |
| Nested OOM (9) | MEDIUM | Kill crashed worker. Release claim. Resume from last checkpoint. Redesign to inline workflow execution. |
| Stale auto_advance (10) | LOW | `mow-tools.cjs config-set workflow.auto_advance false`. One command. |
| Stale .planning/ (11) | LOW | Workers read shared files from main worktree absolute path. One-time path update in worker definition. |
| Stdout convention (12) | LOW | Fix hook script to output only the path. Test in isolation. |
| Attempt limit conflict (13) | LOW | Use maxTurns as primary limit. Remove custom counter if conflicting. |
| Blocked worker context (14) | LOW | Write blocked state to disk. Lead re-reads on next decision cycle. |

## Integration Pitfalls: Replacing Custom Code with Platform-Native Features

This section synthesizes the cross-cutting theme of v1.2: delegating to Claude Code's native features while preserving the coordination layer.

### The Integration Surface

| Mowism Custom | Claude Code Native | Integration Risk |
|---------------|-------------------|-----------------|
| `cmdWorktreeCreate` (path, branch, manifest, planning copy, STATUS init) | `isolation: worktree` (path, branch only) | HIGH -- 4/5 capabilities have no native equivalent |
| `worktree claim/release` in STATE.md | Agent Teams task claiming (file-locked) | MEDIUM -- could delegate to AT, but claim tracks different data (phase-to-worktree, not task-to-agent) |
| `worktree merge` (manifest-tracked merge with conflict detection) | None | HIGH -- no native equivalent, must keep |
| `worktree stash/restore` (crash recovery) | Subagent resume (agent ID-based) | LOW -- different mechanisms for different problems |
| Custom subagent spawning (mow-executor, mow-verifier) | Native subagent YAML with frontmatter | LOW -- straightforward migration, just move config to YAML |
| Auto-advance via config.json flag | None (no native pipeline concept) | LOW -- Mowism-specific, not replacing anything |

### The Golden Rule of Platform Adoption

**Adopt the platform for the LEAF operations, keep custom code for COORDINATION.** Claude Code's native worktree support is excellent for creating isolated workspaces. It is NOT a coordination layer. Mowism's value-add is the coordination: tracking which phase runs where, preventing conflicts, orchestrating merges, maintaining shared state. Replacing the coordination layer with native features is not simplification -- it is removing the product's core value.

**Specifically:**
- USE `isolation: worktree` for temporary subagent isolation (research, plan-checking) where auto-cleanup is desired
- USE WorktreeCreate/WorktreeRemove hooks to bridge native creation with Mowism coordination
- USE native subagent YAML frontmatter for agent definitions (move from inline to `.claude/agents/`)
- KEEP `cmdWorktreeCreate` for phase workers (long-lived, needs manifest tracking, planning copy, STATUS init)
- KEEP `worktree claim/release/merge/stash` (no native equivalent)
- KEEP the messaging protocol (lead-writes-state, structured messages)

## Sources

**Official Documentation:**
- [Claude Code Subagents docs](https://code.claude.com/docs/en/sub-agents) -- isolation: worktree behavior, subagent frontmatter fields, subagents cannot spawn subagents, maxTurns, background mode, auto-compaction. HIGH confidence.
- [Claude Code v2.1.50 Release Notes](https://github.com/anthropics/claude-code/releases/tag/v2.1.50) -- WorktreeCreate/WorktreeRemove hooks, hook input/output protocol. HIGH confidence.

**Pre-existing Research:**
- `.planning/research/v1.2-NESTED-DELEGATION.md` -- 2-level hierarchy confirmed, subagent OOM on nested spawn, skills don't resolve in Task(), cost estimates. HIGH confidence.
- `.planning/research/v1.2-GSD-UPSTREAM-DIFF.md` -- 9 must-port bugs, specific file locations, effort estimates. HIGH confidence.
- `.planning/research/PITFALLS.md` (v1.1) -- Concurrent state access, context exhaustion, DAG cycles, .planning/ copies, over-engineering. HIGH confidence (validated during v1.1 execution).
- `.planning/research/ARCHITECTURE.md` (v1.1) -- State coherence architecture, lead-writes-state protocol, component boundaries. HIGH confidence.

**Codebase Analysis:**
- `bin/mow-tools.cjs` lines 6610-6724 (`cmdWorktreeCreate`, hardcoded paths, manifest, planning copy). PRIMARY source for Pitfalls 1, 2, 11. HIGH confidence.
- `agents/mow-phase-worker.md` (full lifecycle definition, messaging protocol, constraints). PRIMARY source for Pitfalls 3, 5, 9, 14. HIGH confidence.
- `agents/mow-team-lead.md` (multi-phase flow, task creation, worker spawning). PRIMARY source for Pitfalls 4, 6, 8. HIGH confidence.
- `mowism/workflows/discuss-phase.md` lines 430-476 (auto_advance step). PRIMARY source for Pitfall 4. HIGH confidence.
- `mowism/workflows/execute-phase.md` lines 519-538 (auto_advance propagation). PRIMARY source for Pitfall 6. HIGH confidence.
- `mowism/workflows/transition.md` line 456 (auto_advance clearing at milestone boundary). PRIMARY source for Pitfall 10. HIGH confidence.

**Industry Sources:**
- [Building a C Compiler with Parallel Claudes (Anthropic)](https://www.anthropic.com/engineering/building-c-compiler) -- 16-agent stress test, context degradation in long sessions, CI pipeline as failure mode mitigation. HIGH confidence.
- [Cherry-picks vs backmerges (Runway)](https://www.runway.team/blog/cherry-picks-vs-backmerges-whats-the-right-way-to-get-fixes-into-your-release-branch) -- Cherry-pick pitfalls for diverged branches. MEDIUM confidence.
- [Claude Code Guardrails (rulebricks)](https://github.com/rulebricks/claude-code-guardrails) -- PreToolUse hook patterns for safety guardrails. MEDIUM confidence.
- [Claude Code Multi-Agent Systems Guide (eesel.ai)](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide) -- Multi-agent architecture patterns, failure modes. MEDIUM confidence.

---
*Pitfalls research for: Mowism v1.2 native worktrees, full-lifecycle workers, auto-advance, GSD cherry-pick*
*Researched: 2026-02-24*
*Supersedes: v1.1 PITFALLS.md (2026-02-20)*
