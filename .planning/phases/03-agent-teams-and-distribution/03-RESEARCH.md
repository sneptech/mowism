# Phase 3: Agent Teams and Distribution - Research

**Researched:** 2026-02-19
**Domain:** Claude Code Agent Teams API / Install script distribution / Help system (`???` suffix)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Lead + workers model: one lead orchestrator session spawns worker sessions per worktree
- Lead tracks overall state, workers execute plans
- Each worker session prints a status banner when the user switches to it (e.g., "Worker 2: Executing 03-02-PLAN.md (task 3/5)")
- Lead session has a /mow:team-status command showing all workers and their current tasks
- Prominent nudge at key moments: /mow:new-project and /mow:execute-phase
- Lighter tooltips between phases highlighting productivity gains of Agent Teams
- Persistent per-project dismiss: user can say "don't remind me" and it's saved to project config
- Always nudge once at the start of a new project or first-time brownfield setup, regardless of dismiss state
- Install mechanism: git clone + ./install.sh (two steps, no curl|bash)
- Install scope: global only (~/.claude/) -- Mowism is a personal tool
- Dependencies: check and report -- show what's missing (WorkTrunk, Node.js) with install instructions, continue anyway
- Post-install: summary of what was installed + what deps are missing + suggest "/mow:new-project" as first command
- Reference: GSD's post-install pattern (clean summary, point to first command, verify with /mow:help)
- ??? behavior: open dedicated help file in $EDITOR (not the raw workflow markdown)
- ??? content: user-friendly help files with usage examples and flag descriptions

### Claude's Discretion
- Lead orchestrator coordination strategy (monitor vs route) based on Agent Teams API
- Whether to offer team re-spawn during /mow:resume-work
- Nudge detail level and tone (context-dependent)
- Which commands get ??? help files
- $EDITOR fallback chain for ??? system

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEAM-01 | `/mow:new-project` offers option to spawn Agent Teams setup with lead orchestrator | Agent Teams API supports natural-language team creation; lead spawns teammates via `Task()` with `team_name` parameter; the new-project workflow has a clear integration point after config setup |
| TEAM-02 | `/mow:resume-work` offers option to re-spawn Agent Teams from persisted `.planning/` state | Agent Teams has NO session resumption for in-process teammates (`/resume` and `/rewind` do not restore them); re-spawn must create fresh team from STATE.md team status section |
| TEAM-03 | Lead orchestrator tracks overall project state while human hops between individual sessions | Agent Teams supports `Shift+Down` to cycle teammates (in-process mode) or split panes (tmux mode); lead receives automatic idle/completion notifications; shared task list provides coordination |
| TEAM-04 | Without Agent Teams env var, Mowism still works but gives prominent nudge with exact instructions | Env var check is `process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`; can add to `mow-tools.cjs` init functions alongside existing WorkTrunk check |
| TEAM-05 | STATE.md tracks agent team status (active teammates, assigned worktrees, current tasks) | Agent Teams stores team config at `~/.claude/teams/{team-name}/config.json` with members array; STATE.md can mirror this into a readable markdown table |
| DIST-01 | One-command install script that clones repo and registers all `/mow:*` skills in `~/.claude/` | GSD uses `bin/install.js` with path templating for file copy; Mowism needs a bash `install.sh` that copies commands, agents, workflows, templates, references, bin to `~/.claude/` |
| DIST-02 | `???` suffix on any `/mow:*` command opens workflow markdown in `$EDITOR` | Claude Code commands support `$ARGUMENTS` substitution; a `???` command can detect the suffix and open help files; `$EDITOR` with fallback chain is standard |
| DIST-03 | Install script checks for WorkTrunk and warns if not installed | Simple `command -v wt` check in bash; non-blocking warning with install instructions |
| DIST-04 | Install script checks for Agent Teams env var and informs user it's optional but recommended | Check `$CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in install.sh; informational message, not a blocker |
| DIST-05 | GitHub repo with README explaining what Mowism is, how to install, and how to use | Standard GitHub README pattern; reference GSD's README structure but with Mowism branding and Agent Teams emphasis |
</phase_requirements>

## Summary

Phase 3 has two distinct domains: Agent Teams integration (TEAM-*) and distribution packaging (DIST-*). These are largely independent workstreams that share only the install script's dependency checking as a connection point.

