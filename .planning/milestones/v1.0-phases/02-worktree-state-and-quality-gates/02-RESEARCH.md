# Phase 2: Worktree State and Quality Gates - Research

**Researched:** 2026-02-19
**Domain:** Git worktree state management / WorkTrunk CLI integration / Quality chain orchestration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Hard requirement: Mowism refuses to init if `wt` CLI is not installed
- Check on every `/mow:*` command init, not just worktree-specific commands
- Error message shows exact install command + one-liner explaining why Mowism needs wt
- Auto-configure wt post-create hook on init if wt is installed but hook is missing
- Install script (Phase 3) should fetch and install WorkTrunk before Mowism setup
- Phase-level lock granularity: one worktree claims an entire phase, not individual plans or waves
- Rich tracking per assignment: worktree path, phase, plan progress, timestamp, agent/session ID
- Copy+merge approach: each worktree gets its own `.planning/` copy, changes merge back to main
- Auto-release claims when phase execution completes successfully
- Worktree claim visibility: `/mow:progress` shows worktree summary, plus a dedicated detail command
- Both `/mow:progress` (summary) and dedicated command (detail) for worktree status
- Tier selection: 4 options -- Auto (recommended, Claude picks based on phase content), minimum, complex, algorithmic
- Resilient chain: quality checks flag findings and continue, don't hard-stop on failure
- Retry/continue on transient failures (API errors, etc.) -- chain should recover gracefully
- Findings format: separate file per quality check, VERIFICATION-CHAIN is an index linking to each
- After `/mow:execute-phase` completes, offer to run `/mow:refine-phase` as next step (user confirms, not auto-chained)

