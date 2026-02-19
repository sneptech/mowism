# /mow:check-todos

List pending todos and select one to work on.

## Usage

    /mow:check-todos [area]

## Arguments

    area    Optional filter to show only todos in a specific area

## What Happens

1. Scans `.planning/todos/` for pending items
2. Lists todos with area tags and descriptions
3. Lets you select a todo to work on
4. Loads full context for the selected todo
5. Checks if it correlates with any roadmap phase
6. Offers actions: work now, add to phase, brainstorm, or create new phase
7. Updates STATE.md and commits changes

## Examples

    /mow:check-todos          List all pending todos
    /mow:check-todos api      Show only API-related todos

## Related

    /mow:add-todo        Capture a new todo
    /mow:quick           Execute a small task quickly
    /mow:plan-phase      Plan a phase if the todo is large enough
