# Phase 8: DAG-Based Phase Scheduling - Research

**Researched:** 2026-02-20
**Domain:** DAG dependency graphs for phase scheduling -- topological sort, dependency parsing, parallel track detection, roadmapper agent integration
**Confidence:** HIGH

## Summary

Phase 8 transforms the roadmap from a linear chain into an arbitrary dependency graph (DAG) and provides tooling to resolve execution order automatically. The work spans three layers: (1) extending the ROADMAP.md format so `**Depends on**:` accepts comma-separated phase lists instead of only "Phase N-1", (2) adding a `roadmap analyze-dag` CLI subcommand that runs Kahn's BFS algorithm to produce execution waves (parallel groups), and (3) building a dedicated DAG analysis agent that the roadmapper spawns during roadmap creation to auto-detect which phases are genuinely independent based on requirement domains and file overlap.

The algorithm is textbook -- Kahn's BFS with generation layering, ~40 lines of inline JavaScript, zero dependencies. The ROADMAP.md format extension is backward compatible: existing `Depends on: Phase 2` continues to parse correctly, while new `Depends on: Phase 7, Phase 8` adds multi-dependency support. The real complexity is in the DAG agent: it must analyze roadmap text (phase goals, requirements, success criteria) AND codebase context (`.planning/codebase/` files if available) to determine genuine vs phantom dependencies, then classify each relationship into confidence tiers (HIGH/MEDIUM/LOW) that control whether parallelism is auto-applied or requires user confirmation.

A critical finding is that the existing `roadmap analyze` command has a regex bug: it expects `**Depends on:**` (colon inside bold markers) but the ROADMAP.md template and all existing roadmaps use `**Depends on**:` (colon outside bold markers). This causes `depends_on` to return `null` for all phases. The same bug affects `**Goal:**` parsing. This must be fixed as a prerequisite for any DAG analysis work.

**Primary recommendation:** Build incrementally: (1) fix the regex bug in `cmdRoadmapAnalyze`, (2) add `parseDependsOn()` to extract structured phase arrays from the raw depends_on string, (3) implement `topoGenerations()` as an inline Kahn's BFS, (4) wire them together into a `roadmap analyze-dag` subcommand, (5) create the `mow-dag-analyzer` agent, (6) update the roadmapper to spawn it during roadmap creation. Keep `**Parallel with**:` as an advisory-only field -- the real constraint is `**Depends on**:`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
#### Parallelism detection -- dedicated DAG agent
- A specialized subagent analyzes the complete roadmap to determine dependency relationships
- The agent figures out: what conflicts with what, what can start immediately, what must wait
- Analyzes both roadmap text (phase goals, requirements, success criteria) AND codebase context (`.planning/codebase/` if available) to understand which files/modules each phase would touch
- Auto-runs during roadmap creation (roadmapper spawns it after generating phases)
- Also available for manual re-invocation to update dependencies after roadmap changes

#### Parallelism confidence tiers
- **High confidence** -- clearly independent phases, auto-parallelized without user confirmation
- **Medium confidence** -- possibly independent, user is prompted to decide whether to parallelize
- **Low confidence** -- ambiguous or likely conflicting, excluded from parallelism (kept sequential)

#### Circular dependency handling
- Interactive resolution: show the exact cycle path, have the agent suggest which edge to break
- Conservative approach -- the agent should be able to figure out the best resolution but confirms with the user before making changes
- Don't auto-break cycles silently

