# /mow:add-phase

Add a new phase to the end of the current milestone in the roadmap.

## Usage

    /mow:add-phase <description>

## Arguments

    description    Brief description of the new phase's goal

## What Happens

1. Validates the roadmap exists
2. Identifies the current milestone
3. Calculates the next sequential phase number
4. Generates a slug from the description
5. Creates the phase directory under `.planning/phases/`
6. Adds the phase entry to ROADMAP.md
7. Updates STATE.md with the change

## Examples

    /mow:add-phase "Email notifications"    Add a notifications phase
    /mow:add-phase "API rate limiting"      Add a rate limiting phase

## Related

    /mow:insert-phase     Insert an urgent phase between existing ones
    /mow:remove-phase     Remove an unstarted phase
    /mow:plan-phase       Plan the newly added phase
