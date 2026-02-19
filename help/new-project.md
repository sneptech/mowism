# /mow:new-project

Initialize a new project with deep context gathering, requirements, and roadmap.

## Usage

    /mow:new-project [--auto]

## Flags

    --auto    Automatic mode. After config questions, runs research, requirements,
              and roadmap without further interaction. Expects idea document via
              @ reference.

## What Happens

1. Asks questions to understand your project goals, constraints, and preferences
2. Creates `.planning/PROJECT.md` with gathered context
3. Creates `.planning/config.json` with workflow preferences
4. Optionally runs domain research into `.planning/research/`
5. Generates `.planning/REQUIREMENTS.md` with scoped requirements
6. Creates `.planning/ROADMAP.md` with phased execution plan
7. Creates `.planning/STATE.md` for session continuity

## Examples

    /mow:new-project                Start interactive project setup
    /mow:new-project --auto         Auto-mode with minimal interaction

## Related

    /mow:resume-work          Resume work on an existing project
    /mow:plan-phase 1         Plan the first phase after project setup
    /mow:new-milestone        Start a new milestone on an existing project
