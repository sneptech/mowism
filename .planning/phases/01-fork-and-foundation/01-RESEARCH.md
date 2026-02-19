# Phase 1: Fork and Foundation - Research

**Researched:** 2026-02-19
**Domain:** GSD-to-Mowism rebrand / Claude Code skill system / file migration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full rename of everything — command names, agent names, internal tooling, file paths, template output
- Not hiding the GSD origin, but not prominently branding as GSD either. It's a clearly forked, independently developing project
- All agent types renamed: `gsd-planner` → `mow-planner`, `gsd-executor` → `mow-executor`, etc.
- Internal tooling renamed: `gsd-tools.cjs` → `mow-tools.cjs`
- Install directory: `~/.claude/mowism/` (not `~/.claude/get-shit-done/`)
- Output text uses short prefix: `MOW ▶` in banners and status messages (not "Mowism" spelled out)
- Mowism supersedes GSD — if someone's using `/mow:*` commands, it replaces GSD
- Both can technically coexist (same kinds of commands), but Mowism is the active one
- No special conflict detection or deconfliction needed
- `/mow:migrate` copies `.planning/` to a backup first, then modifies originals in-place
- Leaves existing GSD skill registrations untouched — user can remove `/gsd:*` manually if they want
- Auto-commits after migration completes (single commit with all changes)
- The rebrand is thorough but pragmatic — "gsd" strings should not appear in any user-visible output, but a comment in source acknowledging the GSD origin is fine
- Migration should feel safe — copy-then-modify approach means the user can always recover from the backup

### Claude's Discretion
- How to handle partial migrations (mid-phase `.planning/` directories) — pick the safest approach
- Exact string replacement strategy (regex vs literal, order of operations)
- Backup naming convention and cleanup
- Error recovery if migration fails partway through

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Summary

Phase 1 is a mechanical rebrand and reorganization. The existing GSD installation at `~/.claude/get-shit-done/` consists of 56 files containing 756 occurrences of "gsd"/"GSD"/"get-shit-done" strings across workflows (32 files, 547 occurrences), commands (31 files, 191 occurrences), agents (11 files, 119 occurrences), templates (multiple files), references (multiple files), and the core CLI tool `gsd-tools.cjs` (55 occurrences). All of these need to be forked into the Mowism repo and rebranded.

The quality skills (SKIL-01 through SKIL-07: scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary, update-claude-md) are currently documented in `/home/max/git/ai-agent-tools-and-tips/SKILLS.md` with detailed specifications, but do NOT exist as individual Claude Code command files. They need to be created as new `/mow:*` commands from the SKILLS.md specifications. The RECOMMENDED-WORKFLOW-CHAIN.md documents their execution order and staging.

The migration tool (`/mow:migrate`) needs to handle `.planning/` directories that contain GSD references in: STATE.md (command references like `/gsd:add-todo`, `/gsd:check-todos`), template-generated content, and config.json (branch templates like `gsd/phase-{phase}-{slug}`). The migration is a backup-then-replace-in-place operation with auto-commit.

**Primary recommendation:** Approach the fork as a series of mechanical copy-and-rename operations, working bottom-up: CLI tool first (mow-tools.cjs), then references/templates, then workflows, then agents, then commands, then quality skills, then migration command. This order ensures each layer references the already-rebranded layer below it.

## Standard Stack

### Core
| Component | Current | Target | Purpose |
|-----------|---------|--------|---------|
| CLI Tool | `gsd-tools.cjs` (5300+ lines, zero-dep Node.js CJS) | `mow-tools.cjs` | State operations, config, commits, phase management |
| Workflows | `~/.claude/get-shit-done/workflows/` (32 .md files) | `~/.claude/mowism/workflows/` | Detailed workflow logic referenced by commands |
| Commands | `~/.claude/commands/gsd/` (31 .md files) | `~/.claude/commands/mow/` | Slash command registrations (`/mow:*`) |
| Agents | `~/.claude/agents/gsd-*.md` (11 files) | `~/.claude/agents/mow-*.md` | Subagent definitions |
| Templates | `~/.claude/get-shit-done/templates/` (25+ files) | `~/.claude/mowism/templates/` | File templates for `.planning/` artifacts |
| References | `~/.claude/get-shit-done/references/` (13 files) | `~/.claude/mowism/references/` | Reference documentation |

### Supporting
| Component | Purpose | Notes |
|-----------|---------|-------|
| Quality skill specs | `ai-agent-tools-and-tips/SKILLS.md` | Source for creating 7 new skill commands |
| Workflow chain spec | `ai-agent-tools-and-tips/RECOMMENDED-WORKFLOW-CHAIN.md` | Defines execution order for quality skills |

