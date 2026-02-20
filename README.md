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

<!-- This section is completed by Plan 11-01 Task 2 -->

<!-- COMMANDS_REFERENCE: Plan 02 will write this section -->

<!-- CONFIG_SECURITY_TROUBLESHOOTING: Plan 03 will write this section -->

## License and Attribution

Mowism is a fork of [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) by [TACHES](https://github.com/glittercowboy). The original GSD framework provides meta-prompting, context engineering, and spec-driven development for Claude Code. Mowism extends it with multi-agent coordination, worktree-aware state, and quality gates.
