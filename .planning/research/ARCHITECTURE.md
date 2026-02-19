# Architecture Research

**Domain:** Claude Code workflow orchestration / multi-agent coordination system
**Researched:** 2026-02-19
**Confidence:** HIGH (verified against official Claude Code docs, GSD source, WorkTrunk docs)

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                             │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  /mow:* Skill│  │  Agent Teams │  │  ??? Suffix  │                   │
│  │  Invocations │  │  (Lead +     │  │  (Docs       │                   │
│  │  (~35 skills)│  │  Teammates)  │  │  Viewer)     │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                 │                  │                           │
├─────────┴─────────────────┴──────────────────┴──────────────────────────┤
│                        ORCHESTRATION LAYER                              │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  Workflow     │  │  Quality     │  │  Worktree    │                   │
│  │  Engine       │  │  Gate        │  │  Coordinator │                   │
│  │  (Skills +   │  │  Pipeline    │  │  (wt CLI +   │                   │
│  │  Subagents)  │  │  (/refine)   │  │  state sync) │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                 │                  │                           │
├─────────┴─────────────────┴──────────────────┴──────────────────────────┤
│                        TOOLING LAYER                                    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    mow-tools.cjs (Node.js CLI)                  │    │
│  │  state ops | config | commits | phase ops | roadmap | verify    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                        STATE LAYER                                      │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │PROJECT.md│  │ROADMAP.md│  │ STATE.md │  │config.json│               │
│  │(immut.)  │  │(roadmap) │  │(mutable) │  │(settings) │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│  ┌──────────────────────────┐  ┌──────────────────────────┐            │
│  │  .planning/phases/       │  │  VERIFICATION-CHAIN-*.md │            │
│  │  (plans, summaries, ctx) │  │  (quality check results) │            │
│  └──────────────────────────┘  └──────────────────────────┘            │
│                                                                         │
│  All state lives in .planning/ within the main worktree.               │
│  Worktrees read shared state via git or symlink.                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Skills (SKILL.md files)** | Register `/mow:*` slash commands, define workflow logic | Markdown with YAML frontmatter in `~/.claude/skills/mow-*/SKILL.md` |
| **Subagent Definitions** | Specialized agent roles (executor, researcher, verifier, quality checkers) | Markdown with frontmatter in `~/.claude/agents/mow-*.md` |
| **mow-tools.cjs** | Stateful operations: config, state, commits, phase management, roadmap ops | Single-file Node.js CLI, fork of gsd-tools.cjs |
| **Quality Gate Pipeline** | Tiered quality checks between execute and verify phases | `/mow:refine-phase` skill orchestrating parallel subagents |
| **Worktree Coordinator** | Sync state between main worktree and child worktrees, track agent assignments | Combination of `wt` CLI hooks and state file conventions |
| **Agent Teams Integration** | Multi-session coordination for parallel feature work | Anthropic's experimental agent teams (lead + teammates + shared task list) |
| **State Files** | Source of truth for project progress, decisions, blockers | Markdown files in `.planning/` directory |

## Recommended Project Structure

