# /mow:health

Diagnose planning directory health and optionally repair issues.

## Usage

    /mow:health [--repair]

## Flags

    --repair    Attempt to automatically fix discovered issues

## What Happens

1. Validates `.planning/` directory structure exists
2. Checks for required files (PROJECT.md, ROADMAP.md, STATE.md, config.json)
3. Validates configuration values
4. Checks for inconsistent state (orphaned plans, missing summaries, etc.)
5. Reports actionable issues with severity levels
6. With --repair: attempts to fix fixable issues automatically

## Examples

    /mow:health            Check planning directory integrity
    /mow:health --repair   Check and auto-fix issues

## Related

    /mow:migrate      Migrate from GSD format
    /mow:cleanup      Archive old milestone directories
    /mow:settings     Fix configuration issues
