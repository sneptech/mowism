# Phase 14: Native Worktree Adoption - Research

**Researched:** 2026-02-24
**Domain:** Claude Code native worktree hooks, git worktree management, multi-agent coordination layer adaptation
**Confidence:** HIGH

## Summary

Phase 14 replaces Mowism's custom `cmdWorktreeCreate` / `cmdWorktreeStash` / manifest / WorkTrunk code with Claude Code's native `WorktreeCreate` and `WorktreeRemove` hooks (v2.1.50), while preserving the coordination layer (claim, release, merge, status tracking, stale cleanup). The WorktreeCreate hook **replaces default git behavior entirely** -- when defined, Claude Code delegates worktree creation to the hook script, which must print the absolute path on stdout. This means the hook can create worktrees at any path (including `.worktrees/pNN`), perform `.planning/` copy, init STATUS.md, and update the manifest -- all within a single hook invocation.

The path convention decision per CONTEXT.md is to migrate from `.worktrees/pNN` to `.claude/worktrees/phase-NN` (native path). The WorktreeCreate hook creates at the native path. All `.worktrees/` references in mow-tools.cjs, agent files, and workflows must be updated. The migration script detects old `.worktrees/` directories, renames to `.worktrees.bak`, and does NOT delete them. A `.worktrees.bak` cleanup offer is tied into `/mow:complete-milestone`.

**Primary recommendation:** Implement as 4-5 plans: (1) WorktreeCreate hook + slimmed `cmdWorktreeCreateNative`, (2) WorktreeRemove hook + cleanup, (3) path reference rewrite across all files, (4) coordination layer adaptation, (5) migration script + WorkTrunk removal + install.sh update.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Auto-detect on first `/mow:` command run: if `.worktrees/` exists with entries, offer to migrate
- No version number check — presence of `.worktrees/` directory is the trigger
- On migration: rename `.worktrees/` to `.worktrees.bak` (not deleted)
- Offer cleanup/deletion of `.worktrees.bak` when a milestone completes (tie into `/mow:complete-milestone`)

### Claude's Discretion
- Hook bootstrapping: what WorktreeCreate sets up (`.planning/` symlink/copy, STATUS.md, config propagation)
- Cleanup scope: what WorktreeRemove tears down (manifest, claims, dashboard, handling of uncommitted work)
- Code removal boundaries: which custom worktree code gets deleted vs which coordination code stays
- In-progress work handling during migration (warn-and-skip vs migrate-everything — pick safest approach)
- Path reference rewriting scope during migration (full rewrite vs directories-only)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WKT-01 | Agent spawns use `--worktree` flag or `isolation: worktree` frontmatter instead of custom cmdWorktreeCreate | WorktreeCreate hook replaces `git worktree add` call inside `cmdWorktreeCreate`. Team lead invokes `claude --worktree phase-NN` which triggers the hook. Hook creates worktree with Mowism coordination (`.planning/` copy, STATUS.md init, manifest update). |
| WKT-02 | WorktreeCreate hook copies `.planning/` directory and initializes STATUS.md in new worktrees | Hook script reads JSON from stdin (`name` field), runs `git worktree add`, copies `.planning/`, runs `mow-tools.cjs status init`, updates manifest, and prints absolute path to stdout. |
| WKT-03 | WorktreeRemove hook removes manifest entry, releases phase claim, and clears dashboard state | Hook script reads JSON from stdin (`worktree_path` field), derives phase from path or manifest lookup, calls `mow-tools.cjs worktree release`, removes manifest entry, clears dashboard event for this phase. Cannot block removal -- informational only. |
| WKT-04 | All worktree path references updated from `.worktrees/pNN` to `.claude/worktrees/phase-NN` | Grep found 13 `.worktrees/` references in mow-tools.cjs, 6 in workflow files, 3 in agent files, 2 in commands. Total: ~24 active code references (excludes planning docs/milestones). Full list enumerated in Architecture Patterns section. |
| WKT-05 | Coordination layer (claim, merge, manifest, status) works with native worktree paths | `getWorktreePath()` already uses `git rev-parse --show-toplevel` (path-agnostic). `cmdWorktreeClaim`/`Release`/`UpdatePlan`/`Clean` use `getWorktreePath()` output in STATE.md table -- no hardcoded paths. `cmdWorktreeMerge` derives branch from `phase-{NN}` convention, not path. `readManifest`/`writeManifest` use `getRepoRoot()` + `.worktrees/manifest.json` -- this path MUST be updated to `.claude/worktrees/manifest.json`. |
| WKT-06 | Migration script detects existing `.worktrees/` entries and offers migration to native paths | New `cmdWorktreeMigrate` function: detects `.worktrees/` directory, reads manifest, warns about in-progress worktrees (warn-and-skip safest approach), renames `.worktrees/` to `.worktrees.bak`, re-creates active worktrees at `.claude/worktrees/phase-NN` via the new hook. Auto-detected on first `/mow:` command. |
| WKT-07 | Redundant worktree creation code removed from mow-tools.cjs (net LOC reduction) | Remove: `cmdWorktreeCreate` (115 lines), `cmdWorktreeStash` (40 lines), `readManifest`/`writeManifest` (retargeted to new path -- not removed, adapted), `getDefaultBranch` (12 lines), `WT_CONFIG_CONTENT`/`WT_PLANNING_COPY_HOOK` (40 lines), `ensureWtConfig` (20 lines), `checkWorkTrunk`/`requireWorkTrunk` (25 lines), 13x `requireWorkTrunk()` + `ensureWtConfig()` call sites in init functions. Add: `cmdWorktreeCreateNative` (~40 lines, slimmed version for hook), `cmdWorktreeMigrate` (~60 lines). Net: approximately -100 LOC. |
</phase_requirements>