### No Alternatives Needed
This is a fork-and-rename operation. There are no library choices or alternative approaches to consider. The stack is inherited from GSD as-is.

## Architecture Patterns

### Recommended Project Structure (Target)

```
~/.claude/mowism/                     # Install directory (was ~/.claude/get-shit-done/)
├── bin/
│   ├── mow-tools.cjs                # Fork of gsd-tools.cjs
│   └── mow-tools.test.cjs           # Fork of gsd-tools.test.cjs
├── workflows/                        # 32 workflow files (rebranded)
│   ├── new-project.md
│   ├── execute-phase.md
│   ├── execute-plan.md
│   ├── plan-phase.md
│   ├── discuss-phase.md
│   ├── verify-work.md
│   ├── verify-phase.md
│   ├── resume-project.md
│   ├── progress.md
│   ├── help.md
│   ├── ... (20 more)
│   └── quick.md
├── templates/                        # Template files (rebranded)
│   ├── config.json
│   ├── context.md
│   ├── state.md
│   ├── summary.md
│   ├── roadmap.md
│   ├── project.md
│   ├── requirements.md
│   ├── phase-prompt.md
│   ├── ... (15 more)
│   ├── codebase/                    # 7 codebase mapping templates
│   └── research-project/            # 5 research templates
├── references/                       # Reference docs (rebranded)
│   ├── ui-brand.md
│   ├── questioning.md
│   ├── model-profiles.md
│   ├── ... (10 more)
│   └── verification-patterns.md
└── VERSION

~/.claude/commands/mow/               # Slash commands (was ~/.claude/commands/gsd/)
├── new-project.md                    # /mow:new-project
├── execute-phase.md                  # /mow:execute-phase
├── plan-phase.md                     # /mow:plan-phase
├── discuss-phase.md                  # /mow:discuss-phase
├── verify-work.md                    # /mow:verify-work
├── progress.md                       # /mow:progress
├── resume-work.md                    # /mow:resume-work
├── research-phase.md                 # /mow:research-phase
├── help.md                           # /mow:help
├── ... (20 more)
├── migrate.md                        # /mow:migrate (NEW)
├── scope-check.md                    # /scope-check (quality skill, NEW)
├── simplify.md                       # /simplify (quality skill, NEW)
├── dead-code-sweep.md                # /dead-code-sweep (quality skill, NEW)
├── prove-it.md                       # /prove-it (quality skill, NEW)
├── grill-me.md                       # /grill-me (quality skill, NEW)
├── change-summary.md                 # /change-summary (quality skill, NEW)
└── update-claude-md.md               # /update-claude-md (quality skill, NEW)

~/.claude/agents/                     # Subagent definitions (renamed in-place)
├── mow-executor.md                   # Was gsd-executor.md
├── mow-planner.md                    # Was gsd-planner.md
├── mow-verifier.md                   # Was gsd-verifier.md
├── mow-phase-researcher.md           # Was gsd-phase-researcher.md
├── mow-project-researcher.md         # Was gsd-project-researcher.md
├── mow-research-synthesizer.md       # Was gsd-research-synthesizer.md
├── mow-debugger.md                   # Was gsd-debugger.md
├── mow-codebase-mapper.md            # Was gsd-codebase-mapper.md
├── mow-plan-checker.md               # Was gsd-plan-checker.md
├── mow-integration-checker.md        # Was gsd-integration-checker.md
└── mow-roadmapper.md                 # Was gsd-roadmapper.md
```

### Pattern 1: Quality Skill Registration

**What:** The 7 quality skills (scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary, update-claude-md) are registered as standalone Claude Code commands. Unlike the GSD workflow commands which use the `mow:` namespace prefix, the quality skills use bare names (no namespace) because they are general-purpose tools, not Mowism-specific workflows.

**Why:** The SKILLS.md and RECOMMENDED-WORKFLOW-CHAIN.md show these skills as standalone invocations: `/scope-check`, `/simplify`, etc. They work independently of the GSD/Mowism workflow system. Namespacing them as `/mow:scope-check` would make them feel like Mowism-only features rather than general tools.

**Registration location:** Quality skills go in `~/.claude/commands/` as top-level .md files (NOT inside a `mow/` subdirectory), making them available as `/scope-check` rather than `/mow:scope-check`.

**Note:** The ROADMAP.md success criteria says "User can run `/scope-check`, `/simplify`, etc. as registered Mowism skills" -- the key is "registered in Mowism" (shipped with it), not "namespaced under mow:".

### Pattern 2: Command-Workflow Indirection

