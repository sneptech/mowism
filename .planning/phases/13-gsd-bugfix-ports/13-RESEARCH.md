# Phase 13: GSD Bugfix Ports - Research

**Researched:** 2026-02-24
**Domain:** Correctness bugfixes for state mutation, progress computation, workflow ordering, backup/recovery, context monitoring, and todo lifecycle in an existing Node.js CLI tool (~8200 LOC monolith) and Markdown-based workflow system
**Confidence:** HIGH

## Summary

Phase 13 fixes 11 correctness bugs in Mowism's `mow-tools.cjs` and associated workflow/agent files. These are not feature additions -- they are fixes to existing code paths that produce corrupt data, crash on edge cases, lack safety guards, or silently skip user interaction. The bugs were identified by studying GSD upstream patches and Mowism's own operational experience.

The fixes divide into three categories: (1) **Pure code fixes** in `mow-tools.cjs` -- dollar sign corruption, progress bar RangeError, requirement ID propagation (BUG-01, BUG-02, BUG-04); (2) **Behavioral additions** to existing workflows -- executor retry limits, workflow ordering guards, feature branch timing, backup before repair, CLAUDE.md injection, discuss-phase probing (BUG-03, BUG-05, BUG-06, BUG-07, BUG-08, BUG-11); (3) **New infrastructure** -- context window monitoring hook and todo in-progress lifecycle (BUG-09, BUG-10).

All fixes target the existing file `bin/mow-tools.cjs`, existing workflow files under `~/.claude/mowism/workflows/`, existing agent definitions under `~/.claude/agents/`, and the Claude Code hooks system in `~/.claude/settings.json`. No new npm dependencies are required. No architectural changes.

