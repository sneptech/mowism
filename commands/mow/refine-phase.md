---
name: mow:refine-phase
description: Run tiered quality checks on a completed phase
argument-hint: "<phase-number>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
Run automated quality checks on a completed phase. Presents tier options (Auto, minimum, complex, algorithmic), then orchestrates the quality chain as sequential/parallel Task() subagents.

Runs BETWEEN execute-phase and verify-work in the Mowism workflow.

Context budget: ~15% orchestrator, 100% fresh per subagent.
</objective>

<execution_context>
@/home/max/.claude/mowism/workflows/refine-phase.md
@/home/max/.claude/mowism/references/ui-brand.md
</execution_context>

<context>
Phase: $ARGUMENTS

@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
Execute the refine-phase workflow from @/home/max/.claude/mowism/workflows/refine-phase.md end-to-end.
Preserve all workflow gates (tier selection, chain execution, resilience handling, result reporting).
</process>