```
~/.claude/
├── skills/
│   ├── mow-new-project/          # /mow:new-project
│   │   ├── SKILL.md              # Workflow definition (frontmatter + instructions)
│   │   ├── templates/            # Supporting files referenced by SKILL.md
│   │   └── references/           # Domain knowledge files
│   ├── mow-execute-phase/        # /mow:execute-phase
│   │   └── SKILL.md
│   ├── mow-refine-phase/         # /mow:refine-phase (quality gate pipeline)
│   │   ├── SKILL.md              # Orchestrator: tier selection + subagent spawning
│   │   └── tiers.md              # Tier definitions (minimum, complex, algorithmic)
│   ├── mow-scope-check/          # /mow:scope-check (quality check)
│   │   └── SKILL.md
│   ├── mow-simplify/             # /mow:simplify
│   │   └── SKILL.md
│   ├── mow-prove-it/             # /mow:prove-it
│   │   └── SKILL.md
│   ├── mow-grill-me/             # /mow:grill-me
│   │   └── SKILL.md
│   ├── mow-dead-code-sweep/      # /mow:dead-code-sweep
│   │   └── SKILL.md
│   ├── mow-change-summary/       # /mow:change-summary
│   │   └── SKILL.md
│   ├── mow-update-claude-md/     # /mow:update-claude-md
│   │   └── SKILL.md
│   ├── mow-progress/             # /mow:progress
│   │   └── SKILL.md
│   ├── mow-resume-work/          # /mow:resume-work
│   │   └── SKILL.md
│   └── ... (~35 skills total)
├── agents/
│   ├── mow-executor.md           # Plan execution subagent
│   ├── mow-verifier.md           # Phase verification subagent
│   ├── mow-project-researcher.md # Research subagent (stack/features/arch/pitfalls)
│   ├── mow-phase-researcher.md   # Phase-specific research subagent
│   ├── mow-roadmapper.md         # Roadmap creation subagent
│   ├── mow-quality-checker.md    # Generic quality check subagent
│   └── mow-synthesizer.md        # Research synthesis subagent
└── bin/
    └── mow-tools.cjs             # Node.js CLI tool (fork of gsd-tools.cjs)

<project>/.planning/
├── PROJECT.md                    # Project definition (rarely changes)
├── REQUIREMENTS.md               # Requirements with status tracking
├── ROADMAP.md                    # Phase structure with progress tables
├── STATE.md                      # Mutable state: position, decisions, blockers
├── config.json                   # Settings: mode, depth, parallelization, etc.
├── agent-history.json            # Subagent tracking (spawns, completions)
├── research/                     # Research outputs
│   ├── SUMMARY.md
│   ├── STACK.md
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   └── PITFALLS.md
├── phases/
│   ├── 01-foundation/
│   │   ├── 01-01-PLAN.md
│   │   ├── 01-01-SUMMARY.md
│   │   ├── 01-02-PLAN.md
│   │   ├── 01-02-SUMMARY.md
│   │   ├── CONTEXT.md
│   │   ├── VERIFICATION.md
│   │   └── VERIFICATION-CHAIN-P01.md   # Quality check results
│   ├── 02-core/
│   │   └── ...
│   └── ...
├── todos/
│   ├── pending/
│   └── completed/
└── worktree-state.json           # NEW: Worktree assignment tracking
```

### Structure Rationale