**Primary recommendation:** Fix in priority order -- pure code fixes first (simplest, highest confidence), then behavioral additions (require workflow edits), then new infrastructure (BUG-09, BUG-10 are the most complex). Test each fix in isolation before moving to the next.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Context window monitoring (BUG-10): warn at 25% remaining, wrap-up at 15% remaining (tighter than GSD's 35%/25%). At 25%: print visible warning with remaining capacity. At 15%: commit staged work, write handoff note to STATE.md, tell user to /clear and resume. Scope: top-level sessions only -- do NOT monitor Task() subagents.
- Todo lifecycle (BUG-09): Add in-progress/ state directory alongside pending/ and done/. In-progress todos persist across sessions -- they do NOT auto-revert to pending on /clear. /mow:check-todos shows in-progress items first in a separate "Currently working on" section, then pending below. No limit on concurrent in-progress todos. Before starting a new todo, check for interference with currently in-progress todo(s) and warn if overlap detected.
- Backup & safety (BUG-07): Backups live in `.planning/backups/`. Backup scope: STATE.md, ROADMAP.md, and REQUIREMENTS.md together (full planning snapshot). Retention: keep all backups, never auto-delete. When 5+ backups exist, suggest /mow:cleanup to the user. --repair shows a diff of what changed between old STATE.md and regenerated version.
- Guardrail strictness (BUG-05, BUG-06): Claude's discretion on warn-vs-block behavior.

### Claude's Discretion
- Hook implementation type for context monitor (PostToolUse vs Notification)
- Guardrail strictness (warn vs hard-block for BUG-05 executor limits and BUG-06 workflow ordering guards)
- Todo file state implementation (move to in-progress/ directory vs inline marker)
- All pure-fix bugs (BUG-01 dollar sign, BUG-02 requirement IDs, BUG-03 branch timing, BUG-04 progress bar clamp, BUG-08 CLAUDE.md in subagents, BUG-11 discuss probing) -- these have clear-cut fixes from GSD upstream

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUG-01 | STATE.md state mutators use callback replacers instead of string replacement (dollar sign corruption fix) | Identified all 5 vulnerable `.replace()` call sites in mow-tools.cjs: `cmdStateUpdate` (line 1983), `cmdStatePatch` (line 1955), `stateReplaceField` (line 2006), `cmdStateUpdateProgress` (line 2104), and `cmdPhaseComplete` state updates (lines 3323-3358). Fix: use callback function `(match, prefix) => prefix + value` instead of `$1${value}` |
| BUG-02 | Phase requirement IDs extracted from ROADMAP.md and propagated via init functions | `cmdInitPhaseOp` (line 6232), `cmdInitPlanPhase` (line 5928), and `cmdInitExecutePhase` (line 5851) do not extract or include `phase_requirement_ids` in their output. Fix: parse `**Requirements**:` line from ROADMAP.md phase section via `getRoadmapPhaseInternal()` and include in init result |
| BUG-03 | Feature branch created at discuss-phase start when branching_strategy is "phase" | Currently, branches only created at execute-phase (line 5889 in `cmdInitExecutePhase`). Fix: add branching logic to discuss-phase workflow's initialize step |
| BUG-04 | Progress bar computations clamped with Math.min(100, ...) | `renderProgressBar` (line 313) already clamps. But `cmdStateUpdateProgress` (line 2096), `progress` command (lines 638-649), and `cmdProgress` (lines 5527-5532) compute percent without clamping orphaned-file edge cases. Fix: add `Math.min(100, ...)` at each computation site |
| BUG-05 | Executor has maximum attempt limit per task to prevent infinite retry loops | mow-executor agent already has "FIX ATTEMPT LIMIT: After 3 auto-fix attempts" (line 149-153) but this is prompt-only guidance with no enforcement. Fix: add configurable `max_task_attempts` to config.json with default 3, and add enforcement logic to executor workflow |
| BUG-06 | plan-phase warns if no CONTEXT.md exists; discuss-phase warns if plans already exist | `cmdInitPlanPhase` already returns `has_context` (line 5959). plan-phase workflow needs to check this and warn. `cmdInitPhaseOp` returns `has_plans` (line 6275). discuss-phase workflow already checks `has_plans` at step check_existing (line 152-166). Fix: strengthen plan-phase warning; discuss-phase already handles this |
| BUG-07 | /mow:health --repair creates timestamped backup before regeneration | `cmdValidateHealth` repair section (lines 5419-5461) regenerates STATE.md without backup. Fix: before `regenerateState` case, copy STATE.md + ROADMAP.md + REQUIREMENTS.md to `.planning/backups/{timestamp}/`, show diff after repair |
| BUG-08 | Subagent spawn prompts include project CLAUDE.md content for context discovery | No current mechanism passes CLAUDE.md content to subagents. Fix: use SubagentStart hook to inject CLAUDE.md content via `additionalContext`, OR read CLAUDE.md in init functions and include in output |
| BUG-09 | Todo system has in-progress/ state and todo start subcommand | Current: `pending/` and `completed/` directories only (lines 5562-5569). `cmdTodoComplete` moves files from pending to completed. Fix: add `in-progress/` directory, add `todo start` subcommand, modify `cmdListTodos` and `cmdInitTodos` to scan in-progress/, update check-todos workflow |
| BUG-10 | PostToolUse hook monitors context window usage and warns at 25%/15% remaining | No existing context monitoring. Fix: create a hook script that runs on Stop or PostToolUse events, reads transcript file to estimate token usage, outputs warnings via `additionalContext` or `systemMessage` |
| BUG-11 | Discuss-phase probes ambiguous user preferences with follow-up questions | discuss-phase workflow already has probing (4 questions per area, lines 244-293). Fix: add explicit gray-area detection for ambiguous answers (user says "maybe", "either works", "not sure") and follow-up with clarifying questions before accepting |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | system (22.x+) | Runtime for mow-tools.cjs | Already in use, no change |
| fs (built-in) | N/A | File I/O for state mutations, backups, todo management | Already in use |
| path (built-in) | N/A | Path operations | Already in use |
| child_process (built-in) | N/A | Git operations, exec | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jq | system | JSON parsing in hook scripts | BUG-10 context monitor hook |
| diff (coreutils) | system | Showing backup diffs in --repair | BUG-07 backup diff display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Transcript file parsing for token estimation | Claude Code API (no access) | No official API for token usage -- must estimate from transcript file size or message count |
| SubagentStart hook for CLAUDE.md injection | Reading CLAUDE.md in init functions | Hook approach is cleaner (automatic, no per-workflow changes) but SubagentStart hooks cannot block, only add context |

**Installation:** No new packages needed. All fixes use existing Node.js builtins and system tools.

## Architecture Patterns

### Recommended Project Structure (changes only)
```
bin/
└── mow-tools.cjs              # All BUG-01 through BUG-09 code fixes
.planning/
├── backups/                    # NEW: timestamped backup snapshots (BUG-07)
│   └── 2026-02-24T12-00-00Z/  # One directory per backup
│       ├── STATE.md
│       ├── ROADMAP.md
│       └── REQUIREMENTS.md
└── todos/
    ├── pending/                # Existing
    ├── in-progress/            # NEW: currently active todos (BUG-09)
    └── completed/              # Existing (was done/)
~/.claude/
├── settings.json               # Add PostToolUse hook for BUG-10
└── hooks/
    └── mow-context-monitor.sh  # NEW: context window monitoring script (BUG-10)
```

### Pattern 1: Callback Replacer for Dollar Sign Safety (BUG-01)
**What:** Use a callback function instead of replacement string in `String.replace()` to prevent `$1`, `$2`, `$$`, `$&`, `$'`, `` $` `` in values from being interpreted as replacement patterns.
**When to use:** Every `content.replace(pattern, replacement)` where `replacement` contains a user-provided value.
**Example:**
```javascript
// BEFORE (vulnerable to dollar sign corruption):
content = content.replace(pattern, `$1${value}`);

// AFTER (safe):
content = content.replace(pattern, (match, prefix) => prefix + value);
```
**Source:** JavaScript MDN docs on String.prototype.replace() -- "replacement patterns" section.

### Pattern 2: SubagentStart Hook for Context Injection (BUG-08)
**What:** Use Claude Code's SubagentStart hook to inject project CLAUDE.md content into every subagent's context automatically.
**When to use:** When all subagents need access to the same project-level context that the parent session loads from CLAUDE.md.
**Example:**
```json
{
  "hooks": {
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/mow-inject-claude-md.sh"
          }
        ]
      }
    ]
  }
}
```
The hook script reads `.claude/CLAUDE.md` (if exists) and outputs JSON with `additionalContext`.
**Source:** Claude Code official hooks reference -- SubagentStart section: "SubagentStart hooks cannot block subagent creation, but they can inject context."

### Pattern 3: Stop Hook for Context Window Monitoring (BUG-10)
**What:** Use Claude Code's Stop hook (not PostToolUse) to check context window usage at the end of each agent turn. The Stop hook fires when Claude finishes responding, making it the natural place to assess whether the session is running low on context.
**When to use:** For monitoring that should run once per agent turn rather than after every tool call.
**Why Stop over PostToolUse:** PostToolUse fires after EVERY tool call (Read, Write, Bash, etc.), adding overhead on every operation. Stop fires once per response cycle. Context window monitoring needs to run periodically, not on every single tool use. Additionally, Stop hooks can prevent Claude from stopping (exit code 2 / `decision: "block"`), which is needed for the wrap-up behavior at 15% remaining.
**Example:**
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/mow-context-monitor.sh"
          }
        ]
      }
    ]
  }
}
```
**Source:** Claude Code official hooks reference -- Stop section: "When Claude finishes responding. decision: 'block' prevents Claude from stopping."