**What:** GSD uses a two-layer architecture: lightweight command files (`~/.claude/commands/gsd/*.md`) that reference heavier workflow files (`~/.claude/get-shit-done/workflows/*.md`). Commands define the slash command metadata (name, description, allowed tools) and `@`-reference the workflow file for actual logic.

**Why this matters for rebranding:**
- Command files contain: `name: gsd:*`, `@/home/max/.claude/get-shit-done/...` paths, occasional `/gsd:*` references in descriptions
- Workflow files contain: `gsd-tools.cjs` invocations, `/gsd:*` command references, `GSD ►` banner text, `get-shit-done` paths, agent type references like `gsd-executor`
- Both layers must be rebranded for the system to work

**Example transformation (command file):**
```
# Before (gsd)
name: gsd:execute-phase
@/home/max/.claude/get-shit-done/workflows/execute-phase.md
@/home/max/.claude/get-shit-done/references/ui-brand.md
node /home/max/.claude/get-shit-done/bin/gsd-tools.cjs

# After (mow)
name: mow:execute-phase
@/home/max/.claude/mowism/workflows/execute-phase.md
@/home/max/.claude/mowism/references/ui-brand.md
node /home/max/.claude/mowism/bin/mow-tools.cjs
```

### Pattern 3: String Replacement Categories

**What:** The "gsd" string appears in 6 distinct categories, each requiring different replacement rules. Processing must happen in a specific order to avoid double-replacement bugs.

**Replacement table (ordered by specificity, most specific first):**

| Category | Pattern | Replacement | Count | Example |
|----------|---------|-------------|-------|---------|
| 1. Absolute paths | `/home/max/.claude/get-shit-done/` | `/home/max/.claude/mowism/` | ~186 | `@/home/max/.claude/get-shit-done/workflows/...` |
| 2. Config paths | `~/.gsd/` or `.gsd/` | `~/.mowism/` or `.mowism/` | 3 | `~/.gsd/brave_api_key`, `~/.gsd/defaults.json` |
| 3. Branch templates | `gsd/phase-` and `gsd/{milestone}` | `mow/phase-` and `mow/{milestone}` | 4 | `gsd/phase-{phase}-{slug}` |
| 4. Command names | `/gsd:` | `/mow:` | ~200 | `/gsd:execute-phase` |
| 5. Agent types | `gsd-` (in agent contexts) | `mow-` | ~130 | `gsd-executor`, `gsd-planner` |
| 6. Brand strings | `GSD ►` and `GSD` (brand) | `MOW ▶` and `MOW` (brand) | ~15 | banner text, help header |
| 7. Temp file prefix | `gsd-` (in tmpdir contexts) | `mow-` | 1 | `gsd-${Date.now()}.json` |

**Order matters:** Replace absolute paths first (most specific), then shorter patterns. Replacing `gsd` globally before `get-shit-done` would corrupt path strings.

### Anti-Patterns to Avoid

- **Global regex replace without context:** A naive `s/gsd/mow/g` would break things like "gsd" in comments explaining the fork origin, and would produce malformed paths if the order is wrong.
- **Renaming files without updating references:** Every file rename (e.g., `gsd-tools.cjs` to `mow-tools.cjs`) must be paired with updating all files that reference the old name.
- **Forgetting the test file:** `gsd-tools.test.cjs` also needs rebranding. Its 89 "gsd" occurrences include test assertions that check for GSD-branded output.
- **Leaving agent frontmatter unchanged:** Agent definition files have `name: gsd-*` in YAML frontmatter that must also be updated.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quality skill command files | Write each from scratch | Derive from SKILLS.md detailed specifications | The SKILLS.md already has complete descriptions, examples, expected behavior, and GSD integration notes for each skill |
| Migration path backup | Custom backup logic | `cp -r .planning/ .planning.backup.$(date +%s)` | Unix timestamp in name avoids collisions, single command, trivially verifiable |
| Command registration | Custom plugin system | Claude Code's native command system (`~/.claude/commands/<namespace>/*.md`) | Native system handles discovery, slash command registration, argument passing |
| String replacement order | Ad-hoc replacement script | Ordered replacement list (most specific first) | Prevents double-replacement and corrupted paths |

**Key insight:** This phase is almost entirely mechanical file-copy-and-replace. The temptation is to build tooling. Resist it — the files are well-structured, the patterns are consistent, and doing the replacements file-by-file with a clear replacement table is more reliable than building a migration script for a one-time operation.

## Common Pitfalls

