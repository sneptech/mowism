# Phase 5: Fix Update Workflow - Research

**Researched:** 2026-02-20
**Domain:** Shell scripting, Claude Code skill workflows, update/install lifecycle
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIST-01 (fix) | One-command install script that clones repo and registers all `/mow:*` skills in `~/.claude/` | The install.sh works correctly (verified in Phase 4), but the update pathway is broken after install.sh installation. Three specific issues identified: (1) update.md workflow expects `.git` directory that install.sh does not create, (2) update.md command file has stale npm/GSD-era references, (3) reapply-patches references unimplemented patch-save mechanism. All three must be fixed to complete DIST-01's intent. |
</phase_requirements>

## Summary

This phase fixes three related problems that were identified in the v1.0 Milestone Audit (INT-01, FLOW-01) and accumulated tech debt list. All three stem from the same root cause: the update and reapply-patches commands were originally ported from GSD (which distributed via npm) but Mowism switched to a git-clone + install.sh distribution model in Phase 3, and the update-related files were never reconciled with this new reality.

The core problem is an install method mismatch. `install.sh` copies flat files into `~/.claude/mowism/` (no `.git` directory). The `update.md` workflow checks `if [ -d ~/.claude/mowism/.git ]` and, finding no `.git`, falls into the "INSTALLED but not a git repo" branch that advises manual setup rather than performing an update. This means **no user who installed via install.sh can successfully run `/mow:update`**. The fix requires rewriting the update workflow to support the install.sh installation method (re-running install.sh from a local or freshly-fetched repo clone), updating the command file and help file to remove stale npm/GSD-era references, and making reapply-patches handle the "no patches" case gracefully without referencing unimplemented mechanisms.

**Primary recommendation:** Rewrite the update workflow to detect whether Mowism was installed via `install.sh` (VERSION file exists, no .git) and provide a working update path that fetches the latest repo and re-runs install.sh. Clean up all stale references in the command file, help file, and workflow. Fix reapply-patches to work gracefully when no patches exist.

## Standard Stack

This phase involves no new libraries or tools. All changes are to existing markdown files (Claude Code skill definitions).

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Bash | Shell commands in update workflow | All Mowism workflows use bash code blocks for system operations |
| Git | Fetch latest version from remote repo | The update mechanism is git-based (git clone/pull) |
| `install.sh` | Re-run to apply updates after fetching latest | Already exists and is verified to work correctly (Phase 4) |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `mktemp -d` | Create temporary directory for fetching latest repo | During update when install was via install.sh (no local .git) |
| `diff` / `comm` | Compare file lists before/after update | Optional: show what changed during update |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Re-run install.sh from temp clone | In-place git pull on ~/.claude/mowism/ | Would require converting flat install to git repo -- invasive and fragile |
| Temporary clone + install.sh | Download tarball from GitHub releases | Adds GitHub API dependency; git clone is simpler and already the documented install method |

## Architecture Patterns

### Pattern 1: Two Installation Methods, One Update Flow

**What:** The update workflow must detect the installation method and route to the appropriate update mechanism.

**When to use:** Every `/mow:update` invocation.

**Detection logic:**
```bash
# Priority order for detection
if [ -d ~/.claude/mowism/.git ]; then
  # Method A: User cloned repo directly into ~/.claude/mowism/
  # Update: git pull
  INSTALL_METHOD="GIT_CLONE"
elif [ -f ~/.claude/mowism/VERSION ]; then
  # Method B: User ran install.sh (flat file copy, no .git)
  # Update: clone to temp dir, re-run install.sh
  INSTALL_METHOD="INSTALL_SH"
else
  INSTALL_METHOD="NOT_FOUND"
fi
```

**Key insight:** The current workflow only handles method A (GIT_CLONE) and gives up on method B (INSTALL_SH). Method B is the **primary** installation path since install.sh is what the README recommends.

### Pattern 2: Install.sh-Based Update (New)

**What:** For INSTALL_SH installations, the update clones the repo to a temp directory, compares versions, and re-runs install.sh to update.

**Flow:**
```
1. Read current version from ~/.claude/mowism/VERSION
2. Clone repo to temp directory (or use existing local clone if available)
3. Read new version from temp/mowism/VERSION
4. Compare versions / show git log of changes
5. Confirm with user
6. Run bash temp/bin/install.sh
7. Clean up temp directory
8. Show success + restart reminder
```