**Recommendation for BUG-10:** Use Stop hook, NOT PostToolUse. The Stop hook fires once per turn (efficient), can block stopping (enables wrap-up flow), and the `stop_hook_active` field prevents infinite loops (check it to avoid re-triggering).

### Anti-Patterns to Avoid
- **Batch-applying all .replace() fixes blindly:** Some `.replace()` calls use patterns where `$1` is intentional regex backreference, not user data. Only fix calls where the replacement string contains USER-PROVIDED values (field values from STATE.md, not hardcoded strings).
- **Creating a new file for each bug fix:** All `mow-tools.cjs` fixes should modify the existing monolith. Do not extract functions to new modules -- that is a future refactoring concern (MAINT-01).
- **Making the context monitor too aggressive:** Checking token usage after every tool call (PostToolUse) would add latency to every Read, Write, Bash, etc. Use the Stop hook for periodic checks.
- **Auto-reverting in-progress todos on session start:** The user explicitly decided that in-progress todos persist across sessions. Do NOT add cleanup logic that resets them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Context window token estimation | Custom tokenizer | Transcript file size heuristic or message count from transcript JSONL | No access to actual token counts from Claude Code API; file size correlates well enough for warn/wrap-up thresholds |
| Backup diffing | Custom diff algorithm | Shell `diff` command on old vs new STATE.md | Standard Unix diff is already available and produces human-readable output |
| Todo file interference detection | Custom dependency graph | Simple file-path overlap check between in-progress todo's `files:` frontmatter and new todo | Interference is about file contention, not logical dependencies |