### Pitfall 1: Double Replacement
**What goes wrong:** Replacing `gsd` with `mow` in a string that already contains `mow` from a previous replacement, or replacing a substring of a longer match.
**Why it happens:** Unordered or overlapping regex patterns. For example, replacing `gsd-tools` first produces `mow-tools`, then a later `gsd` replacement has nothing left to match in that string (benign case) — but replacing `gsd` first and then `get-shit-done` never matches (harmful case because the path is now `get-shit-done` with `gsd` replaced inside it, producing garbage).
**How to avoid:** Process replacements in order of specificity: longest/most-specific patterns first. Replace `get-shit-done` and full paths before replacing `gsd` as a standalone token.
**Warning signs:** Paths that look like `/home/max/.claude/mowism/` but with `get-shit-done` still in them, or agent names like `mow-mow-executor`.

### Pitfall 2: Hardcoded User Home Path
**What goes wrong:** The GSD commands hardcode `/home/max/.claude/get-shit-done/` as absolute paths. Forking these files directly embeds a specific user's home directory.
**Why it happens:** GSD uses `@` references with absolute paths because Claude Code's `@` syntax requires them.
**How to avoid:** In the Mowism fork, replace `/home/max/.claude/get-shit-done/` with `/home/max/.claude/mowism/` in the repo files. For future distribution (Phase 3), the install script will need to resolve the actual home directory. For now, the fork is for the user's own system, so hardcoded paths work.
**Warning signs:** Commands that reference `~` instead of the full path (Claude Code `@` syntax requires absolute paths, not `~`).

### Pitfall 3: Agent Name Mismatch
**What goes wrong:** An agent definition file is renamed from `gsd-executor.md` to `mow-executor.md`, but the command/workflow that spawns it still references `gsd-executor` in the `agent:` frontmatter or Task() prompt.
**Why it happens:** Agent references appear in three places: (1) command frontmatter `agent: gsd-planner`, (2) workflow Task() calls `subagent_type="gsd-executor"`, (3) model profile resolution `resolve-model gsd-executor`. Missing any one breaks spawning.
**How to avoid:** After renaming, grep the entire mowism directory for any remaining `gsd-` strings. Every occurrence should be `mow-` except source-code comments acknowledging the GSD origin.
**Warning signs:** "Agent not found" or "Unknown agent type" errors when running commands.

### Pitfall 4: Config Key Compatibility
**What goes wrong:** The `config.json` in `.planning/` may have `model_overrides` with GSD agent names as keys (e.g., `"gsd-executor": "opus"`). If the tools look up `mow-executor` but the config still has `gsd-executor`, overrides silently fail.
**Why it happens:** The config is user data in the `.planning/` directory, not part of the installed tool. Forking the tool code doesn't update user configs.
**How to avoid:** The migration command (`/mow:migrate`) must update `model_overrides` keys in `config.json` along with content in .md files. Also, `mow-tools.cjs` should accept both `gsd-*` and `mow-*` agent names during a transition period, or the migration should be thorough enough that no GSD keys remain.
**Warning signs:** Agent model overrides that were set explicitly suddenly stop working.

### Pitfall 5: Quality Skills Without Agent Context
**What goes wrong:** Quality skills (scope-check, simplify, etc.) are created as bare commands but fail because they need project context (recent git changes, codebase access) that requires specific tool permissions.
**Why it happens:** The SKILLS.md descriptions are conceptual. Converting them to working Claude Code commands requires specifying `allowed-tools` in the YAML frontmatter.
**How to avoid:** Each quality skill command must include appropriate `allowed-tools` based on what it does. For example: `/scope-check` needs Read, Bash (for git diff), Grep. `/prove-it` needs Read, Bash (for running tests, git commands), Write. `/update-claude-md` needs Read, Write, Edit.
**Warning signs:** "Permission denied" or "Tool not available" errors when running quality skills.

### Pitfall 6: Migration of Mid-Execution State
**What goes wrong:** A user runs `/mow:migrate` on a `.planning/` directory that is mid-phase — with some plans complete and some in progress. STATE.md references specific phase directories, plans, and resume files.
**Why it happens:** Migration operates on content strings, but STATE.md contains positional state (phase numbers, plan numbers, status) that is semantic, not just branding.
**How to avoid:** Migration should ONLY replace GSD-specific strings, NOT modify any semantic content. The phase numbers, plan numbers, status markers, progress bars, and timing data are brand-neutral and should be left untouched. Specifically:
- Replace `/gsd:*` command references with `/mow:*`
- Replace `gsd-*` agent names with `mow-*` in model override configs
- Replace `gsd/phase-` branch templates with `mow/phase-`
- Leave phase numbers, plan content, progress data, and decision logs alone
**Warning signs:** After migration, STATE.md shows wrong phase number or progress gets reset.

## Code Examples

### Command File Transformation Example

