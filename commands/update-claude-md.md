---
name: update-claude-md
description: Update CLAUDE.md with learnings from the current session so mistakes are not repeated
argument-hint: "[optional: specific lesson or correction to capture]"
allowed-tools: Read, Write, Edit, Bash
---

# Update CLAUDE.md

**Source:** Boris Cherny -- "After every correction, end with: 'Update your CLAUDE.md so you don't make that mistake again.' Claude is eerily good at writing rules for itself."

## Objective

Review the current session for corrections, mistakes, and learnings. Draft precise updates to CLAUDE.md. Present the diff for user approval. NEVER modify CLAUDE.md without explicit user confirmation.

## Process

### 1. Review the Session for Learnings

Scan the current conversation for:
- **Corrections** -- things the user corrected you on
- **Mistakes** -- errors you made that were caught (by you or the user)
- **Surprises** -- things that worked differently than expected
- **Project quirks** -- codebase-specific patterns or rules discovered
- **Tool/library gotchas** -- things about dependencies that were non-obvious
- **Environment specifics** -- OS, shell, or platform behaviors that matter

If `$ARGUMENTS` specifies a particular lesson, focus on that.

### 2. Read Existing CLAUDE.md

- Read the project-level CLAUDE.md (`.claude/CLAUDE.md` or `CLAUDE.md` in repo root)
- Also read the global CLAUDE.md (`~/.claude/CLAUDE.md`) if relevant
- Understand existing rules to avoid duplication or contradiction
- Note which file the updates should go to (project-specific vs global)

### 3. Draft Precise Updates

Write rules that are:

| Quality | Example |
|---|---|
| **Specific** | "Use `jose` not `jsonwebtoken` for JWT in this project because the app uses Edge runtime which requires ESM" |
| **Actionable** | "Always check `git status` before committing -- this repo has pre-commit hooks that modify staged files" |
| **Includes WHY** | "Never use `sudo` in Claude Code commands because the sandbox does not support it -- tell the user to run it manually" |

NOT:

| Anti-pattern | Why Bad |
|---|---|
| "Be careful with libraries" | Not actionable -- which libraries? Be careful how? |
| "Remember to test" | Vague -- test what? When? How? |
| "Handle errors properly" | Meaningless without specifics |

Each rule should prevent a future agent from making the same mistake. Include the WHY so the rule can be intelligently applied (not blindly followed when context differs).

### 4. Present the Diff for Approval

Show the proposed changes as a clear diff:

```
## Proposed CLAUDE.md Updates

**Target file:** [path to CLAUDE.md]

### Additions

> [New rule 1 with WHY]

> [New rule 2 with WHY]

### Modifications

> **Before:** [existing rule]
> **After:** [updated rule]
> **Reason:** [why the change]

### No Changes Needed
[If the session produced no new learnings worth capturing, say so honestly]
```

### 5. Apply ONLY After User Confirms

Ask explicitly:

> Apply these updates to [CLAUDE.md path]? (yes / modify / no)

- **yes** -- Apply the changes
- **modify** -- User provides adjustments, then ask again
- **no** -- Discard, do not modify the file

**NEVER modify CLAUDE.md without this confirmation step.** This is the user's persistent memory for their AI agents. Unauthorized changes can cause cascading incorrect behavior across sessions.

## Output Format

```
## Session Learnings

### Corrections Found
1. [What was wrong and what the correct behavior is]
2. ...

### Proposed CLAUDE.md Updates

**Target:** [file path]

[Diff as described above]

### Apply?
> Apply these updates? (yes / modify / no)
```

## Rules

- NEVER modify CLAUDE.md without explicit user approval. This is non-negotiable.
- Rules must be specific and actionable. Generic advice is worse than no rule.
- Include the WHY in every rule. Future context may differ, and understanding the reason allows intelligent application.
- Check for contradictions with existing rules before proposing additions.
- Do not duplicate existing rules. If a rule already covers the learning, skip it.
- If the session produced no new learnings, say "No new learnings to capture" rather than inventing vague rules.
- Prefer project-level CLAUDE.md for project-specific learnings and global CLAUDE.md for universal lessons.
- Keep rules concise. A rule that takes a paragraph to state will not be followed.