**Agent Teams** is Anthropic's experimental multi-agent coordination feature, released with Opus 4.6 in February 2026. It provides seven core primitives: team creation, task management (create/update/list), teammate spawning via the existing `Task()` tool with a `team_name` parameter, message passing (direct and broadcast), and cleanup. Teams store config at `~/.claude/teams/{team-name}/config.json` and tasks at `~/.claude/tasks/{team-name}/`. The lead session spawns teammates that run as independent Claude Code instances with their own context windows. Teammates load project context (CLAUDE.md, skills, MCP servers) but do NOT inherit the lead's conversation history. Communication is via automatic message delivery, idle notifications, and the shared task list. The critical limitation for Mowism is that **Agent Teams has no session resumption** -- `/resume` and `/rewind` do not restore in-process teammates. This means TEAM-02 (re-spawn from STATE.md) must create entirely fresh teams, not resume old ones.

The lead orchestrator model maps well to Mowism's existing architecture. The lead acts as a **router**: it reads `.planning/` state, creates tasks from PLAN.md files, spawns workers per worktree, and monitors progress. Workers are self-organizing -- they claim tasks from the shared list, execute plans, and report completion. The lead's primary job is coordination (task creation, dependency management, progress synthesis), not direct implementation. This aligns with the "orchestrator coordinates, not executes" principle already established in `execute-phase.md`.

**Distribution** follows the proven GSD pattern: an install script that copies files to `~/.claude/` and registers commands. GSD uses a Node.js `install.js` with path templating; Mowism's locked decision specifies a bash `install.sh` with `git clone` as the delivery mechanism. The install script needs to: (1) copy commands, agents, workflows, templates, references, and bin to the right `~/.claude/` subdirectories, (2) check dependencies (WorkTrunk required, Agent Teams recommended), and (3) display a clean post-install summary. The `???` help system is a separate concern: a mechanism to open user-friendly help files in `$EDITOR` when the user appends `???` to any command.

**Primary recommendation:** Build Agent Teams as a coordination layer on top of existing worktree-aware execution. The lead orchestrator is a natural-language prompt that instructs Claude to create a team and delegate PLAN.md files to workers. Workers execute plans using the existing `execute-plan.md` workflow. STATE.md gets a new "Agent Team Status" section that mirrors `~/.claude/teams/` config. The install script is a straightforward bash script that copies files and checks dependencies.

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Agent Teams API | Experimental (Feb 2026) | Multi-session coordination | Anthropic's native multi-agent system; no custom implementation needed |
| `Task()` with `team_name` | (built-in) | Spawn teammates | Standard mechanism for creating team members; already used for subagents |
| `Teammate()` operations | (built-in) | Team management | spawnTeam, write, broadcast, requestShutdown, approveShutdown, cleanup |
| `TaskCreate/Update/List` | (built-in) | Shared task coordination | Built-in task management with dependencies, status, ownership |
| `mow-tools.cjs` | (existing) | State management, config | Extend with Agent Teams env check and team status tracking |
| bash | 5.x | Install script | Portable, no Node.js required at install time |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `~/.claude/teams/{name}/config.json` | Team config persistence | Read for team status display, re-spawn decisions |
| `~/.claude/tasks/{name}/` | Task list persistence | Read for task status, dependency tracking |
| `process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Feature gate detection | Every init to determine nudge vs team-ready behavior |
| `$EDITOR` / `$VISUAL` | Help file viewer | `???` suffix opens help files; fallback chain needed |
| `settings.json` `env` block | Agent Teams enablement | Alternative to shell env var; documented in official docs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bash install.sh | Node.js install.js (like GSD) | GSD uses Node for cross-runtime support (OpenCode, Gemini); Mowism is Claude Code only, so bash is simpler and has no Node dependency at install time |
| In-process teammate mode | tmux split panes | tmux gives visual panes but has known platform issues (not supported in VS Code terminal, Ghostty, Windows Terminal); in-process is universal and Mowism already uses `Shift+Down` paradigm |
| Lead as monitor (passive) | Lead as router (active) | Router is better: lead creates tasks, assigns to workers, manages dependencies. Monitor pattern would require workers to self-organize entirely, which is fragile for plan-based execution |
| Custom team persistence | Reading `~/.claude/teams/` directly | Using Anthropic's built-in persistence avoids maintaining a parallel system; STATE.md mirrors the info for `.planning/` portability |

## Architecture Patterns

### Recommended File Structure Changes

```
# New files in git repo (source of truth)
bin/
  install.sh                    # NEW: Install script (bash)
  mow-tools.cjs                 # MODIFIED: Add Agent Teams env check, team status commands
  mow-tools.test.cjs            # MODIFIED: Tests for new commands

