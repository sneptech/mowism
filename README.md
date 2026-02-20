# Mowism

Coordinated multi-agent workflows for Claude Code with worktree-aware state and automated quality gates.

## What is Mowism

Mowism is a workflow framework that lets multiple Claude Code agents work in parallel across git worktrees with shared state, quality checks, and optional Agent Teams coordination. Each agent knows what the others are doing through worktree-aware state tracking, preventing conflicts and enabling true parallel development.

It grew from a fork of [GSD](https://github.com/gsd-build/get-shit-done), redesigned around parallel multi-agent workflows and WorkTrunk-based worktree management. Where GSD focuses on single-agent productivity, Mowism adds the coordination layer: worktree claims, state synchronization, tiered quality gates, and Agent Teams integration.

The result is a system where you can have one agent implementing features in one worktree while another runs quality checks in another, all sharing a coherent view of project state through `.planning/STATE.md`.

## Install

```bash
git clone https://github.com/sneptech/mowism.git
cd mowism
./bin/install.sh
```

The installer copies all commands, agents, workflows, and tools to `~/.claude/` and checks for required dependencies. It never blocks on missing dependencies -- it reports what's missing and how to install it.

## Quick Start

After installing, open Claude Code in any project and run:

```
/mow:new-project
```

This initializes a `.planning/` directory with your project state, roadmap, and requirements. From there, the core workflow is:

1. `/mow:plan-phase` -- plan the next phase of work (research, then plans)
2. `/mow:execute-phase` -- execute plans (optionally in parallel across worktrees)
3. `/mow:refine-phase` -- run quality gates to verify the work

## Features

- **`/mow:*` command namespace** -- 30+ commands for planning, execution, quality, and management
- **Worktree-aware state tracking** -- `STATE.md` tracks which agent is doing what in which worktree
- **Tiered quality gates** -- `/mow:refine-phase` runs minimum, complex, or algorithmic verification tiers
- **Agent Teams integration** -- Optional parallel execution with Claude Code's experimental Agent Teams
- **Quality skills** -- Standalone commands: `scope-check`, `simplify`, `dead-code-sweep`, `prove-it`, `grill-me`, `change-summary`, `update-claude-md`
- **Inline help** -- Add `???` to any command (e.g., `/mow:execute-phase ???`) for detailed usage info

## Requirements

| Dependency | Required | Purpose |
|---|---|---|
| [Claude Code](https://claude.ai/code) | Yes | Runtime environment |
| [Node.js](https://nodejs.org) | Yes | Powers mow-tools.cjs (state management, roadmap updates) |
| [WorkTrunk](https://github.com/nicholasgasior/worktrunk) | Yes | Multi-worktree management (`wt` CLI) |
| Agent Teams env var | No | Enables parallel agent execution (optional but recommended) |

## Commands

### Getting Started

| Command | Description |
|---|---|
| `/mow:new-project` | Initialize a new project with `.planning/` structure |
| `/mow:help` | Full command list and usage info |

### Planning

| Command | Description |
|---|---|
| `/mow:research-phase` | Research context for a phase |
| `/mow:plan-phase` | Generate execution plans for a phase |
| `/mow:discuss-phase` | Discuss phase approach before planning |

### Execution

| Command | Description |
|---|---|
| `/mow:execute-phase` | Execute plans (sequential or parallel) |
| `/mow:verify-work` | Verify completed work against plan |
| `/mow:progress` | Show current project progress |

### Quality

| Command | Description |
|---|---|
| `/mow:refine-phase` | Run tiered quality gates on completed phase |
| `scope-check` | Verify changes match intended scope |
| `simplify` | Find opportunities to reduce complexity |
| `prove-it` | Challenge assumptions with evidence |
| `grill-me` | Adversarial review of implementation |

### Management

| Command | Description |
|---|---|
| `/mow:pause-work` | Save state and pause for later |
| `/mow:resume-work` | Resume from saved state |
| `/mow:settings` | View and update project settings |
| `/mow:health` | Check project health and consistency |

Run `/mow:help` for the full list, or append `???` to any command for detailed help.

## License and Attribution

Mowism is a fork of [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) by [TÂCHES](https://github.com/glittercowboy). The original GSD framework provides meta-prompting, context engineering, and spec-driven development for Claude Code. Mowism extends it with multi-agent coordination, worktree-aware state, and quality gates.