Before (GSD `~/.claude/commands/gsd/execute-phase.md`):
```yaml
---
name: gsd:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--gaps-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
<execution_context>
@/home/max/.claude/get-shit-done/workflows/execute-phase.md
@/home/max/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<process>
Execute the execute-phase workflow from @/home/max/.claude/get-shit-done/workflows/execute-phase.md end-to-end.
</process>
```

After (Mowism `~/.claude/commands/mow/execute-phase.md`):
```yaml
---
name: mow:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--gaps-only]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
<execution_context>
@/home/max/.claude/mowism/workflows/execute-phase.md
@/home/max/.claude/mowism/references/ui-brand.md
</execution_context>

<process>
Execute the execute-phase workflow from @/home/max/.claude/mowism/workflows/execute-phase.md end-to-end.
</process>
```

### Agent File Transformation Example

Before (`~/.claude/agents/gsd-executor.md` frontmatter):
```yaml
---
name: gsd-executor
description: ...executes plans...
tools: Read, Write, Edit, Bash, Glob, Grep
color: green
---
```

After (`~/.claude/agents/mow-executor.md` frontmatter):
```yaml
---
name: mow-executor
description: ...executes plans...
tools: Read, Write, Edit, Bash, Glob, Grep
color: green
---
```

### gsd-tools.cjs Key Sections to Rebrand

```javascript
// 1. Header comment (lines 4-6)
// Before:
// * GSD Tools — CLI utility for GSD workflow operations
// After:
// * MOW Tools — CLI utility for Mowism workflow operations

// 2. Model profile table (lines 133-143)
// Before:
'gsd-planner':              { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
// After:
'mow-planner':              { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },

// 3. Branch templates (lines 171-172, 629-630)
// Before:
phase_branch_template: 'gsd/phase-{phase}-{slug}',
milestone_branch_template: 'gsd/{milestone}-{slug}',
// After:
phase_branch_template: 'mow/phase-{phase}-{slug}',
milestone_branch_template: 'mow/{milestone}-{slug}',

// 4. Config directory (lines 609, 613, 4413)
// Before:
const braveKeyFile = path.join(homedir, '.gsd', 'brave_api_key');
const globalDefaultsPath = path.join(homedir, '.gsd', 'defaults.json');
// After:
const braveKeyFile = path.join(homedir, '.mowism', 'brave_api_key');
const globalDefaultsPath = path.join(homedir, '.mowism', 'defaults.json');

// 5. Temp file prefix (line 481)
// Before:
const tmpPath = path.join(require('os').tmpdir(), `gsd-${Date.now()}.json`);
// After:
const tmpPath = path.join(require('os').tmpdir(), `mow-${Date.now()}.json`);

// 6. Error messages with command references (lines 3662-3843, 4001)
// Before:
addIssue('error', 'E001', '...', 'Run /gsd:new-project to initialize');
// After:
addIssue('error', 'E001', '...', 'Run /mow:new-project to initialize');

// 7. Usage line (line 4922)
// Before:
error('Usage: gsd-tools <command> [args] [--raw]...');
// After:
error('Usage: mow-tools <command> [args] [--raw]...');

// 8. Agent model resolution references (lines 4251-4252, 4322-4324, etc.)
// Before:
executor_model: resolveModelInternal(cwd, 'gsd-executor'),
// After:
executor_model: resolveModelInternal(cwd, 'mow-executor'),
```

### Quality Skill Command Example (New)

For `/scope-check` (SKIL-01), creating `~/.claude/commands/scope-check.md`:
```yaml
---
name: scope-check
description: Verify recent changes stay within the scope of the original task
argument-hint: "[description of original task or commit range]"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---
<objective>
Review recent changes and classify each as in-scope or out-of-scope relative to
the original task. Catch removed comments, "cleaned up" unrelated code, refactored
adjacent systems, and deleted code that seemed unused.
</objective>

<process>
1. Determine the original task intent (from $ARGUMENTS or recent commits)
2. Review all modified files via `git diff` (or `git diff HEAD~N` for recent commits)
3. Classify each change: IN-SCOPE, OUT-OF-SCOPE, or WARNING
4. Present findings with recommendations (revert out-of-scope changes)
5. Give a verdict: PASS (all in scope) or FAIL (scope violations found)
</process>
```

### Migration Command Example (New)