commands/mow/
  team-status.md                # NEW: Show agent team status
  (existing commands)           # MODIFIED: Add ??? detection to command routing

help/                           # NEW: User-friendly help files for ??? system
  new-project.md
  resume-work.md
  execute-phase.md
  plan-phase.md
  discuss-phase.md
  refine-phase.md
  ... (one per command that gets ??? support)

README.md                       # NEW: GitHub README for distribution

# Files installed to ~/.claude/
~/.claude/
  commands/mow/
    team-status.md              # NEW
    (existing commands)
  agents/
    mow-team-lead.md            # NEW: Lead orchestrator agent definition
    (existing agents)
  mowism/
    workflows/
      team-orchestrator.md      # NEW: Lead orchestrator workflow
      help.md                   # MODIFIED: Add ??? reference
      new-project.md            # MODIFIED: Agent Teams offer + nudge
      resume-project.md         # MODIFIED: Team re-spawn offer
      execute-phase.md          # MODIFIED: Agent Teams nudge (lighter)
    help/                       # NEW: Help files for ??? system
      (same as repo help/)
    bin/
      mow-tools.cjs             # MODIFIED
```

### Pattern 1: Lead Orchestrator as Router
**What:** The lead session creates a team, reads `.planning/ROADMAP.md` and PLAN files, creates tasks with dependencies matching plan waves, spawns workers, and monitors completion. Workers execute plans using the existing `execute-plan.md` workflow.
**When to use:** When user opts into Agent Teams during `/mow:new-project` or `/mow:execute-phase`.
**How it maps to Agent Teams API:**

```
# Lead orchestrator flow (natural language in team-orchestrator.md workflow)

1. Read .planning/STATE.md and ROADMAP.md to understand project state
2. Create team:
   Teammate({ operation: "spawnTeam", team_name: "mow-{project-slug}" })

3. Create tasks from PLAN.md files (one task per plan):
   TaskCreate({
     subject: "Execute {plan_id}: {plan_name}",
     description: "Execute plan at {phase_dir}/{plan_file}. Follow execute-plan workflow.",
   })

4. Set up wave dependencies:
   TaskUpdate({ taskId: "3", addBlockedBy: ["1", "2"] })  # Wave 2 waits for Wave 1

5. Spawn workers (one per worktree):
   Task({
     team_name: "mow-{project-slug}",
     name: "worker-{worktree-name}",
     subagent_type: "mow-executor",
     prompt: "You are a Mowism worker. Check TaskList() for pending tasks,
              claim one, execute the plan, mark complete. Repeat until no
              tasks remain. Working directory: {worktree_path}",
     run_in_background: true
   })

6. Monitor via inbox messages and task list updates
7. Update STATE.md with team status as tasks complete
8. Request shutdown for all workers when done
9. Cleanup team
```

### Pattern 2: Agent Teams Env Var Detection
**What:** Check for `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` at init time and store result for nudge/team logic.
**When to use:** Every `cmdInit*` function in mow-tools.cjs.

```javascript
// In mow-tools.cjs
function checkAgentTeams() {
  return {
    enabled: process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1',
    // Also check settings.json env block as fallback
    settingsEnabled: (() => {
      try {
        const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
          return settings?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';
        }
      } catch { /* ignore */ }
      return false;
    })()
  };
}

// Add to init output JSON:
// agent_teams_enabled: true/false
// agent_teams_nudge_dismissed: true/false (from .planning/config.json)
```

### Pattern 3: Nudge System with Per-Project Dismiss
**What:** Display Agent Teams nudge at key moments. Track dismissal in `.planning/config.json`.
**When to use:** When `agent_teams_enabled` is false and nudge hasn't been dismissed for this project.

```javascript
// In .planning/config.json, add:
{
  "agent_teams_nudge_dismissed": false,
  "agent_teams_nudge_dismissed_at": null
}

// Nudge logic in workflow files (not mow-tools.cjs):
// 1. Check init JSON for agent_teams_enabled and agent_teams_nudge_dismissed
// 2. If !enabled && !dismissed: show prominent nudge
// 3. If !enabled && dismissed: show lighter tooltip (between phases only)
// 4. If enabled: no nudge, offer team creation
```

### Pattern 4: ??? Help System
**What:** When user appends `???` to a `/mow:*` command, open that command's help file in their editor.
**When to use:** Any `/mow:*` command invocation with `???` in arguments.

```bash
# Detection in command .md file:
# Check if $ARGUMENTS contains "???"
# If so, determine the command name and open help file

