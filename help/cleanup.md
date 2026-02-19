# /mow:cleanup

Archive accumulated phase directories from completed milestones.

## Usage

    /mow:cleanup

## What Happens

1. Scans `.planning/phases/` for directories from completed milestones
2. Shows a dry-run summary of what would be archived
3. On confirmation: moves completed milestone directories to `.planning/milestones/v{X.Y}-phases/`
4. Keeps the `.planning/phases/` directory clean for current work

## Examples

    /mow:cleanup    Archive old phase directories

## Related

    /mow:complete-milestone    Complete a milestone before cleanup
    /mow:health                Check planning directory health
    /mow:progress              See current project status
