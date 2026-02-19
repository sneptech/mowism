# /mow:reapply-patches

Reapply local modifications after a MOW update.

## Usage

    /mow:reapply-patches

## What Happens

1. Checks for backed-up patches in `~/.claude/mow-local-patches/`
2. Reads `backup-meta.json` for list of modified files
3. Shows patch summary: backed-up version, current version, file count
4. For each file: compares backed-up version with new version
5. Merges user modifications into the updated files
6. Flags conflicts for manual resolution when both user and upstream changed
7. Offers to keep or clean up patch backups
8. Reports final status per file

## Examples

    /mow:reapply-patches    Merge your local modifications back after an update

## Related

    /mow:update    Update MOW (creates backups automatically)
    /mow:health    Verify installation after reapplying patches