**Why this approach:**
- install.sh is already verified to work correctly (Phase 4)
- No need to duplicate its logic in the update workflow
- install.sh handles all file copying, directory creation, and dependency checking
- Idempotent: running install.sh over existing installation is safe (it overwrites unconditionally)

### Pattern 3: Graceful No-Patches Handling

**What:** The reapply-patches command must handle the common case where no patches directory exists without referencing unimplemented mechanisms.

**Current problem:** The "no patches found" message says "Local patches are automatically saved when you run /mow:update after modifying any MOW workflow, command, or agent files." But `/mow:update` never implements any patch-saving mechanism. This is a false promise.

**Fix:** The no-patches message should accurately describe the current state: patches are not yet automatically saved. The user can manually back up modified files before updating.

### Anti-Patterns to Avoid

- **Converting flat install to git repo in-place:** Do not try to `git init` and `git remote add` inside `~/.claude/mowism/`. This is fragile, can corrupt existing files, and creates a non-standard git state.
- **Downloading individual files from GitHub API:** Each file would need a separate API call. Just clone the whole repo to a temp directory.
- **Hardcoding a GitHub repo URL in the workflow:** The repo URL should be discoverable (from the installed VERSION file metadata, or as a well-known constant). Since there is currently no remote set, use a placeholder that can be configured.
- **Referencing npm or package registries:** Mowism is not distributed via npm. All npm references are stale GSD-era artifacts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File update/copy logic | Custom per-file copy commands in update.md | Re-run `install.sh` | install.sh already handles all file copying, directory creation, counts, and dependency checks |
| Version comparison | Custom semver parser | Simple string comparison or `sort -V` | Version is a simple string in VERSION file; exact equality check is sufficient for "is update available" |
| Patch backup/restore | Complex diff-and-merge system | Defer to future version or manual backup | The patch system was never implemented; building it now would be scope creep for this phase |

**Key insight:** The existing `install.sh` is the correct update mechanism. The update workflow just needs to orchestrate fetching a fresh copy and running it.

## Common Pitfalls

### Pitfall 1: Stale References Surviving the Rewrite

**What goes wrong:** After fixing the workflow, some npm/GSD-era references remain in the command file or help file.
**Why it happens:** The fix focuses on the workflow file (`mowism/workflows/update.md`) but forgets that `commands/mow/update.md` and `help/update.md` also contain stale descriptions.
**How to avoid:** Fix ALL THREE files: workflow, command, and help. Grep for `npm`, `changelog`, `local vs global`, `cache clearing`, `clean install` across all update-related files after fixing.
**Warning signs:** Any mention of npm, changelog fetching, local/global installation detection, or cache clearing in update-related files.

### Pitfall 2: No Repo URL Available

**What goes wrong:** The update workflow tries to `git clone` but has no URL for the Mowism repository.
**Why it happens:** The git repo at `/home/max/git/mowism` currently has no remote configured. The update workflow needs a URL.
**How to avoid:** The update workflow should handle the "no repo URL configured" case gracefully. Options: (1) read from a config value, (2) use a well-known default URL, (3) ask the user for the URL on first update. Since Mowism does not yet have a public GitHub URL, the workflow should support a configurable repo URL with a clear error message if none is set.
**Warning signs:** Hardcoded URL that does not exist yet, or update silently failing because `git clone` has no target.

### Pitfall 3: Reapply-Patches False Promises

**What goes wrong:** The reapply-patches "no patches" message still references automatic patch saving that does not exist.
**Why it happens:** Only fixing the update workflow but not the reapply-patches command.
**How to avoid:** Fix the reapply-patches "no patches found" message to be honest about current capabilities. Remove the claim that patches are "automatically saved when you run /mow:update."
**Warning signs:** Any text in reapply-patches.md that describes automatic behavior that the update workflow does not implement.

### Pitfall 4: Breaking the GIT_CLONE Update Path

**What goes wrong:** While adding the INSTALL_SH path, the existing GIT_CLONE path (git pull) gets broken or removed.
**Why it happens:** Overwriting the entire workflow instead of extending it.
**How to avoid:** The existing GIT_CLONE path (check .git, git fetch, git pull) works correctly. Keep it. Add the INSTALL_SH path as a new branch in the detection logic.
**Warning signs:** The GIT_CLONE detection check being removed or modified.

