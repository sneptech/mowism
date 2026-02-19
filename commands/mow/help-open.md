---
name: mow:help-open
description: Open help documentation for a /mow:* command in your editor
argument-hint: "<command-name>"
allowed-tools:
  - Bash
  - Read
---

<objective>
Open the help file for a MOW command in the user's preferred editor.

If no argument provided, list all available help topics.
</objective>

<process>

## 1. Parse Arguments

Extract the command name from `$ARGUMENTS`.

- If `$ARGUMENTS` is empty or blank: go to **step 4** (list all help topics)
- Strip any leading `mow:` prefix (e.g., `mow:execute-phase` becomes `execute-phase`)
- Strip any `???` and surrounding whitespace (e.g., `execute-phase ???` becomes `execute-phase`)
- Trim whitespace from the result

If the result is empty after stripping: go to **step 4** (list all help topics).

## 2. Check Help File Exists

Construct the help file path:

```bash
HELP_FILE="$HOME/.claude/mowism/help/${COMMAND_NAME}.md"
```

Check if the file exists:

```bash
[ -f "$HELP_FILE" ] && echo "EXISTS" || echo "NOT_FOUND"
```

**If NOT_FOUND:** Tell the user:
```
No help file found for "{command-name}".

Available help topics:
{list from step 4}
```

## 3. Open in Editor

Open the help file using the editor fallback chain:

```bash
HELP_FILE="$HOME/.claude/mowism/help/${COMMAND_NAME}.md"
EDIT_CMD="${VISUAL:-${EDITOR:-$(command -v nano 2>/dev/null || command -v vi 2>/dev/null || command -v less 2>/dev/null || echo cat)}}"
"$EDIT_CMD" "$HELP_FILE"
```

After opening, confirm to the user:
```
Opened help for /mow:{command-name} in {editor name}.
```

**Stop here** -- do not proceed to step 4.

## 4. List All Help Topics

If no argument was provided or the argument was empty after stripping, list all available help files:

```bash
ls "$HOME/.claude/mowism/help/"*.md 2>/dev/null | sort
```

For each file found, extract the filename (without .md extension) and read the first non-heading, non-empty line as the description.

Present as:
```
## Available Help Topics

Usage: /mow:help-open <command-name>

  execute-phase      Execute all plans in a phase
  new-project        Initialize a new project
  resume-work        Resume from previous session
  ...
```

</process>

<success_criteria>
- Command name extracted and cleaned from $ARGUMENTS
- Help file path correctly constructed under ~/.claude/mowism/help/
- Editor fallback chain: $VISUAL -> $EDITOR -> nano -> vi -> less -> cat
- Missing help file shows available topics
- No argument shows full topic list
</success_criteria>
