---
phase: {phase}
plan: {plan}
status: {status}
worker: {worker-name}
worktree: {worktree-path}
timestamp: {timestamp}
reason: {reason}
circuit_breaker_hit: {circuit_breaker_hit}
---

## Completed Plans

{List of plans with SUMMARY.md files and commit hashes, or "None" if first plan}

## Current Plan State

**Plan:** {plan-id}
**Task:** {task-number} of {total-tasks}
**Task name:** {task-name}
**What was completed in this task:** {description of completed work within the current task}

## Uncommitted Changes

{Output of `git diff --stat` from worktree, or "None"}

## Stashed Changes

{Stash reference if changes were stashed via `worktree stash`, or "None"}

## Error Context

{Error message and what was being attempted, or "N/A" for user_cancel/pause}

## Resume Instructions

1. Switch to worktree: `cd {worktree-path}`
2. Run smoke test on completed plans: {list of verification commands from completed plan SUMMARYs}
3. Continue from plan {plan-id}, task {task-number}: {task-name}
4. {Specific guidance based on failure point}
