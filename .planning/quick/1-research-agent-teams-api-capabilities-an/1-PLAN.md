---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/research/AGENT-TEAMS-API.md
autonomous: true
requirements: [RESEARCH-AT-API]

must_haves:
  truths:
    - "Document covers all 8 research questions with confidence levels"
    - "Each capability is tagged as verified, assumed, or unknown"
    - "Design implications are actionable — v1.1 multi-agent UX can reference this document for go/no-go decisions"
  artifacts:
    - path: ".planning/research/AGENT-TEAMS-API.md"
      provides: "Agent Teams API reference document for v1.1 design decisions"
      min_lines: 150
  key_links:
    - from: ".planning/research/AGENT-TEAMS-API.md"
      to: ".planning/todos/pending/2026-02-20-research-agent-teams-api-capabilities-and-constraints.md"
      via: "answers all 8 questions that block the 3 sibling todos"
      pattern: "## .*(Inbox|Worker Output|Permission|Terminal|Task System|Teammate|Concurrency|Stability)"
---

<objective>
Research the actual runtime capabilities and constraints of Claude Code's experimental Agent Teams API, producing a reference document that all v1.1 multi-agent UX design decisions can cite.

Purpose: The entire v1.1 multi-agent cluster (phase-level parallelism, live feedback, distributed input routing with color-coded terminals) depends on knowing what Agent Teams actually supports at runtime — not just what the API surface looks like. The v1.0 research (03-RESEARCH.md) documented the API primitives but left behavioral questions open (e.g., can inbox messages carry structured JSON? can the lead detect worker permission prompts? what controls terminal spawning?). This research closes those gaps.

Output: `.planning/research/AGENT-TEAMS-API.md`
</objective>

<execution_context>
@/home/max/.claude/get-shit-done/workflows/execute-plan.md
@/home/max/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/milestones/v1.0-phases/03-agent-teams-and-distribution/03-RESEARCH.md
@agents/mow-team-lead.md
@mowism/workflows/execute-phase.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Research Agent Teams runtime behavior via web sources and Claude Code internals</name>
  <files>.planning/research/AGENT-TEAMS-API.md</files>
  <action>
Research the 8 specific questions about Agent Teams runtime behavior. Use multiple approaches in parallel:

**Web research (use WebFetch on each):**
- https://docs.anthropic.com/en/docs/claude-code/agent-teams — official Anthropic docs
- https://docs.anthropic.com/en/docs/claude-code/overview — Claude Code overview for tool reference
- https://github.com/anthropics/claude-code/blob/main/README.md — Claude Code repo README
- Search for recent blog posts, changelogs, or community write-ups about Agent Teams capabilities (check alexop.dev, Anthropic blog, GitHub issues)
- The gist referenced in 03-RESEARCH.md: https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea

**Existing codebase analysis:**
- Read `agents/mow-team-lead.md` (already in context) — note which Agent Teams operations it uses and what assumptions it makes
- Read `mowism/workflows/execute-phase.md` (already in context) — note how it spawns agents and what it expects back
- Grep for `Teammate`, `TaskCreate`, `TaskUpdate`, `TaskList`, `team_name`, `inbox`, `write`, `broadcast` across the codebase to find all Agent Teams touchpoints
- Check if there are any Claude Code source files accessible locally (e.g., in node_modules or ~/.claude/) that reveal Agent Teams internals

**For each of the 8 questions, determine:**
1. **Inbox message format** — Are messages free-text strings or can they carry structured data? Test hypothesis: if Teammate write accepts a string, can that string be valid JSON that the recipient parses?
2. **Worker output visibility** — Does the lead get streaming output or only discrete inbox messages? How does idle detection work?
3. **Permission/input proxying** — When a worker hits a tool-use permission prompt, what happens? Does the lead session get notified? Or does the user need to be in the worker's terminal?
4. **Terminal spawning** — Does Agent Teams control terminal creation? Can ANSI escape codes be injected into the worker session prompt or environment? Or is terminal management entirely outside Agent Teams' scope?
5. **Task system** — Full TaskCreate/TaskUpdate/TaskList schema. What fields exist? Can task descriptions carry arbitrary metadata? What's the blockedBy/blocking system?
6. **Teammate operations** — Complete list: spawnTeam, write, broadcast, requestShutdown, approveShutdown, cleanup — are there others? Can you query team member status? Send targeted messages by teammate name?
7. **Concurrency limits** — Max teammates? Token budget per teammate? Does each get a full 200k context window? What happens when you exceed limits?
8. **Stability** — Experimental flag status. Known bugs. Deprecation risk. What breaks when updated?

**Write the research document** at `.planning/research/AGENT-TEAMS-API.md` with this structure:

