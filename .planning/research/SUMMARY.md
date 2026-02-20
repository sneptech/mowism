# Research Summary: Mowism v1.1

**Project:** Mowism — Multi-Agent Coordination CLI for Claude Code
**Domain:** Multi-agent state coherence, parallel phase execution, live feedback, visual differentiation
**Researched:** 2026-02-20
**Supersedes:** v1.0 SUMMARY.md (2026-02-19) for v1.1 scope. v1.0 decisions (zero-dependency CJS, Markdown workflows, WorkTrunk, plugin format) remain valid and are not repeated here.
**Confidence:** HIGH (stack and architecture verified against codebase; Agent Teams API partially verified; pitfalls grounded in codebase analysis and industry literature)

## Executive Summary

Mowism v1.1 adds four capabilities to a working sequential orchestration system: (1) distributed state coherence for parallel workers, (2) DAG-based phase scheduling instead of a linear chain, (3) live milestone feedback from workers to the coordinator, and (4) color-coded terminal badges for visual identification. These are well-understood problems in multi-agent engineering — CrewAI, LangGraph, Google ADK, and Airflow all solve them — but Mowism's constraints (zero npm dependencies, LLM-readable Markdown files, Agent Teams API as the coordination layer, git worktrees as process isolation) require purpose-built solutions rather than off-the-shelf ones. The core insight from research is that all four features share a single load-bearing dependency: **the coordinator must own shared state exclusively, and workers must write only to their own isolated files.** Without this, parallel execution produces lost updates, merge conflicts, and coordinator context drift.

The recommended architecture is the Hybrid: index + lead-writes-state pattern. Workers write per-phase STATUS.md files in their own directories; the coordinator maintains a lightweight STATE.md index (~50 lines); workers communicate via structured JSON inbox messages rather than directly modifying shared files. This pattern is zero-dependency (NDJSON append via `fs.appendFileSync`, atomic rename via `fs.renameSync`, ANSI color via `util.styleText`), agent-readable (everything is Markdown or JSON), and git-compatible (per-phase directories merge cleanly because each is owned by one worker). The DAG scheduler is a 25-line hand-rolled Kahn's algorithm — no library needed.

The primary risk is over-engineering: the pitfall research finds that 41.77% of multi-agent failures stem from coordination complexity exceeding the value delivered. The correct mitigation is incremental delivery — ship state coherence and single-writer protocol first, validate it works, then add DAG scheduling, then add feedback and color. Each layer should demonstrably pay for its coordination overhead before the next is added. A secondary risk is Agent Teams API gaps: 6 of 8 runtime questions remain INCONCLUSIVE because testing requires a top-level interactive session with `mow-team-lead` or `general-purpose` agent types. The architecture is designed resilient to these unknowns — it uses defensive patterns (explicit unblocking rather than assumed auto-unblocking, lead-maintained teammate registry rather than assumed `listTeammates` API).

## Key Findings

### Recommended Stack

Mowism's zero-dependency constraint is non-negotiable: no `npm install`, no `node_modules`, single `.cjs` file. Every v1.1 addition uses Node.js built-ins or inline implementations. The stack research verified all recommendations on Node.js 25.4.0.

