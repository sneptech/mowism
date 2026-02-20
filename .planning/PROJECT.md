# Mowism

## What This Is

A fork of [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) rebranded to `/mow:*`, redesigned around parallel multi-agent workflows using git worktrees and Anthropic's Agent Teams. It bundles quality-check skills derived from Andrej Karpathy and Boris Cherny's Claude Code practices, and introduces `/mow:refine-phase` as an automated inter-phase quality gate. For developers running multiple Claude Code sessions in parallel who need state coherence, quality assurance, and coordination across agents.

## Core Value

Multiple Claude Code agents can work in parallel across git worktrees with coherent shared state, automated quality gates, and coordinated orchestration — without manual context-checking between sessions.

## Requirements

### Validated

- ✓ GSD forked and all `/gsd:*` commands rebranded to `/mow:*` — v1.0
- ✓ WorkTrunk required as core dependency with clear error if missing — v1.0
- ✓ `.planning/` state files are worktree-aware (track assignments, prevent conflicts) — v1.0
- ✓ `/mow:refine-phase` command — tiered quality checks (minimum, complex, algorithmic) with parallel subagents — v1.0
- ✓ `???` suffix on any command opens documentation in user's editor — v1.0
- ✓ Agent Teams integration — `/mow:new-project` and `/mow:resume-work` offer multi-session coordination — v1.0
- ✓ All Karpathy/Cherny quality skills forked and registered as Mowism skills — v1.0
- ✓ Quality check findings written to `.planning/phases/VERIFICATION-CHAIN-P{phase}.md` — v1.0
- ✓ STATE.md tracks verification results, worktree assignments, and agent team status — v1.0
- ✓ One-command install from GitHub README with all skills registered in `~/.claude/` — v1.0
- ✓ Portable paths — zero hardcoded `~/.claude/` references, works on any machine — v1.0
- ✓ Dual-path update workflow (git clone and install.sh installations both supported) — v1.0

### Active

- [ ] Multi-agent state coherence architecture — research and implement how `.planning/` state survives parallel worktree execution without merge conflicts or context window exhaustion — v1.1
- [ ] Phase-level parallelism — DAG dependency graph in roadmap (not linear chain), multi-phase execution across worktrees simultaneously — v1.1
- [ ] Live agent feedback — message-driven progress reporting from phase workers to orchestrator terminal — v1.1
- [ ] Distributed input routing with color-coded agent terminals — user switches to worker terminal for input, orchestrator shows rich notifications with phase/mode/terminal info — v1.1
- [ ] README overhaul — lifecycle narrative, all 35 commands documented, brownfield entry point, config/security/troubleshooting sections — v1.1

### Out of Scope

- Multi-year workflow persistence — state files in git are sufficient for now
- Custom database or knowledge graph — CLAUDE.md + .planning/ files cover this
- Mobile/web UI — CLI-only, Claude Code terminal
- Forking/modifying WorkTrunk itself — use as-is, clean dependency boundary
- Building a custom Agent Teams implementation — use Anthropic's experimental feature as-is
- Plugin/extension marketplace — skills are .md files, users copy them into a directory
- Automatic model routing — user-selected profiles are more predictable

## Context

**Shipped v1.0** with ~41,500 lines across 248 files (cjs, md, sh, json).
Tech stack: Node.js (mow-tools.cjs), Bash (install.sh), Markdown (workflows, commands, agents, templates, help).
103 tests passing in mow-tools.test.cjs. 36/36 requirements satisfied. 6 phases, 22 plans executed in ~50 minutes.

**GSD divergence:** Mowism adds worktree-aware state, `/mow:refine-phase` quality gates, Agent Teams coordination, and a `???` help system — none of which exist in upstream GSD. The fork is intentionally permanent.

## Current Milestone: v1.1 Multi-Agent UX & Documentation

**Goal:** Make parallel multi-agent execution actually work well — coherent state across worktrees, phase-level parallelism, live feedback, intuitive input routing — then document the full system in a comprehensive README.

**Target features:**
- Multi-agent state coherence (research-driven architecture for `.planning/` under parallel execution)
- Phase-level parallelism (DAG roadmap, concurrent phase execution)
- Live agent feedback (message-driven progress in orchestrator)
- Distributed input routing (color-coded terminals, rich notifications)
- README overhaul (lifecycle narrative, all 35 commands, brownfield entry)

## Constraints

- **Dependency:** WorkTrunk must be installed (`wt` CLI available in PATH) for Mowism to function
- **Dependency:** Agent Teams requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (experimental, may change)
- **Platform:** CachyOS (Arch-based Linux), fish shell, KDE Plasma on Wayland — install and skills must work in this environment
- **Upstream:** GSD is actively maintained; the fork will diverge. No expectation of merging back upstream.
- **Install pattern:** Must install to `~/.claude/` and register skills via Claude Code's skill system, installable from a single command

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork GSD rather than wrap it | Need deep modifications to state management, skill names, and assumptions — wrapping would be fragile | ✓ Good — clean separation, 248 files modified without upstream entanglement |
| Rebrand `/gsd:*` to `/mow:*` | Clean identity separation from upstream GSD | ✓ Good — zero "gsd" in user-facing output, migrate command for existing users |
| WorkTrunk replaces custom `wt:*` skills | WorkTrunk is purpose-built, actively maintained, and more capable than the custom skills | ✓ Good — hard dependency with clear error messaging |
| Fork Karpathy/Cherny skills into Mowism | Single package, can enhance with worktree awareness and state persistence | ✓ Good — 7 skills registered, fully standalone |
| Agent Teams as a first-class integration | Multi-agent coordination is core to the vision, not an add-on | ✓ Good — prominent nudge, graceful degradation when disabled |
| `???` suffix for inline docs | Low-friction way to learn command options without leaving the terminal | ✓ Good — 34 help files, $EDITOR fallback chain |
| Ordered string replacement (most-specific-first) | Prevent double-replacement during rebrand (e.g., "gsd-tools" before "gsd") | ✓ Good — zero replacement artifacts across 107+ files |
| Tiered quality gates (minimum/complex/algorithmic) | Different codebases need different depth of review | ✓ Good — one-word selection, parallel subagents, machine-readable output |
| Dual-path update (git clone vs install.sh) | Users install via different methods, both need working updates | ✓ Good — configurable via .update-source file |
| Archive pattern for orphaned files | Keep design references without cluttering active workflows | ✓ Good — _archive/ with YAML frontmatter documenting reason and replacement |
| Distributed input routing (not centralized/hybrid) | User switches to worker terminal; orchestrator shows rich notification with phase/mode/terminal info | — Pending |
| Color-coded terminal badges per agent | Red background for orchestrator, rotating bright ANSI colors for workers | — Pending |
| AT tool availability is per-agent-type | Executor types lack AT tools by design; general-purpose/team-lead types have them; nested hierarchies possible | — Pending |
| README overhaul is last v1.1 phase | README documents what changed in the milestone, must run after all implementation phases | — Pending |
| State coherence needs research before implementation | 5 candidate approaches identified; choosing wrong pattern bakes structural problems into multi-agent execution | — Pending |

---
*Last updated: 2026-02-20 after v1.1 milestone start*