# $EDITOR fallback chain (in the ??? handler):
EDITOR_CMD="${VISUAL:-${EDITOR:-nano}}"

# Open help file:
$EDITOR_CMD ~/.claude/mowism/help/{command-name}.md
```

**Implementation approach:** A single `/mow:???` command that takes the command name as argument, OR detection logic within each command file. The single-command approach is cleaner: each command file checks for `???` in `$ARGUMENTS` first and routes to the help opener if found.

### Pattern 5: Install Script Structure
**What:** Bash script that copies Mowism files to `~/.claude/` and checks dependencies.
**When to use:** First-time install from git clone.

```bash
#!/bin/bash
# install.sh - Install Mowism to ~/.claude/

set -euo pipefail

MOWISM_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

# 1. Create directories
mkdir -p "$CLAUDE_DIR/commands/mow"
mkdir -p "$CLAUDE_DIR/agents"
mkdir -p "$CLAUDE_DIR/mowism"

# 2. Copy files with path templating
# Commands: commands/mow/*.md -> ~/.claude/commands/mow/
# Agents: agents/mow-*.md -> ~/.claude/agents/
# Mowism core: mowism/ -> ~/.claude/mowism/ (workflows, templates, references, bin, help)
# Note: Path references inside .md files use absolute paths to ~/.claude/mowism/
# which are already correct for global install