### Pitfall 5: Temp Directory Cleanup Failure

**What goes wrong:** The temp directory used for cloning is not cleaned up on error, filling disk over time.
**Why it happens:** Script exits early on error without reaching cleanup code.
**How to avoid:** Use a trap or ensure cleanup runs in all exit paths. Since this is a Claude Code workflow (markdown with bash blocks), the agent executing it should handle cleanup as a final step.
**Warning signs:** No mention of temp directory cleanup in the workflow.

## Code Examples

### Example 1: Updated Installation Detection (update.md workflow)

```bash
# Detect installation method
if [ -d ~/.claude/mowism/.git ]; then
  echo "GIT_CLONE"
  cd ~/.claude/mowism && git rev-parse --short HEAD
elif [ -f ~/.claude/mowism/VERSION ]; then
  echo "INSTALL_SH"
  cat ~/.claude/mowism/VERSION
else
  echo "NOT_FOUND"
fi
```

Source: Adapted from current `mowism/workflows/update.md` check_installation step

### Example 2: Install.sh-Based Update Flow

```bash
# Clone to temp directory
TMPDIR=$(mktemp -d)
git clone --depth 1 "$REPO_URL" "$TMPDIR/mowism" 2>/dev/null

# Read new version
NEW_VERSION=$(cat "$TMPDIR/mowism/mowism/VERSION" 2>/dev/null)
CURRENT_VERSION=$(cat ~/.claude/mowism/VERSION 2>/dev/null)

# Show what's new (git log between versions if available)
echo "Current: $CURRENT_VERSION"
echo "Latest: $NEW_VERSION"

# Run install.sh from the fresh clone
bash "$TMPDIR/mowism/bin/install.sh"

# Cleanup
rm -rf "$TMPDIR"
```

### Example 3: Fixed "No Patches" Message (reapply-patches.md)

```markdown
**If no patches found:**

No local patches found. Nothing to reapply.

To preserve local modifications before updating:
1. Identify files you have modified in `~/.claude/`
2. Copy them to a safe location before running `/mow:update`
3. After updating, manually merge your changes back

Automatic patch detection may be added in a future version.
```

### Example 4: Fixed Command Description (commands/mow/update.md)

```markdown
---
name: mow:update
description: Update MOW to latest version
allowed-tools:
  - Bash
  - AskUserQuestion
---

<objective>
Check for MOW updates and install if available.

Routes to the update workflow which handles:
- Installation method detection (git clone vs install.sh)
- Remote version checking
- User confirmation before updating
- Update execution (git pull or re-run install.sh)
- Restart reminder
</objective>
```

### Example 5: Fixed Help File (help/update.md)

