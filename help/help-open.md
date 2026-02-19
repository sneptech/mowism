# /mow:help-open

Open detailed help documentation for any /mow:* command in your editor.

## Usage

    /mow:help-open <command-name>

## Arguments

    command-name    The command to get help for (e.g., "execute-phase", "new-project")

## What Happens

1. Takes the command name from the argument
2. Strips any `mow:` prefix or `???` suffix
3. Looks up the help file at `~/.claude/mowism/help/{command-name}.md`
4. Opens it in your editor using: $VISUAL, $EDITOR, nano, vi, less, or cat
5. If no argument provided: lists all available help topics

## Examples

    /mow:help-open execute-phase        Open help for execute-phase
    /mow:help-open mow:new-project      Also works with mow: prefix
    /mow:help-open                      List all available help topics

## Related

    /mow:help             Quick command reference (no editor)
    /mow:execute-phase ???    Shortcut: append ??? to any command for help
