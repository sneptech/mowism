# Mowism

Coordinated multi-agent workflows for Claude Code -- plan, execute, and ship with parallel agents across git worktrees.

## What is Mowism

Mowism is a meta-prompting framework for Claude Code that plans and executes project work in phases. You describe what you want to build, and Mowism breaks it into researched requirements, a phased roadmap, and detailed execution plans -- then runs them with per-task commits, quality gates, and state tracking. When you're ready, it can parallelize execution across git worktrees using Claude Code's Agent Teams.

What makes it different: worktree-aware state so multiple agents never conflict, DAG-based phase scheduling so independent phases run simultaneously, tiered quality gates that scale verification depth to code complexity, and live agent feedback with color-coded terminals so you always know what each worker is doing.

Mowism is a permanent fork of [GSD](https://github.com/gsd-build/get-shit-done) by [TACHES](https://github.com/glittercowboy). Where GSD focuses on single-agent productivity, Mowism adds the coordination layer: multi-agent orchestration, worktree state synchronization, DAG scheduling, and automated quality verification. The two projects have fully diverged.

## Install

```bash
git clone https://github.com/sneptech/mowism.git
cd mowism
./bin/install.sh
```

The installer copies all commands, agents, workflows, and tools to `~/.claude/` and checks for required dependencies. It never blocks on missing dependencies -- it reports what's missing and how to install it.

## Requirements

| Dependency | Required | Purpose | Install |
|---|---|---|---|
| Claude Code | Yes | Runtime environment | [claude.ai/code](https://claude.ai/code) |
| Node.js | Yes | Powers mow-tools.cjs (state management, roadmap updates) | [nodejs.org](https://nodejs.org) |
| WorkTrunk | Yes | Multi-worktree management (`wt` CLI) | [WorkTrunk repo](https://github.com/nicholasgasior/worktrunk) |

**Optional:** Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to enable multi-agent parallel execution across worktrees.

## Quick Start

After installing, open Claude Code in any project directory and run:

```
/mow:new-project           # Research + requirements + roadmap
/clear
/mow:plan-phase 1          # Create execution plans
/clear
/mow:execute-phase 1       # Execute all plans
```

This initializes a `.planning/` directory with your project state, creates phased execution plans, and runs them. Use `/clear` between commands to keep context fresh.

## The Mowism Lifecycle

The quick start above shows the happy path. Here's the full picture -- every stage of a Mowism project, from initialization through milestone completion.

### Single-Agent Workflow

This is the default. One Claude Code session, one agent, full control.

**1. Start a project** -- `/mow:new-project`

Mowism asks deep questions about your goals, constraints, and preferences. Then it optionally spawns 4 parallel research agents for domain-specific investigation. The result is a `.planning/` directory containing:

- `PROJECT.md` -- your project vision and constraints
- `REQUIREMENTS.md` -- scoped requirements with acceptance criteria
- `ROADMAP.md` -- phased execution plan
- `STATE.md` -- session continuity and progress tracking
- `config.json` -- workflow preferences

**2. Discuss a phase** (optional) -- `/mow:discuss-phase N`

Capture your vision for how a phase should work before any planning happens. Creates a `CONTEXT.md` with decisions that constrain the planner -- what approach to take, what to avoid, architectural preferences.

**3. Research a phase** (optional) -- `/mow:research-phase N`

Deep domain research for specialized areas (3D rendering, ML pipelines, audio processing, etc.). Spawns focused research agents that produce a `RESEARCH.md` with recommended stack, patterns, and pitfalls to avoid.

**4. Plan a phase** -- `/mow:plan-phase N`

Breaks the phase into 2-3 detailed task plans with dependency waves. Each plan gets a `XX-NN-PLAN.md` file containing tasks, verification criteria, and success conditions. Plans respect any CONTEXT.md or RESEARCH.md that exist.

**5. Execute a phase** -- `/mow:execute-phase N`

Executes plans wave by wave -- independent plans within each wave run in parallel via subagents. Each plan executor commits per-task, handles deviations automatically (bug fixes, missing validation, blocking issues), and produces a `XX-NN-SUMMARY.md` documenting what was built and any deviations from the plan.

**6. Refine a phase** -- `/mow:refine-phase N`

Runs tiered quality gates scaled to code complexity:

- **Minimum** (always): scope-check + change-summary
- **Complex** (when warranted): + simplify, dead-code-sweep, grill-me
- **Algorithmic** (when applicable): + prove-it

Creates a `VERIFICATION-CHAIN-P{N}.md` with findings and recommended fixes.

**7. Verify work** (optional) -- `/mow:verify-work N`

Conversational user acceptance testing. Presents test cases one at a time, waits for your pass/fail verdict. If failures are found, diagnoses the root cause and creates fix plans that can be executed with `/mow:execute-phase N --gaps-only`.

**8. Complete milestone** -- `/mow:complete-milestone`

Archives the milestone (roadmap, requirements, stats), creates a git tag, and prepares for the next body of work. Follow with `/mow:new-milestone` to start the next version.

```
new-project -> [discuss] -> [research] -> plan-phase -> execute-phase -> refine-phase -> [verify-work] -> complete-milestone
                                               ^                              |
                                               +-- repeat for each phase -----+
```

*Brackets indicate optional steps.*

### Multi-Agent Parallel Execution

When you're ready to parallelize, Mowism can run independent phases simultaneously across git worktrees using Claude Code's Agent Teams.

**Enable Agent Teams:**

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

**DAG-based scheduling:** Phases in the roadmap declare `depends_on` dependencies. Mowism analyzes the dependency graph and identifies which phases can run in parallel -- phases with no unmet dependencies execute simultaneously rather than waiting in a linear chain.

**How it works:** When you run `/mow:execute-phase`, Mowism detects Agent Teams and spawns a team lead. The lead analyzes the DAG, creates workers for independent phases, and assigns each worker its own git worktree. Workers execute their phases autonomously -- planning, executing, and refining without manual intervention.

**Live feedback:** Workers send structured progress messages to the team lead. A dashboard in the orchestrator terminal shows:

- Phase-level status (queued, in-progress, complete, blocked)
- Event log with timestamped milestones and completions
- Pinned notifications for items requiring attention

**Color-coded terminals:** The orchestrator terminal displays a red banner. Each worker gets a unique bright ANSI color. When a worker needs user input (a permission prompt, a design decision, a verification checkpoint), the orchestrator shows which terminal to switch to -- including the phase name, input type, and terminal color.

**Cleanup:** Run `/mow:close-shop` to gracefully shut down the multi-agent session and merge worktrees back to the main branch.

## Brownfield Projects

Already have a codebase? Start here instead of the Quick Start.

```
/mow:map-codebase           # Analyze existing code
/clear
/mow:new-project            # Initialize planning on top of analysis
```

`/mow:map-codebase` spawns 4 parallel mapper agents that produce 7 structured documents in `.planning/codebase/`:

| Document | What it captures |
|---|---|
| `STACK.md` | Languages, frameworks, build tools, runtime |
| `ARCHITECTURE.md` | System design, component boundaries, data flow |
| `STRUCTURE.md` | Directory layout, file organization patterns |
| `CONVENTIONS.md` | Naming conventions, code style, patterns in use |
| `TESTING.md` | Test framework, coverage, testing patterns |
| `INTEGRATIONS.md` | External services, APIs, third-party dependencies |
| `CONCERNS.md` | Technical debt, security issues, performance risks |

These documents feed into the planner's context so execution plans respect your existing patterns, conventions, and architecture -- instead of imposing new ones.

You can run `map-codebase` before or after `new-project`. If you're continuing work on a project that already has a `.planning/` directory from a previous milestone, use `/mow:new-milestone` instead of `/mow:new-project`.

## Commands

Mowism provides 35 `/mow:*` commands and 7 quality skills. Append `???` to any command for detailed help -- e.g., `/mow:execute-phase ???` opens the full reference for that command.

### Getting Started

| Command | Description |
|---|---|
| `/mow:new-project` | Initialize a new project with deep context gathering and roadmap |
| `/mow:map-codebase` | Analyze existing codebase with parallel mapper agents |
| `/mow:help` | Show the full command reference |
| `/mow:help-open` | Open help documentation for a specific command in your editor |

### Phase Planning

| Command | Description |
|---|---|
| `/mow:discuss-phase N` | Gather your vision for a phase through adaptive questioning |
| `/mow:research-phase N` | Research domain for complex or niche phases |
| `/mow:list-phase-assumptions N` | Surface Claude's assumptions about a phase before planning |
| `/mow:plan-phase N` | Create detailed execution plans with verification criteria |

```
/mow:discuss-phase 3         # Optional: share your vision first
/mow:research-phase 3        # Optional: deep research for niche domains
/mow:plan-phase 3            # Create execution plans
```

### Execution

| Command | Description |
|---|---|
| `/mow:execute-phase N` | Execute all plans in a phase with wave-based parallelization |
| `/mow:quick` | Execute a quick task with Mowism guarantees, skip optional agents |

```
/mow:execute-phase 3         # Execute all plans in phase 3
/mow:quick                   # Small task: plan + execute, no research/verify
```

### Quality and Verification

| Command | Description |
|---|---|
| `/mow:refine-phase N` | Run tiered quality gates (minimum/complex/algorithmic) |
| `/mow:verify-work N` | Conversational user acceptance testing against deliverables |

```
/mow:refine-phase 3          # Quality gates scaled to code complexity
/mow:verify-work 3           # UAT: pass/fail each test case interactively
```

### Roadmap Management

| Command | Description |
|---|---|
| `/mow:add-phase "description"` | Add a phase to the end of the current milestone |
| `/mow:insert-phase N "description"` | Insert urgent work as a decimal phase between existing phases |
| `/mow:remove-phase N` | Remove a future phase and renumber subsequent phases |

```
/mow:add-phase "Add admin dashboard"
/mow:insert-phase 5 "Critical auth fix"   # Creates Phase 5.1
/mow:remove-phase 12                      # Renumbers 13+ down
```

### Milestone Management

| Command | Description |
|---|---|
| `/mow:new-milestone` | Start a new milestone cycle (questioning, research, requirements, roadmap) |
| `/mow:complete-milestone` | Archive completed milestone, create git tag, prepare for next |
| `/mow:audit-milestone` | Audit milestone completion against original intent |
| `/mow:plan-milestone-gaps` | Create phases to close gaps identified by audit |

```
/mow:complete-milestone      # Archive and tag
/clear
/mow:new-milestone           # Start next body of work
```

### Session Management

| Command | Description |
|---|---|
| `/mow:progress` | Check project status and route to next action |
| `/mow:resume-work` | Resume from previous session with context restoration |
| `/mow:pause-work` | Save context handoff when pausing mid-phase |

```
/mow:progress                # Where am I? What's next?
/mow:pause-work              # Saves state for later
/mow:resume-work             # Picks up where you left off
```

### Debugging and Todos

| Command | Description |
|---|---|
| `/mow:debug "issue"` | Systematic debugging with persistent state across context resets |
| `/mow:add-todo` | Capture an idea or task as a todo from conversation context |
| `/mow:check-todos` | List pending todos and select one to work on |

```
/mow:debug "login fails"     # Start investigation
/clear
/mow:debug                   # Resume after context reset
```

### Multi-Agent

| Command | Description |
|---|---|
| `/mow:team-status` | Show agent team status and teammate assignments |
| `/mow:worktree-status` | Show detailed worktree assignment status |
| `/mow:close-shop` | Gracefully shut down multi-agent session and merge worktrees |

### Configuration

| Command | Description |
|---|---|
| `/mow:settings` | Configure workflow toggles and model profile interactively |
| `/mow:set-profile PROFILE` | Quick switch model profile (quality/balanced/budget) |

```
/mow:set-profile budget      # Sonnet for writing, Haiku for research
/mow:settings                # Interactive toggle for agents and profile
```

### Utility

| Command | Description |
|---|---|
| `/mow:health` | Diagnose `.planning/` directory health and optionally repair issues |
| `/mow:cleanup` | Archive phase directories from completed milestones |
| `/mow:update` | Update Mowism to latest version with changelog preview |
| `/mow:migrate` | Migrate an existing GSD `.planning/` directory to Mowism format |
| `/mow:reapply-patches` | Reapply local modifications after a Mowism update |

### Quality Skills

Standalone commands (no `/mow:` prefix) for code quality. Run directly in Claude Code.

| Skill | Description |
|---|---|
| `scope-check` | Verify recent changes stay within the scope of the original task |
| `simplify` | Audit code for unnecessary complexity and over-engineering |
| `dead-code-sweep` | Find unreachable and unused code after refactors |
| `change-summary` | Generate a structured summary of all changes with risks |
| `prove-it` | Demand evidence that changes work by diffing behavior between states |
| `grill-me` | Aggressive code review -- challenge changes before they ship |
| `update-claude-md` | Update CLAUDE.md with session learnings so mistakes are not repeated |

Run `/mow:help` for the full reference, or append `???` to any command for detailed help.

<!-- CONFIG_SECURITY_TROUBLESHOOTING: Plan 03 will write this section -->

## License and Attribution

Mowism is a fork of [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) by [TACHES](https://github.com/glittercowboy). The original GSD framework provides meta-prompting, context engineering, and spec-driven development for Claude Code. Mowism extends it with multi-agent coordination, worktree-aware state, and quality gates.
