# /mow:plan-milestone-gaps

Create phases to close all gaps identified by a milestone audit.

## Usage

    /mow:plan-milestone-gaps

## What Happens

1. Reads the most recent MILESTONE-AUDIT.md
2. Extracts all identified gaps (unfulfilled requirements, integration issues, etc.)
3. Prioritizes gaps against original PROJECT.md intent
4. Groups related gaps into logical phases
5. Creates phase entries in ROADMAP.md for each gap group
6. Offers to plan each new phase immediately

## Examples

    /mow:plan-milestone-gaps    Create fix phases from audit results

## Related

    /mow:audit-milestone        Run the audit first
    /mow:complete-milestone     Complete milestone after gaps are closed
    /mow:plan-phase             Plan individual phases
    /mow:execute-phase          Execute the gap-closure phases
