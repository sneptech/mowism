# /mow:research-phase

Research how to implement a phase using a dedicated subagent.

## Usage

    /mow:research-phase <phase>

## Arguments

    phase    Phase number to research (required)

## What Happens

1. Validates the phase exists in ROADMAP.md
2. Checks for existing RESEARCH.md (offers update, view, or skip)
3. Gathers phase context (description, requirements, prior decisions)
4. Spawns a researcher subagent with fresh 200k context
5. Agent investigates: standard stack, architecture patterns, common pitfalls
6. Creates RESEARCH.md with prescriptive recommendations

## Examples

    /mow:research-phase 2    Research implementation approach for Phase 2

## Related

    /mow:plan-phase           Plan the phase (integrates research automatically)
    /mow:discuss-phase        Gather user context before research
    /mow:execute-phase        Execute after planning
