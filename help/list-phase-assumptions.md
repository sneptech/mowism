# /mow:list-phase-assumptions

Surface Claude's assumptions about a phase before planning begins.

## Usage

    /mow:list-phase-assumptions <phase>

## Arguments

    phase    Phase number to analyze (required)

## What Happens

1. Validates the phase exists in the roadmap
2. Analyzes the phase description, requirements, and context
3. Presents assumptions across five areas:
   - Technical approach
   - Implementation order
   - Scope boundaries
   - Risk areas
   - Dependencies
4. Prompts "What do you think?" for course correction
5. Offers next steps: discuss context, plan phase, or correct assumptions

## Examples

    /mow:list-phase-assumptions 3    See assumptions about Phase 3

## Related

    /mow:discuss-phase    Discuss and lock decisions before planning
    /mow:plan-phase       Plan the phase after reviewing assumptions
    /mow:research-phase   Research before committing to an approach
