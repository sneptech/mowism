# /mow:debug

Systematic debugging with persistent state across context resets.

## Usage

    /mow:debug [issue description]

## Arguments

    issue description    Optional description of the problem to investigate

## What Happens

1. Checks for active debug sessions in `.planning/debug/`
2. If active sessions exist and no argument: lets you resume one
3. If new issue: gathers symptoms (expected behavior, actual behavior, errors, timeline, reproduction steps)
4. Spawns a debugger subagent with fresh 200k context for investigation
5. Agent uses scientific method: hypothesize, test, eliminate, confirm
6. Returns root cause with evidence, or checkpoint for more information
7. Offers: fix now, plan fix, or manual fix

## Examples

    /mow:debug "Login fails after token refresh"    Start debugging a specific issue
    /mow:debug                                      Resume an active debug session

## Related

    /mow:execute-phase    Execute fix plans after debugging
    /mow:quick            Quick-fix a small issue
    /mow:verify-work      Verify the fix worked