#### Missing dependency references
- Treat as a to-do, not an error
- Warn and log: leave a comment in both the code and planning documentation
- The missing reference is aspirational (a phase that doesn't exist yet), not broken
- Don't block analysis -- treat the missing dependency as satisfied and continue

#### Runtime file conflict awareness
- When the DAG agent detects two parallel phases would touch the same files, it identifies this at analysis time
- At runtime (Phase 9 territory), workers should be messaged with context about what's off-limits
- Workers skip conflicting files, log that they need to revisit when freed up
- "They're doing something with it right now, I'll skip it for now but log that I need to do that next" pattern

#### Sequential DAG validation
- If analysis produces a fully sequential DAG (no parallelism found), trust the result
- Don't flag or second-guess an all-sequential outcome -- it may be correct

### Claude's Discretion
- DAG output format and visualization style for `analyze-dag` command
- Dependency field syntax in ROADMAP.md (how `depends_on` is expressed in markdown)
- Exact confidence thresholds for the tiered parallelism system
- DAG agent prompt design and instruction depth

### Deferred Ideas (OUT OF SCOPE)
- Runtime file-level locking between parallel workers -- Phase 9 (execution engine) handles the actual mechanics
- Worker-to-worker conflict messaging protocol -- Phase 9/10 territory
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DAG-01 | ROADMAP.md supports arbitrary `depends_on` declarations (not just previous phase), enabling parallel tracks | Format extension is backward compatible. Existing regex at line 3350 of mow-tools.cjs already captures the raw `**Depends on**:` text. New `parseDependsOn()` function splits on commas, extracts phase numbers, returns array. Supports `Nothing`, `None`, `N/A`, single phases, and comma-separated lists. Critical: regex bug must be fixed first -- current pattern `\*\*Depends on:\*\*` does not match actual format `**Depends on**:`. |
| DAG-02 | `mow-tools.cjs` includes topological sort (Kahn's algorithm) to resolve phase execution order from DAG | Inline `topoGenerations()` function (~40 lines). Takes node list + edge list, returns array of arrays (execution waves). Includes cycle detection (throws if nodes remain after BFS exhausts). Verified algorithm design from STACK.md research with 4 test topologies: diamond, linear, independent, complex. New `roadmap analyze-dag` subcommand integrates parsing + topo sort + output formatting. |
| DAG-03 | Roadmapper agent auto-detects which phases can run in parallel based on requirement dependencies | New `mow-dag-analyzer` agent spawned by the roadmapper after initial phase generation. Analyzes requirement categories, phase goals, success criteria, and optionally `.planning/codebase/` files to determine genuine independence. Outputs confidence-tiered dependency annotations. Results written back to ROADMAP.md as updated `**Depends on**:` and advisory `**Parallel with**:` fields. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs` (built-in) | N/A | Read/write ROADMAP.md, read `.planning/codebase/` files | Zero dependencies; mow-tools.cjs already uses `fs` exclusively |
| Node.js `path` (built-in) | N/A | Phase directory path construction | Already used throughout mow-tools.cjs |
| Inline Kahn's BFS | N/A (~40 lines) | Topological sort with generation grouping | Textbook algorithm; ~40 lines inline. Verified working in prior STACK.md research. No library needed. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mow-tools.cjs` `roadmap analyze` | Existing | Phase extraction from ROADMAP.md with disk status | Extended with DAG-specific output fields. `parseDependsOn()` added as helper. |
| `mow-tools.cjs` scaffold | Existing | Agent template creation | May scaffold DAG agent file |
| `mow-tools.cjs` commit | Existing | Git commits for updated roadmap files | Committing dependency annotations after DAG analysis |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline `topoGenerations()` | npm `toposort` package | Returns flat sorted array, not generation groups. Would need post-processing. Also breaks zero-dependency constraint. |
| Inline `topoGenerations()` | npm `graph-data-structure` | Massive overkill -- brings in full graph library for one function. Breaks zero-dependency constraint. |
| Inline `topoGenerations()` | npm `topological-sort-group` | Closest match (returns generation groups), but low weekly downloads indicate maintenance risk. Breaks zero-dependency constraint. |
| Inline regex parsing | Formal markdown AST parser (`remark`) | ROADMAP.md parsing is simple enough for targeted regexes. Full AST parsing would be over-engineering for extracting `**Depends on**:` fields. |

**Installation:** No new dependencies. All additions are inline in `mow-tools.cjs` and a new agent markdown file.

## Architecture Patterns

### Recommended Project Structure

```
bin/
  mow-tools.cjs                        # Extended with: parseDependsOn(), topoGenerations(),
                                        #   cmdRoadmapAnalyzeDag(), regex fixes
  mow-tools.test.cjs                   # Extended with: DAG topology tests
agents/
  mow-dag-analyzer.md                  # NEW: DAG analysis agent (spawned by roadmapper)
  mow-roadmapper.md                    # MODIFIED: spawns mow-dag-analyzer after phase generation
mowism/
  templates/
    roadmap.md                         # MODIFIED: multi-dependency format, Parallel with field
```

### Pattern 1: Dependency Parsing Pipeline

**What:** Parse `**Depends on**:` free-text into structured phase reference arrays, then build a DAG edge list.

**When to use:** Every time DAG analysis is invoked (analyze-dag command, DAG agent, roadmapper integration).

**Example:**
```javascript
// Source: STACK.md research, verified backward compatible
function parseDependsOn(raw) {
  if (!raw || /nothing|none|n\/a|first phase/i.test(raw)) return [];
  return raw.match(/Phase\s+(\d+(?:\.\d+)?)/gi)
    ?.map(m => m.match(/\d+(?:\.\d+)?/)[0]) || [];
}

// Usage:
// "Nothing (first v1.1 phase, no v1.1 dependencies)" → []
// "Phase 7"                                            → ["7"]
// "Phase 7, Phase 8"                                   → ["7", "8"]
// "Phase 7, Phase 8, Phase 9, Phase 10"                → ["7", "8", "9", "10"]
```

### Pattern 2: Kahn's BFS with Generation Grouping

**What:** Topological sort that produces execution waves (groups of phases that can run in parallel) rather than a flat ordering.

**When to use:** `roadmap analyze-dag` command output.

**Example:**
```javascript
// Source: STACK.md research, verified with 4 test topologies
function topoGenerations(nodes, edges) {
  const inDeg = new Map();
  const adj = new Map();
  for (const n of nodes) { inDeg.set(n, 0); adj.set(n, []); }
  for (const [from, to] of edges) {
    adj.get(from).push(to);
    inDeg.set(to, (inDeg.get(to) || 0) + 1);
  }

  let queue = [...nodes].filter(n => inDeg.get(n) === 0);
  const generations = [];
  let processed = 0;

  while (queue.length > 0) {
    generations.push([...queue]);
    processed += queue.length;
    const next = [];
    for (const n of queue) {
      for (const nb of adj.get(n)) {
        inDeg.set(nb, inDeg.get(nb) - 1);
        if (inDeg.get(nb) === 0) next.push(nb);
      }
    }
    queue = next;
  }

  if (processed !== nodes.length) {
    // Cycle detection: find nodes still with positive in-degree
    const cycleNodes = [...inDeg.entries()]
      .filter(([, deg]) => deg > 0)
      .map(([n]) => n);
    throw new Error(`Cycle detected involving: ${cycleNodes.join(', ')}`);
  }
  return generations;
}
```

### Pattern 3: `analyze-dag` Command Output Format (Discretion Recommendation)

**What:** JSON output structure for the `roadmap analyze-dag` subcommand.

**When to use:** CLI consumers (team lead, other commands) that need to determine execution order.

**Recommended format:**
```json
{
  "phases": [
    {
      "number": "7",
      "name": "State Coherence Foundation",
      "depends_on": [],
      "depended_by": ["9", "10", "11"],
      "disk_status": "complete"
    },
    {
      "number": "8",
      "name": "DAG-Based Phase Scheduling",
      "depends_on": [],
      "depended_by": ["9", "11"],
      "disk_status": "discussed"
    },
    {
      "number": "9",
      "name": "Multi-Phase Execution Engine",
      "depends_on": ["7", "8"],
      "depended_by": ["11"],
      "disk_status": "no_directory"
    }
  ],
  "waves": [
    { "wave": 1, "phases": ["7", "8"] },
    { "wave": 2, "phases": ["9", "10"] },
    { "wave": 3, "phases": ["11"] }
  ],
  "ready": ["8"],
  "blocked": [
    { "phase": "9", "waiting_on": ["8"] },
    { "phase": "11", "waiting_on": ["8", "9", "10"] }
  ],
  "completed": ["7"],
  "validation": {
    "is_dag": true,
    "cycle_error": null,
    "missing_refs": [],
    "fully_sequential": false
  }
}
```

**Design rationale:**
- `waves` gives the team lead execution groups (what can run in parallel)
- `ready` filters for phases whose dependencies are ALL satisfied (disk_status = complete) and that are not yet complete themselves -- this is the actionable field for "what can I start now?"
- `blocked` shows exactly what each blocked phase is waiting for -- only lists phases that are NOT yet complete
- `validation` includes cycle detection, missing reference warnings, and whether the DAG is fully sequential (no parallelism)
- `depended_by` (reverse edges) enables the team lead to check "when Phase 8 completes, what becomes unblocked?" without re-running full analysis

### Pattern 4: DAG Text Visualization (Discretion Recommendation)

**What:** ASCII representation of the DAG for human-readable CLI output (non-raw mode).

**When to use:** When `roadmap analyze-dag` is called without `--raw` flag.

**Recommended format:**
```
DAG Analysis:

Wave 1: Phase 7 (complete), Phase 8
Wave 2: Phase 9, Phase 10
Wave 3: Phase 11

  Phase 7 ──┬──> Phase 9 ──┬──> Phase 11
             │              │
  Phase 8 ──┘              │
             └──> Phase 10 ─┘

Ready to execute: Phase 8
Blocked: Phase 9 (waiting on Phase 8), Phase 11 (waiting on Phase 8, Phase 9, Phase 10)
```

**Why this format:** Keep it simple. The DAG in this project is typically 5-15 phases, not hundreds. A hand-formatted ASCII representation is more readable than algorithmic ASCII layout for small graphs. The `roadmap analyze-dag --raw` flag returns machine-parseable JSON; the non-raw output is for human consumption.

### Pattern 5: Dependency Syntax in ROADMAP.md (Discretion Recommendation)

**What:** The format for `**Depends on**:` field values and the new `**Parallel with**:` advisory field.

**Recommended syntax:**
```markdown
### Phase 8: DAG-Based Phase Scheduling
**Goal**: Roadmaps express arbitrary dependency relationships
**Depends on**: Nothing
**Parallel with**: Phase 7 (different file domains -- roadmap parsing vs state management)

### Phase 9: Multi-Phase Execution Engine
**Goal**: Multiple independent phases execute simultaneously
**Depends on**: Phase 7, Phase 8

### Phase 11: README Overhaul
**Goal**: A new user can understand Mowism from the README alone
**Depends on**: Phase 7, Phase 8, Phase 9, Phase 10
```

**Rules:**
- `**Depends on**:` is the machine-parseable constraint. Parser extracts `Phase N` references.
- `**Parallel with**:` is advisory for human readability. It's derivable from `**Depends on**:` (two phases are parallel if neither depends on the other and they share common ancestors or neither blocks the other).
- `Nothing` means root node (no dependencies, can start immediately).
- Comma-separated values for multiple dependencies.
- Parenthetical annotations (e.g., `(different file domains)`) are ignored by parser.
- Format uses `**Field**:` (colon OUTSIDE bold markers) to match existing template convention.

### Anti-Patterns to Avoid

- **Phantom dependencies:** LLMs generating roadmaps tend to over-specify dependencies (e.g., making everything depend on Phase 1 even if Phase 1 just creates directories). The DAG agent must distinguish genuine data dependencies from phantom "it comes first so it must be a dependency" reasoning. Default to independent rather than dependent.

- **Colon-inside-bold format mismatch:** The existing regex patterns in `cmdRoadmapAnalyze` and `cmdRoadmapGetPhase` use `\*\*Goal:\*\*` (colon inside bold markers) but templates and actual ROADMAP.md files use `**Goal**:` (colon outside). Always use `\*\*Goal\*\*:` in regex patterns to match the real format.

- **Over-engineering the DAG agent:** The agent's job is classification (independent, maybe-independent, dependent) not proof. It reads roadmap text and optionally codebase files. It does not need to trace actual code paths or build call graphs. Keep it prompt-based, not code-based.

- **Treating `Parallel with` as a constraint:** `Parallel with` is purely advisory. The DAG is fully determined by `Depends on` edges. Two phases are parallel if and only if neither depends on the other (directly or transitively). `Parallel with` is a human-readable annotation the roadmapper adds for clarity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topological sort with cycle detection | External graph library | Inline `topoGenerations()` (~40 lines) | Algorithm is textbook. External library adds npm dependency for trivially implementable code. But DO hand-roll this -- it's the right approach for a zero-dependency project. |
| Markdown parsing for `Depends on` | Full AST parser (remark, unified) | Targeted regex with `parseDependsOn()` | ROADMAP.md structure is predictable. Full AST parsing is overkill for extracting specific fields from a controlled format. |
| DAG visualization | ascii-dag library or graphviz | Simple hand-formatted text for small DAGs | Mowism roadmaps are 5-15 phases. A library for DAG rendering adds a dependency for a problem that's trivially solvable with printf-style formatting. |

**Key insight:** This phase is an exception to the "don't hand-roll" principle. The zero-dependency constraint means hand-rolling IS the standard approach. The algorithms involved (topological sort, regex parsing) are well-understood and small enough that libraries would add more complexity than they save.

## Common Pitfalls

### Pitfall 1: Regex Format Mismatch (EXISTING BUG)

**What goes wrong:** `roadmap analyze` returns `null` for `depends_on` and `goal` fields for all phases.
**Why it happens:** The regex patterns in `cmdRoadmapAnalyze` (line 3347-3351) and `cmdRoadmapGetPhase` (line 1211-1213) expect `\*\*Goal:\*\*` and `\*\*Depends on:\*\*` (colon inside bold markers). But the roadmap template and all existing ROADMAP.md files use `**Goal**:` and `**Depends on**:` (colon outside bold markers). This is a pre-existing bug that Phase 8 inherits and MUST fix.
**How to avoid:** Update all regex patterns to match both formats: `\*\*(?:Goal\*\*:|Goal:\*\*)` or more flexibly `\*\*Goal\*?\*?:?\s*\*?\*?`. Recommended: use `\*\*Goal\*\*:\s*` for the canonical format and test against both.
**Warning signs:** `depends_on: null` in `roadmap analyze --raw` output when dependencies clearly exist in the markdown.

### Pitfall 2: Phantom Dependencies from LLM Roadmapping

**What goes wrong:** The roadmapper (an LLM) generates overly conservative dependency graphs where everything depends on Phase 1, resulting in a fully sequential DAG even when phases are genuinely independent.
**Why it happens:** LLMs default to sequential reasoning ("Phase 2 comes after Phase 1, so it must depend on it"). Without explicit analysis, they conflate ordering with dependency.
**How to avoid:** The DAG agent must explicitly ask: "What specific artifact or state from Phase X does Phase Y require as input?" If the answer is nothing concrete, the dependency is phantom. The confidence tier system helps: HIGH confidence independence means the agent is sure they're independent; LOW confidence means it's unsure and defaults to sequential.
**Warning signs:** A DAG where every phase depends on the immediately preceding phase (linear chain), even when phase goals are clearly in different domains.

### Pitfall 3: Cycle Detection with Incomplete Data

**What goes wrong:** A phase references `Phase 12` which doesn't exist yet. The DAG analysis either crashes or silently produces incorrect results.
**Why it happens:** Missing phases are aspirational references to future work that hasn't been scoped yet.
**How to avoid:** Per the locked decision: treat missing references as satisfied (the dependency is met). Log a warning in the output (`validation.missing_refs`). Don't block analysis. The DAG should still produce valid waves for the phases that DO exist.
**Warning signs:** Phase references in `Depends on` that don't correspond to any `### Phase N:` header in the ROADMAP.md.

### Pitfall 4: Over-Engineering the DAG Agent

**What goes wrong:** The DAG agent tries to trace actual code paths, build call graphs, or do deep static analysis to determine phase independence. This takes excessive time, produces false positives, and consumes context.
**Why it happens:** The desire for certainty. If we could prove phases are independent at the code level, we'd never get false positives.
**How to avoid:** The agent should do lightweight analysis: read phase goals, requirements, and success criteria for domain overlap. Optionally scan `.planning/codebase/` for file-level overlap. Then classify with confidence tiers. MEDIUM confidence phases get user confirmation, which is the safety valve for uncertainty.
**Warning signs:** The agent prompt asking it to "analyze all source code" or "build a dependency graph of function calls."

### Pitfall 5: Breaking Existing Roadmap Parsing

**What goes wrong:** Changes to `cmdRoadmapAnalyze` or `parseDependsOn` break existing consumers (other mow-tools commands, plan-phase workflow, execute-phase workflow).
**Why it happens:** Other parts of the system consume the `roadmap analyze` output JSON and depend on its current schema.
**How to avoid:** The `roadmap analyze-dag` command should be a NEW subcommand, not a modification of `roadmap analyze`. Keep `roadmap analyze` backward compatible (fix the regex bug, but keep the same output schema). The new `roadmap analyze-dag` subcommand adds DAG-specific fields (`waves`, `ready`, `blocked`, `validation`). Consumers that need DAG data call the new command; existing consumers are unaffected.
**Warning signs:** Test failures in `mow-tools.test.cjs` after modifying existing functions.

## Code Examples

Verified patterns from codebase analysis and prior STACK.md research:

### Fixing the Regex Bug (Priority 1)

```javascript
// BEFORE (broken -- colon inside bold markers):
const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
const dependsMatch = section.match(/\*\*Depends on:\*\*\s*([^\n]+)/i);

// AFTER (fixed -- colon outside bold markers, matching actual format):
const goalMatch = section.match(/\*\*Goal\*\*:\s*([^\n]+)/i);
const dependsMatch = section.match(/\*\*Depends on\*\*:\s*([^\n]+)/i);

// MOST ROBUST (handles both formats):
const goalMatch = section.match(/\*\*Goal\*?\*?:\s*([^\n]+)/i);
const dependsMatch = section.match(/\*\*Depends on\*?\*?:\s*([^\n]+)/i);
```

**Locations to fix:**
- `cmdRoadmapAnalyze` (line 3347 and 3350 in mow-tools.cjs)
- `cmdRoadmapGetPhase` (line 1211 in mow-tools.cjs)
- `cmdPhaseComplete` (line 4031, 4046 in mow-tools.cjs -- uses `\*\*Plans:\*\*` and `\*\*Requirements:\*\*` patterns)

### New `roadmap analyze-dag` Command

```javascript
function cmdRoadmapAnalyzeDag(cwd, raw) {
  // Reuse existing cmdRoadmapAnalyze parsing logic
  const analyzeResult = cmdRoadmapAnalyzeInternal(cwd);
  if (analyzeResult.error) {
    output({ error: analyzeResult.error }, raw);
    return;
  }

  const phases = analyzeResult.phases;
  const nodes = phases.map(p => p.number);
  const edges = [];
  const missingRefs = [];

  for (const phase of phases) {
    const deps = parseDependsOn(phase.depends_on);
    for (const dep of deps) {
      if (!nodes.includes(dep)) {
        missingRefs.push({ phase: phase.number, references: dep });
        continue; // Treat as satisfied
      }
      edges.push([dep, phase.number]); // dep → phase (dep must come before phase)
    }
  }

  let waves, cycleError;
  try {
    waves = topoGenerations(nodes, edges);
    cycleError = null;
  } catch (e) {
    waves = null;
    cycleError = e.message;
  }

  // Determine ready and blocked phases
  const completedPhases = phases.filter(p => p.disk_status === 'complete').map(p => p.number);
  const ready = [];
  const blocked = [];

  for (const phase of phases) {
    if (completedPhases.includes(phase.number)) continue;
    const deps = parseDependsOn(phase.depends_on);
    const unmetDeps = deps.filter(d => !completedPhases.includes(d) && nodes.includes(d));
    if (unmetDeps.length === 0) {
      ready.push(phase.number);
    } else {
      blocked.push({ phase: phase.number, waiting_on: unmetDeps });
    }
  }

  const result = {
    phases: phases.map(p => ({
      number: p.number,
      name: p.name,
      depends_on: parseDependsOn(p.depends_on),
      disk_status: p.disk_status,
    })),
    waves: waves ? waves.map((gen, i) => ({ wave: i + 1, phases: gen })) : null,
    ready,
    blocked,
    completed: completedPhases,
    validation: {
      is_dag: cycleError === null,
      cycle_error: cycleError,
      missing_refs: missingRefs,
      fully_sequential: waves ? waves.every(gen => gen.length === 1) : null,
    },
  };

  output(result, raw);
}
```

### DAG Agent Prompt Structure (Discretion Recommendation)

The `mow-dag-analyzer` agent should be a Read-only agent (tools: Read, Glob, Grep, Bash) since it only analyzes and produces annotations -- it does not write files. The roadmapper invokes it, reads its output, and writes the annotations back to ROADMAP.md.

Alternatively, the agent can be given Write access to directly annotate the ROADMAP.md. This is simpler but breaks the "roadmapper owns the roadmap" pattern.

**Recommended:** Give the DAG agent Write access. The roadmapper spawns it with context about the roadmap it just generated. The agent reads the roadmap, analyzes dependencies, and writes updated `**Depends on**:` and `**Parallel with**:` fields directly. This is cleaner than passing analysis results back through the roadmapper.

The agent's core analysis loop:

```
For each pair of phases (A, B):
  1. Read phase A goals, requirements, success criteria
  2. Read phase B goals, requirements, success criteria
  3. Check requirement category overlap (same REQ- prefix = likely dependent)
  4. Check success criteria overlap (mentions same features/systems = likely dependent)
  5. If .planning/codebase/ exists:
     a. Check STRUCTURE.md for which directories each phase would modify
     b. Check ARCHITECTURE.md for system boundaries
  6. Classify:
     - HIGH confidence independent: different requirement categories,
       different success criteria domains, different file areas
     - MEDIUM confidence: some overlap but unclear if causal
     - LOW confidence: same requirement category or overlapping files
  7. Emit depends_on edge only if dependency is genuine (B needs artifact from A)
```

### Confidence Tier Thresholds (Discretion Recommendation)

```
HIGH confidence (auto-parallelize):
  - Phases have ZERO requirement category overlap
  - Phases reference completely different file areas (if codebase context available)
  - Phase goals use different domain vocabulary

MEDIUM confidence (prompt user):
  - Phases share a requirement category but different specific requirements
  - Phases reference some overlapping files but different functions/sections
  - One phase creates something the other might reference but doesn't explicitly require

LOW confidence (keep sequential):
  - Phases share specific requirements
  - Phases explicitly reference the same files in their goals or success criteria
  - Phase B's success criteria assume output from Phase A exists
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Linear `Depends on: Phase N-1` for all phases | Arbitrary DAG with `Depends on: Phase X, Phase Y` | Phase 8 (now) | Enables parallel phase execution. Backward compatible. |
| Implicit dependency through phase ordering | Explicit dependency analysis by dedicated agent | Phase 8 (now) | Dependencies are justified, not assumed. Reduces phantom dependencies. |
| Single `next_phase` in `roadmap analyze` | `waves`, `ready`, `blocked` arrays in `roadmap analyze-dag` | Phase 8 (now) | Team lead can determine parallel execution groups programmatically. |

**Deprecated/outdated:**
- `roadmap analyze` `depends_on` field: Currently returns raw text (or null due to bug). Will be fixed to return raw text correctly. Structured parsing moves to `roadmap analyze-dag`.
- `cmdPhaseAdd` hardcoded `Depends on: Phase ${maxPhase}`: Currently always chains new phases linearly. Should be updated to use `Depends on: [To be analyzed]` or prompt for explicit dependency.

## Open Questions

1. **Should `roadmap analyze` output schema change?**
   - What we know: The current `depends_on` field in `roadmap analyze` output is raw text (or null due to the regex bug). The new `roadmap analyze-dag` command adds structured parsing.
   - What's unclear: Should the existing `roadmap analyze` also get the parsed `depends_on` array (in addition to raw text), or should that be `analyze-dag`-only?
   - Recommendation: Add a `depends_on_parsed` array field to `roadmap analyze` output alongside the existing `depends_on` text field. This keeps backward compatibility while making structured data available without requiring the full DAG analysis.

2. **DAG agent file ownership: who writes `Depends on` annotations?**
   - What we know: The CONTEXT.md says the agent auto-runs during roadmap creation (roadmapper spawns it after generating phases). The roadmapper currently writes ROADMAP.md.
   - What's unclear: Does the DAG agent write directly to ROADMAP.md, or does it return analysis to the roadmapper which then writes?
   - Recommendation: Let the DAG agent write directly to ROADMAP.md. It's spawned by the roadmapper as a subagent, so it runs in the same context. Having it write directly is simpler than parsing structured output back. The roadmapper can validate the result after the agent finishes.

3. **What happens to `phase add` and `phase insert` commands?**
   - What we know: Both currently hardcode `Depends on: Phase ${maxPhase}` (linear chain assumption).
   - What's unclear: Should they prompt for dependencies, default to "Nothing", or default to the predecessor?
   - Recommendation: Default to `Depends on: Phase ${maxPhase}` for `phase add` (preserves current behavior -- new phases likely DO depend on the latest phase). For `phase insert`, default to `Depends on: Phase ${afterPhase}` (also preserves current behavior). Both are manually adjustable. The DAG agent can be re-invoked to update dependencies after manual changes.

4. **Existing ROADMAP.md uses `**Depends on**:` with parenthetical annotations like "(first v1.1 phase, no v1.1 dependencies)". Should these annotations be preserved?**
   - What we know: The `parseDependsOn()` function ignores everything except `Phase N` patterns.
   - What's unclear: Should the DAG agent or `phase add` command include annotations?
   - Recommendation: Preserve human-readable annotations. They're valuable context. The parser already ignores them. The DAG agent should ADD annotations (e.g., `(different file domains -- roadmap parsing vs state management)`) for `Parallel with` fields.

## Sources

### Primary (HIGH confidence)
- `bin/mow-tools.cjs` (local, lines 3320-3445) -- `cmdRoadmapAnalyze` function, regex patterns, phase parsing logic. Verified the regex bug (lines 3347-3351 expect colon-inside-bold; actual format is colon-outside-bold).
- `bin/mow-tools.cjs` (local, lines 1153-1235) -- `cmdRoadmapGetPhase` function, same regex format issue.
- `bin/mow-tools.cjs` (local, lines 3449-3586) -- `cmdPhaseAdd` and `cmdPhaseInsert` functions, hardcoded linear `Depends on` assignment.
- `.planning/research/STACK.md` (local) -- Verified `topoGenerations()` implementation, `parseDependsOn()` function, DAG format extension design, alternatives evaluation.
- `.planning/research/ARCHITECTURE.md` (local, lines 340-440) -- DAG format proposal, `analyze-dag` command output schema, integration with team lead flow.
- `.planning/research/SUMMARY.md` (local) -- v1.1 architecture summary confirming DAG scheduler as ~25-line Kahn's BFS, zero dependencies.
- `.planning/ROADMAP.md` (local) -- Current phase structure with `**Depends on**:` fields confirming the colon-outside-bold format.
- `mowism/templates/roadmap.md` (local) -- Template confirming `**Depends on**:` format convention.
- `agents/mow-roadmapper.md` (local) -- Current roadmapper agent prompt, phase identification flow, output format specification.

### Secondary (MEDIUM confidence)
- [GeeksforGeeks: Kahn's Algorithm](https://www.geeksforgeeks.org/dsa/topological-sorting-indegree-based-solution/) -- Algorithm reference confirming BFS-based topological sort with in-degree tracking.
- [Wikipedia: Topological sorting](https://en.wikipedia.org/wiki/Topological_sorting) -- Kahn's algorithm definition, parallel scheduling connection via Coffman-Graham algorithm.
- `.planning/todos/pending/2026-02-20-phase-level-parallelism-in-roadmap-and-execution.md` (local) -- Problem statement for phase-level parallelism, identified current limitations.

### Tertiary (LOW confidence)
- [ascii-dag on GitHub](https://github.com/AshutoshMahala/ascii-dag) -- Reference for DAG ASCII visualization patterns. Not used (zero-dependency constraint) but informed the simple text visualization recommendation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Zero-dependency inline implementations verified in prior STACK.md research. Kahn's BFS is textbook. `parseDependsOn()` is a simple regex.
- Architecture: HIGH -- The command structure (`roadmap analyze-dag` as new subcommand), output format, and roadmapper integration points are all well-defined by codebase analysis. The regex bug is verified and the fix is straightforward.
- Pitfalls: HIGH -- The regex format mismatch is a verified bug (tested by running `roadmap analyze --raw` and observing `null` fields). Phantom dependency risk is documented in prior research (PITFALLS.md Pitfall 3). Breaking changes risk is mitigated by adding a new subcommand instead of modifying existing ones.
- DAG agent design: MEDIUM -- The agent prompt design and confidence tier thresholds are recommendations (Claude's Discretion areas). They're grounded in the locked decisions from CONTEXT.md but the exact implementation needs validation during Phase 8 planning.

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain -- topological sort algorithms don't change; regex bugs don't fix themselves)