```markdown
# /mow:update

Update MOW to the latest version.

## Usage

    /mow:update

## What Happens

1. Detects how Mowism was installed (git clone or install.sh)
2. Checks for latest version available from the repository
3. Shows what's new (commit log)
4. Asks for confirmation before proceeding
5. Runs the update
6. Reminds to restart Claude Code for changes to take effect

## Examples

    /mow:update    Check for and install MOW updates

## Related

    /mow:reapply-patches    Reapply local modifications after updating
    /mow:health             Check installation health
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm-based update (GSD era) | Git-based update (clone + install.sh) | Phase 1 [01-04] decision | update.md workflow was rewritten for git but command/help files kept npm references |
| Single update path (.git required) | Dual path (git clone OR install.sh) | This phase (Phase 5) | Unlocks update for all users, not just git-clone installers |
| Automatic patch save/restore | Manual patch management (future: automatic) | This phase (Phase 5) | Removes false promises; honest about current capabilities |

**Deprecated/outdated (must be removed):**
- `npm version checking` -- Mowism is not on npm
- `Changelog fetching and display` -- No npm changelog; use git log instead
- `clean install warning` / `cache clearing` -- npm concepts, not applicable
- `local vs global installation` -- npm concept; Mowism has "git clone" vs "install.sh"
- `Full install/update tooling (npm package, installer script) is planned for Phase 3 (DIST-01)` -- Phase 3 is complete; install.sh exists; this note is stale

## Scope of Changes

### Files That MUST Change

| File | What's Wrong | What to Fix |
|------|-------------|------------|
| `mowism/workflows/update.md` | Only handles .git installations; stale Phase 3 note at bottom | Add INSTALL_SH branch; remove stale `<note>` about Phase 3 |
| `commands/mow/update.md` | npm references in description and process list | Rewrite description and process to match actual git-based workflow |
| `help/update.md` | npm/changelog/cache references in "What Happens" | Rewrite to describe actual update behavior |
| `commands/mow/reapply-patches.md` | "no patches" message references automatic saving that does not exist | Fix message to be honest; remove false "automatically saved" claim |
| `help/reapply-patches.md` | References `/mow:update` creating backups automatically | Fix to remove false automation claim |

### Files That Must NOT Change

| File | Why |
|------|-----|
| `bin/install.sh` | Already works correctly (verified Phase 4). Update workflow should call it, not modify it. |
| `bin/mow-tools.cjs` | No update-related logic lives here. |
| `mowism/workflows/health.md` | Health check is independent of update. |

## Open Questions

1. **What is the Mowism repository URL?**
   - What we know: The repo lives at `/home/max/git/mowism` locally. No git remote is configured. No public GitHub URL exists yet.
   - What's unclear: Will there be a GitHub URL before this phase is executed? If not, the update workflow cannot fetch remote updates.
   - Recommendation: The update workflow should support a configurable repo URL. For now, use a placeholder (e.g., read from `~/.claude/mowism/.mowism-repo-url` or a constant in the workflow). The workflow should give a clear error when no URL is available rather than failing silently. When the repo goes public, updating the URL is a one-line change.

2. **Should the update workflow support updating from a local repo path?**
   - What we know: During development, the repo is at `/home/max/git/mowism`. A developer might want to update from their local clone rather than from GitHub.
   - What's unclear: Is this a real use case or only for development?
   - Recommendation: Support both a remote URL and a local path as the update source. The workflow can check if the source is a local directory (exists on disk) or a URL (starts with http/git). This is low-cost to implement and useful for development.

3. **Should we implement basic patch saving in the update workflow?**
   - What we know: The reapply-patches command assumes patches are saved during update. The audit flags this as an unimplemented mechanism.
   - What's unclear: How complex would a basic implementation be?
   - Recommendation: Do NOT implement patch saving in this phase. The success criteria specifically say "reapply-patches handles missing patches gracefully (no references to unimplemented mechanisms)." The fix is to make reapply-patches honest about what it does, not to build the missing feature. Patch saving can be a future enhancement.

## Sources

### Primary (HIGH confidence)
- `mowism/workflows/update.md` -- current workflow, read directly from repo
- `commands/mow/update.md` -- current command file, read directly
- `commands/mow/reapply-patches.md` -- current command file, read directly
- `help/update.md` and `help/reapply-patches.md` -- current help files, read directly
- `bin/install.sh` -- current install script, read directly
- `.planning/v1.0-MILESTONE-AUDIT.md` -- audit documenting INT-01, FLOW-01 gaps
- `~/.claude/mowism/` -- actual installed directory, verified no .git present
- `.planning/STATE.md` -- decision [01-04] documenting npm-to-git switch

### Secondary (MEDIUM confidence)
- `.planning/phases/04-distribution-portability/04-RESEARCH.md` -- Phase 4 research confirming install.sh works correctly with portable paths
- `.planning/phases/04-distribution-portability/04-VERIFICATION.md` -- Phase 4 verification confirming install.sh produces working installation

### Tertiary (LOW confidence)
- None. All findings verified with primary sources (direct file inspection).

## Metadata

**Confidence breakdown:**
- Update workflow fix: HIGH -- the broken flow is documented in the audit with specific evidence; the fix (add INSTALL_SH branch) is straightforward
- Stale reference cleanup: HIGH -- all stale references identified by direct grep across all update-related files
- Reapply-patches fix: HIGH -- the false promise is documented in the audit; the fix is text editing
- Repo URL handling: MEDIUM -- the "no remote configured" situation adds a real question about how the update flow should discover the repo URL

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain; changes are to internal workflow files with no external dependencies)