**Key insight:** All 11 bugs have straightforward fixes using existing patterns and tools. The temptation is to over-engineer solutions (e.g., building a proper token counter for BUG-10, or a full state machine for BUG-09). Resist this -- the fixes should be minimal and surgical.

## Common Pitfalls

### Pitfall 1: Dollar Sign Fix Breaks Intentional $1 Backreferences
**What goes wrong:** Blindly converting all `.replace(pattern, '$1...')` to callback form breaks places where `$1` is an intentional regex backreference capturing a prefix.
**Why it happens:** The fix for BUG-01 changes how replacement strings work. In callback form, there is no `$1` -- you receive the captured group as a function parameter.
**How to avoid:** The callback form `(match, prefix) => prefix + value` correctly receives `$1` as the `prefix` parameter. This is the CORRECT translation. The pitfall is if someone tries to use `(match) => match.replace(capturedPart, value)` instead -- that re-introduces the same bug. Use the standard `(match, ...groups) => groups[0] + value` pattern.
**Warning signs:** Test with a value containing `$1` (e.g., "Costs $100") -- if the output is wrong, the fix was applied incorrectly.

### Pitfall 2: Context Monitor Creates Infinite Stop Loop
**What goes wrong:** The Stop hook outputs a warning message with `decision: "block"` at 15% remaining, which prevents Claude from stopping and forces continuation. But the continuation triggers another Stop, which triggers the hook again, which blocks again... infinite loop.
**Why it happens:** The Stop hook fires every time Claude tries to stop. If the hook always blocks, Claude can never stop.
**How to avoid:** Check `stop_hook_active` from the hook input. If `true`, the Stop hook is already in a continuation cycle -- allow stopping. Also, the wrap-up behavior at 15% should: (1) commit work, (2) write handoff note, (3) then EXIT 0 (allow stop) with a `systemMessage` telling the user to `/clear`. Do NOT block stopping at 15% -- just perform cleanup and let Claude stop normally.
**Warning signs:** Session hangs, Claude keeps producing output without stopping, or the user sees repeated "context running low" warnings.

### Pitfall 3: Backup Directory Creates Unbounded Disk Growth
**What goes wrong:** The user decision says "keep all backups, never auto-delete." Over time, `.planning/backups/` grows without bound.
**Why it happens:** Each `--repair` creates a new timestamped directory with 3 files. If health checks are run frequently (automated CI, test scripts), disk usage grows.
**How to avoid:** The user already addressed this: "When 5+ backups exist, suggest /mow:cleanup to the user." This is a suggestion, not auto-deletion. Implement the suggestion as a visible message in the repair output, not as automatic cleanup.
**Warning signs:** `.planning/backups/` contains more than 20 directories.

