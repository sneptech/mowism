# Phase 8: DAG-Based Phase Scheduling - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Roadmaps express arbitrary dependency relationships between phases, and tooling resolves execution order automatically. Includes dependency declaration syntax in ROADMAP.md, a DAG analysis CLI command, and a dedicated DAG analysis agent that the roadmapper invokes during creation.

</domain>

<decisions>
## Implementation Decisions

### Parallelism detection — dedicated DAG agent
- A specialized subagent analyzes the complete roadmap to determine dependency relationships
- The agent figures out: what conflicts with what, what can start immediately, what must wait
- Analyzes both roadmap text (phase goals, requirements, success criteria) AND codebase context (`.planning/codebase/` if available) to understand which files/modules each phase would touch
- Auto-runs during roadmap creation (roadmapper spawns it after generating phases)
- Also available for manual re-invocation to update dependencies after roadmap changes

### Parallelism confidence tiers
- **High confidence** — clearly independent phases, auto-parallelized without user confirmation
- **Medium confidence** — possibly independent, user is prompted to decide whether to parallelize
- **Low confidence** — ambiguous or likely conflicting, excluded from parallelism (kept sequential)

### Circular dependency handling
- Interactive resolution: show the exact cycle path, have the agent suggest which edge to break
- Conservative approach — the agent should be able to figure out the best resolution but confirms with the user before making changes
- Don't auto-break cycles silently

### Missing dependency references
- Treat as a to-do, not an error
- Warn and log: leave a comment in both the code and planning documentation
- The missing reference is aspirational (a phase that doesn't exist yet), not broken
- Don't block analysis — treat the missing dependency as satisfied and continue

### Runtime file conflict awareness
- When the DAG agent detects two parallel phases would touch the same files, it identifies this at analysis time
- At runtime (Phase 9 territory), workers should be messaged with context about what's off-limits
- Workers skip conflicting files, log that they need to revisit when freed up
- "They're doing something with it right now, I'll skip it for now but log that I need to do that next" pattern

### Sequential DAG validation
- If analysis produces a fully sequential DAG (no parallelism found), trust the result
- Don't flag or second-guess an all-sequential outcome — it may be correct

### Claude's Discretion
- DAG output format and visualization style for `analyze-dag` command
- Dependency field syntax in ROADMAP.md (how `depends_on` is expressed in markdown)
- Exact confidence thresholds for the tiered parallelism system
- DAG agent prompt design and instruction depth

</decisions>

<specifics>
## Specific Ideas

- The DAG agent should feel like a thoughtful architect: "these two phases touch completely different domains, safe to parallelize" vs "these share a config file, let's keep them sequential"
- Runtime conflict handling should be graceful, not blocking — agents adapt around conflicts rather than halting
- The tiered confidence system means the user only gets involved for genuinely ambiguous cases

</specifics>

<deferred>
## Deferred Ideas

- Runtime file-level locking between parallel workers — Phase 9 (execution engine) handles the actual mechanics
- Worker-to-worker conflict messaging protocol — Phase 9/10 territory

</deferred>

---

*Phase: 08-dag-based-phase-scheduling*
*Context gathered: 2026-02-20*