- **`~/.claude/skills/`**: Claude Code's skill system auto-discovers these and registers them as `/mow:*` slash commands. Each skill is a directory with SKILL.md + supporting files. This replaces GSD's `workflows/` directory pattern since skills are the native Claude Code extension mechanism (GSD's workflows predate skills).

- **`~/.claude/agents/`**: Subagent definitions used by skills via `context: fork` and `agent: mow-executor` frontmatter, or spawned directly via `Task(subagent_type="mow-executor")`. These define system prompts, tool restrictions, and model selection for each agent role.

- **`~/.claude/bin/`**: The Node.js CLI tool handles all stateful file operations. Agents call it via `Bash` tool. It must be a single file (no npm install) because it ships as a standalone tool.

- **`.planning/`**: Lives in the main worktree. Other worktrees access it via the mechanisms described in the Worktree State Architecture section below.

## Architectural Patterns

### Pattern 1: Skill-as-Orchestrator

**What:** Each `/mow:*` command is a skill (SKILL.md) that acts as an orchestrator. It reads state, makes decisions, spawns subagents for heavy work, and updates state. The skill itself stays lean; subagents do the real work.

**When to use:** Any workflow command that involves multi-step execution.

**Trade-offs:**
- Pro: Each skill runs in a fresh context, keeping the user's main conversation clean
- Pro: Skills can reference supporting files in their directory without loading them all into context
- Pro: Native slash-command registration with no custom infrastructure
- Con: Skills cannot spawn other skills (they can only spawn subagents)
- Con: Skill descriptions consume context budget (2% of window, ~16K chars fallback)

**Example:**

```yaml
# ~/.claude/skills/mow-execute-phase/SKILL.md
---
name: mow-execute-phase
description: Execute all plans in a phase using wave-based parallel execution
disable-model-invocation: true
---

<purpose>
Execute all plans in a phase. Orchestrator stays lean - delegates plan
execution to subagents.
</purpose>

## Step 1: Initialize
...load state via mow-tools.cjs...

## Step 2: Spawn executors
...Task(subagent_type="mow-executor") for each plan...

## Step 3: Verify + Report
...aggregate results, update state...
```

### Pattern 2: Subagent Delegation with Path-Only Prompts

**What:** When spawning subagents, pass file paths rather than file contents. Each subagent starts with a fresh 200K context window and reads the files it needs. This keeps the orchestrator's context lean (~10-15% usage).

**When to use:** Always, for any Task() spawning.

**Trade-offs:**
- Pro: Orchestrator stays at low context usage, can coordinate many subagents
- Pro: Subagents get fresh context without inheriting conversation noise
- Con: Subagents cannot spawn other subagents (single-level delegation)
- Con: Subagents do not share the parent's conversation history

**Example:**

```
Task(
  subagent_type="mow-executor",
  model="sonnet",
  prompt="
    Execute plan at .planning/phases/01-foundation/01-01-PLAN.md
    Read STATE.md and config.json at start.
    Commit each task atomically.
    Create SUMMARY.md when done.
  "
)
```

### Pattern 3: Wave-Based Parallel Execution

**What:** Plans within a phase are grouped into dependency waves. Plans in the same wave execute in parallel; waves execute sequentially. This is GSD's core execution model and carries forward to Mowism.

**When to use:** Phase execution with multiple plans.

**Trade-offs:**
- Pro: Maximizes parallelism while respecting dependencies
- Pro: Claude Code supports up to 7 parallel subagents (capped at 10)
- Con: Wave boundaries are static (defined at plan-creation time), not dynamic
- Con: If one plan in a wave fails, the entire wave blocks

**Example:**

```
Wave 1: [01-01-PLAN, 01-02-PLAN]  (independent, run parallel)
Wave 2: [01-03-PLAN]               (depends on Wave 1, sequential)
Wave 3: [01-04-PLAN, 01-05-PLAN]  (independent of each other, run parallel)
```

### Pattern 4: Tiered Quality Gate Pipeline

**What:** `/mow:refine-phase` asks which tier of quality checks to run, then spawns the appropriate subagents. Three tiers: minimum (every phase), complex (risky phases), algorithmic (correctness-critical). Each tier adds checks on top of the previous.

**When to use:** Between execute and verify in the phase lifecycle.

**Trade-offs:**
- Pro: Users choose the depth of verification based on risk, saving tokens on routine phases
- Pro: Checks within a tier run in parallel where possible
- Con: Quality check results must persist to files (agents lose context on /clear)
- Con: Running all checks at the algorithmic tier is expensive (many parallel subagents)

**Staged execution:**

```
Tier 1 (Minimum):
  Stage 1 (Gate):     /mow:scope-check        [sequential, fast]
  Stage 2 (Parallel): /mow:change-summary
  Stage 3 (Verify):   /mow:verify-work         [sequential, depends on Stage 2]
  Stage 4 (Learn):    /mow:update-claude-md     [sequential, last]

Tier 2 (Complex): All of Tier 1, plus:
  Stage 2 adds:       /mow:simplify + /mow:dead-code-sweep + /mow:grill-me + /mow:prove-it
                       [all parallel with each other]

Tier 3 (Algorithmic): All of Tier 2, plus:
  Stage 2 adds:       /mow:naive-first
  /mow:prove-it becomes the centerpiece (runs with higher scrutiny prompt)
```

### Pattern 5: Main Worktree as State Authority

**What:** All `.planning/` state lives in the main worktree (the original git checkout). Child worktrees created by `wt switch -c` do NOT have their own `.planning/` directories. Instead, they access the main worktree's state through one of two mechanisms:

1. **Symlink approach** (recommended): A `wt` post-create hook creates a symlink from `<worktree>/.planning` to `<main>/.planning`
2. **Git-based approach** (fallback): Agents read state by checking out files from the main branch

**When to use:** Any multi-worktree scenario.

**Trade-offs:**
- Pro: Single source of truth eliminates state divergence
- Pro: All agents see the same roadmap, requirements, and progress
- Con: Concurrent writes to STATE.md from multiple worktrees can cause conflicts
- Con: Symlinks require shell wrapper (WorkTrunk hooks) and are OS-dependent
- Mitigation: Write operations go through mow-tools.cjs which can implement file locking

**Example hook for WorkTrunk:**

```toml
# wt.toml (in repo root or ~/.config/worktrunk/config.toml)
[hooks]
post-create = "ln -sfn $(git rev-parse --show-toplevel)/.planning .planning"
```

## Data Flow

### Lifecycle Data Flow

```
/mow:new-project
    │
    ├── Questioning → PROJECT.md
    ├── Config → config.json
    ├── Research (4 parallel subagents) → .planning/research/*.md
    ├── Synthesize → SUMMARY.md
    ├── Requirements → REQUIREMENTS.md
    └── Roadmap (subagent) → ROADMAP.md + STATE.md + phases/

/mow:execute-phase
    │
    ├── Read STATE.md → determine current phase
    ├── Read phase plans → group into waves
    ├── Per wave: spawn executor subagents (parallel)
    │   └── Each executor: reads PLAN.md → executes → writes SUMMARY.md → commits
    ├── Spot-check summaries → verify files exist, commits present
    └── Update STATE.md + ROADMAP.md progress

/mow:refine-phase
    │
    ├── Ask user: which tier? (minimum / complex / algorithmic)
    ├── Stage 1: /mow:scope-check (gate)
    │   └── If scope blown → STOP, report to user
    ├── Stage 2: Parallel quality checks (tier-dependent)
    │   └── Each check writes findings to VERIFICATION-CHAIN-P{N}.md
    ├── Stage 3: /mow:verify-work (depends on Stage 2)
    └── Stage 4: /mow:update-claude-md (learning capture)

/mow:resume-work (with Agent Teams)
    │
    ├── Read STATE.md → determine what's in progress
    ├── Offer: single session or agent team?
    ├── If team: lead reads roadmap, spawns teammates per phase/plan
    │   ├── Each teammate: wt switch -c → gets own worktree
    │   ├── Teammates claim tasks from shared task list
    │   └── Lead monitors progress, synthesizes results
    └── If single: standard sequential execution
```

### State Update Flow

```
Agent (in any worktree)
    │
    ├── Reads: .planning/STATE.md (via symlink to main worktree)
    ├── Reads: .planning/ROADMAP.md
    ├── Reads: .planning/phases/NN-name/NN-MM-PLAN.md
    │
    ├── Executes tasks, commits to own branch
    │
    └── Writes (via mow-tools.cjs):
        ├── .planning/phases/NN-name/NN-MM-SUMMARY.md
        ├── .planning/STATE.md (position, decisions, metrics)
        ├── .planning/ROADMAP.md (progress tables)
        └── .planning/phases/VERIFICATION-CHAIN-P{N}.md
```

### Worktree State Architecture

```
Main Worktree (/home/user/project)
    │
    ├── .planning/                    ← Source of truth
    │   ├── STATE.md                  ← Mutable: position, blockers, decisions
    │   ├── worktree-state.json       ← NEW: which agent is in which worktree
    │   ├── ROADMAP.md
    │   └── ...
    │
    ├── Worktree A (/home/user/project.feature-auth)
    │   ├── .planning → symlink to main/.planning
    │   ├── Own branch: feature-auth
    │   └── Agent working on auth plans
    │
    └── Worktree B (/home/user/project.feature-api)
        ├── .planning → symlink to main/.planning
        ├── Own branch: feature-api
        └── Agent working on API plans

worktree-state.json:
{
  "worktrees": {
    "feature-auth": {
      "path": "/home/user/project.feature-auth",
      "agent": "teammate-1",
      "phase": 2,
      "plan": "02-01",
      "status": "executing",
      "started": "2026-02-19T10:00:00Z"
    },
    "feature-api": {
      "path": "/home/user/project.feature-api",
      "agent": "teammate-2",
      "phase": 2,
      "plan": "02-03",
      "status": "executing",
      "started": "2026-02-19T10:01:00Z"
    }
  },
  "locks": {
    "STATE.md": null,
    "ROADMAP.md": null
  }
}
```

### Key Data Flows

1. **Skill invocation flow:** User types `/mow:execute-phase 2` in Claude Code. Claude loads SKILL.md content. Skill runs `mow-tools.cjs init execute-phase 2` to gather context. Skill spawns subagents with paths. Subagents read their own files, execute, write summaries. Skill collects results, updates state.

2. **Quality gate flow:** After phase execution, user runs `/mow:refine-phase 2`. Skill presents tier options. User selects. Skill spawns gate check (scope-check). If passes, spawns parallel quality subagents. Each writes findings to `VERIFICATION-CHAIN-P02.md`. After all complete, runs verify-work, then update-claude-md.

3. **Agent Teams flow:** User runs `/mow:resume-work --team`. Lead agent reads STATE.md, identifies parallelizable work. Lead creates agent team via Agent Teams API. Teammates are spawned, each running `wt switch -c` to get their own worktree. Shared task list tracks who is working on what. Teammates message lead with progress. Lead updates STATE.md and worktree-state.json.

4. **Worktree state sync flow:** Agent in worktree-A finishes plan. Calls `mow-tools.cjs state update`. Tool acquires advisory lock on STATE.md (via lockfile). Writes update. Releases lock. Agent in worktree-B reads STATE.md and sees updated progress. No merge conflicts because writes are serialized.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-3 agents | Symlink-based state sharing works fine. File locking via mow-tools.cjs advisory locks prevents corruption. Agent Teams optional. |
| 4-7 agents | Agent Teams becomes valuable for coordination. worktree-state.json tracks assignments. Need careful plan-to-worktree mapping to avoid merge conflicts on the same files. |
| 8+ agents | Hitting Claude Code's parallel subagent limit (7-10). Must use Agent Teams (each teammate is independent session). State contention on STATE.md becomes real. Consider splitting state into per-phase files. |

### Scaling Priorities

1. **First bottleneck: State file contention.** Multiple agents writing to STATE.md simultaneously. Fix with advisory file locking in mow-tools.cjs. The tool already serializes through a single CLI invocation per write.

2. **Second bottleneck: Context window pressure.** Skills loading many file descriptions consume the 2% budget. With ~35 skills, descriptions alone could exceed 16K chars. Fix by using `disable-model-invocation: true` on all workflow skills (user invokes them explicitly) and `user-invocable: false` on background knowledge skills.

3. **Third bottleneck: Merge conflicts from parallel worktrees.** Agents in different worktrees editing overlapping files. Fix by assigning non-overlapping file ownership per plan (GSD already does this with the `files_modified` field in plan frontmatter).

## Anti-Patterns

### Anti-Pattern 1: Workflows as GSD-Style Workflow Files

**What people do:** Put workflow definitions in a custom `workflows/` directory with custom loading logic (as GSD does today).

**Why it's wrong:** Claude Code now has a native skill system. Skills in `~/.claude/skills/` auto-register as slash commands. Building a parallel system duplicates functionality and misses features like `context: fork`, `allowed-tools`, hooks, and `$ARGUMENTS` substitution.

**Do this instead:** Convert all GSD workflows to skills. Each workflow becomes a SKILL.md with YAML frontmatter. Supporting files go in the skill directory. The `/mow:*` namespace is just the skill name with a prefix.

### Anti-Pattern 2: Fat Orchestrator

**What people do:** The main skill tries to do everything: read all files, execute all tasks, verify all results. This bloats the orchestrator's context window.

**Why it's wrong:** Claude Code has a 200K context window. A single execution that reads all plans, all state, and all verification results will compress context (auto-compaction), losing earlier reasoning.

**Do this instead:** Orchestrator reads minimal state (positions, assignments), spawns subagents for heavy work, receives summaries back. Each subagent gets a fresh 200K window. GSD's "orchestrator coordinates, not executes" principle is correct.

### Anti-Pattern 3: Duplicating State Across Worktrees

**What people do:** Each worktree gets its own copy of .planning/ files. Agents in worktree-A and worktree-B independently update their own STATE.md.

**Why it's wrong:** State diverges immediately. Agent-A marks phase 1 complete. Agent-B doesn't know. Both start phase 2 plans. Merging the worktrees produces conflicting STATE.md files.

**Do this instead:** Single source of truth in the main worktree. All worktrees symlink to it. Write operations go through mow-tools.cjs with advisory locking.

### Anti-Pattern 4: Using Agent Teams for Everything

**What people do:** Spin up agent teams for every command, even simple sequential operations.

**Why it's wrong:** Agent Teams use significantly more tokens than a single session. Each teammate is a full Claude Code instance. For `/mow:scope-check` (a fast, single-agent operation), the overhead of team coordination exceeds the work itself.

**Do this instead:** Use Agent Teams only when teammates need to communicate with each other (cross-feature coordination, competing hypotheses). Use subagents (Task tool) for parallel-but-independent work like quality checks. Use single-session for sequential operations.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **WorkTrunk (wt CLI)** | Shell commands via Bash tool: `wt switch`, `wt list`, `wt merge` | Required dependency. Used for worktree lifecycle. Hooks (`wt.toml`) automate setup. |
| **Agent Teams** | Natural language commands to Claude Code lead agent | Experimental, requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. No API; coordination is emergent from shared task list + messaging. |
| **Git** | Standard git commands via Bash tool | Used for commits, branches, merges. mow-tools.cjs wraps commit operations. |
| **GitHub (optional)** | `gh` CLI via Bash tool | PR creation, issue tracking. Not a core dependency. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Skill <-> mow-tools.cjs** | Shell exec via Bash tool, JSON stdout | Skills call `node mow-tools.cjs <cmd>`, parse JSON output. This is the primary interface for all state operations. |
| **Skill <-> Subagent** | Task() tool with prompt string | Subagent receives file paths to read, executes independently, writes results to disk. Return value is a text summary. |
| **Orchestrator <-> Quality Checker** | Task() with subagent_type="mow-quality-checker" | Quality checkers receive phase directory path, write findings to VERIFICATION-CHAIN file. |
| **Main Worktree <-> Child Worktree** | Symlink (.planning/) + advisory file locks | Reads are free (symlink). Writes go through mow-tools.cjs which manages locking. |
| **Agent Teams Lead <-> Teammate** | Shared task list + mailbox messaging | Anthropic's built-in coordination. Lead assigns tasks, teammates claim them, results flow back via messages. |
| **Skills <-> Claude Code** | Skill system (YAML frontmatter + markdown body) | Claude Code auto-discovers skills, registers as slash commands, injects descriptions into context. |

## Component Interaction Diagram

```
User
  │
  ├─ /mow:new-project ─────── Skill reads PROJECT.md
  │   │                          │
  │   ├─ Task(researcher) ×4 ── Subagents write .planning/research/*.md
  │   ├─ Task(synthesizer) ──── Reads research, writes SUMMARY.md
  │   ├─ Task(roadmapper) ───── Reads all, writes ROADMAP.md + STATE.md
  │   └─ mow-tools.cjs ──────── commit, scaffold phases
  │
  ├─ /mow:execute-phase ───── Skill reads STATE.md, ROADMAP.md
  │   │                          │
  │   ├─ mow-tools.cjs init ── Returns phase info, plan inventory
  │   ├─ Task(executor) ×N ─── Subagents read PLANs, write SUMMARYs
  │   └─ mow-tools.cjs ──────── update state, record metrics
  │
  ├─ /mow:refine-phase ────── Skill presents tier choice
  │   │                          │
  │   ├─ Task(scope-check) ──── Gate: pass/fail
  │   ├─ Task(quality) ×N ──── Parallel: simplify, prove-it, grill-me, etc.
  │   │   └─ All write to ───── VERIFICATION-CHAIN-P{N}.md
  │   ├─ Task(verify-work) ──── Goal-backward verification
  │   └─ Task(update-md) ────── Learning capture to CLAUDE.md
  │
  └─ /mow:resume-work ──────── Skill reads STATE.md
      │
      ├─ Single mode: ────────── Continue where left off
      └─ Team mode: ──────────── Agent Teams
          ├─ Lead reads roadmap
          ├─ wt switch -c ×N ── Create worktrees
          ├─ Teammates execute ─ Each in own worktree
          ├─ Shared task list ── Coordination
          └─ Lead: merge results back
```

## Build Order (Dependency Chain)

Understanding the dependency chain is critical for phasing the roadmap. Components must be built in this order:

```
1. mow-tools.cjs (fork gsd-tools.cjs, rebrand)
   └── Foundation: all skills depend on this for state operations
       No other component works without it.

2. Core State Files + Templates (fork GSD templates)
   └── PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json
       Templates define file structure that tools and skills expect.

3. Core Skills (fork + convert GSD workflows to skills)
   ├── /mow:new-project
   ├── /mow:execute-phase
   ├── /mow:execute-plan
   ├── /mow:verify-phase
   ├── /mow:resume-work
   ├── /mow:progress
   └── ... (all GSD workflow equivalents)
       These are the minimum viable system.

4. Subagent Definitions (fork GSD agents)
   ├── mow-executor.md
   ├── mow-verifier.md
   ├── mow-researcher.md
   └── mow-roadmapper.md
       Skills reference these; they must exist for spawning.

5. Quality Check Skills (fork Karpathy/Cherny skills)
   ├── /mow:scope-check
   ├── /mow:simplify
   ├── /mow:prove-it
   ├── /mow:grill-me
   ├── /mow:dead-code-sweep
   ├── /mow:change-summary
   ├── /mow:update-claude-md
   └── /mow:naive-first
       Independent of each other. Can be built in parallel.

6. /mow:refine-phase (Quality Gate Pipeline)
   └── Depends on: quality check skills (step 5)
       Orchestrates the tiered pipeline.

7. Worktree State Awareness
   ├── worktree-state.json schema + mow-tools.cjs operations
   ├── wt.toml hooks for .planning symlink
   ├── Advisory file locking in mow-tools.cjs
   └── STATE.md extensions for worktree tracking
       Depends on: core tools (step 1) + core skills (step 3)

8. Agent Teams Integration
   ├── /mow:resume-work --team mode
   ├── Lead agent coordination logic
   ├── Teammate spawning with worktree assignment
   └── Shared task list mapping to ROADMAP.md plans
       Depends on: worktree state (step 7) + core skills (step 3)

9. Install Script + Documentation
   ├── One-command install to ~/.claude/
   ├── Dependency checking (wt, node, git)
   ├── ??? suffix documentation viewer
   └── README, usage guides
       Depends on: everything else being stable
```

**Key dependency insight:** Steps 1-4 are the "fork and rebrand" phase -- mostly mechanical work converting GSD to Mowism. Steps 5-6 are the "quality pipeline" -- the primary value-add over GSD. Steps 7-8 are the "multi-agent coordination" -- the hardest novel work. Step 9 is packaging.

## Sources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) -- Official docs on skill system, frontmatter, context forking
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- Subagent definitions, tool restrictions, hooks, memory
- [Claude Code Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams) -- Agent Teams architecture, shared task lists, messaging
- [WorkTrunk Documentation](https://worktrunk.dev/) -- wt CLI commands, hooks, configuration
- [WorkTrunk Tips & Patterns](https://worktrunk.dev/tips-patterns/) -- Multi-agent patterns, state markers, dev server isolation
- [WorkTrunk GitHub](https://github.com/max-sixty/worktrunk) -- Source code and README
- [GSD get-shit-done source](file://~/.claude/get-shit-done/) -- Existing workflow architecture being forked
- [ccswarm](https://github.com/nwiizo/ccswarm) -- Reference multi-agent orchestration with worktree isolation
- [Git Worktrees for Parallel AI Agents (Upsun)](https://devcenter.upsun.com/posts/git-worktrees-for-parallel-ai-coding-agents/) -- Patterns and challenges
- [From Tasks to Swarms (alexop.dev)](https://alexop.dev/posts/from-tasks-to-swarms-agent-teams-in-claude-code/) -- Agent Teams vs Task tool comparison

---
*Architecture research for: Claude Code workflow orchestration / multi-agent coordination*
*Researched: 2026-02-19*
