# /mow:complete-milestone

Archive a completed milestone and prepare for the next version.

## Usage

    /mow:complete-milestone <version>

## Arguments

    version    Milestone version to complete (e.g., "1.0", "1.1", "2.0")

## What Happens

1. Checks for milestone audit (recommends /mow:audit-milestone if missing)
2. Verifies all phases have SUMMARY.md files (completion check)
3. Gathers stats: phases, plans, tasks, file changes, timeline
4. Extracts 4-6 key accomplishments from phase summaries
5. Archives milestone to `.planning/milestones/v{version}-ROADMAP.md`
6. Archives requirements to `.planning/milestones/v{version}-REQUIREMENTS.md`
7. Updates PROJECT.md with shipped version and next goals
8. Creates git tag `v{version}`
9. Offers next steps

## Examples

    /mow:complete-milestone 1.0    Archive and tag v1.0
    /mow:complete-milestone 2.0    Complete the v2.0 milestone

## Related

    /mow:audit-milestone        Audit before completing
    /mow:new-milestone          Start the next milestone
    /mow:plan-milestone-gaps    Fix gaps before completing
    /mow:cleanup                Archive phase directories