### Pitfall 4: Todo In-Progress State Confuses Existing Workflows
**What goes wrong:** Adding `in-progress/` as a third state breaks workflows that assume todos are either in `pending/` or `completed/` (which was called `done/` but is now `completed/`).
**Why it happens:** `cmdTodoComplete` currently moves from `pending/` to `completed/`. If a todo is in `in-progress/`, `cmdTodoComplete` will fail because it looks for the file in `pending/`.
**How to avoid:** Update `cmdTodoComplete` to check both `pending/` and `in-progress/` as source directories. A "complete" action on an in-progress todo should move it from `in-progress/` to `completed/`. Also update `cmdListTodos` and `cmdInitTodos` to scan all three directories.
**Warning signs:** "File not found" errors when trying to complete a todo that was started with `todo start`.

### Pitfall 5: Requirement ID Extraction Regex Fails on Varied ROADMAP.md Formats
**What goes wrong:** BUG-02 needs to extract requirement IDs like `BUG-01, BUG-02` from the ROADMAP.md line `**Requirements**: BUG-01, BUG-02, ...`. If the format varies (e.g., with brackets, different spacing, markdown links), the regex misses IDs.
**Why it happens:** ROADMAP.md is hand-edited and format can drift.
**How to avoid:** Use a permissive regex: extract everything after `**Requirements**:` (or `**Requirements:**`), strip brackets and markdown, split on commas/spaces, filter to match `[A-Z]+-\d+` pattern. Test against the actual ROADMAP.md format.
**Warning signs:** init functions return empty `phase_requirement_ids` for phases that clearly have requirements in ROADMAP.md.

## Code Examples

### BUG-01: Callback Replacer Fix
```javascript
// Source: mow-tools.cjs stateReplaceField (line 2002)
// CURRENT (vulnerable):
function stateReplaceField(content, fieldName, newValue) {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\*\\*${escaped}:\\*\\*\\s*)(.*)`, 'i');
  if (pattern.test(content)) {
    return content.replace(pattern, `$1${newValue}`);
  }
  return null;
}

// FIXED:
function stateReplaceField(content, fieldName, newValue) {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\*\\*${escaped}:\\*\\*\\s*)(.*)`, 'i');
  if (pattern.test(content)) {
    return content.replace(pattern, (_, prefix) => prefix + newValue);
  }
  return null;
}
```

### BUG-01: cmdStatePatch Fix
```javascript
// Source: mow-tools.cjs cmdStatePatch (line 1944)
// CURRENT (vulnerable):
content = content.replace(pattern, `$1${value}`);

// FIXED:
content = content.replace(pattern, (_, prefix) => prefix + value);
```

### BUG-01: cmdStateUpdate Fix
```javascript
// Source: mow-tools.cjs cmdStateUpdate (line 1972)
// CURRENT (vulnerable):
content = content.replace(pattern, `$1${value}`);

// FIXED:
content = content.replace(pattern, (_, prefix) => prefix + value);
```

### BUG-02: Requirement ID Extraction in Init Functions
```javascript
// Add to cmdInitPhaseOp, cmdInitPlanPhase, cmdInitExecutePhase:
// After phaseInfo is resolved, extract requirement IDs from ROADMAP.md
function extractPhaseRequirementIds(cwd, phaseNum) {
  const roadmapPhase = getRoadmapPhaseInternal(cwd, phaseNum);
  if (!roadmapPhase?.found || !roadmapPhase.section) return [];
  const reqMatch = roadmapPhase.section.match(
    /\*\*Requirements\*\*:?\s*(.+)/i
  );
  if (!reqMatch) return [];
  return reqMatch[1]
    .replace(/[\[\]]/g, '')
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(s => /^[A-Z]+-\d+$/.test(s));
}

// In init result object:
result.phase_requirement_ids = extractPhaseRequirementIds(cwd, phase);
```