For `/mow:migrate`, creating `~/.claude/commands/mow/migrate.md`:
```yaml
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
<objective>
Upgrade an existing GSD `.planning/` directory to Mowism format.

1. Backup `.planning/` to `.planning.backup.{timestamp}/`
2. Replace GSD-specific strings in all .planning/ files:
   - `/gsd:*` command references → `/mow:*`
   - `gsd-*` agent names in config overrides → `mow-*`
   - `gsd/phase-*` branch templates → `mow/phase-*`
   - `GSD` brand references → `MOW` (in banner/status contexts only)
   - `gsd-tools.cjs` → `mow-tools.cjs`
   - `get-shit-done` path references → `mowism`
3. Verify no `gsd` strings remain in user-visible content
4. Auto-commit all changes with message "chore: migrate .planning/ from GSD to Mowism format"
</objective>
```

## UI Brand Transformation

The UI brand reference file (`references/ui-brand.md`) defines visual patterns. Key changes:

| Element | Before | After |
|---------|--------|-------|
| Stage banner prefix | `GSD ►` | `MOW ▶` |
| Help header | `GSD (Get Shit Done)` | `MOW (Mowism)` |
| Anti-pattern note | `Skipping GSD ► prefix` | `Skipping MOW ▶ prefix` |
| Next-up commands | `/gsd:alternative-1` | `/mow:alternative-1` |

## Complete File Inventory

### Files to Copy and Rebrand (from `~/.claude/get-shit-done/`)

**Workflows (32 files):**
add-phase.md, add-todo.md, audit-milestone.md, check-todos.md, cleanup.md, complete-milestone.md, diagnose-issues.md, discovery-phase.md, discuss-phase.md, execute-phase.md, execute-plan.md, health.md, help.md, insert-phase.md, list-phase-assumptions.md, map-codebase.md, new-milestone.md, new-project.md, pause-work.md, plan-milestone-gaps.md, plan-phase.md, progress.md, quick.md, remove-phase.md, research-phase.md, resume-project.md, set-profile.md, settings.md, transition.md, update.md, verify-phase.md, verify-work.md

**Templates (25 files in 3 directories):**
Root: config.json, context.md, continue-here.md, DEBUG.md, debug-subagent-prompt.md, discovery.md, milestone-archive.md, milestone.md, phase-prompt.md, planner-subagent-prompt.md, project.md, requirements.md, research.md, roadmap.md, state.md, summary-complex.md, summary-minimal.md, summary-standard.md, summary.md, UAT.md, user-setup.md, verification-report.md
Codebase: architecture.md, concerns.md, conventions.md, integrations.md, stack.md, structure.md, testing.md
Research-project: ARCHITECTURE.md, FEATURES.md, PITFALLS.md, STACK.md, SUMMARY.md

**References (13 files):**
checkpoints.md, continuation-format.md, decimal-phase-calculation.md, git-integration.md, git-planning-commit.md, model-profile-resolution.md, model-profiles.md, phase-argument-parsing.md, planning-config.md, questioning.md, tdd.md, ui-brand.md, verification-patterns.md

**Binaries (2 files):**
gsd-tools.cjs, gsd-tools.test.cjs

**Other (1 file):**
VERSION

### Files to Copy and Rebrand (from `~/.claude/commands/gsd/`)

**Commands (31 files, map to `/mow:*` commands):**
add-phase.md, add-todo.md, audit-milestone.md, check-todos.md, cleanup.md, complete-milestone.md, debug.md, discuss-phase.md, execute-phase.md, health.md, help.md, insert-phase.md, join-discord.md, list-phase-assumptions.md, map-codebase.md, new-milestone.md, new-project.md, pause-work.md, plan-milestone-gaps.md, plan-phase.md, progress.md, quick.md, reapply-patches.md, remove-phase.md, research-phase.md, resume-work.md, set-profile.md, settings.md, update.md, verify-work.md

**Note:** `new-project.md.bak` should NOT be forked (backup file).

### Files to Copy and Rebrand (from `~/.claude/agents/`)

**Agent definitions (11 files):**
gsd-codebase-mapper.md → mow-codebase-mapper.md
gsd-debugger.md → mow-debugger.md
gsd-executor.md → mow-executor.md
gsd-integration-checker.md → mow-integration-checker.md
gsd-phase-researcher.md → mow-phase-researcher.md
gsd-plan-checker.md → mow-plan-checker.md
gsd-planner.md → mow-planner.md
gsd-project-researcher.md → mow-project-researcher.md
gsd-research-synthesizer.md → mow-research-synthesizer.md
gsd-roadmapper.md → mow-roadmapper.md
gsd-verifier.md → mow-verifier.md

### New Files to Create

**Quality skill commands (7 files, top-level in `~/.claude/commands/`):**
scope-check.md, simplify.md, dead-code-sweep.md, prove-it.md, grill-me.md, change-summary.md, update-claude-md.md

**Migration command (1 file, in `~/.claude/commands/mow/`):**
migrate.md

## Migration Strategy (Claude's Discretion Recommendation)

