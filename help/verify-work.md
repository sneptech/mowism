# /mow:verify-work

Validate built features through conversational user acceptance testing.

## Usage

    /mow:verify-work [phase]

## Arguments

    phase    Phase number to verify (optional -- prompts if not provided)

## What Happens

1. Loads phase context and all SUMMARY.md files
2. Presents one test scenario at a time for verification
3. Records pass/fail results as you go
4. When issues found: automatically diagnoses root cause
5. Creates verified fix plans ready for execution
6. Writes UAT.md tracking all test results

## Examples

    /mow:verify-work 2    Verify Phase 2 features
    /mow:verify-work      Check for active sessions or prompt for phase

## Related

    /mow:execute-phase        Execute phase before verifying
    /mow:refine-phase         Run automated quality checks
    /mow:execute-phase --gaps-only    Execute fix plans after verification