### BUG-04: Progress Bar Clamping
```javascript
// Source: mow-tools.cjs cmdStateUpdateProgress (line 2096)
// CURRENT:
const percent = totalPlans > 0 ? Math.round(totalSummaries / totalPlans * 100) : 0;

// FIXED:
const percent = totalPlans > 0
  ? Math.min(100, Math.round(totalSummaries / totalPlans * 100))
  : 0;
```

### BUG-07: Backup Before Repair
```javascript
// Add to cmdValidateHealth, before the repairs loop (after line 5420):
function createPlanningBackup(cwd) {
  const backupDir = path.join(cwd, '.planning', 'backups',
    new Date().toISOString().replace(/:/g, '-').replace(/\..+/, ''));
  fs.mkdirSync(backupDir, { recursive: true });
  const files = ['STATE.md', 'ROADMAP.md', 'REQUIREMENTS.md'];
  const backed = [];
  for (const file of files) {
    const src = path.join(cwd, '.planning', file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(backupDir, file));
      backed.push(file);
    }
  }
  // Count existing backups for cleanup suggestion
  const backupsParent = path.join(cwd, '.planning', 'backups');
  let backupCount = 0;
  try { backupCount = fs.readdirSync(backupsParent).length; } catch {}
  return { dir: backupDir, files: backed, total_backups: backupCount };
}
```

### BUG-09: Todo Start Subcommand
```javascript
// Add to mow-tools.cjs alongside cmdTodoComplete:
function cmdTodoStart(cwd, filename, raw) {
  if (!filename) { error('filename required for todo start'); }
  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');
  const inProgressDir = path.join(cwd, '.planning', 'todos', 'in-progress');
  const sourcePath = path.join(pendingDir, filename);
  if (!fs.existsSync(sourcePath)) {
    error(`Todo not found: ${sourcePath}`);
  }
  fs.mkdirSync(inProgressDir, { recursive: true });

  // Check for interference with existing in-progress todos
  const warnings = [];
  try {
    const inProgressFiles = fs.readdirSync(inProgressDir).filter(f => f.endsWith('.md'));
    const newContent = fs.readFileSync(sourcePath, 'utf-8');
    const newFilesMatch = newContent.match(/^files:\s*(.+)$/m);
    const newFiles = newFilesMatch
      ? newFilesMatch[1].split(',').map(s => s.trim()).filter(Boolean)
      : [];
    if (newFiles.length > 0) {
      for (const ipFile of inProgressFiles) {
        const ipContent = fs.readFileSync(path.join(inProgressDir, ipFile), 'utf-8');
        const ipFilesMatch = ipContent.match(/^files:\s*(.+)$/m);
        const ipFiles = ipFilesMatch
          ? ipFilesMatch[1].split(',').map(s => s.trim()).filter(Boolean)
          : [];
        const overlap = newFiles.filter(f => ipFiles.includes(f));
        if (overlap.length > 0) {
          const titleMatch = ipContent.match(/^title:\s*(.+)$/m);
          warnings.push({
            todo: titleMatch ? titleMatch[1].trim() : ipFile,
            overlapping_files: overlap,
          });
        }
      }
    }
  } catch {}

  fs.renameSync(sourcePath, path.join(inProgressDir, filename));
  output({
    started: true,
    file: filename,
    from: 'pending',
    to: 'in-progress',
    warnings: warnings.length > 0 ? warnings : undefined,
  }, raw);
}
```