```markdown
# Agent Teams API — Runtime Capabilities and Constraints

**Researched:** {date}
**Confidence:** {overall}
**Purpose:** Reference document for v1.1 multi-agent UX design decisions
**Supersedes:** Sections of .planning/milestones/v1.0-phases/03-agent-teams-and-distribution/03-RESEARCH.md

## Executive Summary
{3-5 sentences: what's possible, what's not, what's uncertain}

## 1. Inbox Message Format
**Confidence:** {VERIFIED|ASSUMED|UNKNOWN}
{Findings}
**Design implication:** {What this means for v1.1 UX}

## 2. Worker Output Visibility
**Confidence:** {VERIFIED|ASSUMED|UNKNOWN}
{Findings}
**Design implication:** {What this means for live feedback feature}

## 3. Permission/Input Proxying
**Confidence:** {VERIFIED|ASSUMED|UNKNOWN}
{Findings}
**Design implication:** {What this means for distributed input routing}

## 4. Terminal Spawning and Control
**Confidence:** {VERIFIED|ASSUMED|UNKNOWN}
{Findings}
**Design implication:** {What this means for color-coded terminals}

## 5. Task System (TaskCreate/TaskUpdate/TaskList)
**Confidence:** {VERIFIED|ASSUMED|UNKNOWN}
{Findings — full schema if available}
**Design implication:** {What this means for structured state encoding}

## 6. Teammate Operations
**Confidence:** {VERIFIED|ASSUMED|UNKNOWN}
{Complete operation list with parameters}
**Design implication:** {What this means for programmatic team management}

## 7. Concurrency Limits
**Confidence:** {VERIFIED|ASSUMED|UNKNOWN}
{Findings}
**Design implication:** {What this means for phase-level parallelism}

## 8. Stability and Experimental Status
**Confidence:** {VERIFIED|ASSUMED|UNKNOWN}
{Findings}
**Design implication:** {What this means for v1.1 risk}

## Assumptions vs Verified Facts
{Table: claim | status | source | notes}

## v1.1 Design Decision Matrix
{For each of the 4 v1.1 todos, state: feasible/partially feasible/not feasible based on findings, and what adaptations are needed}

## Open Questions
{Anything still unknown that needs runtime testing}

## Sources
{All URLs consulted with confidence tags}
```

Tag every claim as VERIFIED (confirmed in official docs or source code), ASSUMED (reasonable inference from API design), or UNKNOWN (needs runtime testing to confirm). Be honest about gaps — an "UNKNOWN" with a clear test plan is more valuable than a fabricated "VERIFIED".

Cross-reference findings against the v1.0 research (03-RESEARCH.md) to identify what was assumed then that can now be confirmed or corrected.

The "v1.1 Design Decision Matrix" section is critical — it must answer: given what we now know, can we build each of the 4 v1.1 multi-agent features as designed, or do the designs need to adapt?
  </action>
  <verify>
Verify the document exists and covers all 8 sections:
```bash
test -f .planning/research/AGENT-TEAMS-API.md && echo "EXISTS" || echo "MISSING"
grep -c "^## [0-9]" .planning/research/AGENT-TEAMS-API.md  # Should be 8
grep -c "Confidence:" .planning/research/AGENT-TEAMS-API.md  # Should be >= 8
grep -c "Design implication:" .planning/research/AGENT-TEAMS-API.md  # Should be >= 8
grep "Design Decision Matrix" .planning/research/AGENT-TEAMS-API.md  # Must exist
wc -l .planning/research/AGENT-TEAMS-API.md  # Should be >= 150 lines
```
  </verify>
  <done>
AGENT-TEAMS-API.md exists with all 8 research questions answered, each tagged with confidence level (VERIFIED/ASSUMED/UNKNOWN), each with a design implication for v1.1 features, and a decision matrix mapping findings to the 4 v1.1 multi-agent todos. Document is >= 150 lines and provides actionable go/no-go guidance for each v1.1 feature.
  </done>
</task>

</tasks>

<verification>
- Document exists at `.planning/research/AGENT-TEAMS-API.md`
- All 8 research questions have dedicated sections with confidence tags
- v1.1 Design Decision Matrix covers all 4 multi-agent todos
- No section says only "TODO" or "TBD" — every section has substantive findings or honest "UNKNOWN" with a test plan
- Cross-references v1.0 research to note corrections or confirmations
</verification>

<success_criteria>
- The 3 blocked v1.1 todos (phase parallelism, live feedback, distributed input routing) can each be assessed as feasible/partially feasible/not feasible based on this document alone
- Any Mowism contributor reading this document understands what Agent Teams can and cannot do at runtime, without needing to re-research
- Confidence levels are honest — UNKNOWN with test plans preferred over fabricated VERIFIED claims
</success_criteria>

<output>
After completion, create `.planning/quick/1-research-agent-teams-api-capabilities-an/1-01-SUMMARY.md`
</output>
