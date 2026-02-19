# /mow:remove-phase

Remove a future phase from the roadmap and renumber subsequent phases.

## Usage

    /mow:remove-phase <phase-number>

## Arguments

    phase-number    The phase to remove (must be unstarted/future)

## What Happens

1. Validates the phase exists and is unstarted (cannot remove completed/active phases)
2. Checks the phase has no completed work
3. Deletes the phase directory
4. Renumbers all subsequent phases to maintain a clean sequence
5. Updates ROADMAP.md and STATE.md
6. Commits with git as historical record

## Examples

    /mow:remove-phase 5    Remove Phase 5 and renumber 6+ down

## Related

    /mow:add-phase       Add a new phase to the roadmap
    /mow:insert-phase    Insert an urgent phase between existing ones
    /mow:progress        Check current roadmap status