### Claude's Discretion
- Stale worktree entry handling (TTL, check-on-init, or manual release -- research what's most logical for git worktree workflows)
- Conflict resolution when two agents try to claim the same phase (hard block vs warning+confirm)
- STATE.md merge strategy when copy+merge hits conflicts (auto-merge sections vs always ask)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

Phase 2 adds two major capabilities to Mowism: (1) worktree-aware state tracking that prevents conflicts when multiple agents work in parallel across git worktrees, and (2) `/mow:refine-phase`, an automated quality gate that replaces manual skill chaining.

The worktree tracking has a hard dependency on WorkTrunk (`wt` CLI, v0.25.0 currently installed). WorkTrunk provides a rich hook system (post-create, post-start, post-switch, etc.) with Jinja2-style template variables (`{{ branch }}`, `{{ worktree_path }}`, `{{ primary_worktree_path }}`), JSON context on stdin, and both project-level (`.config/wt.toml`) and user-level (`~/.config/worktrunk/config.toml`) configuration. The post-create hook is the key integration point: it runs blocking after worktree creation and before any `--execute` command, making it the right place to copy `.planning/` state and register the worktree claim. WorkTrunk's `wt list --format=json` provides structured data about all worktrees (paths, branches, commit info, working tree state) that Mowism can use for stale detection and status display.

The quality chain orchestration builds on existing patterns already proven in the codebase. The `diagnose-issues.md` workflow demonstrates parallel Task() spawning with result collection, and the `execute-phase.md` workflow shows the wave-based sequential/parallel execution model. The refine-phase chain follows the same patterns: Stage 1 (scope-check as gate), Stage 2 (parallel quality checks), Stage 3 (change-summary), Stage 4 (verify-work), Stage 5 (update-claude-md). Each check writes to a separate findings file; the VERIFICATION-CHAIN file serves as an index. The resilience requirement means wrapping each Task() call in error handling that logs failures and continues rather than aborting the chain.

**Primary recommendation:** Build the worktree tracking as an extension to `mow-tools.cjs` (new `worktree` subcommand family) and the quality chain as a new workflow file (`refine-phase.md`) with a corresponding command file. The wt dependency check should be a utility function called at the top of every `cmdInit*` function. The post-create hook should be configured via `.config/wt.toml` in the project, auto-created by Mowism if missing.

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| WorkTrunk (`wt`) | v0.25.0 | Git worktree lifecycle management | Purpose-built for multi-agent parallel work; provides hooks, JSON output, and Claude Code plugin |
| `mow-tools.cjs` | (existing) | State management, config, phase ops | Already handles all `.planning/` operations; extend with worktree commands |
| Claude Code Task() | (built-in) | Subagent spawning for quality checks | Standard mechanism for parallel agent execution, proven in execute-phase and diagnose-issues |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `.config/wt.toml` | Project-level WorkTrunk configuration | post-create hook to copy `.planning/` and register worktree claim |
| `wt list --format=json` | Structured worktree inventory | Stale detection, status display, worktree enumeration |
| `wt hook post-create` | Manual hook execution | Testing and re-running post-create hooks |
| `{{ primary_worktree_path }}` template var | Reference main worktree from any worktree | Accessing authoritative `.planning/` state for copy operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Copy+merge `.planning/` | Symlink to shared `.planning/` | Symlinks would give real-time shared state but create write conflicts when two agents modify STATE.md simultaneously. Copy+merge is safer and explicitly handles conflicts. |
| Phase-level locks | Plan-level locks | Plan-level would allow finer-grained parallelism but adds complexity -- two agents modifying the same STATE.md sections creates merge conflicts. Phase-level is simpler and matches the user's mental model. |
| Manual `wt list` parsing | WorkTrunk API/plugin | A programmatic API would be cleaner, but `wt list --format=json` is stable, documented, and sufficient. The Claude Code plugin exists but is for statusline display, not state management. |

## Architecture Patterns

### Recommended File Structure Changes
```
.planning/
├── STATE.md                    # Extended with worktree tracking section
├── config.json                 # Existing
├── PROJECT.md                  # Existing
├── REQUIREMENTS.md             # Existing
├── ROADMAP.md                  # Existing
└── phases/
    └── XX-name/
        ├── XX-PLAN.md          # Existing
        ├── XX-SUMMARY.md       # Existing
        ├── XX-VERIFICATION.md  # Existing (from execute-phase)
        ├── VERIFICATION-CHAIN-PXX.md     # NEW: index of quality check findings
        ├── VERIFICATION-CHAIN-PXX/       # NEW: directory for per-check findings
        │   ├── scope-check.md            # Individual check output
        │   ├── simplify.md
        │   ├── dead-code-sweep.md
        │   ├── prove-it.md
        │   ├── grill-me.md
        │   ├── change-summary.md
        │   └── verify-work.md
        └── ...

.config/
└── wt.toml                     # NEW: WorkTrunk project config with post-create hook

bin/
└── mow-tools.cjs               # Extended with worktree subcommands

commands/
├── (existing quality skills)
└── (no new command files here -- refine-phase goes in ~/.claude/commands/mow/)
```

### Pattern 1: WorkTrunk Dependency Check
**What:** A utility function in mow-tools.cjs that checks for `wt` in PATH and returns structured info.
**When to use:** Called at the top of every `cmdInit*` function.
**Example:**
```javascript
// In mow-tools.cjs
function checkWorkTrunkDependency() {
  try {
    const version = execSync('command wt --version 2>/dev/null', { encoding: 'utf-8' }).trim();
    return { installed: true, version };
  } catch {
    return { installed: false, version: null };
  }
}

// In every cmdInit* function:
function cmdInitExecutePhase(cwd, phase, includes, raw) {
  const wtCheck = checkWorkTrunkDependency();
  if (!wtCheck.installed) {
    error(
      'WorkTrunk (wt) is required but not found.\n\n' +
      'Mowism uses WorkTrunk for git worktree management in multi-agent workflows.\n\n' +
      'Install via:\n' +
      '  Arch/CachyOS: yay -S worktrunk\n' +
      '  macOS:        brew install max-sixty/tap/worktrunk\n' +
      '  Cargo:        cargo install worktrunk\n' +
      '  Other:        https://worktrunk.dev\n\n' +
      'After installing, run: wt config shell install'
    );
  }
  // ... rest of init
}
```
**Source:** Direct examination of `wt --help` output and WorkTrunk installation docs.

### Pattern 2: STATE.md Worktree Tracking Section
**What:** A new section in STATE.md that tracks which worktree is executing which phase.
**When to use:** Updated when `/mow:execute-phase` starts and completes in any worktree.
**Example:**
```markdown
## Worktree Assignments

| Worktree | Branch | Phase | Status | Started | Agent |
|----------|--------|-------|--------|---------|-------|
| /home/max/git/mowism.feature-auth | feature-auth | 2 | executing | 2026-02-19T10:00:00Z | session-abc123 |
| /home/max/git/mowism.api-layer | api-layer | 3 | executing | 2026-02-19T10:05:00Z | session-def456 |

### Verification Results

| Phase | Tier | Result | Date | Blockers |
|-------|------|--------|------|----------|
| 1 | complex | pass | 2026-02-19 | none |
| 2 | algorithmic | fail | 2026-02-19 | prove-it: 2 unproven claims |
```

### Pattern 3: Post-Create Hook for .planning/ Copy
**What:** A WorkTrunk post-create hook that copies `.planning/` from the main worktree.
**When to use:** Automatically runs when `wt switch --create <branch>` creates a new worktree.
**Example `.config/wt.toml`:**
```toml
[post-create]
planning = """
# Copy .planning/ from primary worktree if it exists
if [ -d "{{ primary_worktree_path }}/.planning" ]; then
  cp -r "{{ primary_worktree_path }}/.planning" "{{ worktree_path }}/.planning"
  echo "MOW: Copied .planning/ from main worktree"
fi
"""
```
**Why post-create not post-start:** post-create is blocking (waits for completion before proceeding), which is essential because the agent needs `.planning/` immediately. post-start runs in the background and might not finish in time.

### Pattern 4: Quality Chain Orchestration (refine-phase)
**What:** A workflow that runs tiered quality checks as a sequence of Task() calls with parallel stages.
**When to use:** After `/mow:execute-phase` completes, user confirms they want to run quality checks.
**Example orchestration flow:**
```
User picks tier (or "auto") via AskUserQuestion
│
├─ Stage 1 (Gate): scope-check → Task() → if FAIL, flag but continue
│
├─ Stage 2 (Parallel): based on tier
│  ├─ minimum: (skip this stage)
│  ├─ complex: Task(simplify), Task(dead-code-sweep), Task(grill-me) → all parallel
│  └─ algorithmic: Task(prove-it), Task(simplify), Task(dead-code-sweep), Task(grill-me) → all parallel
│
├─ Stage 3 (Sequential): change-summary → Task() → incorporates Stage 1+2 findings
│
├─ Stage 4 (Sequential): verify-work → Task() → goal-backward verification
│
├─ Stage 5 (Sequential): update-claude-md → Task() → captures learnings
│
└─ Final: Write VERIFICATION-CHAIN-P{phase}.md index, update STATE.md
```

### Pattern 5: Resilient Task() Wrapper
**What:** Error handling pattern for quality chain that catches failures and continues.
**When to use:** Every Task() call in the quality chain.
**Example:**
```
# In refine-phase.md workflow:

For each quality check:
1. Record start time
2. Spawn Task() with quality skill prompt
3. On success: parse findings, write to per-check file
4. On failure (agent error, timeout, etc.):
   - Log the failure to per-check file as "CHECK FAILED: {error}"
   - Set check result to "error" (not "pass" or "fail")
   - Continue to next check
5. Record end time and duration

The chain NEVER stops on a single check failure.
Transient API errors get one retry before marking as "error".
```

### Anti-Patterns to Avoid
- **Modifying `.planning/` in the main worktree from a feature worktree:** Each worktree has its own copy. Changes must be committed and merged back via `wt merge` or git merge.
- **Storing worktree state outside `.planning/`:** Everything must be in git-tracked files so it persists across sessions and is visible to all agents.
- **Hard-stopping the quality chain on a single check failure:** The user explicitly wants resilient chains that flag and continue.
- **Auto-running refine-phase after execute-phase:** The user explicitly wants to be offered it, not have it auto-chained.
- **Using symlinks for `.planning/` sharing:** Creates write conflicts when multiple agents modify simultaneously. The copy+merge approach is intentional.
- **Checking wt only on worktree-specific commands:** The decision is to check on EVERY `/mow:*` command init. This ensures consistent behavior and early feedback.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Worktree enumeration | Custom git worktree parsing | `wt list --format=json` | WorkTrunk handles edge cases (detached HEAD, prunable, locked) and provides rich structured output |
| Worktree creation hooks | Custom post-checkout git hooks | `.config/wt.toml` post-create hooks | WorkTrunk hooks have template variables (`{{ primary_worktree_path }}`, `{{ worktree_path }}`), JSON context, and security approval system |
| File copy between worktrees | Custom cp scripts | WorkTrunk `{{ primary_worktree_path }}` template + shell cp in hook | The template variable resolves correctly even for bare repos |
| Worktree path resolution | Parsing `git worktree list` output | `wt list --format=json | jq '.[] | .path'` | JSON output is stable, documented, and includes branch/commit/state info |
| Quality skill invocation | Custom skill runner | Claude Code's native Task() with existing command .md files | The skills already exist as standalone commands; Task() gives fresh context and parallel execution |

**Key insight:** WorkTrunk already solves the hard problems of worktree lifecycle management. Mowism's job is to add the `.planning/`-specific state tracking layer on top, not to reimagine worktree management itself.

## Common Pitfalls

### Pitfall 1: STATE.md Merge Conflicts on Copy+Merge
**What goes wrong:** Two worktrees both modify STATE.md (e.g., recording plan progress). When the feature branch merges back to main, git can't auto-merge the changes because both modified the same sections.
**Why it happens:** STATE.md is a single file with structured sections. Two worktrees updating "Current Position" or "Worktree Assignments" will produce overlapping edits.
**How to avoid:** Design STATE.md sections for additive-only operations where possible. The "Worktree Assignments" section should use append-only rows (one row per worktree, never modifying another worktree's row). For sections that must be overwritten (like "Current Position"), the merge-back step should use the worktree's version for its own sections and the main's version for other worktrees' sections. Mow-tools.cjs can provide a `worktree merge-state` command that does section-aware merging.
**Warning signs:** Merge conflicts on `wt merge` that reference `.planning/STATE.md`.

### Pitfall 2: Stale Worktree Entries After Manual Cleanup
**What goes wrong:** A user removes a worktree manually (e.g., `rm -rf` the directory, or `git worktree remove` directly instead of `wt remove`), but STATE.md still shows it as executing a phase. Future `/mow:execute-phase` calls see the stale claim and refuse to execute.
**Why it happens:** STATE.md tracking is decoupled from actual worktree existence. There is no automatic cleanup when a worktree disappears.
**How to avoid:** On every `/mow:*` init, cross-reference STATE.md worktree entries against `wt list --format=json`. If a claimed worktree path no longer exists in the `wt list` output, auto-release the claim and log a notice. This is the "check-on-init" approach.
**Warning signs:** STATE.md shows worktree assignments for paths that don't exist on disk.

### Pitfall 3: Race Condition on Phase Claims
**What goes wrong:** Two agents in different worktrees both read STATE.md at the same time, both see the phase is unclaimed, and both write a claim. The last writer wins, and the first agent operates without a valid claim.
**Why it happens:** No file locking mechanism for STATE.md. Git worktrees share the same `.git` directory but have separate working trees.
**How to avoid:** Claims should be made via git commits. The claim flow: (1) read STATE.md, (2) check if phase is claimed, (3) write claim + commit, (4) pull to check for conflicts. If the commit conflicts with another claim, the second agent gets a merge conflict and knows the phase is taken. Since each worktree has its own `.planning/` copy (per the copy+merge decision), claims happen in the worktree's local copy and the conflict surfaces on merge.
**Warning signs:** Two worktrees both claiming to execute the same phase.

### Pitfall 4: Quality Chain Context Window Exhaustion
**What goes wrong:** Running all quality checks sequentially in the same context window exceeds the token limit, causing checks to degrade or fail.
**Why it happens:** Each quality skill reads the full codebase diff, recent commits, and produces detailed findings. Running 7 skills sequentially accumulates massive context.
**How to avoid:** Each quality check runs as a separate Task() subagent with its own fresh context window. The orchestrator stays lean -- it only tracks which checks ran, their results (pass/fail/error), and file paths to findings. This is the same pattern used by execute-phase (orchestrator at ~10-15% context, subagents get fresh 200k each).
**Warning signs:** Later quality checks producing lower-quality results or missing obvious issues.

### Pitfall 5: Post-Create Hook Fails Silently
**What goes wrong:** The WorkTrunk post-create hook that copies `.planning/` fails (e.g., main worktree path wrong, permissions issue), but the agent starts working in a worktree without `.planning/` state.
**Why it happens:** WorkTrunk's post-create hooks are fail-fast for the hook set, but a non-zero exit from the copy command would stop subsequent hooks, not prevent the worktree from being created.
**How to avoid:** The post-create hook should verify the copy succeeded (check that `.planning/STATE.md` exists in the new worktree). The `/mow:*` init check should also verify `.planning/` exists and is populated. If missing, offer to copy from main: `cp -r $(wt list --format=json | jq -r '.[] | select(.is_main) | .path')/.planning/ .planning/`.
**Warning signs:** Agent in a new worktree sees "No planning structure found" despite main worktree having `.planning/`.

### Pitfall 6: Auto Tier Selection Without Phase Context
**What goes wrong:** The "auto" tier option tries to intelligently select a tier but makes a poor choice because it doesn't have enough context about the phase.
**Why it happens:** Auto selection needs to assess complexity -- number of plans, types of changes (algorithmic vs UI vs configuration), code coverage status, etc. Without reading all plan summaries, the heuristic is unreliable.
**How to avoid:** Auto tier selection should read: (1) phase plan count, (2) SUMMARY.md files for each plan (extracting change types), (3) any mention of algorithmic/performance work. Default to "complex" when uncertain. Present the auto-selected tier to the user before running so they can override.
**Warning signs:** Auto selects "minimum" for a phase with algorithmic changes, or "algorithmic" for a simple configuration phase.

## Code Examples

### WorkTrunk Dependency Check (mow-tools.cjs extension)
```javascript
// Source: Direct examination of wt CLI output
function checkWorkTrunk() {
  try {
    // `command` bypasses shell functions/aliases
    const result = execSync('command wt --version 2>&1', {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    // wt --version outputs nothing on success but exits 0
    return { installed: true };
  } catch (e) {
    // Exit code 127 = command not found
    return { installed: false };
  }
}
```

### Worktree State Query (mow-tools.cjs extension)
```javascript
// Source: wt list --format=json documented output
function getWorktreeInfo(cwd) {
  try {
    const json = execSync('wt list --format=json', {
      cwd,
      encoding: 'utf-8',
      timeout: 10000,
    });
    const worktrees = JSON.parse(json.replace(/\x1b\[[0-9;]*m/g, '')); // strip ANSI
    return worktrees.map(wt => ({
      branch: wt.branch,
      path: wt.path,
      isMain: wt.is_main,
      isCurrent: wt.is_current,
      commit: wt.commit?.short_sha,
      hasChanges: wt.working_tree?.modified || wt.working_tree?.staged,
    }));
  } catch {
    return [];
  }
}
```

### Post-Create Hook (.config/wt.toml)
```toml
# Source: WorkTrunk hook documentation
[post-create]
# Copy .planning/ from main worktree to new worktree
planning-copy = """
SRC="{{ primary_worktree_path }}/.planning"
DEST="{{ worktree_path }}/.planning"
if [ -d "$SRC" ]; then
  cp -r "$SRC" "$DEST"
  echo "MOW: Copied .planning/ from $(basename {{ primary_worktree_path }})"
  if [ -f "$DEST/STATE.md" ]; then
    echo "MOW: State file verified"
  else
    echo "MOW: WARNING - STATE.md not found after copy" >&2
    exit 1
  fi
else
  echo "MOW: No .planning/ found in main worktree (skipping)"
fi
"""
```

### Quality Chain Task() Invocation Pattern
```
# Scope-check as gate (Stage 1) -- from refine-phase.md workflow

scope_result = Task(
  prompt="
    Run /scope-check on the changes made during Phase {phase}.

    Context: This is Phase {phase}: {phase_name}
    Phase directory: {phase_dir}

    After running scope-check, write your findings to:
    {phase_dir}/VERIFICATION-CHAIN-P{phase}/scope-check.md

    Format the file as:
    ---
    check: scope-check
    phase: {phase}
    result: pass|fail
    date: {timestamp}
    ---

    ## Scope Check Findings
    [full scope-check output]
  ",
  subagent_type="general-purpose",
  description="Scope check: Phase {phase}"
)

# Parse result: read the findings file, extract pass/fail from frontmatter
# If scope-check fails: FLAG it in findings, but DO NOT stop the chain
# Continue to Stage 2 regardless
```

### Parallel Quality Checks (Stage 2)
```
# Complex tier: spawn simplify + dead-code-sweep + grill-me in parallel
# All in a single message = parallel execution

simplify_result = Task(
  prompt="Run /simplify on Phase {phase} changes. Write findings to {phase_dir}/VERIFICATION-CHAIN-P{phase}/simplify.md ...",
  subagent_type="general-purpose",
  description="Simplify: Phase {phase}"
)

dead_code_result = Task(
  prompt="Run /dead-code-sweep on Phase {phase} changes. Write findings to {phase_dir}/VERIFICATION-CHAIN-P{phase}/dead-code-sweep.md ...",
  subagent_type="general-purpose",
  description="Dead code sweep: Phase {phase}"
)

grill_result = Task(
  prompt="Run /grill-me on Phase {phase} changes. Write findings to {phase_dir}/VERIFICATION-CHAIN-P{phase}/grill-me.md ...",
  subagent_type="general-purpose",
  description="Grill me: Phase {phase}"
)

# All three spawn in one message block = parallel
# Wait for all to complete, collect results
# Handle any failures: log error to the check's findings file, mark as "error"
```

### VERIFICATION-CHAIN Index File
```markdown
# Verification Chain: Phase 2

**Date:** 2026-02-19
**Tier:** complex
**Result:** pass (with warnings)

## Chain Summary

| # | Check | Result | Duration | Findings |
|---|-------|--------|----------|----------|
| 1 | scope-check | pass | 45s | [scope-check.md](VERIFICATION-CHAIN-P02/scope-check.md) |
| 2 | simplify | pass (2 warnings) | 1m 12s | [simplify.md](VERIFICATION-CHAIN-P02/simplify.md) |
| 3 | dead-code-sweep | pass | 38s | [dead-code-sweep.md](VERIFICATION-CHAIN-P02/dead-code-sweep.md) |
| 4 | grill-me | request-changes (1 should-fix) | 2m 5s | [grill-me.md](VERIFICATION-CHAIN-P02/grill-me.md) |
| 5 | change-summary | complete | 55s | [change-summary.md](VERIFICATION-CHAIN-P02/change-summary.md) |
| 6 | verify-work | pass | 1m 30s | [verify-work.md](VERIFICATION-CHAIN-P02/verify-work.md) |
| 7 | update-claude-md | complete | 20s | [update-claude-md.md](VERIFICATION-CHAIN-P02/update-claude-md.md) |

## Blockers
- grill-me: 1 SHOULD-FIX item (see findings file)

## Overall Verdict
PASS with warnings. No blockers. 1 should-fix item from grill-me review.
```

## Discretion Recommendations

### Stale Worktree Entry Handling
**Recommendation: Check-on-init (cross-reference with wt list)**

Rationale: The user was introduced to worktrees today, so they may not know to run cleanup commands. TTL-based approaches are fragile (phases can legitimately run for hours or days). Manual release requires the user to know about stale entries.

Check-on-init is the most natural approach:
1. On every `/mow:*` init, run `wt list --format=json` (fast, ~100ms)
2. Compare worktree paths in STATE.md "Worktree Assignments" against `wt list` output
3. If a STATE.md entry's path does not appear in `wt list`, auto-release the claim
4. Log: `"MOW: Released stale claim for [path] (worktree no longer exists)"`

This handles all cleanup scenarios (manual rm, `git worktree remove`, `wt remove`) without requiring user action.

**Confidence:** HIGH -- this approach is directly supported by `wt list --format=json` providing structured worktree inventory.

### Conflict Resolution (Two Agents Claiming Same Phase)
**Recommendation: Hard block with clear message**

Rationale: Warning+confirm adds a user interaction step in what should be an automated flow. The user may not understand the implications of overriding a claim. Hard block is safer and matches the phase-level lock granularity decision.

Behavior:
1. Agent A claims Phase 2, recorded in STATE.md
2. Agent B in a different worktree tries to claim Phase 2
3. Agent B reads STATE.md, sees Phase 2 is claimed by Agent A's worktree
4. Agent B shows: "Phase 2 is being executed by [worktree path] (started [timestamp]). Cannot claim the same phase from another worktree."
5. Agent B suggests: "Run `/mow:progress` to see all worktree assignments, or execute a different phase."

Edge case: If the claiming worktree no longer exists (stale entry), the check-on-init stale detection handles this automatically before the conflict check runs.

**Confidence:** HIGH -- hard block is the simpler, safer choice. The user can always manually edit STATE.md to release a claim if needed.

### STATE.md Merge Strategy
**Recommendation: Section-aware auto-merge with fallback to user prompt**

Rationale: STATE.md has distinct sections with different merge semantics. "Worktree Assignments" rows are owned by individual worktrees (no cross-worktree edits). "Current Position" is worktree-specific in the copy. "Decisions" and "Blockers" are append-only.

Strategy:
1. Each worktree only modifies its own rows in "Worktree Assignments"
2. On merge-back (`wt merge`), most sections auto-merge cleanly because changes are in different lines
3. If git reports a merge conflict in STATE.md:
   - `mow-tools.cjs worktree merge-state` can do section-aware three-way merge
   - "Worktree Assignments": take both additions (each worktree added its own row)
   - "Decisions" / "Blockers": take both additions (append-only)
   - "Current Position": take the merging worktree's version (it has the most recent progress)
   - "Verification Results": take both additions
4. If section-aware merge still fails: present conflict to user with clear explanation

In practice, merge conflicts should be rare because:
- Each worktree works on a different phase (locked at phase level)
- Phase progress updates modify different sections
- The copy+merge approach means each worktree commits to its own branch

**Confidence:** MEDIUM -- the section-aware merge logic is sound in theory but the implementation needs careful testing with real concurrent modification scenarios. The git merge driver approach is well-established but custom merge strategies for markdown require careful parsing.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GSD single-agent STATE.md | Multi-worktree STATE.md with assignments | Phase 2 (new) | Enables parallel agent work without conflicts |
| Manual skill chaining | Automated `/mow:refine-phase` chain | Phase 2 (new) | Eliminates tedious manual quality check invocation |
| No worktree awareness | WorkTrunk integration with hooks | Phase 2 (new) | New worktrees auto-configured with `.planning/` state |
| `git worktree` direct usage | WorkTrunk CLI wrapping git worktree | External tool | Richer lifecycle hooks, JSON output, Claude Code plugin |

**WorkTrunk version notes:**
- v0.25.0 is currently installed (as reported by `wt config show`)
- Claude Code plugin available via `claude plugin marketplace add max-sixty/worktrunk`
- Shell integration configured for bash, zsh, and fish on this system

## Open Questions

1. **WorkTrunk Claude Code Plugin Interaction**
   - What we know: WorkTrunk has a Claude Code plugin that adds activity markers (robot/chat emoji) to `wt list` and provides statusline integration
   - What's unclear: Whether to install the plugin as part of Phase 2 or defer to Phase 3 (distribution). The plugin is useful but not required for state tracking.
   - Recommendation: Install it now (one command: `claude plugin marketplace add max-sixty/worktrunk && claude plugin install worktrunk@worktrunk`). It provides useful visual feedback in `wt list` that complements Mowism's state tracking.

2. **Verification Chain File Organization**
   - What we know: The user wants "separate file per quality check, VERIFICATION-CHAIN is an index linking to each"
   - What's unclear: Whether the per-check files go in a subdirectory (`VERIFICATION-CHAIN-P02/scope-check.md`) or flat alongside the index (`scope-check-P02.md`)
   - Recommendation: Use a subdirectory. It keeps the phase directory clean and groups related files. The index file stays at the phase directory level for easy discovery.

3. **Reconciliation Step (GATE-09)**
   - What we know: Requirement says "Reconciliation step after parallel quality checks synthesizes potentially conflicting recommendations"
   - What's unclear: What "conflicting recommendations" looks like in practice -- e.g., simplify says "remove this abstraction" while grill-me says "this needs more error handling"
   - Recommendation: The change-summary step (Stage 3) naturally serves as reconciliation. It runs after parallel checks and can read all findings files. Its prompt should explicitly include: "Review findings from [list all check files]. If any checks have contradictory recommendations, note the conflict and recommend which to follow based on the phase's goals." No separate reconciliation step needed.

4. **wt Config Auto-Creation Scope**
   - What we know: Decision says "Auto-configure wt post-create hook on init if wt is installed but hook is missing"
   - What's unclear: Should Mowism create `.config/wt.toml` if it doesn't exist at all, or only add the hook if the file exists?
   - Recommendation: Create `.config/wt.toml` with the post-create hook if the file doesn't exist. If it exists, check for the `[post-create]` section and add the planning-copy hook if missing. Present what was added (like update-claude-md presents its diff) but don't require approval since the hook is non-destructive (copies files, doesn't modify them).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WKTR-01 | WorkTrunk (`wt` CLI) declared as required dependency; Mowism checks for it on init and errors clearly if missing | `checkWorkTrunk()` utility function pattern documented. Error message includes platform-specific install commands (yay, brew, cargo). Check runs on every `cmdInit*` call. wt v0.25.0 confirmed installed and working. |
| WKTR-02 | STATE.md tracks which worktree is executing which phase/plan | "Worktree Assignments" section design documented with fields: worktree path, branch, phase, status, started timestamp, agent/session ID. Section-aware merge strategy recommended. |
| WKTR-03 | STATE.md prevents double-execution (two worktrees claiming the same plan) | Hard block conflict resolution recommended. Phase-level lock: check STATE.md for existing claims before allowing execution. Stale entry detection via `wt list --format=json` cross-reference handles cleanup. |
| WKTR-04 | WorkTrunk post-create hook configures new worktrees with access to main worktree's `.planning/` state | `.config/wt.toml` post-create hook documented using `{{ primary_worktree_path }}` template variable. Hook copies entire `.planning/` directory and verifies STATE.md exists. Auto-creation of wt.toml on mow init documented. |
| WKTR-05 | `/mow:execute-phase` is worktree-aware -- routes plans to specific worktrees when running in parallel | Worktree claim mechanism: execute-phase reads current worktree path, writes claim to STATE.md, commits. Phase-level lock prevents two worktrees from claiming the same phase. Each worktree executes plans from its own `.planning/` copy. |
| GATE-01 | `/mow:refine-phase` command exists and runs between execute-phase and verify-work | New command file (`~/.claude/commands/mow/refine-phase.md`) and workflow file (`~/.claude/mowism/workflows/refine-phase.md`). Offered as next step after execute-phase completes. |
| GATE-02 | `/mow:refine-phase` presents 3 tier options (minimum, complex, algorithmic) via AskUserQuestion | Actually 4 options per CONTEXT.md: Auto (recommended), minimum, complex, algorithmic. Auto tier reads phase summaries to select appropriate tier. AskUserQuestion with 4 labeled options. |
| GATE-03 | Minimum tier runs: scope-check (gate) -> change-summary -> verify-work -> update-claude-md | Stage 1: scope-check as Task(). Stage 3: change-summary as Task(). Stage 4: verify-work as Task(). Stage 5: update-claude-md as Task(). No Stage 2 (parallel checks). Sequential execution. |
| GATE-04 | Complex tier runs: scope-check (gate) -> simplify + dead-code-sweep + grill-me in parallel -> change-summary -> verify-work -> update-claude-md | Stage 1: scope-check. Stage 2: simplify + dead-code-sweep + grill-me as parallel Task() calls in single message. Stage 3-5 sequential. Parallel execution pattern proven in diagnose-issues.md workflow. |
| GATE-05 | Algorithmic tier runs: scope-check (gate) -> prove-it + simplify + dead-code-sweep + grill-me in parallel -> change-summary -> verify-work -> update-claude-md | Same as GATE-04 but adds prove-it to Stage 2 parallel set. 4 parallel Task() calls. |
| GATE-06 | Quality check subagents write findings to `.planning/phases/VERIFICATION-CHAIN-P{phase}.md` | Index file at phase directory level, per-check findings in `VERIFICATION-CHAIN-P{phase}/` subdirectory. Each check writes its own file. Index created by orchestrator after chain completes with summary table, links, and overall verdict. |
| GATE-07 | STATE.md updated after refine-phase with verification results (date, tier used, pass/fail, blockers) | New "Verification Results" section in STATE.md. Written by refine-phase orchestrator after chain completes. Fields: phase, tier, result (pass/fail/error), date, blockers (from failing checks). |
| GATE-08 | Each quality check within a worktree runs locally; findings summary is accessible to orchestrator | Each Task() runs in the same worktree directory. Findings written to local `.planning/` files. Orchestrator reads findings files after each Task() returns to build index. |
| GATE-09 | Reconciliation step after parallel quality checks synthesizes potentially conflicting recommendations | Change-summary (Stage 3) serves as natural reconciliation point. Its prompt explicitly reads all Stage 1+2 findings files and notes conflicts. No separate reconciliation step needed -- change-summary already runs after parallel checks and before verify-work. |
</phase_requirements>

## Sources

### Primary (HIGH confidence)
- WorkTrunk CLI (`wt --help`, `wt switch --help`, `wt hook --help`, `wt config --help`, `wt list --help`, `wt merge --help`, `wt step --help`) -- Direct examination of v0.25.0 CLI help output
- `wt list --format=json` -- Direct execution showing structured JSON output fields
- `wt config show` -- Direct examination of current configuration state
- `/home/max/git/mowism/bin/mow-tools.cjs` -- Direct examination of existing init, state, and config patterns
- `~/.claude/mowism/workflows/execute-phase.md` -- Existing wave-based parallel execution pattern
- `~/.claude/mowism/workflows/diagnose-issues.md` -- Existing parallel Task() spawning with result collection
- `~/.claude/mowism/workflows/verify-work.md` -- Existing UAT and verification workflow
- `~/.claude/mowism/workflows/progress.md` -- Existing progress display and routing workflow
- `/home/max/git/ai-agent-tools-and-tips/RECOMMENDED-WORKFLOW-CHAIN.md` -- Quality chain staging order and execution pattern
- `/home/max/git/mowism/commands/*.md` -- All 7 quality skill command files (scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary, update-claude-md)
- `/home/max/git/mowism/.planning/STATE.md` -- Current STATE.md structure and sections
- `/home/max/git/mowism/.planning/REQUIREMENTS.md` -- Full requirement definitions

### Secondary (MEDIUM confidence)
- https://worktrunk.dev/claude-code/ -- WorkTrunk Claude Code integration docs (activity tracking, statusline, plugin install)
- https://worktrunk.dev -- WorkTrunk overview and features

### Tertiary (LOW confidence)
- None -- all findings verified through direct tool examination or codebase inspection

## Metadata

**Confidence breakdown:**
- WorkTrunk integration: HIGH -- CLI directly examined, JSON output tested, hook system fully documented via --help
- State tracking design: HIGH -- extends existing proven STATE.md patterns with well-understood section additions
- Quality chain orchestration: HIGH -- directly mirrors existing diagnose-issues.md parallel Task() pattern
- Discretion recommendations: MEDIUM -- recommendations are logical but untested in real concurrent scenarios
- Merge strategy: MEDIUM -- section-aware merge concept is sound but implementation requires careful testing

**Research date:** 2026-02-19
**Valid until:** 60 days (WorkTrunk is actively developed but API is stable; quality skill patterns are internal)
