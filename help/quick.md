# /mow:quick

Execute a quick task with MOW guarantees but skip optional agents.

## Usage

    /mow:quick [--full]

## Flags

    --full    Enable plan-checking and post-execution verification.
              Use when you want quality guarantees without full milestone ceremony.

## What Happens

1. Describes the task (from conversation context or prompt)
2. Spawns planner in quick mode to create a lightweight plan
3. Executes the plan with atomic commits and STATE.md tracking
4. Quick tasks live in `.planning/quick/` separate from planned phases
5. Updates STATE.md "Quick Tasks Completed" table (not ROADMAP.md)

## Examples

    /mow:quick          Run a quick task with minimal overhead
    /mow:quick --full   Run with plan-checking and verification enabled

## Related

    /mow:execute-phase    Full phase execution with all agents
    /mow:add-todo         Capture a task for later instead of running now
    /mow:progress         Check what else needs doing
