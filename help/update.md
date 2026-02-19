# /mow:update

Update MOW to the latest version.

## Usage

    /mow:update

## What Happens

1. Detects how Mowism was installed (git clone or install.sh)
2. Resolves update source (configured URL or local path)
3. Checks for latest version available
4. Shows what's new (version comparison, commit log if available)
5. Asks for confirmation before proceeding
6. Runs the update (git pull or re-run install.sh)
7. Reminds to restart Claude Code for changes to take effect

## Examples

    /mow:update    Check for and install MOW updates

## Related

    /mow:reapply-patches    Reapply local modifications after updating
    /mow:health             Check installation health
