<purpose>
Check for MOW updates by pulling the latest from the Mowism git repository. Display changes and confirm update.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="check_installation">
Detect the Mowism installation:

```bash
# Check if the Mowism repo directory exists
if [ -d /home/max/.claude/mowism/.git ]; then
  echo "GIT_REPO"
  cd /home/max/.claude/mowism && git rev-parse --short HEAD
elif [ -f /home/max/.claude/mowism/VERSION ]; then
  echo "INSTALLED"
  cat /home/max/.claude/mowism/VERSION
else
  echo "NOT_FOUND"
fi
```

Parse output:
- If "GIT_REPO": Mowism is installed from git, proceed with git pull update
- If "INSTALLED": Mowism is installed but not from git, advise manual setup
- If "NOT_FOUND": No installation detected

**If NOT_FOUND:**
```
## MOW Update

**Installation not found** at `/home/max/.claude/mowism/`

To install Mowism:
```bash
git clone <mowism-repo-url> /home/max/.claude/mowism
```

Exit.

**If INSTALLED but not a git repo:**
```
## MOW Update

**Installed version:** (from VERSION file)

Your installation is not a git checkout. To enable updates:
1. Back up your current installation
2. Clone the Mowism repository to `/home/max/.claude/mowism/`
3. Your configuration in `.planning/` is separate and will be preserved
```

Exit.
</step>

<step name="check_for_updates">
If git repo detected, check for remote changes:

```bash
cd /home/max/.claude/mowism
git fetch origin 2>/dev/null
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "unknown")
```

**If fetch fails:**
```
Couldn't check for updates (offline or remote unavailable).

To update manually: `cd ~/.claude/mowism && git pull`
```

Exit.

**If LOCAL == REMOTE:**
```
## MOW Update

**Current commit:** (short hash)
**Remote:** Up to date

You're already on the latest version.
```

Exit.
</step>

<step name="show_changes_and_confirm">
**If updates available**, show what's new BEFORE updating:

```bash
cd /home/max/.claude/mowism
git log --oneline HEAD..@{u}
```

Display preview:

```
## MOW Update Available

**Current:** (commit hash)
**Latest:** (remote hash)

### New Commits
(git log output)

This will update your Mowism installation in place.
Your project configuration in `.planning/` is separate and will be preserved.
```

Use AskUserQuestion:
- Question: "Proceed with update?"
- Options:
  - "Yes, update now"
  - "No, cancel"

**If user cancels:** Exit.
</step>

<step name="run_update">
Pull the latest changes:

```bash
cd /home/max/.claude/mowism && git pull
```

Capture output. If pull fails (merge conflict, etc.), show error and advise manual resolution.
</step>

<step name="display_result">
Format completion message:

```
## MOW Updated

Successfully pulled latest changes.

Restart Claude Code to pick up any new commands or workflow changes.
```
</step>

</process>

<note>
Full install/update tooling (npm package, installer script) is planned for Phase 3 (DIST-01).
For now, Mowism is updated via git pull on the local repository clone.
</note>

<success_criteria>
- [ ] Installation location detected correctly
- [ ] Remote changes checked via git fetch
- [ ] Update skipped if already current
- [ ] Commit log shown BEFORE update
- [ ] User confirmation obtained
- [ ] Update executed via git pull
- [ ] Restart reminder shown
</success_criteria>