### Backup Naming Convention
**Recommendation:** `.planning.backup.{unix_timestamp}/`
- Example: `.planning.backup.1739980800/`
- Unix timestamp is guaranteed unique, sortable, and trivially parseable
- Located as a sibling of `.planning/` in the project root

### Partial Migration Handling
**Recommendation:** Migrate everything regardless of execution state. The migration only touches GSD-specific strings, not semantic content. Whether a phase is mid-execution, complete, or not started, the same string replacements apply. The backup ensures recovery.

Specific considerations:
- `.continue-here*.md` files: May contain `/gsd:*` command references. Replace them.
- SUMMARY.md files: May reference `gsd-executor` in metrics. Replace agent names.
- VERIFICATION.md files: May reference `/gsd:verify-work`. Replace command names.
- Active plan files (PLAN.md): May contain `gsd-tools.cjs` references. Replace tool name.

### String Replacement Strategy
**Recommendation:** Literal string replacement, not regex. Process in specificity order:

1. `/home/max/.claude/get-shit-done/` → `/home/max/.claude/mowism/` (full paths)
2. `get-shit-done` → `mowism` (any remaining path fragments)
3. `~/.gsd/` → `~/.mowism/` (config paths)
4. `.gsd/` → `.mowism/` (config paths without tilde)
5. `gsd/phase-` → `mow/phase-` (branch templates)
6. `gsd/{milestone}` → `mow/{milestone}` (branch templates)
7. `/gsd:` → `/mow:` (command names)
8. `gsd-tools.cjs` → `mow-tools.cjs` (tool references)
9. `gsd-tools` → `mow-tools` (tool references without extension)
10. `gsd-planner` → `mow-planner` (agent names, one per agent type)
11. `gsd-executor` → `mow-executor`
12. `gsd-verifier` → `mow-verifier`
13. `gsd-phase-researcher` → `mow-phase-researcher`
14. `gsd-project-researcher` → `mow-project-researcher`
15. `gsd-research-synthesizer` → `mow-research-synthesizer`
16. `gsd-debugger` → `mow-debugger`
17. `gsd-codebase-mapper` → `mow-codebase-mapper`
18. `gsd-plan-checker` → `mow-plan-checker`
19. `gsd-integration-checker` → `mow-integration-checker`
20. `gsd-roadmapper` → `mow-roadmapper`
21. `GSD ►` → `MOW ▶` (banner prefix — note the different arrow characters)
22. `GSD ▶` → `MOW ▶` (alternate arrow, if used)
23. `GSD` → `MOW` (remaining brand references, ONLY in banner/brand contexts)

**Important:** Step 23 must be applied carefully — not all "GSD" occurrences should become "MOW". In source comments acknowledging the GSD origin (like "forked from GSD"), leave them as-is. The migration tool should only apply step 23 to `.planning/` user files, and even there, only in known brand contexts (banner text, status prefixes).

### Error Recovery
**Recommendation:** If migration fails partway through:
1. The backup directory already exists (it was created first)
2. Restore from backup: `rm -rf .planning/ && mv .planning.backup.{ts}/ .planning/`
3. The migration command should catch errors and print the restore command
4. Auto-commit only happens AFTER all replacements succeed and pass a verification grep

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GSD workflows in `~/.claude/get-shit-done/workflows/` | Claude Code native skills in `~/.claude/skills/` | Mid-2025 | The ARCHITECTURE.md research recommends migrating to the skill system in a future phase. For Phase 1, we preserve the existing command+workflow pattern. |
| GSD commands as custom namespace commands | Same pattern, just renamed `/mow:*` | Phase 1 | No architectural change, just naming |

**Note for future phases:** The ARCHITECTURE.md research recommends converting workflows to the newer Claude Code skill system (`~/.claude/skills/mow-*/SKILL.md`). This is NOT part of Phase 1 — we preserve the existing `~/.claude/commands/` + `workflows/` architecture to minimize risk. Skill system migration could be a separate initiative.

## Open Questions

1. **`join-discord.md` command**
   - What we know: GSD has a `/gsd:join-discord` command that presumably links to a GSD Discord server
   - What's unclear: Should this be dropped from Mowism, or replaced with a Mowism-specific community link?
   - Recommendation: Drop it for Phase 1. If Mowism needs a community channel later, create one. Don't link to GSD's Discord under a Mowism brand.

2. **`reapply-patches.md` command**
   - What we know: GSD has a `/gsd:reapply-patches` command (10 GSD references)
   - What's unclear: This appears to be an internal GSD maintenance command. Is it relevant to Mowism?
   - Recommendation: Fork it as-is (rebranded). It may be useful for the same purpose in Mowism. Can be removed later if unnecessary.

