# /mow:discuss-phase

Gather implementation context through adaptive questioning before planning.

## Usage

    /mow:discuss-phase <phase> [--auto]

## Arguments

    phase    Phase number to discuss (required)

## Flags

    --auto    Auto-mode for minimal interaction

## What Happens

1. Analyzes the phase to identify gray areas (UI, behavior, UX decisions)
2. Presents gray areas and lets you select which to discuss
3. Deep-dives each selected area with targeted questions (4 per area)
4. Offers to continue or move to next area after each round
5. Creates CONTEXT.md with locked decisions for downstream agents
6. Defers scope-expanding suggestions to future phases

## Examples

    /mow:discuss-phase 2    Discuss Phase 2 before planning
    /mow:discuss-phase 3    Clarify implementation decisions for Phase 3

## Related

    /mow:plan-phase               Plan the phase after discussion
    /mow:list-phase-assumptions   See Claude's assumptions before discussing
    /mow:research-phase           Research implementation approaches