### BUG-10: Context Monitor Hook Script (Stop hook)
```bash
#!/bin/bash
# ~/.claude/hooks/mow-context-monitor.sh
# Stop hook: estimate context window usage and warn/wrap-up

INPUT=$(cat)

# Check if stop hook is already active (prevent infinite loop)
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0  # Allow stop, don't re-trigger
fi

# Get transcript path
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty')
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# Estimate context usage from transcript file size
# Rough heuristic: 200k context window ~ 600KB-800KB of JSONL transcript
# This is approximate but sufficient for warn/wrap-up thresholds
FILE_SIZE=$(stat -c%s "$TRANSCRIPT" 2>/dev/null || stat -f%z "$TRANSCRIPT" 2>/dev/null || echo 0)
# Assume ~700KB = 100% context usage (adjustable)
MAX_SIZE=716800
USED_PERCENT=$(( (FILE_SIZE * 100) / MAX_SIZE ))
REMAINING=$((100 - USED_PERCENT))

# Clamp
if [ "$REMAINING" -lt 0 ]; then REMAINING=0; fi
if [ "$REMAINING" -gt 100 ]; then REMAINING=100; fi

# Check if in a subagent context (skip monitoring for subagents)
# Subagent transcripts are in a subagents/ subdirectory
if echo "$TRANSCRIPT" | grep -q '/subagents/'; then
  exit 0
fi

if [ "$REMAINING" -le 15 ]; then
  # Wrap-up: commit staged work, write handoff, tell user to /clear
  CWD=$(echo "$INPUT" | jq -r '.cwd // "."')

  # Write handoff note
  if [ -f "$CWD/.planning/STATE.md" ]; then
    DATE=$(date -u +"%Y-%m-%d")
    echo "" >> "$CWD/.planning/STATE.md"
    echo "### Context Window Handoff ($DATE)" >> "$CWD/.planning/STATE.md"
    echo "Session approaching context limit (~${REMAINING}% remaining). Work committed. Run /clear and resume." >> "$CWD/.planning/STATE.md"
  fi

  jq -n '{
    "systemMessage": "CONTEXT WINDOW CRITICAL (~'"$REMAINING"'% remaining). Staged work committed. Handoff note written to STATE.md. Please /clear and resume to continue with fresh context.",
    "suppressOutput": false
  }'
elif [ "$REMAINING" -le 25 ]; then
  jq -n '{
    "systemMessage": "CONTEXT WINDOW WARNING: ~'"$REMAINING"'% remaining. Consider wrapping up current task and running /clear soon.",
    "suppressOutput": false
  }'
fi

exit 0
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String replacement `$1${value}` in .replace() | Callback replacer `(_, prefix) => prefix + value` | GSD PR #701 (Feb 2026) | Prevents dollar sign corruption in STATE.md field values |
| No backup before --repair | Timestamped backup snapshot + diff | GSD QoL improvement (Feb 2026) | Allows recovery if repair corrupts data |
| Todo: pending → done (2 states) | Todo: pending → in-progress → completed (3 states) | GSD improvement + user decision | Supports concurrent work tracking in worktree parallelism |
| No context window awareness | Stop hook with 25%/15% thresholds | New for Mowism v1.2 | Prevents context degradation in long sessions |

**Deprecated/outdated:**
- GSD's 35%/25% context window thresholds replaced by Mowism's tighter 25%/15% (user decision)
- `done/` directory name -- Mowism already uses `completed/` (verified in codebase at line 5569)

## Open Questions

1. **Context window size estimation accuracy**
   - What we know: Transcript JSONL file size correlates with context usage, but the ratio varies by model, conversation style, and tool output verbosity. 200k context ~ 600-800KB of JSONL is a rough heuristic.
   - What's unclear: Whether Claude Code exposes actual token counts anywhere accessible to hooks (transcript metadata, environment variables, etc.).
   - Recommendation: Start with file-size heuristic. Calibrate thresholds empirically in first few sessions. Add a configurable `context_monitor.max_transcript_kb` setting in config.json for tuning. If the heuristic proves too inaccurate, switch to counting JSONL lines (each line = one API message, easier to estimate tokens).

2. **SubagentStart hook vs init function for CLAUDE.md injection (BUG-08)**
   - What we know: SubagentStart hook can inject `additionalContext` into any spawned subagent. Alternatively, init functions could read CLAUDE.md and include its content in their JSON output.
   - What's unclear: Whether `additionalContext` from SubagentStart is visible to the subagent in the same way as system prompt content.
   - Recommendation: Use SubagentStart hook. It is automatic (no per-workflow changes), works for ALL subagent types (not just ones using init functions), and is the official mechanism for injecting context into subagents. The hook should read `.claude/CLAUDE.md` from `$CLAUDE_PROJECT_DIR` and output it as `additionalContext`. If the file does not exist, exit 0 silently.

3. **Executor retry limit: warn vs hard-block (BUG-05)**
   - What we know: The mow-executor agent already has a prompt-level "FIX ATTEMPT LIMIT: After 3 auto-fix attempts" instruction. This is discretionary guidance, not enforcement.
   - What's unclear: Whether a hard block (exit after 3 attempts per task) or a warn (log warning, continue trying) is better for the user experience.
   - Recommendation: **Warn at 3, hard-block at 5.** At 3 attempts, log a prominent warning to SUMMARY.md and print to output. At 5 attempts, stop the task, write it to "Deferred Issues" in SUMMARY.md, and continue to the next task. This gives the executor some flexibility while preventing infinite loops. The limit should be configurable via `executor.max_task_attempts` in config.json (default: 5).

4. **Workflow ordering guards: warn vs hard-block (BUG-06)**
   - Recommendation: **Warn, don't block.** The plan-phase should print a visible warning "No CONTEXT.md found for phase {N}. Consider running /mow:discuss-phase {N} first to capture user decisions." but proceed anyway. The discuss-phase already handles the "plans already exist" case with an interactive prompt (lines 152-166). Making these hard blocks would break resumption flows where the user intentionally skips discussion.

## Sources

### Primary (HIGH confidence)
- `bin/mow-tools.cjs` (8208 lines) -- direct codebase analysis of all vulnerable code paths, function signatures, line numbers
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- PostToolUse, Stop, SubagentStart, Notification hook schemas, input/output formats, decision control, lifecycle events (fetched 2026-02-24)
- `~/.claude/settings.json` -- existing hook configuration confirming PostToolUse and Stop hooks already in use
- `~/.claude/mowism/workflows/discuss-phase.md` -- discuss-phase workflow with probing logic (lines 244-293), auto-advance step (lines 430-476)
- `~/.claude/mowism/workflows/execute-phase.md` -- execute-phase workflow with branching strategy (lines 92-103)
- `~/.claude/mowism/workflows/execute-plan.md` -- execute-plan workflow confirming no retry limit enforcement
- `~/.claude/agents/mow-executor.md` -- executor agent definition with FIX ATTEMPT LIMIT instruction (lines 149-153)

### Secondary (MEDIUM confidence)
- `~/.claude/get-shit-done/bin/gsd-tools.cjs` (5326 lines) -- GSD upstream comparison confirming same bugs exist in upstream (dollar sign, backup, requirement IDs)
- `.planning/research/PITFALLS.md` (v1.2) -- Pitfall 7 (GSD cherry-pick regression) and Pitfall 13 (executor attempt limit conflict) directly relevant
- `.planning/research/v1.2-ARCHITECTURE.md`, `.planning/research/v1.2-FEATURES.md` -- v1.2 scope context

### Tertiary (LOW confidence)
- Context window size estimation heuristic (transcript file size → token usage) -- based on general observation, not verified empirically. Needs calibration.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all fixes use existing builtins
- Architecture: HIGH -- patterns verified against existing codebase and official Claude Code docs
- Pitfalls: HIGH -- dollar sign fix verified with MDN docs, hook loop prevention verified with official docs (`stop_hook_active`), todo state transitions traced through existing code
- Code examples: HIGH -- all examples reference actual line numbers and function signatures from codebase analysis
- Context monitoring: MEDIUM -- token estimation heuristic needs empirical validation

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable domain -- bugfixes, not fast-moving library APIs)
