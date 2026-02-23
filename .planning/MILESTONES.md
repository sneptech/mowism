# Milestones

## v1.0 Mowism (Shipped: 2026-02-20)

**Phases completed:** 6 phases, 22 plans
**Timeline:** 2 days (2026-02-19 → 2026-02-20)
**Commits:** 97
**Files:** 248 modified, ~41,500 lines of code
**Requirements:** 36/36 satisfied

**Key accomplishments:**
- Complete GSD fork with all `/mow:*` commands, agents, workflows, templates rebranded — zero "gsd" strings in user-facing output
- Worktree-aware state tracking in STATE.md with conflict detection and WorkTrunk integration for parallel multi-agent work
- `/mow:refine-phase` tiered quality gate chain (minimum/complex/algorithmic) running parallel quality skill subagents
- Agent Teams coordination with lead orchestrator, STATE.md team tracking, and prominent onboarding nudge
- One-command install script with `???` help system for all 34 commands and $EDITOR fallback chain
- Full portability — zero hardcoded paths, dual-path update workflow (git clone vs install.sh), portable `~/.claude/` references

---


## v1.1 Multi-Agent UX & Documentation (Shipped: 2026-02-24)

**Phases completed:** 6 phases (7-12), 17 plans
**Timeline:** 1 day (2026-02-20)
**Commits:** 108
**Files:** 96 modified, +21,129 / -1,184 lines
**Requirements:** 18/18 satisfied

**Key accomplishments:**
- Single-writer state protocol with per-phase STATUS.md, structured JSON messaging (7 event types), and Active Phases dashboard for multi-agent coordination
- DAG-based phase scheduling — dependency parsing, Kahn's BFS topological sort with wave grouping, confidence-tiered parallelism detection in roadmapper
- Multi-phase execution engine — worktree lifecycle management, DAG-driven team lead orchestrator, autonomous phase workers with full lifecycle, graceful shutdown
- Live feedback dashboard — 256-color ANSI with fallbacks, 13-event message schema v2, pinned notifications, input routing for permission prompts
- Comprehensive README — lifecycle narrative (8 stages), 35 commands documented, brownfield entry, configuration/security/troubleshooting
- Audit gap closure — recipient standardization, requirements-completed in SUMMARY templates

---


## v1.2 Native Worktrees & Full-Lifecycle Workers (Shipped: 2026-02-24)

**Phases completed:** 4 phases (13-16), 15 plans
**Timeline:** 1 day (2026-02-24)
**Commits:** 50
**Files:** 64 modified, +11,528 / -880 lines
**Requirements:** 32/32 satisfied

**Key accomplishments:**
- Ported 11 correctness bugfixes from GSD upstream -- dollar sign corruption, executor retry limits, progress clamping, backup-before-repair, discuss-phase ambiguity probing
- Context window monitor hook (25%/15% thresholds) and CLAUDE.md subagent injection for project context discovery
- Replaced WorkTrunk dependency with Claude Code native worktree hooks (`isolation: worktree`) -- net LOC reduction, migration script for existing users
- Full-lifecycle phase workers chain discuss → research → plan → execute → refine autonomously with artifact-based resume detection
- `/mow:auto` command drives entire milestones from one entry point with DAG-aware scheduling, discuss pause gates, and milestone boundary cleanup
- Dashboard milestone-wide auto-advance progress banner showing current phase and completion percentage

---

