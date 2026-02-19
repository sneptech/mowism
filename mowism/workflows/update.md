<purpose>
Check for MOW updates and install them. Supports two installation methods: git clone (direct pull) and install.sh (re-run installer from fresh source).
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="check_installation">
Detect the Mowism installation method:

```bash
if [ -d ~/.claude/mowism/.git ]; then
  INSTALL_METHOD="GIT_CLONE"
  cd ~/.claude/mowism && git rev-parse --short HEAD
elif [ -f ~/.claude/mowism/VERSION ]; then
  INSTALL_METHOD="INSTALL_SH"
  cat ~/.claude/mowism/VERSION
else
  INSTALL_METHOD="NOT_FOUND"
fi
```

Parse output:
- If `GIT_CLONE`: Mowism was installed by cloning the repo directly -- proceed with git pull update
- If `INSTALL_SH`: Mowism was installed via install.sh (flat file copy, no .git) -- proceed with install.sh re-run update
- If `NOT_FOUND`: No installation detected

**If NOT_FOUND:**
```
## MOW Update

**Installation not found** at `~/.claude/mowism/`

To install Mowism, see the project README for instructions.
```

Exit.
</step>

<step name="resolve_repo_source">
Determine where to get updates from:

```bash
# Check for configured update source
if [ -f ~/.claude/mowism/.update-source ]; then
  SOURCE=$(cat ~/.claude/mowism/.update-source | tr -d '[:space:]')
elif [ "$INSTALL_METHOD" = "GIT_CLONE" ]; then
  SOURCE=$(cd ~/.claude/mowism && git remote get-url origin 2>/dev/null)
fi
```

**If no source available**, show error and exit:
```
## MOW Update

**No update source configured.**

To configure, create ~/.claude/mowism/.update-source containing
the path or URL to the Mowism repository. For example:

    echo "https://github.com/youruser/mowism" > ~/.claude/mowism/.update-source

Or for a local repo:

    echo "/home/you/git/mowism" > ~/.claude/mowism/.update-source
```

Exit.

Determine source type:
- If `SOURCE` starts with `http`, `git@`, or `ssh://`: it is a **remote URL**
- If `SOURCE` is an existing directory on disk: it is a **local path**
- Otherwise: show error that the configured source is invalid, exit
</step>

<step name="check_for_updates">

**GIT_CLONE method:**

```bash
cd ~/.claude/mowism
git fetch origin 2>/dev/null
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "unknown")
```

If fetch fails:
```
Couldn't check for updates (offline or remote unavailable).

To update manually: `cd ~/.claude/mowism && git pull`
```
Exit.

If LOCAL == REMOTE:
```
## MOW Update

**Current commit:** (short hash)
**Remote:** Up to date

You're already on the latest version.
```
Exit.

**INSTALL_SH method:**

Read current version:
```bash
CURRENT_VERSION=$(cat ~/.claude/mowism/VERSION 2>/dev/null || echo "unknown")
```

Fetch latest source to a temp directory:
```bash
TMPDIR=$(mktemp -d)
```

If source is a remote URL:
```bash
git clone --depth 1 "$SOURCE" "$TMPDIR/mowism" 2>/dev/null
```
If clone fails, clean up temp dir and show error:
```
Couldn't fetch updates from $SOURCE (offline or URL unavailable).
```
Exit.

Read new version:
```bash
NEW_VERSION=$(cat "$TMPDIR/mowism/mowism/VERSION" 2>/dev/null || echo "unknown")
```

If source is a local path:
```bash
NEW_VERSION=$(cat "$SOURCE/mowism/VERSION" 2>/dev/null || echo "unknown")
```

If CURRENT_VERSION == NEW_VERSION:
```
## MOW Update

**Current version:** $CURRENT_VERSION
**Latest version:** $NEW_VERSION

You're already on the latest version.
```
Clean up temp dir (`rm -rf "$TMPDIR"`) and exit.

If versions differ, show:
```
## MOW Update Available

**Current version:** $CURRENT_VERSION
**Latest version:** $NEW_VERSION
```
</step>

<step name="show_changes_and_confirm">
Show what changed and ask for confirmation.

**GIT_CLONE method:**
```bash
cd ~/.claude/mowism
git log --oneline HEAD..@{u}
```

Display:
```
### New Commits
(git log output)

This will update your Mowism installation in place.
Your project configuration in `.planning/` is separate and will be preserved.
```

**INSTALL_SH method:**
Display:
```
### Version Change
$CURRENT_VERSION -> $NEW_VERSION

This will re-run the Mowism installer, updating all files in ~/.claude/.
Your project configuration in `.planning/` is separate and will be preserved.
```

Use AskUserQuestion:
- Question: "Proceed with update?"
- Options:
  - "Yes, update now"
  - "No, cancel"

**If user cancels:** Clean up temp dir if it exists (`rm -rf "$TMPDIR"`) and exit.
</step>

<step name="run_update">

**GIT_CLONE method:**
```bash
cd ~/.claude/mowism && git pull
```

Capture output. If pull fails (merge conflict, etc.), show error and advise manual resolution.

**INSTALL_SH method:**

If source is a remote URL:
```bash
bash "$TMPDIR/mowism/bin/install.sh"
rm -rf "$TMPDIR"
```

If source is a local path:
```bash
bash "$SOURCE/bin/install.sh"
```

If install.sh fails, show error. Clean up temp dir regardless:
```bash
rm -rf "$TMPDIR"
```
</step>

<step name="display_result">
Format completion message:

```
## MOW Updated

Successfully updated Mowism.

Restart Claude Code to pick up any new commands or workflow changes.
```
</step>

</process>

<success_criteria>
- [ ] Installation method detected correctly (GIT_CLONE, INSTALL_SH, or NOT_FOUND)
- [ ] Update source resolved from .update-source file or git remote
- [ ] Clear error shown when no update source is configured
- [ ] Remote changes checked (git fetch for GIT_CLONE, version compare for INSTALL_SH)
- [ ] Update skipped if already current
- [ ] Changes shown BEFORE update
- [ ] User confirmation obtained
- [ ] Update executed (git pull or re-run install.sh)
- [ ] Temp directory cleaned up on success and failure
- [ ] Restart reminder shown
</success_criteria>
