# /mow:refine-phase

Run tiered quality checks on a completed phase.

## Usage

    /mow:refine-phase <phase-number>

## Arguments

    phase-number    Phase to run quality checks on (required)

## What Happens

1. Presents quality tier options: Auto, Minimum, Complex, Algorithmic
2. Auto tier auto-selects based on phase complexity
3. Orchestrates quality checks as parallel subagent tasks
4. Each check writes structured findings with YAML frontmatter
5. Aggregates results and reports issues found
6. Suggests next steps based on findings

## Examples

    /mow:refine-phase 2    Run quality checks on Phase 2

## Related

    /mow:execute-phase    Execute phase plans (run before refine)
    /mow:verify-work      Validate features after refining
    /mow:debug            Debug specific issues found during refinement
