# Mowism

## What This Is

A fork of [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) rebranded to `/mow:*`, redesigned around parallel multi-agent workflows using git worktrees and Anthropic's Agent Teams. It bundles quality-check skills derived from Andrej Karpathy and Boris Cherny's Claude Code practices, and introduces `/mow:refine-phase` as an automated inter-phase quality gate. For developers running multiple Claude Code sessions in parallel who need state coherence, quality assurance, and coordination across agents.

## Core Value

Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration — without manual context-checking between sessions.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] GSD forked and all `/gsd:*` commands rebranded to `/mow:*`
- [ ] WorkTrunk required as core dependency (replaces existing `wt:*` skills)
- [ ] `.planning/` state files are worktree-aware (track which worktree/agent is doing what, prevent conflicts)
- [ ] `/mow:refine-phase` command — tiered inter-phase quality checks (minimum, complex, algorithmic) running parallel subagents
- [ ] `/mow:refine-phase` always asks which tier, presents 3 options
- [ ] `???` suffix on any command opens that command's documentation in the user's default text editor
- [ ] Agent Teams integration — `/mow:new-project` and `/mow:resume-work` offer to spin up a multi-session agent team with a lead orchestrator
- [ ] Human moves between individual agent sessions for context/input while lead tracks overall state
- [ ] All Karpathy/Cherny skills (scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary, update-claude-md, etc.) forked into the Mowism repo
- [ ] Quality check subagents write findings to persistent files (`.planning/phases/VERIFICATION-CHAIN-P{phase}.md`)
- [ ] STATE.md tracks verification chain results, worktree assignments, and agent team status
- [ ] GitHub repo with one-command install to Claude Code
- [ ] Install script registers all `/mow:*` skills globally in `~/.claude/`

### Out of Scope

- Multi-year workflow persistence — aspirational goal, not v1. State files in git are sufficient for now.
- Custom database or knowledge graph for long-term memory — CLAUDE.md + .planning/ files cover this
- Mobile/web UI — CLI-only, Claude Code terminal
- Forking/modifying WorkTrunk itself — use it as-is, it's someone else's tool
- Building a custom Agent Teams implementation — use Anthropic's experimental feature as-is

## Context

**GSD's limitation:** GSD assumes a single agent working on a single branch. Its `.planning/STATE.md` doesn't track which worktree is executing which plan, and documentation written in one worktree isn't visible to agents in other worktrees until merged. This causes context fragmentation — agents in different worktrees don't know what other agents have done, leading to manual "hey, do you have everything?" checks.

**Current manual workflow:** After every GSD phase execution, the user manually runs a chain of quality-check skills (scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary, verify-work, update-claude-md) from the RECOMMENDED-WORKFLOW-CHAIN.md. These are staged in a specific order with parallelization opportunities, but running them manually is tedious and error-prone.

**WorkTrunk:** A CLI tool (`wt` command) for managing git worktrees, purpose-built for multi-agent parallel work. Handles worktree creation, switching, merging, hooks, and cleanup. Available via brew, cargo, yay (Arch), or winget.

**Agent Teams:** Anthropic's experimental feature for coordinating multiple Claude Code instances. One session acts as team lead, others are teammates with shared task lists and inter-agent messaging. Currently requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

**Source skills:** 20+ skills from Boris Cherny (Claude Code team lead) and Andrej Karpathy, covering planning, review, simplification, scope discipline, testing, proof-of-correctness, code review, dead code cleanup, and CLAUDE.md maintenance. All currently live at `/home/max/git/ai-agent-tools-and-tips/`.

**Name origin:** "Mow" = the chirping sound a snow leopard makes. "Mowism" = Mow + Maoism (five-year plans). A pun reflecting the goal of long-running agentic workflows. The project mascot is a snow leopard.

## Constraints

- **Dependency:** WorkTrunk must be installed (`wt` CLI available in PATH) for Mowism to function
- **Dependency:** Agent Teams requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (experimental, may change)
- **Platform:** CachyOS (Arch-based Linux), fish shell, KDE Plasma on Wayland — install and skills must work in this environment
- **Upstream:** GSD is actively maintained; the fork will diverge. No expectation of merging back upstream.
- **Install pattern:** Must install to `~/.claude/` and register skills via Claude Code's skill system, installable from a single command

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork GSD rather than wrap it | Need deep modifications to state management, skill names, and assumptions — wrapping would be fragile | — Pending |
| Rebrand `/gsd:*` to `/mow:*` | Clean identity separation from upstream GSD | — Pending |
| WorkTrunk replaces custom `wt:*` skills | WorkTrunk is purpose-built, actively maintained, and more capable than the custom skills | — Pending |
| Fork Karpathy/Cherny skills into Mowism | Single package, can enhance with worktree awareness and state persistence | — Pending |
| Agent Teams as a first-class integration | Multi-agent coordination is core to the vision, not an add-on | — Pending |
| `???` suffix for inline docs | Low-friction way to learn command options without leaving the terminal | — Pending |

---
*Last updated: 2026-02-19 after initialization*
