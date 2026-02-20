---
created: 2026-02-20T03:27:07.000Z
title: "Multi-agent state coherence architecture"
area: architecture
priority: high
blocks:
  - Phase-level parallelism in roadmap and execution
  - Live agent feedback and multi-phase input routing UX
  - Distributed input routing with color-coded agent terminals
files:
  - .planning/STATE.md
  - .planning/research/AGENT-TEAMS-API.md
  - .planning/research/AGENT-TEAMS-API-RUNTIME.md
  - bin/mow-tools.cjs
  - agents/mow-team-lead.md
  - .config/wt.toml
---

## Problem

When multiple phase workers operate in parallel across git worktrees, `.planning/` state — especially STATE.md — becomes a shared mutable resource with no conflict resolution. The current design copies `.planning/` into each worktree on creation, workers modify their local copies independently, and git merge produces textual conflicts on merge-back. The v1.0 research proposed a `worktree merge-state` command but it was never built.

The problem is deeper than merge conflicts. Two compounding risks:

1. **Context window bloat** — If STATE.md grows with every worker's contributions (decisions, progress, blockers), the orchestrator's context fills up reading it. Claude Code auto-compression is lossy, so the orchestrator may lose earlier state.

2. **Over-condensation** — If STATE.md is aggressively summarized to stay small, important decisions and context get silently dropped. The orchestrator makes decisions on incomplete information.

Both lead to the same failure: the orchestrator loses coherence about what's happening across phases.

## Research Questions

### State Architecture

1. **Monolithic vs. distributed state** — Should `.planning/STATE.md` remain a single shared document, or should state be split into per-phase/per-worker files with a lightweight index?
   - Folder-per-worker with stubs (microservices pattern): each worker owns `phases/XX/state.md`, top-level STATE.md is an index with links
   - Monolithic with section-aware merge tooling (the v1.0 proposal)
   - Hybrid: index + detail files, merge tool for the index only

2. **What belongs in the index vs. detail files?** — If we split, what's the minimum the orchestrator needs in its "dashboard view" vs. what lives in per-phase detail files read on demand?

3. **Should `.planning/` be gitignored?** — If state lives on disk but not in git, merge conflicts disappear entirely. The canonical copy lives on the main worktree, workers report via messages, orchestrator updates centrally. Tradeoff: lose git history of planning decisions.

### Coordination Patterns

4. **Dedicated scribe/merge agent** — Can a specialized agent handle state reconciliation so the orchestrator doesn't fill its context with merge details? The "single writer" principle: only one entity writes to shared state, workers report in, scribe reconciles. Research: cost overhead, spawn frequency, whether this adds meaningful latency.

5. **How do successful multi-agent frameworks handle shared state?** — Survey: CrewAI, AutoGen, LangGraph, OpenAI Swarm, Anthropic's own Agent Teams examples. What patterns do they use? Event logs? Shared memory? Message passing only?

6. **Human team parallels** — Scrum boards (shared state = board, not anyone's memory), standup syncs (periodic bounded summaries), CODEOWNERS (domain ownership), SITREPs (hierarchical summarization). Which patterns translate to AI agent teams?

### Context Window Management

7. **Claude Code auto-compression behavior** — What actually survives compression? Are structured documents (tables, headers) preserved better than prose? Does file content read via `Read` tool survive differently than inline message content? This determines whether state-on-disk or state-in-context is more reliable.

8. **Message volume modeling** — For N phase workers over a 30-minute execution, how many messages does the orchestrator receive? (Inbox messages + automatic idle notifications per turn.) At what N does compression become likely?

9. **Hierarchical summarization** — Can phase workers summarize their own state at phase boundaries, so the orchestrator only ever sees phase-level summaries? This is the O(phases) vs O(tasks) distinction from the context window risk analysis. What's the right granularity?

### Practical Constraints

10. **Composability with existing mow-tools.cjs** — Whatever pattern we choose must work with the existing `worktree claim/release`, `init`, and state tracking functions. How much refactoring is needed for each approach?

11. **WorkTrunk integration** — `wt:merge` handles the git merge. Can we hook into its merge process to trigger state reconciliation? Or does state reconciliation need to happen before/after the git merge?

12. **Failure modes** — What happens if the scribe agent fails? If a worker crashes mid-phase and its state file is incomplete? If two workers somehow claim the same state file? Each pattern has different failure characteristics.

## Candidate Approaches (to evaluate, not commit to)

### A: Distributed state with index (folder-per-worker)
- Workers write to `phases/XX/state.md` (isolated, no conflicts)
- STATE.md becomes a lightweight index (~50 lines) with links
- Orchestrator reads index + specific phase state on demand
- No merge tool needed (separate files)
- Risk: more files, more reads, index could drift from reality

### B: Scribe agent (single writer)
- Workers report results via SendMessage to a scribe agent
- Scribe agent reconciles and writes canonical STATE.md
- Orchestrator reads STATE.md written by scribe, never writes it
- No merge conflicts (single writer)
- Risk: scribe is a bottleneck, adds latency, another context window to manage

### C: Section-aware merge tool (v1.0 proposal)
- Workers write to their own STATE.md copies
- `mow-tools.cjs worktree merge-state` reconciles on merge-back
- Section-by-section rules: append-only sections concatenate, overwrite sections take latest
- Risk: still a shared mutable file, tooling complexity, edge cases

### D: Event log + materialized view
- Workers append to an event log (`phases/XX/events.jsonl`)
- STATE.md is a materialized view rebuilt from events on demand
- No merge conflicts (append-only log per worker)
- Full history preserved, can replay
- Risk: complexity, rebuild cost, unfamiliar pattern for the codebase

### E: Hybrid (index + scribe for reconciliation)
- Distributed state (approach A) for isolation
- Scribe agent (approach B) for periodic reconciliation of the index
- Orchestrator reads index, scribe keeps it accurate
- Combines benefits of A and B

## Success Criteria

Research is complete when:
- [ ] Each candidate approach has been evaluated against the 12 research questions
- [ ] At least 3 external multi-agent frameworks surveyed for state patterns
- [ ] Context window exhaustion risk quantified (message volume modeling)
- [ ] Clear recommendation with tradeoffs documented
- [ ] The recommendation composes with existing mow-tools.cjs and WorkTrunk
- [ ] Failure modes documented for recommended approach

## Cross-References

- `.planning/research/AGENT-TEAMS-API-RUNTIME.md` — context window exhaustion risk analysis
- `.planning/research/AGENT-TEAMS-API.md` — coordinator message volume, concurrency limits
- `.planning/milestones/v1.0-phases/02-worktree-state-and-quality-gates/02-RESEARCH.md` — original merge-state proposal (lines 472-493)
- `.planning/research/PITFALLS.md` — STATE.md merge conflict documentation
- `.planning/todos/pending/2026-02-20-phase-level-parallelism-in-roadmap-and-execution.md` — parent todo (point 6: merge coordination)