**Core technologies:**
- **Hand-rolled topological sort (Kahn's BFS)** — DAG phase scheduling — ~25 lines, verified with 4 test cases (diamond, linear, independent, complex); no library needed
- **`util.styleText()` (Node.js built-in, stable since v22)** — ANSI color badges — zero deps, respects `NO_COLOR`/`FORCE_COLOR` automatically; raw ANSI fallback for tmux OSC sequences; degrades gracefully to plain text on Node < 22
- **NDJSON append-only event logs (`fs.appendFileSync`)** — per-phase event capture — atomic on POSIX for lines < PIPE_BUF (4096 bytes); no read-modify-write, no merge conflicts
- **Write-then-rename pattern (`fs.writeFileSync` + `fs.renameSync`)** — atomic shared state updates — POSIX atomic rename prevents partial reads by concurrent processes
- **JSON-in-string convention over Agent Teams inbox** — structured worker-to-coordinator messages — not a first-class API feature; a prompt engineering pattern where workers send compact JSON strings the coordinator parses

**Rejected (all break zero-dependency constraint or solve non-existent problems):** `chalk`, `ansi-colors`, `picocolors`, `graph-data-structure`, `toposort`, `proper-lockfile`, SQLite, Redis, WebSocket/SSE, event sourcing frameworks.

**Version compatibility:** Core features work on Node >= 18. Color badges degrade to plain text on Node < 22 (cosmetic, not functional). Agent Teams experimental feature required for multi-agent execution.

**Estimated implementation:** ~280 lines of new code + ~200 lines of tests, all in `mow-tools.cjs`. Zero new installed files outside the existing single-file deployment.

### Expected Features

**Must have (table stakes — any parallel agent system must provide these):**
- Single source of truth for project state — every multi-agent framework requires it; without it, workers drift
- Non-overlapping write keys per worker — Google ADK's core pattern for safe concurrent state mutation
- State survives context window compression — unique LLM constraint; state must be on disk, not in agent context
- Explicit dependency declarations in roadmap — every DAG scheduler requires `depends_on` to be explicit, not implied
- Topological sort with wave grouping — produces execution "generations" (sets of phases with no unmet dependencies)
- Structured milestone messages from workers — defined checkpoints: claimed, complete, error, blocked, phase_done
- Worker self-identification banner — minimum visual differentiation in concurrent sessions
- Rich notification content in coordinator — what phase, what input type, which terminal, which color badge

**Should have (differentiators):**
- Distributed state with lightweight index — no other Claude Code tool splits `.planning/` into per-phase files with a coordinator-owned index
- Git-native state isolation — worktrees provide process isolation, merge is reconciliation; no external runtime needed
- Hierarchical progress rollup — coordinator sees O(phases) messages, not O(tasks); workers handle their own wave coordination
- Roadmapper auto-detects parallelism — roadmap creation agent infers independent phases from requirement analysis
- Color-coded status rows in coordinator dashboard — correlate colors to terminals at a glance

**Defer to v1.2+:**
- tmux pane integration — optional, tmux-only, add when core is stable
- Phase-level merge conflict prediction — complex, needs real-world data on conflict frequency
- Dynamic DAG restructuring at runtime — anti-feature for now; fix the DAG at roadmap creation time

**Anti-features (explicitly rejected patterns):**
- Real-time streaming output from workers (Agent Teams does not provide this)
- Scribe agent for state reconciliation (consumes teammate slot, adds bottleneck; no nested teams allowed)
- Progress bars or percentage indicators (meaningless for LLM agents with unpredictable runtimes)
- Cross-worktree file watchers (requires infrastructure Claude Code sessions cannot manage)
- Event sourcing as primary state (LLMs cannot efficiently replay JSONL; use snapshots)

### Architecture Approach

The recommended architecture is **Approach E: Hybrid (index + lead-writes-state)**, selected from five evaluated candidates. Workers own per-phase STATUS.md files; the coordinator owns STATE.md (index) and ROADMAP.md (DAG). Workers never write shared state — they send structured JSON messages and the coordinator serializes updates. This eliminates merge conflicts (non-overlapping write domains), keeps the coordinator's context light (index is ~50 lines; detail is on demand), and aligns with Agent Teams' flat coordination model.

**Critical architecture corrections from official docs (override earlier assumptions):**
- No nested teams — teammates cannot spawn their own teams or teammates; only the lead manages the team (flat model)
- Permission prompts bubble up to lead automatically — not session-local as previously assumed; but the lead cannot proxy approvals; user must switch to worker terminal
- Auto-unblocking confirmed — "When a teammate completes a task that other tasks depend on, blocked tasks unblock without manual intervention" per official docs; however runtime test was inconclusive so defensive unblocking is still recommended as a fallback

**Major components:**
1. **STATE.md (coordinator-owned index)** — `## Active Phases` table replaces `## Current Position`; tracks N concurrent phases with worktree, worker, plan progress, last update; stays under 100 lines
2. **Per-phase STATUS.md files** — `.planning/phases/XX-name/XX-STATUS.md`; written only by the phase worker; contains live plan progress table, phase-local decisions, issues; read by coordinator on demand
3. **ROADMAP.md DAG** — extended `**Depends on:**` field supports comma-separated phase lists; new `**Parallel with:**` advisory annotation; parsed by `roadmap analyze-dag` command with topological sort output
4. **mow-tools.cjs additions** — `roadmap dag`, `event append/read`, `state rebuild`, `format badge/status`, `message format/parse`, `state active-phases`, `state update-phase-row`, `color-assign` — all inline implementations, zero new dependencies
5. **Agent Teams coordination layer** — Task system for plan-level dependencies; structured inbox messages for phase-level status; TeammateIdle and TaskCompleted hooks for automated quality gates
6. **Color assignment system** — deterministic by spawn order: green, yellow, blue, magenta, cyan, white; lead always red; passed to workers via spawn prompt; workers print self-identification banner at startup

**Files that change:** `mow-tools.cjs` (~280 lines new), `STATE.md` (Active Phases table format), `ROADMAP.md` (DAG dependency format), `mow-team-lead.md` (multi-phase orchestration rewrite), `execute-phase.md` (write STATUS.md, send structured messages, do not write STATE.md directly), roadmap/state templates.

**Files that do NOT change:** `wt.toml` (copy semantics still correct — snapshot is intentionally stale), `execute-plan.md` (plan execution unchanged), quality skill agents, command definitions.

### Critical Pitfalls

1. **Lost updates in STATE.md during parallel phase execution** — Multiple workers calling `mow-tools.cjs phase complete` concurrently produce the classic lost update. Prevention: single-writer protocol — only the coordinator writes STATE.md; workers write only per-phase STATUS.md files and send messages. Must be solved before enabling any parallel execution. (Source: mow-tools.cjs line 5246 — no locking mechanism exists)

2. **Coordinator context window exhaustion under message flood** — N phase workers send milestone messages plus Agent Teams idle notifications (automatic, one per worker turn); at 4+ workers this approaches the 200k token limit; auto-compression is lossy. Prevention: state on disk (re-read STATE.md after compression), compact messages (<200 tokens), milestone-only communication, periodic state snapshots. (Source: AGENT-TEAMS-API-RUNTIME.md context window analysis)

3. **DAG dependency cycles and phantom dependencies** — LLMs generating roadmap dependency graphs can produce cycles (deadlock) or phantom dependencies (unnecessary serialization). Prevention: validate DAG at generation time with `roadmap validate-dag`; require concrete justification per dependency edge; default to independent rather than dependent; user review before execution.

4. **.planning/ copy semantics creating divergent realities** — The `wt.toml` hook copies `.planning/` as a snapshot; parallel phases develop divergent reality. Prevention: workers treat the snapshot as read-only context; write ONLY to their own per-phase STATUS.md; coordinator is the single source of live state. (Source: mow-tools.cjs line 247 — WT_PLANNING_COPY_HOOK)

5. **Over-engineering coordination that adds latency without value** — 41.77% of multi-agent failures are system design issues (MAST 2025). Each pitfall prevention is individually justified but together can make coordination slower than sequential execution. Prevention: ship incrementally; measure before adding each coordination mechanism; budget coordination tokens at <20% of orchestrator prompt.

**Additional watchpoints:** Worker crash leaving orphaned state (timeout-based claim expiry), background mode workers blocking silently on permission prompts (use tmux/in-process for phases with checkpoints, pre-approve common tools via `settings.json`), terminal color escape code incompatibility (use 24-bit RGB with `$COLORTERM` detection, always pair color with text labels, respect `NO_COLOR`).

## Implications for Roadmap

The feature dependency graph has a clear internal DAG: State Coherence unlocks everything; DAG Scheduling can be developed in parallel with State Coherence (different files); Multi-Phase Execution requires both; Live Feedback and Visual Differentiation build on the execution infrastructure; README documents the stable result.

### Phase 1: State Coherence Foundation

**Rationale:** Load-bearing dependency for all other v1.1 features. Parallel phases cannot track independent progress without it. Coordinator context drift is catastrophic without disk-first state. Must ship first.
**Delivers:** Single-writer state protocol; per-phase STATUS.md files and format; `state active-phases`, `state update-phase-row`, `state next-unblockable` mow-tools.cjs commands; STATE.md Active Phases table (replaces Current Position); atomic write patterns; updated execute-phase.md worker behavior (writes STATUS.md, sends structured JSON messages, does not write STATE.md directly)
**Addresses:** State coherence table stakes — single source of truth, non-overlapping write keys, compression-resilient state
**Avoids:** Pitfall 1 (lost updates), Pitfall 5 (.planning/ divergent copies), Pitfall 10 (claim table race conditions)
**Research flag:** Standard patterns — skip research-phase; single-writer, atomic file operations, and per-directory ownership are textbook

### Phase 2: DAG-Based Phase Scheduling

**Rationale:** Can be developed in parallel with Phase 1 — they modify different files (state system vs. roadmap format/parse). However, integration and actual parallel phase execution require Phase 1 to be in place first.
**Delivers:** Extended `**Depends on:**` syntax (comma-separated phase lists), `**Parallel with:**` advisory field, `roadmap analyze-dag` command with topological sort and execution wave output, `roadmap validate-dag` command with cycle detection and justification requirements, roadmapper agent update to emit DAG dependencies during `/mow:new-milestone`
**Addresses:** DAG scheduling table stakes — explicit dependency declarations, topological sort, wave grouping, cycle detection, partial dependency support
**Avoids:** Pitfall 3 (DAG cycles and phantom dependencies), Pitfall 13 (merge conflicts from overlapping phase file modifications)
**Research flag:** Standard algorithm — Kahn's BFS is textbook; roadmapper prompt updates may benefit from small validation exercise to confirm LLM distinguishes genuine from phantom dependencies reliably

### Phase 3: Multi-Phase Execution Engine

**Rationale:** Depends on Phase 1 (state coherence) and Phase 2 (DAG scheduler). This is where parallel execution becomes functional. Most complex phase — requires integrating all prior work into a coherent coordinator flow.
**Delivers:** Rewritten `mow-team-lead.md` for multi-phase orchestration (spawn N workers, DAG-aware task list, parse structured messages, display dashboard, detect unblocked phases, reassign idle workers); `execute-phase.md` behavior update; integration test with 2+ parallel phases
**Addresses:** Multi-phase execution command differentiator; phase completion notification; error escalation from workers; worker reassignment after phase completion
**Avoids:** Pitfall 2 (context window exhaustion — disk-first state), Pitfall 4 (orphaned worker state), Pitfall 9 (over-engineering — ship incrementally)
**Research flag:** NEEDS research-phase — 6 Agent Teams API runtime questions remain inconclusive and directly affect coordinator design: auto-unblocking behavior, idle notification content, message delivery timing, teammate status querying, message size limits. Testing requires an interactive Claude Code session with `mow-team-lead` agent type. See "Gaps to Address" for test plan.

### Phase 4: Live Feedback and Visual Differentiation

**Rationale:** UX features that build on Phase 3 execution infrastructure. Color banners are partially independent (add to workers early), but coordinator dashboard and input routing require Phase 3 coordinator to be in place.
**Delivers:** Structured milestone message schema (claimed, progress, complete, error, blocked, phase_done) with `message format/parse` helpers; color palette with deterministic assignment and `color-assign` command; worker self-identification banner; coordinator dashboard with color-coded rows; input routing notifications ("Switch to Terminal 2 — green"); tiered notification severity (critical/important/info suppressed by default); `format badge/status` commands; `util.styleText` integration with Node < 22 fallback; terminal color detection (`$COLORTERM`, `NO_COLOR`)
**Addresses:** Visual differentiation table stakes; live feedback table stakes; coordinator dashboard refresh differentiator; quiet worker detection
**Avoids:** Pitfall 7 (notification fatigue — tiered severity), Pitfall 8 (terminal color incompatibility — 24-bit RGB + text labels + `NO_COLOR`), Pitfall 14 (background mode blocking — mode selection at spawn time)
**Research flag:** Standard patterns — skip research-phase; `util.styleText`, ANSI color codes, message schema design are all documented and verified on this machine

### Phase 5: README Overhaul

**Rationale:** Fully independent of all multi-agent features. Can be developed in parallel with any phase. Should follow v1.1 implementation to document what was actually built.
**Delivers:** Lifecycle narrative (GSD-style but Mowism-specific), all 34+ commands documented with examples, brownfield entry point, config/security/troubleshooting sections
**Addresses:** v1.1 confirmed scope item — README overhaul (fully independent)
**Avoids:** No pitfalls specific to documentation
**Research flag:** Standard patterns — skip research-phase; no technical unknowns

### Phase Ordering Rationale

- **State coherence first** — load-bearing dependency for all multi-agent features; without it, parallel execution corrupts data
- **DAG tooling concurrent with state coherence** — different file domains (state layer vs. roadmap layer) means no shared write conflicts; this is itself a proof-of-concept for the DAG model
- **Multi-phase execution engine third** — requires both Phase 1 (correct state) and Phase 2 (correct dependency graph) to integrate; most complex; benefits from Agent Teams runtime testing first
- **Live feedback and visual differentiation fourth** — UX enhancements on a working parallel execution system; color banners can be added to workers early but coordinator dashboard requires Phase 3 infrastructure
- **README last** — documents the final, stable system; writing documentation before implementation is stable creates churn

### Research Flags

**Needs research-phase during planning:**
- **Phase 3 (Multi-Phase Execution Engine):** Agent Teams API interactive testing is required before finalizing the coordinator design. Key open questions: auto-unblocking behavior (if NOT automatic, coordinator must explicitly remove blockers after each wave — changes coordinator loop design); idle notification content (if doesn't indicate why idle, coordinator cannot distinguish thinking from blocked); message delivery timing (if not queued, coordinator must design for out-of-order delivery). Testing requires user's interactive Claude Code session — see AGENT-TEAMS-API.md "Suggested Runtime Test Plan" section.

**Standard patterns, skip research-phase:**
- **Phase 1 (State Coherence Foundation):** Atomic file operations, single-writer patterns, NDJSON are textbook; codebase analysis identified all integration points
- **Phase 2 (DAG Scheduling):** Kahn's algorithm is textbook; roadmapper prompt updates are prompt engineering
- **Phase 4 (Live Feedback + Visual Differentiation):** `util.styleText`, ANSI color codes, message schema design are documented and verified locally
- **Phase 5 (README Overhaul):** Documentation; no research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified on Node.js 25.4.0: `util.styleText`, `fs.appendFileSync`, `fs.renameSync`, topological sort algorithm. Zero-dependency constraint validated against existing codebase. Rejected alternatives explicitly evaluated. |
| Features | HIGH | Table stakes validated against CrewAI, LangGraph, ADK, Airflow, human dev team patterns. Anti-features explicitly justified. Feature dependency graph is internally consistent. Agent Teams constraints verified against official docs. |
| Architecture | HIGH | Approach E selected from 5 evaluated candidates with explicit criteria. Integration points verified against mow-tools.cjs source (5700+ lines). Critical corrections applied from official Agent Teams docs: no nested teams, permission bubbling, auto-unblocking confirmed in docs. |
| Pitfalls | HIGH | All critical pitfalls grounded in codebase source analysis (specific line numbers cited for Pitfalls 5, 10, 14) or peer-reviewed literature (MAST research, Anthropic engineering blog). Recovery strategies provided for all 14 pitfalls. |
| Agent Teams API | MEDIUM | Official docs confirmed key constraints (no nested teams, permission bubbling, auto-unblocking, hooks). 6 of 8 runtime questions remain INCONCLUSIVE — tests require an interactive session with `mow-team-lead` agent type, not a spawned executor. |

**Overall confidence:** HIGH for architecture and implementation approach. MEDIUM for Agent Teams API specifics that affect Phase 3 coordinator design.

### Gaps to Address

- **Agent Teams runtime testing (Phase 3 blocker):** 6 open questions require interactive session testing before Phase 3 planning is finalized. Key questions with highest design impact: (1) Is auto-unblocking truly automatic when a blocking task is marked complete, or must the coordinator manually remove blockers? (2) Do idle notifications include why the worker is idle, or only that it is idle? (3) What are actual message size limits? Run the test plan in `.planning/research/AGENT-TEAMS-API.md` "Suggested Runtime Test Plan" from an interactive Claude Code session (not via `/mow:quick`).

- **Roadmapper dependency inference quality:** The DAG scheduler requires the roadmapper (an LLM) to distinguish genuine from phantom dependencies. Validation: create 3-5 test cases with known structures and verify output. If false positives are common, add a mandatory user-review step before any parallel execution. This can be addressed during Phase 2 planning.

- **Disk space management for parallel worktrees:** Pitfall 12 identifies potential disk exhaustion with N concurrent worktrees. Add disk space pre-checks before spawning; exact thresholds need calibration against real project sizes during Phase 3 integration testing.

- **Heartbeat protocol necessity:** Pitfall 4 recommends a heartbeat protocol for detecting worker crashes. Do not implement proactively — build it only if worker crashes are observed during Phase 3 integration testing. Premature addition is Pitfall 9 territory.

## Sources

### Primary (HIGH confidence)
- `bin/mow-tools.cjs` (local, 5700+ lines) — integration surface, state management functions, worktree claim at line 5246 (no locking verified), planning copy hook at line 247
- `agents/mow-team-lead.md` (local) — current orchestration flow, tool list, Agent Teams operation signatures
- `mowism/workflows/execute-phase.md` (local) — worker spawning, background mode at line 202, wave execution flow
- [Official Agent Teams docs](https://code.claude.com/docs/en/agent-teams) — no nested teams constraint, auto-unblocking confirmed, permission bubbling to lead, TeammateIdle and TaskCompleted hooks
- [Node.js util.styleText documentation](https://nodejs.org/api/util.html) — stable since Node.js 22, `NO_COLOR`/`FORCE_COLOR` support
- [Node.js fs documentation](https://nodejs.org/api/fs.html) — `appendFileSync`, `writeFileSync`, `renameSync` atomicity on POSIX
- Local verification scripts: `/tmp/topo-test.js`, `/tmp/ansi-test.js`, `/tmp/ndjson-test.js` — all verified on Node.js 25.4.0
- [Why Do Multi-Agent LLM Systems Fail? (MAST)](https://arxiv.org/abs/2503.13657) — 1642 traces across 7 frameworks, 41.77% system design failures
- [Building a C Compiler with Parallel Claudes (Anthropic)](https://www.anthropic.com/engineering/building-c-compiler) — real-world 16-agent stress test, state management lessons

### Secondary (MEDIUM confidence)
- [Google ADK Parallel Agents](https://google.github.io/adk-docs/agents/workflow-agents/parallel-agents/) — distinct key pattern, scatter-gather, race condition guidance
- [Airflow DAG documentation](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html) — topological sort, trigger rules, partial dependencies
- [tmux-agent-indicator](https://github.com/accessd/tmux-agent-indicator) — visual feedback for AI agent states in tmux, Claude Code hooks
- `.planning/research/AGENT-TEAMS-API-RUNTIME.md` (local) — runtime test session, corrected meta-finding on agent-type-based tool availability, context window exhaustion risk analysis
- [2ality: Styling console text in Node.js](https://2ality.com/2025/05/ansi-escape-sequences-nodejs.html) — util.styleText comprehensive guide
- [ANSI Escape Code Standards (Julia Evans, 2025)](https://jvns.ca/blog/2025/03/07/escape-code-standards/) — cross-terminal compatibility issues

### Tertiary (LOW confidence, flag for validation)
- CrewAI, LangGraph, AutoGen framework comparisons — multi-agent state and feedback patterns; useful for domain framing but Mowism's constraints differ substantially
- Notification fatigue UX literature — tiered notification design; applicable pattern from monitoring domain

---
*Research completed: 2026-02-20*
*Synthesizes: STACK.md, v1.1-FEATURES.md, ARCHITECTURE.md, PITFALLS.md, AGENT-TEAMS-API.md, AGENT-TEAMS-API-RUNTIME.md*
*Ready for roadmap: yes*
