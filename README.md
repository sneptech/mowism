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

<!-- COMMANDS_REFERENCE: Plan 02 will write this section -->

<!-- CONFIG_SECURITY_TROUBLESHOOTING: Plan 03 will write this section -->

## License and Attribution

Mowism is a fork of [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) by [TACHES](https://github.com/glittercowboy). The original GSD framework provides meta-prompting, context engineering, and spec-driven development for Claude Code. Mowism extends it with multi-agent coordination, worktree-aware state, and quality gates.