# 3. Check dependencies
check_worktrunk() { command -v wt >/dev/null 2>&1; }
check_agent_teams() { [ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" = "1" ]; }
check_node() { command -v node >/dev/null 2>&1; }

# 4. Display summary
echo "Mowism installed successfully!"
echo ""
echo "Dependencies:"
echo "  Node.js:     $(check_node && echo 'OK' || echo 'MISSING - required for mow-tools')"
echo "  WorkTrunk:   $(check_worktrunk && echo 'OK' || echo 'MISSING - required for worktree management')"
echo "  Agent Teams: $(check_agent_teams && echo 'ENABLED' || echo 'NOT ENABLED (optional)')"
echo ""
echo "Get started: /mow:new-project"
echo "Need help?   /mow:help"
```

### Anti-Patterns to Avoid

- **Building custom team coordination**: Agent Teams API handles team creation, task management, messaging, and cleanup. Do NOT build a custom coordination layer -- use the primitives directly.
- **Polling for teammate status**: Messages are delivered automatically. The lead does NOT need to poll inboxes or task lists in a loop. Idle notifications arrive automatically.
- **Storing team state in two places**: STATE.md should mirror `~/.claude/teams/` info, not be the source of truth for team mechanics. The Agent Teams system manages its own state. STATE.md is for human-readable project tracking.
- **Blocking install on missing dependencies**: The locked decision says "check and report, continue anyway." The install script should NEVER abort on missing WorkTrunk or Agent Teams.
- **Spawning teammates without clear task boundaries**: Each worker must own a distinct set of files. Two teammates editing the same file causes overwrites. Map workers to worktrees (which isolate file changes).
- **Using broadcast for routine updates**: Broadcast sends N messages for N teammates, costing tokens. Use targeted `write` for specific communications. Broadcast only for truly team-wide announcements.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-session coordination | Custom IPC, file locks, message queues | Agent Teams API (Teammate/Task primitives) | Anthropic maintains the coordination layer; it handles file locking, message delivery, idle detection, shutdown |
| Task dependency management | Custom DAG execution engine | `TaskCreate` + `TaskUpdate` with `addBlockedBy` | Built-in dependency resolution with auto-unblocking when prerequisites complete |
| Teammate messaging | Custom socket/file communication | `Teammate write/broadcast` operations | Built-in inbox system with automatic delivery; teammates get idle notifications for free |
| Team cleanup | Custom process management | `Teammate cleanup` after shutdown | Handles orphaned sessions, temp files, team config directories |
| File copy + path templating | Complex sed/awk pipeline | Simple `cp -r` + well-structured source | Mowism files already use absolute `~/.claude/mowism/` paths; no templating needed for global-only install |
| Editor detection | Custom editor finder | `$VISUAL` -> `$EDITOR` -> `nano` fallback | Standard Unix convention; every significant tool uses this chain |

**Key insight:** Agent Teams is a complete coordination system. Mowism's job is to integrate with it (create the right team structure, spawn workers with the right prompts, read status), NOT to reimplement any coordination primitive.

## Common Pitfalls

### Pitfall 1: Agent Teams Session Resumption Does Not Exist
**What goes wrong:** Assuming you can resume a team after a session ends. `/resume` and `/rewind` do NOT restore in-process teammates.
**Why it happens:** Natural assumption from the "resume-work" concept.
**How to avoid:** TEAM-02 (re-spawn from STATE.md) must always create a fresh team. Read team status from STATE.md, create new team, spawn new workers. The old team's `~/.claude/teams/` data may be stale.
**Warning signs:** Attempting to message teammates from a previous session; "teammate not found" errors.

### Pitfall 2: Workers Editing the Same File
**What goes wrong:** Two workers modify the same file, causing overwrites. This is the #1 failure mode in Agent Teams.
**Why it happens:** Plans may touch overlapping files (e.g., STATE.md, ROADMAP.md).
**How to avoid:** Each worker operates in its own worktree (physical file isolation). Only the lead updates shared state files (STATE.md, ROADMAP.md) after workers report completion. Workers communicate results via Agent Teams messaging, not by writing to shared files directly.
**Warning signs:** Merge conflicts in `.planning/` files; lost changes; workers reading stale state.

### Pitfall 3: Lead Taking Over Worker Responsibilities
**What goes wrong:** The lead starts implementing tasks instead of delegating. The lead's context fills up with implementation details.
**Why it happens:** LLMs want to be helpful and may start doing work when workers are slow.
**How to avoid:** The lead orchestrator workflow must explicitly say "Wait for your teammates to complete their tasks before proceeding." The lead's only actions are: create tasks, assign workers, read messages, update STATE.md, and synthesize results.
**Warning signs:** Lead context usage exceeding 15-20%; lead making file edits; lead running implementation commands.

### Pitfall 4: Install Script Failing on Non-Bash Shells
**What goes wrong:** Install script uses bashisms that fail in sh/dash, or doesn't work on non-standard systems.
**Why it happens:** Using `#!/bin/bash` features without ensuring bash is available; or using `#!/bin/sh` with bash-specific syntax.
**How to avoid:** Use `#!/bin/bash` explicitly (not `#!/bin/sh`). Keep the script simple: `set -euo pipefail`, standard `cp`/`mkdir`/`command -v`, no arrays or complex parameter expansion. Test with both bash and fish (user's shell).
**Warning signs:** "syntax error near unexpected token" on install; missing files after install.

### Pitfall 5: Agent Teams Token Cost Explosion
**What goes wrong:** Spawning too many teammates for small projects burns tokens without proportional benefit.
**Why it happens:** Team coordination overhead (each teammate is a full Claude instance with its own context window).
**How to avoid:** The nudge and team-offer logic should communicate the tradeoff. Small projects (1-2 plans per phase) should not suggest teams. Teams make sense when there are 3+ independent plans that can execute in parallel across worktrees.
**Warning signs:** 5x+ token usage compared to sequential execution; workers idle waiting for dependencies; single-plan phases spawning teams.

### Pitfall 6: ??? System Not Finding Help Files After Update
**What goes wrong:** Help files exist in the repo but weren't copied during install/update.
**Why it happens:** Install script doesn't include the `help/` directory, or update process misses it.
**How to avoid:** The install script must explicitly copy `help/` to `~/.claude/mowism/help/`. The update workflow (`update.md`) already uses `git pull`, which handles source updates; but if help files are in a new directory, the install script needs to be re-run or the update workflow needs to copy them.
**Warning signs:** "File not found" when running `???`; help works in repo but not in installed version.

### Pitfall 7: Nudge Dismiss State Not Persisting
**What goes wrong:** User dismisses Agent Teams nudge but keeps seeing it.
**Why it happens:** Dismiss flag written to wrong location, or config.json read from wrong path.
**How to avoid:** Store dismiss flag in `.planning/config.json` (project-scoped, survives worktree copies). Read from the same path in all init functions. The locked decision says "per-project dismiss" so this must be in `.planning/`, not `~/.claude/`.
**Warning signs:** Nudge appearing repeatedly after dismiss; dismiss working in one worktree but not another.

## Code Examples

### Agent Teams Check in mow-tools.cjs
```javascript
// Source: Official docs at https://code.claude.com/docs/en/agent-teams
// and existing checkWorkTrunk() pattern in mow-tools.cjs

function checkAgentTeams() {
  // Check environment variable first (shell-level)
  if (process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {
    return { enabled: true, source: 'env' };
  }

  // Check settings.json env block (settings-level)
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings?.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {
        return { enabled: true, source: 'settings' };
      }
    }
  } catch { /* ignore parse errors */ }

  return { enabled: false, source: null };
}

// In cmdInit* functions, add to output:
// agent_teams: checkAgentTeams(),
// agent_teams_nudge_dismissed: config?.agent_teams_nudge_dismissed || false,
```

### Team Status Section in STATE.md
```markdown
## Agent Team Status

| Teammate | Worktree | Task | Status | Last Update |
|----------|----------|------|--------|-------------|
| worker-frontend | feature/ui-components | 03-01-PLAN.md (task 2/4) | executing | 2026-02-19 14:30 |
| worker-backend | feature/api-endpoints | 03-02-PLAN.md (task 1/3) | executing | 2026-02-19 14:28 |
| worker-tests | feature/test-coverage | (idle) | waiting | 2026-02-19 14:25 |

**Team:** mow-my-project
**Lead session:** active
**Started:** 2026-02-19 14:20
```

### Prominent Nudge Format (for /mow:new-project)
```markdown
# The workflow would output this when Agent Teams is not enabled:

---
## Agent Teams: Parallel Execution

Mowism works great solo, but its most powerful feature is running
multiple Claude Code sessions in parallel across git worktrees.

**To enable Agent Teams:**

Option A (shell):
  export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

Option B (settings.json):
  Add to ~/.claude/settings.json:
  { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }

Then restart Claude Code.

With Agent Teams, /mow:execute-phase spawns workers that each
handle a plan in their own worktree -- simultaneously.

> Type "don't remind me" to dismiss for this project.
---
```

### Lighter Tooltip Format (between phases)
```markdown
# Shown as a brief note, not a full block:

Tip: Agent Teams can execute this phase's 4 plans in parallel.
Enable: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### ??? Help File Format
```markdown
# ~/.claude/mowism/help/execute-phase.md

# /mow:execute-phase

Execute all plans in a phase with wave-based parallelization.

## Usage

  /mow:execute-phase <phase-number>
  /mow:execute-phase <phase-number> --gaps-only

## Arguments

  <phase-number>    The phase to execute (e.g., 1, 2, 3)

## Flags

  --gaps-only       Execute only gap closure plans (plans with
                    gap_closure: true in frontmatter)

## What Happens

1. Reads all PLAN.md files in the phase directory
2. Groups plans into waves based on frontmatter dependencies
3. Executes each wave sequentially; plans within a wave run in parallel
4. Each plan is executed by a subagent with fresh context
5. After all plans complete, updates STATE.md and ROADMAP.md

## Examples

  /mow:execute-phase 2         Execute all Phase 2 plans
  /mow:execute-phase 3 --gaps-only  Execute only gap closure plans

## Related

  /mow:plan-phase     Create plans for a phase
  /mow:refine-phase   Run quality checks after execution
  /mow:progress       Check overall progress
```

### Install Script Core Logic
```bash
#!/bin/bash
# install.sh - Install Mowism to ~/.claude/
# Source: git clone <repo> && ./install.sh

set -euo pipefail

MOWISM_SRC="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
MOWISM_DEST="$CLAUDE_DIR/mowism"

echo "Installing Mowism..."
echo ""

# Create directories
mkdir -p "$CLAUDE_DIR/commands/mow"
mkdir -p "$CLAUDE_DIR/agents"
mkdir -p "$MOWISM_DEST"

# Copy commands (repo commands/mow/ -> ~/.claude/commands/mow/)
cp "$MOWISM_SRC/commands/mow/"*.md "$CLAUDE_DIR/commands/mow/"

# Copy agents (repo to install location -- convention from Phase 1)
# Agents reference absolute paths, already correct for global install
for agent in "$MOWISM_SRC"/agents/mow-*.md; do
  [ -f "$agent" ] && cp "$agent" "$CLAUDE_DIR/agents/"
done

# Copy Mowism core (workflows, templates, references, bin, help)
cp -r "$MOWISM_SRC/mowism/"* "$MOWISM_DEST/"

# Copy quality skill commands (repo commands/*.md that aren't in mow/)
for skill in "$MOWISM_SRC"/commands/*.md; do
  [ -f "$skill" ] && cp "$skill" "$CLAUDE_DIR/commands/"
done

echo "Files installed to $CLAUDE_DIR"
echo ""

# Check dependencies
echo "Checking dependencies..."
echo ""

NODE_OK=false
WT_OK=false
AT_OK=false

if command -v node >/dev/null 2>&1; then
  NODE_OK=true
  echo "  Node.js:      $(node --version) [OK]"
else
  echo "  Node.js:      MISSING"
  echo "                Required for mow-tools.cjs"
  echo "                Install: https://nodejs.org/"
fi

if command -v wt >/dev/null 2>&1; then
  WT_OK=true
  echo "  WorkTrunk:    $(wt --version 2>&1 | head -1) [OK]"
else
  echo "  WorkTrunk:    MISSING"
  echo "                Required for multi-worktree workflows"
  echo "                Install: yay -S worktrunk (Arch)"
  echo "                         brew install max-sixty/tap/worktrunk (macOS)"
  echo "                         cargo install worktrunk"
fi

if [ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" = "1" ]; then
  AT_OK=true
  echo "  Agent Teams:  ENABLED [OK]"
else
  echo "  Agent Teams:  NOT ENABLED (optional but recommended)"
  echo "                Enable: export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
  echo "                Or add to ~/.claude/settings.json:"
  echo '                { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }'
fi

echo ""
echo "---"
echo ""
echo "Get started:  /mow:new-project"
echo "Need help:    /mow:help"
echo "Verify:       /mow:health"
```

### Agent Team Status Command
```markdown
# commands/mow/team-status.md
---
name: mow:team-status
description: Show agent team status and teammate assignments
allowed-tools:
  - Read
  - Bash
---

<objective>
Display the current Agent Teams status from STATE.md and live team config.
</objective>

<process>
1. Read .planning/STATE.md -- extract Agent Team Status section
2. Check if team config exists:
   ls ~/.claude/teams/mow-*/config.json 2>/dev/null
3. If live team config exists, cross-reference with STATE.md
4. Display formatted team status with:
   - Team name and lead status
   - Each teammate: name, worktree, current task, status
   - Task list summary: pending/in-progress/completed
5. If no team active, show message suggesting /mow:execute-phase with teams
</process>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual parallel sessions + git worktrees | Agent Teams with coordinated task lists | Feb 2026 (Opus 4.6) | Eliminates manual context-checking between sessions; shared task list prevents duplicate work |
| Subagents only (Task tool) | Subagents + Agent Teams | Feb 2026 | Subagents still best for focused one-off tasks; Agent Teams adds persistent coordination for ongoing parallel work |
| GSD `npx` install | Mowism `git clone + ./install.sh` | Phase 3 (new) | Simpler install path, no npm dependency, two-step process per locked decision |
| No help system | `???` suffix opens editor | Phase 3 (new) | Users can learn commands without leaving terminal or memorizing help flags |

**Deprecated/outdated:**
- Agent Teams was initially called "swarms" in some early documentation. The official name is "Agent Teams."
- tmux is suggested for split-pane mode but has known platform limitations. In-process mode is the safe default.

## Discretion Recommendations

### Lead Orchestrator Strategy: Router (recommended)
Based on the Agent Teams API capabilities, the lead should be a **router**, not a passive monitor. Rationale:
- The API provides `TaskCreate`, `TaskUpdate`, and `addBlockedBy` for active task management
- The lead can create tasks that mirror plan waves, with dependencies matching the wave structure
- Workers self-organize by claiming available tasks from the list
- The lead synthesizes results from inbox messages and updates STATE.md
- This matches the existing `execute-phase.md` pattern ("Orchestrator coordinates, not executes")

A passive monitor would only read status, leaving workers to figure out task ordering themselves. The router model is strictly better because the lead already knows the plan dependency structure.

### Team Re-spawn During /mow:resume-work: Yes, offer it (recommended)
Rationale:
- Agent Teams has no session resumption, so re-spawn is the ONLY option for continuing team work
- STATE.md's "Agent Team Status" section provides the information needed to re-create the team
- Workers may have completed some plans since last session; re-spawn should only create tasks for incomplete plans
- Offer as an option ("Would you like to re-spawn the team?"), not automatic

### Which Commands Get ??? Help Files: All user-facing workflows (recommended)
With 32 commands, writing help files for all of them is feasible. Recommend creating help files for:
- **Core workflows** (12): new-project, resume-work, execute-phase, plan-phase, discuss-phase, research-phase, refine-phase, verify-work, progress, quick, help, map-codebase
- **Management** (8): add-phase, remove-phase, insert-phase, add-todo, check-todos, pause-work, settings, update
- **Advanced** (5): debug, worktree-status, team-status, migrate, reapply-patches
- **Milestone** (4): new-milestone, complete-milestone, audit-milestone, plan-milestone-gaps
- **Meta** (3): health, cleanup, set-profile, list-phase-assumptions

Total: ~32 files, each 20-40 lines. This is a mechanical task well-suited for a subagent.

### $EDITOR Fallback Chain (recommended)
```
$VISUAL -> $EDITOR -> nano -> vi -> less
```
Standard Unix convention. `$VISUAL` is preferred for GUI editors, `$EDITOR` for terminal editors. `nano` is the most user-friendly fallback. `vi` is universally available. `less` as final fallback for view-only (if nothing else works). On the user's system (CachyOS/Arch), `nano` is typically installed by default.

## Open Questions

1. **How do Agent Teams workers interact with worktree-specific file systems?**
   - What we know: Each worker is spawned as an independent Claude Code instance. Workers can be told to operate in a specific directory via their spawn prompt.
   - What's unclear: Whether a worker spawned from the lead's session inherits the lead's working directory, or starts in the project root. The lead may need to `cd` workers to their assigned worktree, or use `--add-dir` to specify the worktree path.
   - Recommendation: Test during implementation. The spawn prompt should explicitly include `cd {worktree_path}` as the first instruction.

2. **Token cost of Agent Teams for typical Mowism projects**
   - What we know: A 5-person team uses ~800k tokens vs ~200k for solo. Each teammate has a full context window.
   - What's unclear: How this scales with Mowism's typical plan count (3-6 plans per phase) and whether the coordination overhead is worth it for phases with only 2-3 plans.
   - Recommendation: The nudge system should mention token cost. Team offer should only appear when a phase has 3+ independent plans.

3. **Settings.json modifications during install**
   - What we know: GSD's install.js registers hooks in settings.json. The install script might need to add the Agent Teams env var or teammate mode settings.
   - What's unclear: Whether the install script should modify `~/.claude/settings.json` or leave that to the user.
   - Recommendation: Do NOT modify settings.json in the install script. Show the user what to add (copy-pasteable snippet) in the post-install summary. Modifying settings.json risks breaking existing configuration.

## Sources

### Primary (HIGH confidence)
- [Anthropic Official Docs: Agent Teams](https://code.claude.com/docs/en/agent-teams) - Complete API reference, architecture, limitations, best practices
- [Anthropic Official Docs: Skills/Slash Commands](https://code.claude.com/docs/en/slash-commands) - Command registration, frontmatter, `$ARGUMENTS`, skills system
- Existing Mowism codebase (`mow-tools.cjs`, workflows, commands) - Established patterns for init functions, STATE.md management, subagent spawning

### Secondary (MEDIUM confidence)
- [Agent Teams Swarm Orchestration Gist](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea) - Detailed primitives reference (TeamCreate, TaskCreate, etc.), verified against official docs
- [alexop.dev: From Tasks to Swarms](https://alexop.dev/posts/from-tasks-to-swarms-agent-teams-in-claude-code/) - Practical implementation patterns, verified against official docs
- [GSD GitHub: get-shit-done](https://github.com/glittercowboy/get-shit-done) - Install script patterns (install.js), README structure, post-install flow

### Tertiary (LOW confidence)
- Agent Teams environment variables auto-set for teammates (`CLAUDE_CODE_TEAM_NAME`, `CLAUDE_CODE_AGENT_ID`, etc.) - documented in community gist but not verified in official docs; HIGH confidence that env vars exist based on multiple sources agreeing, but exact names need validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Agent Teams API is well-documented in official Anthropic docs; all primitives verified
- Architecture: HIGH - Patterns map directly to existing Mowism architecture (subagent spawning, STATE.md, worktree tracking) and verified Agent Teams API capabilities
- Install script: HIGH - GSD install pattern is the reference; bash script is straightforward; file copy structure matches existing Phase 1/2 layout
- ??? help system: MEDIUM - Implementation approach is sound but the exact `???` detection mechanism in command files needs validation (whether `$ARGUMENTS` includes `???` when typed as a suffix)
- Pitfalls: HIGH - Official docs explicitly list limitations; session resumption gap is critical and well-documented
- Nudge system: HIGH - Simple feature-flag + config pattern; no unknowns

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (Agent Teams is experimental; API could change with any Claude Code release)