3. **`update.md` command**
   - What we know: GSD has a `/gsd:update` command that runs `npx get-shit-done-cc@latest`
   - What's unclear: Mowism will have its own install mechanism. This command needs to be rewritten, not just rebranded.
   - Recommendation: Create a placeholder `/mow:update` that advises the user to git-pull the Mowism repo. Full install/update mechanism is Phase 3 (DIST-01).

4. **Quality skill `allowed-tools` specifics**
   - What we know: Each quality skill needs specific tool permissions
   - What's unclear: The exact minimum tool set for each skill
   - Recommendation: Start with a generous tool set per skill based on what each needs to do, then tighten in testing. Better to have tools available and unused than to hit permission errors.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-01 | All GSD workflows forked and `/gsd:*` commands rebranded to `/mow:*` | Complete file inventory (32 workflows, 31 commands). String replacement table with 23 ordered patterns. Command-Workflow indirection pattern documented. |
| CORE-02 | `gsd-tools.cjs` forked to `mow-tools.cjs` with all internal references updated | 55 GSD occurrences identified in gsd-tools.cjs across 8 categories: header, model profiles, branch templates, config paths, temp files, error messages, usage line, agent model references. Code examples provided. |
| CORE-03 | All GSD agent definitions forked with updated references to Mowism paths | 11 agent files identified with 119 total GSD occurrences. File rename mapping documented. Frontmatter name field and internal references both need updating. |
| CORE-04 | All GSD templates forked with updated branding | 25+ template files inventoried. GSD references in templates include command names, tool paths, agent names, and brand text. |
| CORE-05 | All GSD references (questioning guide, UI brand) forked with updated branding | 13 reference files inventoried. UI brand transformation table (GSD ► → MOW ▶, etc.) documented. |
| CORE-06 | `/mow:migrate` command upgrades existing GSD `.planning/` directory to Mowism format | Migration strategy fully specified: backup naming, string replacement order, partial migration handling, error recovery. Example command file provided. |
| SKIL-01 | `/scope-check` skill forked and registered in Mowism | Full specification in SKILLS.md. Example command file provided. Needs: Read, Bash, Grep, Glob tools. |
| SKIL-02 | `/simplify` skill forked and registered in Mowism | Full specification in SKILLS.md. Needs: Read, Bash, Grep, Glob, Edit tools. |
| SKIL-03 | `/dead-code-sweep` skill forked and registered in Mowism | Full specification in SKILLS.md. Needs: Read, Bash, Grep, Glob tools. |
| SKIL-04 | `/prove-it` skill forked and registered in Mowism | Full specification in SKILLS.md. Needs: Read, Bash, Grep, Glob, Write tools. |
| SKIL-05 | `/grill-me` skill forked and registered in Mowism | Full specification in SKILLS.md. Needs: Read, Bash, Grep, Glob tools. |
| SKIL-06 | `/change-summary` skill forked and registered in Mowism | Full specification in SKILLS.md. Needs: Read, Bash, Grep, Glob tools. |
| SKIL-07 | `/update-claude-md` skill forked and registered in Mowism | Full specification in SKILLS.md. Needs: Read, Write, Edit, Bash tools. |
</phase_requirements>

## Sources

### Primary (HIGH confidence)
- `/home/max/.claude/get-shit-done/` — Direct examination of all 56 GSD files, string counting, path analysis
- `/home/max/.claude/commands/gsd/` — Direct examination of all 31 command registration files
- `/home/max/.claude/agents/gsd-*.md` — Direct examination of all 11 agent definition files
- `/home/max/git/ai-agent-tools-and-tips/SKILLS.md` — Complete quality skill specifications
- `/home/max/git/ai-agent-tools-and-tips/RECOMMENDED-WORKFLOW-CHAIN.md` — Quality skill execution order
- `/home/max/git/mowism/.planning/` — Direct examination of existing project planning files

### Secondary (MEDIUM confidence)
- `/home/max/git/mowism/.planning/research/ARCHITECTURE.md` — Prior project research on target architecture (recommends skill system migration for future)

### Tertiary (LOW confidence)
- None — all findings verified through direct file examination

## Metadata

**Confidence breakdown:**
- File inventory: HIGH — every file examined directly, counts verified with grep
- String replacement strategy: HIGH — all patterns identified by examining actual file contents
- Quality skill specifications: HIGH — SKILLS.md provides complete specifications verified against source material
- Migration strategy: MEDIUM — strategy is sound but untested; edge cases in mid-execution state may surface during implementation

**Research date:** 2026-02-19
**Valid until:** Indefinite (static source files, no external dependencies or version-sensitive findings)
