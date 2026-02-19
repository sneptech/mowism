# /mow:audit-milestone

Audit milestone completion against original intent before archiving.

## Usage

    /mow:audit-milestone [version]

## Arguments

    version    Milestone version to audit (defaults to current milestone)

## What Happens

1. Loads original intent from PROJECT.md and REQUIREMENTS.md
2. Reads all SUMMARY.md and VERIFICATION.md files for the milestone phases
3. Checks requirements coverage (which requirements are fulfilled)
4. Aggregates tech debt and deferred gaps from phase summaries
5. Spawns integration checker for cross-phase wiring verification
6. Creates MILESTONE-AUDIT.md with pass/gaps_found status
7. Routes to fix plans or completion based on results

## Examples

    /mow:audit-milestone          Audit the current milestone
    /mow:audit-milestone 1.0     Audit milestone v1.0

## Related

    /mow:complete-milestone     Complete after audit passes
    /mow:plan-milestone-gaps    Create fix phases for audit gaps
    /mow:verify-work            Verify individual phases