## Standard Stack

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Claude Code `WorktreeCreate` hook | v2.1.50+ | Replaces default git worktree creation with custom logic | Official extension point for worktree lifecycle. Replaces default behavior entirely when defined. Only `type: "command"` hooks supported. |
| Claude Code `WorktreeRemove` hook | v2.1.50+ | Runs cleanup when worktree is removed | Official teardown hook. Cannot block removal (informational). Only `type: "command"` hooks supported. |
| Claude Code `--worktree <name>` flag | v2.1.49+ | Creates isolated worktree session | Native flag for worktree isolation. Hook receives `name` on stdin as JSON. |
| `git worktree add/remove` | git 2.20+ | Underlying worktree creation mechanism | Standard git operation, called from within hook script. |
| `jq` | Any | JSON parsing in hook shell scripts | Standard on developer machines. Fallback to Node.js if missing. |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `mow-tools.cjs worktree create-native` | New | Slim worktree creation with coordination | Called FROM the WorktreeCreate hook script. Does: git worktree add, `.planning/` copy, STATUS.md init, manifest update. Returns absolute path. |
| `mow-tools.cjs worktree migrate` | New | Migrate `.worktrees/` to `.claude/worktrees/` | Called on first `/mow:` command when `.worktrees/` detected. Auto-detection in init commands. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WorktreeCreate hook for creation | `isolation: worktree` frontmatter on agents | Frontmatter creates worktrees at Claude Code's chosen path with auto-cleanup. Phase worktrees need to persist after subagent completion. Hooks give Mowism full control over path, setup, and lifecycle. Hooks are correct. |
| Keeping `.worktrees/pNN` path via hook | Migrating to `.claude/worktrees/phase-NN` | Research initially suggested keeping `.worktrees/pNN` to avoid churn. CONTEXT.md from user discussion confirms migration to native paths (WKT-04). Migration is the right call -- aligns with Claude Code conventions and removes path confusion. |
| `jq` for JSON parsing in hooks | Node.js one-liner fallback | `jq` is simpler and faster for shell scripts. Include Node.js fallback for machines without `jq`. |

**Installation:**
No new npm dependencies. Hook scripts are bash (`.claude/hooks/*.sh`). `jq` is a soft dependency with Node.js fallback.

## Architecture Patterns

### Recommended Structure Change

```
Before (v1.1):
  .worktrees/               # Custom worktree directory
  ├── manifest.json          # Phase-to-worktree tracking
  ├── p09/                   # Phase 9 worktree
  │   ├── .planning/         # Copied from main
  │   └── ...
  └── p10/                   # Phase 10 worktree
  .config/wt.toml            # WorkTrunk config (auto-created)

After (v1.2):
  .claude/
  ├── settings.json           # Hook registration (NEW)
  ├── hooks/                  # Hook scripts (NEW)
  │   ├── mow-worktree-create.sh
  │   └── mow-worktree-remove.sh
  └── worktrees/              # Native worktree location
      ├── manifest.json       # Moved from .worktrees/
      ├── phase-09/           # Phase 9 worktree
      │   ├── .planning/      # Copied by hook
      │   └── ...
      └── phase-10/           # Phase 10 worktree
```

