---
name: mow:migrate
description: Migrate an existing GSD .planning/ directory to Mowism format
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

**??? Help Detection:**
If `$ARGUMENTS` contains "???" (e.g., the user typed `/mow:migrate ???`):
1. Extract the command name: `migrate`
2. Run `/mow:help-open migrate` to open the help file in the user's editor
3. Stop here -- do NOT proceed with the normal command execution below

<objective>
Upgrade an existing GSD `.planning/` directory to Mowism format. This is a safe, recoverable operation: backup first, then in-place replacement, then auto-commit.
</objective>

<process>

## Step 1: Pre-flight checks

Verify the migration environment is ready:

1. Check that `.planning/` directory exists in the current project root
2. Check that it contains files (not empty)
3. Inform the user what will happen:

```
## MOW Migration

This will migrate your `.planning/` directory from GSD format to Mowism format.

**What happens:**
1. Backup `.planning/` to `.planning.backup.{timestamp}/`
2. Replace GSD-specific strings in all `.planning/` files
3. Verify no functional GSD references remain
4. Auto-commit all changes

**Safe to run:** Your original files are preserved in the backup directory.

Proceeding...
```

If `.planning/` does not exist or is empty, stop with an error message.

## Step 2: Backup

Create a timestamped backup of the entire `.planning/` directory:

```bash
TIMESTAMP=$(date +%s)
cp -r .planning/ ".planning.backup.${TIMESTAMP}/"
```

Verify the backup was created and contains files:

```bash
[ -d ".planning.backup.${TIMESTAMP}" ] && echo "Backup created" || echo "ERROR: Backup failed"
```

Print the restore command for the user:

```
**Restore command (if needed):**
rm -rf .planning/ && mv .planning.backup.{TIMESTAMP}/ .planning/
```

## Step 3: String replacement

Apply replacements in specificity order to ALL files in `.planning/`. Process each file that matches `*.md`, `*.json`, or `*.yaml` within `.planning/`.

**Replacement table (apply in this exact order):**

1. `~/.claude/get-shit-done/` -> `~/.claude/mowism/`
2. `get-shit-done` -> `mowism`
3. `~/.gsd/` -> `~/.mowism/`
4. `.gsd/` -> `.mowism/`
5. `gsd/phase-` -> `mow/phase-`
6. `gsd/{milestone}` -> `mow/{milestone}`
7. `/gsd:` -> `/mow:`
8. `gsd-tools.cjs` -> `mow-tools.cjs`
9. `gsd-tools` -> `mow-tools`
10. `gsd-integration-checker` -> `mow-integration-checker`
11. `gsd-research-synthesizer` -> `mow-research-synthesizer`
12. `gsd-project-researcher` -> `mow-project-researcher`
13. `gsd-phase-researcher` -> `mow-phase-researcher`
14. `gsd-codebase-mapper` -> `mow-codebase-mapper`
15. `gsd-plan-checker` -> `mow-plan-checker`
16. `gsd-roadmapper` -> `mow-roadmapper`
17. `gsd-debugger` -> `mow-debugger`
18. `gsd-executor` -> `mow-executor`
19. `gsd-planner` -> `mow-planner`
20. `gsd-verifier` -> `mow-verifier`
21. `GSD ►` -> `MOW ▶` (note: different arrow characters)
22. `GSD ▶` -> `MOW ▶`
23. Remaining standalone `GSD` in brand/banner/status contexts -> `MOW` (do NOT replace GSD in prose discussing the GSD origin or migration history)

Also update `model_overrides` keys in `config.json` if present:
- Any key starting with `gsd-` should be renamed to start with `mow-` (e.g., `"gsd-executor"` -> `"mow-executor"`)

**Important:** Leave phase numbers, plan content, progress data, decision logs, and timing data unchanged. Only replace GSD-specific functional strings.

## Step 4: Verification

After all replacements, scan for remaining `gsd` strings:

```bash
grep -rn 'gsd\|get-shit-done' .planning/ --include='*.md' --include='*.json' --include='*.yaml'
```

**Evaluate results:**
- If NO results: migration is clean. Proceed to Step 5.
- If results found: check each occurrence.
  - **Prose references** (e.g., "migrated from GSD", "forked from GSD project"): These are acceptable. They document history, not functional references.
  - **Functional references** (e.g., `/gsd:command`, `gsd-tools.cjs`, `gsd-executor` in config keys): These are errors. Fix them before proceeding.

Print a summary:

```
## Migration Verification

**Files modified:** {count}
**Remaining 'gsd' strings:** {count}

{If remaining strings exist, show each with context line}

{If all remaining are prose/historical: "All remaining references are historical/prose context (acceptable)."}
{If functional references remain: "ERROR: Functional GSD references remain. Migration incomplete."}
```

**If functional references remain:** Print the restore command and STOP. Do NOT auto-commit.

## Step 5: Auto-commit

If verification passed (no functional GSD references remain):

```bash
git add .planning/
git commit -m "chore: migrate .planning/ from GSD to Mowism format"
```

Print completion message:

```
## Migration Complete

Your `.planning/` directory has been migrated from GSD to Mowism format.

**Backup location:** .planning.backup.{TIMESTAMP}/
**Restore command:** rm -rf .planning/ && mv .planning.backup.{TIMESTAMP}/ .planning/

You can safely delete the backup directory once you've verified everything works:
rm -rf .planning.backup.{TIMESTAMP}/
```

## Error Handling

If ANY step fails:
1. Print the error that occurred
2. Print the restore command: `rm -rf .planning/ && mv .planning.backup.{TIMESTAMP}/ .planning/`
3. STOP immediately -- do not continue to subsequent steps

</process>

<success_criteria>
- [ ] Backup created at `.planning.backup.{timestamp}/`
- [ ] All functional GSD strings replaced in `.planning/` files
- [ ] Phase numbers, progress data, and decision logs unchanged
- [ ] Config model_overrides keys updated (if present)
- [ ] Verification grep shows no functional GSD references
- [ ] Changes auto-committed
</success_criteria>
