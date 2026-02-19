# /mow:update

Update MOW to the latest version with changelog display.

## Usage

    /mow:update

## What Happens

1. Detects installed version (local vs global installation)
2. Checks for latest version available
3. Compares versions and shows changelog
4. Warns about clean install (local modifications backed up)
5. Asks for confirmation before proceeding
6. Runs the update and clears caches
7. Reminds to restart Claude Code for changes to take effect

## Examples

    /mow:update    Check for and install MOW updates

## Related

    /mow:reapply-patches    Reapply local modifications after updating
    /mow:health             Check installation health