### Pattern 1: WorktreeCreate Hook as Bridge

**What:** The WorktreeCreate hook replaces Claude Code's default `git worktree add` behavior. When Claude Code needs a worktree (via `--worktree` or `isolation: worktree`), it calls the hook instead of running git directly. The hook runs Mowism's coordination logic and prints the worktree path to stdout.

**When to use:** Always -- the hook is registered in `.claude/settings.json` at install time.

**Hook input (from stdin):**
```json
{
  "session_id": "abc123",
  "cwd": "/home/user/project",
  "hook_event_name": "WorktreeCreate",
  "name": "phase-09"
}
```

**Hook script (`.claude/hooks/mow-worktree-create.sh`):**
```bash
#!/bin/bash
set -euo pipefail

# Read JSON from stdin
INPUT=$(cat)

# Parse fields -- prefer jq, fall back to node
if command -v jq &>/dev/null; then
  NAME=$(echo "$INPUT" | jq -r '.name')
  CWD=$(echo "$INPUT" | jq -r '.cwd')
else
  read -r NAME CWD <<< $(echo "$INPUT" | node -e "
    process.stdin.on('data', d => {
      const j = JSON.parse(d);
      console.log(j.name + ' ' + j.cwd);
    });
  ")
fi

# Delegate to mow-tools for full coordination
# create-native: git worktree add, .planning/ copy, STATUS.md init, manifest update
# Returns JSON with { path: "/absolute/path/..." }
RESULT=$(node "$CWD/bin/mow-tools.cjs" worktree create-native --name "$NAME" --raw 2>/dev/null)

# Extract absolute path and print to stdout (Claude Code reads this)
if command -v jq &>/dev/null; then
  echo "$RESULT" | jq -r '.path'
else
  echo "$RESULT" | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).path));"
fi
```

**Key behavior verified from official docs:**
- Hook MUST print absolute path to stdout
- Non-zero exit code fails worktree creation
- No matcher support -- fires on EVERY worktree creation
- Only `type: "command"` hooks supported (no prompt/agent)
- Replaces default git behavior entirely

