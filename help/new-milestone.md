# /mow:new-milestone

Start a new milestone cycle with updated PROJECT.md and fresh requirements.

## Usage

    /mow:new-milestone [milestone name]

## Arguments

    milestone name    Optional name (e.g., "v1.1 Notifications"). Prompts if omitted.

## What Happens

1. Loads existing PROJECT.md, STATE.md, and milestone history
2. Runs questioning to understand what is next for the project
3. Optionally runs domain research for new features
4. Updates PROJECT.md with new milestone goals
5. Generates fresh REQUIREMENTS.md scoped to this milestone
6. Creates ROADMAP.md with new phases (continues numbering from previous milestone)
7. Resets STATE.md for the new milestone

## Examples

    /mow:new-milestone "v1.1 Notifications"    Start milestone with a name
    /mow:new-milestone                          Interactive milestone setup

## Related

    /mow:complete-milestone    Complete current milestone first
    /mow:plan-phase            Plan the first phase of the new milestone
    /mow:new-project           For brand-new projects (not existing ones)
