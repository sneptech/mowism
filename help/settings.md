# /mow:settings

Configure MOW workflow toggles and model profile.

## Usage

    /mow:settings

## What Happens

1. Reads current `.planning/config.json` (creates with defaults if missing)
2. Presents an interactive 5-question prompt:
   - Model profile (quality/balanced/budget)
   - Research agent toggle
   - Plan-checker agent toggle
   - Verifier agent toggle
   - Branching strategy
3. Merges your answers into config.json
4. Shows confirmation with active settings

## Examples

    /mow:settings    Open interactive configuration

## Related

    /mow:set-profile      Quick switch between model profiles
    /mow:help             See all available commands
    /mow:progress         Check project status
