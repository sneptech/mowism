# /mow:insert-phase

Insert urgent work as a decimal phase between existing phases.

## Usage

    /mow:insert-phase <after> <description>

## Arguments

    after          Phase number to insert after (e.g., 2)
    description    Brief description of the urgent work

## What Happens

1. Validates the target phase exists
2. Calculates the next decimal number (e.g., 2.1, 2.2)
3. Creates the phase directory with decimal numbering
4. Adds the entry to ROADMAP.md in the correct position
5. Updates STATE.md

## Examples

    /mow:insert-phase 2 "Hotfix auth tokens"    Insert Phase 2.1 after Phase 2
    /mow:insert-phase 3 "Security audit"         Insert Phase 3.1 after Phase 3

## Related

    /mow:add-phase       Add a phase at the end instead
    /mow:remove-phase    Remove an unstarted phase
    /mow:plan-phase      Plan the inserted phase