**Source:** [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- WorktreeCreate section

### Pattern 2: WorktreeRemove Hook for Cleanup

**What:** The WorktreeRemove hook fires when a worktree is removed (session exit or subagent completion). It performs Mowism coordination cleanup: manifest entry removal, phase claim release, dashboard state clearing.

**When to use:** Always -- paired with WorktreeCreate.

**Hook input (from stdin):**
```json
{
  "session_id": "abc123",
  "cwd": "/home/user/project",
  "hook_event_name": "WorktreeRemove",
  "worktree_path": "/home/user/project/.claude/worktrees/phase-09"
}
```

**Hook script (`.claude/hooks/mow-worktree-remove.sh`):**
```bash
#!/bin/bash
INPUT=$(cat)

if command -v jq &>/dev/null; then
  WT_PATH=$(echo "$INPUT" | jq -r '.worktree_path')
  CWD=$(echo "$INPUT" | jq -r '.cwd')
else
  read -r WT_PATH CWD <<< $(echo "$INPUT" | node -e "
    process.stdin.on('data', d => {
      const j = JSON.parse(d);
      console.log(j.worktree_path + ' ' + j.cwd);
    });
  ")
fi

# Derive phase from worktree name (phase-09 -> 09)
PHASE=$(basename "$WT_PATH" | sed 's/^phase-//')

# Cleanup coordination state (best-effort, cannot block removal)
node "$CWD/bin/mow-tools.cjs" worktree release "$PHASE" 2>/dev/null || true
node "$CWD/bin/mow-tools.cjs" worktree remove-manifest "$PHASE" 2>/dev/null || true
node "$CWD/bin/mow-tools.cjs" dashboard event add --type "worktree_removed" --phase "$PHASE" --detail "Worktree removed" 2>/dev/null || true

exit 0  # Always succeed -- removal cannot be blocked
```

**Key behavior verified from official docs:**
- Cannot block removal (informational only)
- Receives `worktree_path` in input JSON
- Hook failures logged in debug mode only
- Only `type: "command"` hooks supported

**Recommendation for uncommitted work handling:** When `WorktreeRemove` fires, check if the worktree has uncommitted changes (`git -C "$WT_PATH" diff --quiet`). If yes, log a warning to stderr: `"MOW: WARNING: Worktree phase-{NN} removed with uncommitted changes. Changes are lost."`. The hook cannot prevent removal, but the warning provides visibility. This is the safest approach per the Claude's Discretion scope.

**Source:** [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- WorktreeRemove section

### Pattern 3: `cmdWorktreeCreateNative` (Slimmed Internal Function)

**What:** A new function replacing `cmdWorktreeCreate` that is called FROM the WorktreeCreate hook. It does everything except the `git worktree add` (which the hook takes responsibility for triggering) -- OR it handles the full creation including `git worktree add` when called from the hook context where it knows the exact path and naming convention.

**Implementation approach:** The hook script calls `mow-tools.cjs worktree create-native --name <name>`. This function:

1. Derives phase number from name (`phase-09` -> `09`)
2. Determines base branch via `getDefaultBranch()`
3. Runs `git worktree add .claude/worktrees/phase-{NN} -b phase-{NN} {base}`
4. Copies `.planning/` from main worktree
5. Initializes STATUS.md via `status init {phase}`
6. Updates manifest at `.claude/worktrees/manifest.json`
7. Returns `{ path: "/absolute/path/to/.claude/worktrees/phase-NN", branch: "phase-NN", phase: "NN" }`

### Pattern 4: Path-Agnostic Coordination

**What:** The coordination layer (claim, release, merge, clean, update-plan) already uses `getWorktreePath()` which calls `git rev-parse --show-toplevel`. This returns the actual worktree root regardless of where it lives on disk. The Worktree Assignments table in STATE.md stores absolute paths from `getWorktreePath()`, not hardcoded `.worktrees/pNN` patterns.

**What stays path-agnostic (no changes needed):**
- `cmdWorktreeClaim` -- uses `getWorktreePath(cwd)` for the worktree column
- `cmdWorktreeRelease` -- filters by `r.worktree === wtPath` from `getWorktreePath()`
- `cmdWorktreeUpdatePlan` -- same pattern
- `parseWorktreeTable` / `writeWorktreeTable` -- generic table CRUD

**What needs path updates:**
- `readManifest` / `writeManifest` -- hardcodes `.worktrees/manifest.json` path
- `cmdWorktreeClean` / `silentWorktreeClean` -- calls `getActiveWorktrees()` which uses `git worktree list`; this is already path-agnostic. BUT it compares against `r.worktree` values in STATE.md which were written as `.worktrees/pNN` paths. Post-migration, STATE.md will have `.claude/worktrees/phase-NN` paths. No code change needed after path references are updated.
- `cmdWorktreeMerge` -- derives branch as `phase-{padded}` which stays the same. No path dependency.

### Anti-Patterns to Avoid

- **Putting coordination logic in hooks.** Hooks are fire-and-forget shell scripts with limited error handling. Keep manifest tracking, claim prevention, and merge orchestration in mow-tools.cjs, invoked explicitly by agents. Hooks handle only: worktree creation (with Mowism setup) and cleanup notification.

- **Using `isolation: worktree` on phase workers.** Phase workers are Agent Teams teammates that need long-lived worktrees surviving the subagent lifecycle. `isolation: worktree` auto-cleans on completion. The team lead creates worktrees via `claude --worktree phase-NN` (triggers WorktreeCreate hook) BEFORE spawning the teammate.

- **Hardcoding `.claude/worktrees/phase-NN` as the new path.** Use the pattern from `getWorktreePath()` (i.e., `git rev-parse --show-toplevel`) wherever possible. For manifest path specifically, compute from repo root + `.claude/worktrees/manifest.json`.

- **Migrating in-progress worktrees automatically.** If `.worktrees/pNN` has active git changes (uncommitted work, unfinished phase), automatically moving it risks data loss. The safest approach is to warn the user about in-progress worktrees and skip those entries during migration. The user can manually finish work, then re-run migration.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Worktree creation | Custom `git worktree add` in JS with shell escaping | Claude Code `WorktreeCreate` hook | Hook is the official extension point, receives clean JSON input, controls path output |
| Worktree removal detection | Polling `git worktree list` for stale entries | Claude Code `WorktreeRemove` hook | Hook fires automatically on removal events, no polling overhead |
| Path resolution for current worktree | Parsing `.worktrees/` directory listings | `git rev-parse --show-toplevel` | Already used by `getWorktreePath()`, works regardless of worktree location |
| JSON parsing in shell hooks | Manual `grep`/`sed` parsing | `jq` (with Node.js fallback) | `jq` is standard, reliable, and handles edge cases in JSON values |

**Key insight:** The hook system is specifically designed for our use case. Anthropic created WorktreeCreate/WorktreeRemove hooks so tools like Mowism can inject custom coordination into native worktree lifecycle. Don't fight it.

## Common Pitfalls

### Pitfall 1: Hook Fires for ALL Worktree Creations (Not Just Phase Workers)

**What goes wrong:** The WorktreeCreate hook fires on EVERY `--worktree` or `isolation: worktree` invocation. If any other subagent or user session uses `--worktree`, the hook runs Mowism's full worktree creation logic (manifest update, `.planning/` copy) on a non-phase worktree. The manifest fills with spurious entries.

**Why it happens:** WorktreeCreate does not support matchers (confirmed in official docs: "WorktreeCreate and WorktreeRemove don't support matchers and always fire on every occurrence").

**How to avoid:** Filter by naming convention inside the hook script. Check if `name` matches the pattern `phase-\d+`. If not, fall back to default git behavior:
```bash
if ! echo "$NAME" | grep -qE '^phase-[0-9]+$'; then
  # Not a Mowism phase worktree -- use default git behavior
  git worktree add ".claude/worktrees/$NAME" -b "$NAME" 2>/dev/null
  echo "$(pwd)/.claude/worktrees/$NAME"
  exit 0
fi
# ... Mowism coordination logic for phase worktrees
```

**Warning signs:** Manifest JSON contains entries like `bold-oak-a3f2` or `feature-auth`.

### Pitfall 2: Hook stdout Contamination

**What goes wrong:** The WorktreeCreate hook must print ONLY the absolute path to stdout. If the hook script has debug output, echo statements, or Node.js warnings on stdout, Claude Code reads the wrong string as the worktree path and the session fails.

**Why it happens:** Bash scripts often have `echo` debugging. Node.js can print warnings to stdout. The `mow-tools.cjs` output function writes to stdout by default.

**How to avoid:** Redirect ALL diagnostic output to stderr (`>&2`). Use `--raw` flag with mow-tools.cjs (returns JSON, not formatted). Parse the JSON result to extract only the path. Final `echo` on stdout must be exactly the absolute path.

**Warning signs:** Claude Code reports "worktree creation failed" or creates a session in the wrong directory.

### Pitfall 3: Migration Destroys In-Progress Work

**What goes wrong:** The migration script renames `.worktrees/` to `.worktrees.bak` while a phase worker is actively using `.worktrees/p09`. The worker's working directory no longer exists. Git operations fail. Uncommitted changes in the worktree are inaccessible (they're in `.worktrees.bak/p09/` but the worker doesn't know that).

**Why it happens:** Migration is triggered "on first `/mow:` command run" which could be ANY command, including one run by an active worker.

**How to avoid:**
1. Before migration, check `git worktree list` for active worktrees in `.worktrees/`
2. If any are active (have a branch checked out), warn the user and DO NOT migrate:
   ```
   WARNING: Active worktrees found in .worktrees/:
     .worktrees/p09 (branch: phase-09) -- IN USE

   Cannot migrate while worktrees are active. Please:
   1. Complete or stash work in active worktrees
   2. Run `git worktree remove .worktrees/pNN` for each
   3. Then run any /mow: command to trigger migration
   ```
3. Only proceed if no active worktrees exist in `.worktrees/`

**Warning signs:** Worker reports "fatal: not a git repository" after migration runs.

### Pitfall 4: `ensureWtConfig` / `requireWorkTrunk` Calls Still Present

**What goes wrong:** After removing WorkTrunk dependency, the 13 `requireWorkTrunk()` call sites in init functions still check for `wt` binary. On machines without WorkTrunk, every `/mow:` command errors out with "WorkTrunk (wt) is required but not found."

**Why it happens:** The removal of WorkTrunk code must be thorough -- not just the functions but all 13 call sites across `cmdInitExecutePhase`, `cmdInitPlanPhase`, `cmdInitNewProject`, `cmdInitNewMilestone`, `cmdInitResume`, `cmdInitVerifyWork`, `cmdInitPhaseOp`, `cmdInitTodos`, `cmdInitMilestoneOp`, `cmdInitMapCodebase`, `cmdInitProgress`, and two more.

**How to avoid:** Grep for ALL `requireWorkTrunk` and `ensureWtConfig` call sites. Remove every instance. Run the test suite to verify no function references remain.

**Warning signs:** "WorkTrunk (wt) is required but not found" error on any `/mow:` command after v1.2 upgrade.

### Pitfall 5: Manifest Path Mismatch After Partial Migration

**What goes wrong:** The manifest file moves from `.worktrees/manifest.json` to `.claude/worktrees/manifest.json`. If the code is updated but migration hasn't run, `readManifest()` looks in `.claude/worktrees/` and finds nothing. If migration ran but code wasn't updated, `readManifest()` looks in `.worktrees/` (now `.worktrees.bak/`) and reads stale data.

**Why it happens:** The manifest path change and the migration are separate operations that must be coordinated.

**How to avoid:**
1. `readManifest()` should check BOTH locations: try `.claude/worktrees/manifest.json` first, fall back to `.worktrees/manifest.json`
2. If found at old location, treat as trigger for migration offer
3. `writeManifest()` always writes to `.claude/worktrees/manifest.json`
4. Migration includes moving manifest.json from old to new location

## Code Examples

### WorktreeCreate Hook Registration in `.claude/settings.json`

```json
{
  "hooks": {
    "WorktreeCreate": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/mow-worktree-create.sh"
          }
        ]
      }
    ],
    "WorktreeRemove": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/mow-worktree-remove.sh"
          }
        ]
      }
    ]
  }
}
```

**Source:** [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)

### `cmdWorktreeCreateNative` (New Slimmed Function)

```javascript
function cmdWorktreeCreateNative(cwd, options, raw) {
  const name = options && options.name;
  if (!name) { error('--name required for worktree create-native'); }

  const root = getRepoRoot(cwd);

  // Derive phase from name (phase-09 -> 09)
  const phaseMatch = name.match(/^phase-(\d+)$/);
  if (!phaseMatch) {
    // Non-phase worktree: just create with git defaults
    const absPath = path.join(root, '.claude', 'worktrees', name);
    const base = getDefaultBranch(root);
    try {
      execSync(`git worktree add "${absPath}" -b "${name}" "${base}"`, {
        cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      error(`Failed to create worktree: ${err.stderr || err.message}`);
    }
    output({ path: absPath, branch: name, phase: null }, raw);
    return;
  }

  const padded = phaseMatch[1];
  const branch = `phase-${padded}`;
  const base = getDefaultBranch(root);
  const absPath = path.join(root, '.claude', 'worktrees', name);

  // Check manifest for existing entry
  const manifest = readManifest(root);
  const wtKey = name;  // e.g. "phase-09"

  if (manifest.worktrees[wtKey] && fs.existsSync(absPath)) {
    // Reuse existing worktree
    process.stderr.write(`MOW: Reusing existing worktree for phase ${padded}\n`);
    manifest.worktrees[wtKey].status = 'active';
    writeManifest(root, manifest);
    output({ path: absPath, branch, phase: padded, reused: true }, raw);
    return;
  }

  // Create new worktree
  const wtDir = path.join(root, '.claude', 'worktrees');
  if (!fs.existsSync(wtDir)) {
    fs.mkdirSync(wtDir, { recursive: true });
  }

  try {
    execSync(`git worktree add "${absPath}" -b "${branch}" "${base}"`, {
      cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    error(`Failed to create worktree: ${err.stderr || err.message}`);
  }

  // Copy .planning/
  const planningDir = path.join(root, '.planning');
  if (fs.existsSync(planningDir)) {
    try {
      execSync(`cp -r "${planningDir}" "${path.join(absPath, '.planning')}"`, {
        encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      process.stderr.write('MOW: Warning: could not copy .planning/ to worktree\n');
    }
  }

  // Initialize STATUS.md
  try {
    execSync(`node "${path.join(root, 'bin', 'mow-tools.cjs')}" status init ${padded}`, {
      cwd: absPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    process.stderr.write('MOW: Warning: could not initialize STATUS.md in worktree\n');
  }

  // Update manifest
  manifest.worktrees[wtKey] = {
    path: absPath,
    branch,
    phase: padded,
    created: new Date().toISOString(),
    status: 'active',
    stash_ref: null,
    last_commit: null,
    merged: false,
  };
  writeManifest(root, manifest);

  output({ path: absPath, branch, phase: padded, reused: false }, raw);
}
```

### Migration Detection (Added to Init Commands)

```javascript
function checkMigrationNeeded(cwd) {
  const root = getRepoRoot(cwd);
  const oldDir = path.join(root, '.worktrees');
  const newDir = path.join(root, '.claude', 'worktrees');

  if (fs.existsSync(oldDir) && !fs.existsSync(path.join(oldDir + '.bak'))) {
    // Check if any entries exist (not just empty directory)
    try {
      const entries = fs.readdirSync(oldDir).filter(e => e !== 'manifest.json');
      if (entries.length > 0 || fs.existsSync(path.join(oldDir, 'manifest.json'))) {
        return { needed: true, old_path: oldDir, entries: entries.length };
      }
    } catch {}
  }
  return { needed: false };
}
```

## Enumerated Path References to Update

### mow-tools.cjs (Active Code)

| Line | Current Reference | Change To |
|------|-------------------|-----------|
| 2891 | `options.worktree \|\| '.worktrees/p' + padded` | `options.worktree \|\| '.claude/worktrees/phase-' + padded` |
| 6820 | `path.join(root, '.worktrees', 'manifest.json')` | `path.join(root, '.claude', 'worktrees', 'manifest.json')` |
| 6831 | `path.join(root, '.worktrees')` in `writeManifest` | `path.join(root, '.claude', 'worktrees')` |

### Workflow Files

| File | Line | Current | Change To |
|------|------|---------|-----------|
| `execute-phase.md` | 97 | `the current worktree being in .worktrees/` | `.claude/worktrees/` |
| `execute-phase.md` | 108 | `(.worktrees/pNN)` | `(.claude/worktrees/phase-NN)` |
| `execute-phase.md` | 464 | `(.worktrees/pNN)` | `(.claude/worktrees/phase-NN)` |
| `execute-phase.md` | 501 | `(.worktrees/pNN)` | `(.claude/worktrees/phase-NN)` |
| `close-shop.md` | 51 | `cat .worktrees/p{NN}/...` | `cat .claude/worktrees/phase-{NN}/...` |
| `close-shop.md` | 117 | `Worktrees preserved at .worktrees/` | `Worktrees preserved at .claude/worktrees/` |

### Agent Files

| File | Line | Current | Change To |
|------|------|---------|-----------|
| `mow-team-lead.md` | 102 | `worktree create {phase}` | `claude --worktree phase-{NN}` (or hook-triggered equivalent) |
| `mow-team-lead.md` | 117 | `.worktrees/p{NN}` | `.claude/worktrees/phase-{NN}` |

### Command Files

| File | Reference | Change |
|------|-----------|--------|
| `commands/mow/worktree-status.md` | `wt list --format=json` | Remove WorkTrunk reference, use `git worktree list` or manifest |

### Install Script

| File | Change |
|------|--------|
| `bin/install.sh` | Remove WorkTrunk dependency check (lines 77-84). Update status output. Add hook script installation (copy `.claude/hooks/*.sh`). |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom `cmdWorktreeCreate` with `git worktree add` | `WorktreeCreate` hook delegates to `cmdWorktreeCreateNative` | Claude Code v2.1.50 (Feb 2026) | Hook replaces default git behavior; Mowism controls path and setup |
| WorkTrunk (`wt`) external dependency | Eliminated | This phase | Removes install complexity and external dependency |
| `.worktrees/pNN` path convention | `.claude/worktrees/phase-NN` path convention | This phase | Aligns with Claude Code native path structure |
| `.worktrees/manifest.json` | `.claude/worktrees/manifest.json` | This phase | Co-located with worktrees |
| `.config/wt.toml` auto-created | Removed | This phase | No more WorkTrunk config |
| `requireWorkTrunk()` in 13 init functions | Removed | This phase | No more dependency gating |

**Deprecated/outdated:**
- WorkTrunk (`wt`): No longer required. All worktree management done through Claude Code hooks + `git worktree` directly.
- `.worktrees/` directory: Replaced by `.claude/worktrees/`. Migration renames to `.worktrees.bak`.
- `WT_CONFIG_CONTENT` / `WT_PLANNING_COPY_HOOK` constants: Replaced by `.claude/hooks/mow-worktree-create.sh`.

## Open Questions

1. **`.claude/settings.json` does not currently exist in the repo**
   - What we know: The project has `.claude/settings.local.json` (gitignored, with permissions). No `.claude/settings.json` (project-level, committable) exists.
   - What's unclear: Hook registration in `.claude/settings.json` would be committed to the repo, making it available to all users. But this might conflict with user-level settings.
   - Recommendation: Create `.claude/settings.json` with hook registration. This is the intended pattern per official docs ("Single project, Yes, can be committed to the repo"). Install script should also copy hook scripts to `$CLAUDE_DIR/mowism/hooks/` as a fallback, and the settings.json should reference them via `$CLAUDE_PROJECT_DIR`.

2. **Worktree naming for non-phase uses**
   - What we know: The WorktreeCreate hook fires for ALL worktree creations. The name filtering pattern (`phase-\d+`) handles phase worktrees.
   - What's unclear: What happens if a user runs `claude --worktree my-feature` in a Mowism project? The hook should create a plain worktree without Mowism coordination.
   - Recommendation: Implemented in Pitfall 1 prevention -- non-`phase-NN` names get default git behavior from the hook. Verified that this is the safest approach.

3. **Manifest persistence across worktree removal**
   - What we know: WorktreeRemove hook fires when worktree is removed. Hook performs cleanup (release claim, remove manifest entry). The hook cannot block removal.
   - What's unclear: If the manifest entry is removed but merge has not happened, is the merge still possible? (The branch still exists even if the worktree is removed.)
   - Recommendation: WorktreeRemove should check if the manifest entry has `merged: false`. If so, do NOT remove the manifest entry -- instead mark as `status: "removed_unmerged"`. The merge can still happen using the branch name. Only remove the entry after successful merge or user confirmation.

## Sources

### Primary (HIGH confidence)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- Full WorktreeCreate/WorktreeRemove hook specifications including input JSON schema, output requirements, exit code behavior, matcher support (none for these events), and `type: "command"` only constraint. Verified: hook replaces default git behavior, must print absolute path on stdout, non-zero exit fails creation.
- [Claude Code v2.1.50 Release Notes](https://github.com/anthropics/claude-code/releases/tag/v2.1.50) -- Confirmed WorktreeCreate/WorktreeRemove hook availability.
- [Claude Code v2.1.50 Changelog on X](https://x.com/ClaudeCodeLog/status/2025163354965266574) -- "Added WorktreeCreate and WorktreeRemove hook events."
- Local codebase analysis: `bin/mow-tools.cjs` lines 732-870 (WorkTrunk), 6799-7063 (worktree lifecycle), 7065-7380 (worktree state tracking), 7846-7884 (CLI dispatch).

### Secondary (MEDIUM confidence)
- [Mowism v1.2 Architecture Research](file://.planning/research/v1.2-ARCHITECTURE.md) -- Component integration map, files to remove/keep/modify.
- [Mowism v1.2 Stack Research](file://.planning/research/v1.2-STACK.md) -- WorktreeCreate hook spec details, integration design.
- [Mowism v1.2 Pitfalls Research](file://.planning/research/PITFALLS.md) -- Pitfalls 1-2 on worktree path mismatch and simplification overshoot.
- [Mowism v1.2 Features Research](file://.planning/research/v1.2-FEATURES.md) -- Feature categorization (table stakes, differentiators, anti-features).

### Tertiary (LOW confidence)
- None -- all findings verified against official docs or local codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- WorktreeCreate/WorktreeRemove hooks verified from official Claude Code docs (code.claude.com/docs/en/hooks) and v2.1.50 release notes
- Architecture: HIGH -- Based on direct codebase analysis. Every line reference verified. Path enumeration complete.
- Pitfalls: HIGH -- Grounded in official hook behavior (no matcher support, stdout-only output, cannot block removal) and codebase specifics (13 requireWorkTrunk call sites, hardcoded paths)
- Migration: MEDIUM -- Migration logic is new code; the warn-and-skip approach for in-progress work is the conservative choice but untested

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable -- Claude Code hook API unlikely to change within 30 days)
