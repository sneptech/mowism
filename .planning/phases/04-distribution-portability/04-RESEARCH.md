# Phase 4: Distribution Portability - Research

**Researched:** 2026-02-20
**Domain:** Path portability, environment detection, stale file cleanup
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fix ALL files in the repo, including `.planning/` historical artifacts -- not just distributed files
- Full consistency: zero occurrences of `/home/max/.claude/` anywhere in the repository
- Broader sweep beyond the 4 known audit gaps -- check for any portability assumptions that would break on Ubuntu, macOS, or other environments (fish-isms, CachyOS-specific paths, etc.)

### Claude's Discretion
- Path resolution method (`$HOME/.claude/` substitution vs runtime resolution vs PATH binary)
- Env var tolerance level for Agent Teams detection (strict vs relaxed matching)
- Stale file cleanup granularity (directory vs individual files)
- Validation depth (grep sweep vs Docker test)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIST-04 | Install script checks for Agent Teams env var and informs user it's optional but recommended | install.sh already does this correctly (checks both `true` and `1`); the mismatch is in `checkAgentTeams()` in mow-tools.cjs which only checks `=== '1'` |
| DIST-01 | One-command install script that clones repo and registers all /mow:* skills in ~/.claude/ | install.sh works but copies files with hardcoded `/home/max/.claude/` paths; source files must be fixed before install.sh can produce working results |
| CORE-01 | All GSD workflows forked and /gsd:* commands rebranded to /mow:* | Already done in Phase 1; this phase fixes the paths inside those files |
| CORE-03 | All GSD agent definitions forked with updated references to Mowism paths | Already done in Phase 1; this phase fixes the paths inside those files |
| TEAM-04 | Without Agent Teams env var, Mowism still works but gives a prominent nudge with exact instructions | Nudge mechanism exists but `checkAgentTeams()` fails to detect `=true` which install.sh recommends; fix makes nudge work correctly |
</phase_requirements>

## Summary

This phase is a focused find-and-replace plus two small code fixes. The work has no architectural complexity -- it is a mechanical transformation with clear before/after states and a simple validation criterion (zero occurrences of the hardcoded path).

**The core problem:** When Mowism was forked from GSD in Phase 1, all paths were rewritten from `~/.claude/get-shit-done/` to `/home/max/.claude/mowism/` using the developer's actual home directory instead of a portable form. The upstream GSD project uses `~/.claude/get-shit-done/` throughout (verified by reading the current GSD repository), which is the correct portable pattern. Mowism must adopt the same pattern: `~/.claude/mowism/`.

**Quantitative scope:** 411 occurrences across 106 files. Broken down:
- 81 distributed files (commands, agents, workflows, references, templates) -- these are what users install
- 25 `.planning/` historical artifacts -- these do not affect users but must be fixed per user's decision
- Usage patterns: 155 `@` context references, 182 `node` command invocations, 74 other references (text, docs, templates)

**The fix is a simple string substitution** -- `/home/max/.claude/` becomes `~/.claude/` -- plus two targeted code changes in `mow-tools.cjs` and deletion of stale files in `mowism/bin/`.

**Primary recommendation:** Replace all 411 occurrences of `/home/max/.claude/` with `~/.claude/` across the entire repository, fix `checkAgentTeams()` to accept both `'1'` and `'true'`, delete the stale `mowism/bin/` directory, and validate with a grep sweep.

## Standard Stack

This phase involves no new libraries. All changes are to existing markdown files and one JavaScript file (`mow-tools.cjs`).

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| `sed` or scripted find-replace | Bulk path substitution across 106 files | Standard Unix text transformation; safe for literal string replacement |
| `grep -r` | Validation sweep to confirm zero remaining occurrences | Standard verification tool |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `wc -l` / `grep -c` | Count occurrences before/after for audit trail | Pre/post verification |
| `git diff --stat` | Verify scope of changes matches expectations | Post-change review |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Source file fixes | install.sh `sed` substitution at copy time | Rejected: source files would remain wrong in the repo; `@` references in markdown are resolved by Claude Code before install.sh runs; GSD upstream proves source-level fix is the standard |
| `~/.claude/` (tilde) | `$HOME/.claude/` (env var) | `~` is correct: it works in Claude Code `@` references (verified via GSD upstream), in bash `node` invocations, and is what GSD uses. `$HOME` does NOT expand in `@` references. |

## Architecture Patterns

### Pattern 1: Tilde-Based Portable Paths (Recommended)

**What:** Use `~/.claude/mowism/` as the canonical path form in all source files.

**When to use:** Every file reference to the Mowism installation directory.

**Why this, not `$HOME`:** Claude Code's `@` file reference mechanism resolves `~` to the user's home directory. The upstream GSD project uses `@~/.claude/get-shit-done/...` for all context includes and `node ~/.claude/get-shit-done/bin/gsd-tools.cjs` for all command invocations. Both forms (`@~/...` and `node ~/...`) are standard and work across Linux, macOS, and other Unix systems.

`$HOME` expansion does NOT work in Claude Code `@` references. The `@` mechanism only supports absolute paths and tilde paths, not environment variable expansion.

**Evidence:**
- GSD upstream `commands/gsd/new-project.md` uses `@~/.claude/get-shit-done/workflows/new-project.md` (verified via GitHub API)
- GSD upstream `get-shit-done/workflows/new-project.md` uses `node ~/.claude/get-shit-done/bin/gsd-tools.cjs init new-project` (verified via GitHub API)
- Mowism `agents/mow-team-lead.md` already uses `node ~/.claude/mowism/bin/mow-tools.cjs` and works correctly
- Mowism `commands/mow/help-open.md` already uses `$HOME/.claude/mowism/help/` in bash blocks (also works, but tilde is more consistent)

**Example:**
```markdown
# Before (broken on non-developer machines)
@/home/max/.claude/mowism/workflows/execute-phase.md
node /home/max/.claude/mowism/bin/mow-tools.cjs init execute-phase "${PHASE}"

# After (portable)
@~/.claude/mowism/workflows/execute-phase.md
node ~/.claude/mowism/bin/mow-tools.cjs init execute-phase "${PHASE}"
```

Source: GSD upstream repository (github.com/gsd-build/get-shit-done), verified 2026-02-20

### Pattern 2: Truthy Value Matching for Env Vars

**What:** Accept multiple truthy representations of environment variable values.

**When to use:** Any boolean-like environment variable check.

**Example:**
```javascript
// Before (only detects '1')
if (process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {

// After (detects '1', 'true', 'yes')
const val = (process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS || '').toLowerCase();
if (val === '1' || val === 'true') {
```

The same pattern must apply to the settings.json fallback check (line 198 of mow-tools.cjs).

### Anti-Patterns to Avoid

- **Half-portable paths:** Mixing `~/.claude/` in some files and `/home/max/.claude/` in others. The fix must be all-or-nothing.
- **`$HOME` in `@` references:** `@$HOME/.claude/mowism/workflows/...` will NOT work. Claude Code does not expand environment variables in `@` paths.
- **Leaving stale files "just in case":** The `mowism/bin/` copies are 812 lines (28KB) behind the current `bin/` versions. They serve no purpose and will confuse anyone who looks at the repo.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bulk string replacement across files | Manual file-by-file editing | `sed -i 's|/home/max/.claude/|~/.claude/|g'` or scripted loop | 411 occurrences across 106 files; manual editing is error-prone and slow |
| Path detection at runtime | Custom home directory resolver | `~` (shell expansion) and `os.homedir()` (Node.js, already used) | Both are battle-tested cross-platform mechanisms |

**Key insight:** This is a text replacement problem, not an architecture problem. The fix is mechanical, not creative.

## Common Pitfalls

### Pitfall 1: Incomplete Replacement

**What goes wrong:** Some occurrences are missed, leaving a mixed state where some paths work and others do not.
**Why it happens:** Manual editing of 106 files; easy to miss files or occurrences within code blocks, comments, or template strings.
**How to avoid:** Use automated sed/replace across all files, then validate with `grep -r '/home/max/' .` (note: search for `/home/max/`, not just `/home/max/.claude/`, to catch any related hardcoding). The acceptance criterion is zero matches.
**Warning signs:** Any grep match after the replacement.

### Pitfall 2: Breaking @-Reference Syntax with Wrong Path Form

**What goes wrong:** Using `$HOME` or other variable syntax in `@` file references, which Claude Code does not expand.
**Why it happens:** Assuming Claude Code's `@` references work like bash variable expansion.
**How to avoid:** Use `~/.claude/` exclusively. This is the form GSD upstream uses and it is verified to work.
**Warning signs:** `@` references that contain `$HOME` or `${HOME}`.

### Pitfall 3: Forgetting the settings.json Check in checkAgentTeams

**What goes wrong:** Only fixing the env var check (line 189) but not the settings.json check (line 198), leaving a path where `"true"` in settings.json still fails detection.
**Why it happens:** The function has two independent checks; easy to fix one and miss the other.
**How to avoid:** Fix both comparisons in `checkAgentTeams()`. Both must accept `'1'` and `'true'`.
**Warning signs:** Tests pass for env var but not for settings.json configuration.

### Pitfall 4: Sed Accidentally Modifying Binary or Non-Target Content

**What goes wrong:** A broad `sed` command modifies content that happens to contain the target string but should not be changed (e.g., git object hashes, base64 content).
**Why it happens:** Running sed against all files without filtering by extension.
**How to avoid:** Restrict sed to `*.md`, `*.cjs`, and `*.sh` files. Exclude `.git/` directory. Run `git diff` after to review every change.
**Warning signs:** Changes in unexpected files or binary-looking diff output.

### Pitfall 5: macOS sed -i Syntax Difference

**What goes wrong:** `sed -i 's/old/new/g' file` works on GNU sed (Linux) but macOS requires `sed -i '' 's/old/new/g' file` (empty string argument for backup extension).
**Why it happens:** macOS ships BSD sed, not GNU sed.
**How to avoid:** If the developer runs this on macOS, use `sed -i '' ...` or install GNU sed via homebrew. Since the developer is on CachyOS (GNU sed), this is unlikely to be an issue during implementation, but worth noting for the planner.
**Warning signs:** `sed: 1: extra characters at the end of -i` error on macOS.

## Code Examples

### Example 1: Bulk Path Replacement

```bash
# Replace all occurrences in markdown, JavaScript, and shell files
# Must be run from repo root
find . -type f \( -name '*.md' -o -name '*.cjs' -o -name '*.sh' \) \
  -not -path './.git/*' \
  -exec sed -i 's|/home/max/\.claude/|~/.claude/|g' {} +

# Verify: should output 0
grep -r '/home/max/' . --include='*.md' --include='*.cjs' --include='*.sh' | grep -v '.git/' | wc -l
```

### Example 2: Fix checkAgentTeams() in mow-tools.cjs

```javascript
// Fix both the env var check and settings.json check
function checkAgentTeams() {
  // Check shell-level env var first
  const envVal = (process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS || '').toLowerCase();
  if (envVal === '1' || envVal === 'true') {
    return { enabled: true, source: 'env' };
  }

  // Fallback: check ~/.claude/settings.json
  try {
    const homedir = require('os').homedir();
    const settingsPath = path.join(homedir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const settingsVal = (
      (settings.env && settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) || ''
    ).toLowerCase();
    if (settingsVal === '1' || settingsVal === 'true') {
      return { enabled: true, source: 'settings' };
    }
  } catch {
    // settings.json doesn't exist or is malformed -- that's fine
  }

  return { enabled: false, source: null };
}
```

### Example 3: Delete Stale mowism/bin/ Directory

```bash
# mowism/bin/ contains only stale copies:
#   mow-tools.cjs     (5326 lines vs 6138 in bin/) -- 812 lines behind
#   mow-tools.test.cjs (2346 lines vs 2729 in bin/) -- 383 lines behind
# install.sh already copies from bin/, not mowism/bin/
rm -rf mowism/bin/
```

### Example 4: Update Tests for checkAgentTeams

```javascript
// Add test for 'true' value detection
test('checkAgentTeams detects env var set to true', () => {
  const original = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = 'true';

  const result = runMowTools('init new-project', tmpDir);
  assert.ok(result.success, `Command failed: ${result.error}`);

  const output = JSON.parse(result.output);
  assert.strictEqual(output.agent_teams_enabled, true, 'agent_teams_enabled should be true for "true"');

  // Restore
  if (original !== undefined) process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = original;
  else delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/home/max/.claude/` hardcoded paths | `~/.claude/` portable paths | GSD used portable from the start; Mowism diverged during fork | Blocking bug: product only works on developer's machine |
| `checkAgentTeams() === '1'` only | Accept `'1'` and `'true'` | install.sh already recommends `=true` | Users following install instructions get permanent nudge |
| `mowism/bin/` stale copies | Single source of truth in `bin/` | install.sh already copies from `bin/`, not `mowism/bin/` | Dead code in repo, confusing |

## Discretion Recommendations

### Path Resolution Method: Use `~/.claude/` (tilde)

**Recommendation: Tilde (`~/.claude/`)** -- not `$HOME/.claude/` or runtime resolution.

**Rationale:**
1. `@~/.claude/...` works in Claude Code `@` references (verified via GSD upstream).
2. `@$HOME/.claude/...` does NOT work -- Claude Code does not expand environment variables in `@` paths.
3. `node ~/.claude/...` works in bash (tilde expansion happens before command execution).
4. GSD upstream uses this form consistently -- it is the proven, standard pattern.
5. `$HOME` in bash code blocks would also work (e.g., `HELP_FILE="$HOME/.claude/mowism/help/..."`) but introduces inconsistency. Using `~` everywhere is simpler.
6. Exception: `$HOME` is acceptable in bash heredocs or quoted strings where tilde does not expand (e.g., inside double quotes without word splitting). However, in the Mowism codebase, all paths appear in contexts where tilde expansion works (unquoted command arguments, `@` references).

**Confidence: HIGH** -- verified against GSD upstream and Claude Code documentation.

### Env Var Tolerance: Accept Both '1' and 'true'

**Recommendation: Accept both `'1'` and `'true'` (case-insensitive).**

**Rationale:**
1. install.sh already recommends `=true` and checks for both values.
2. Different users/docs/platforms may use either form.
3. Cost of tolerance is one extra comparison; cost of strictness is permanent broken detection for users following install instructions.
4. No need to accept additional values like `'yes'` -- only `'1'` and `'true'` are documented anywhere in the ecosystem.

**Confidence: HIGH** -- the mismatch between install.sh and checkAgentTeams() is the documented bug.

### Stale File Cleanup: Delete Entire mowism/bin/ Directory

**Recommendation: Delete the entire `mowism/bin/` directory, not just individual files.**

**Rationale:**
1. `mowism/bin/` contains exactly 2 files: `mow-tools.cjs` (stale) and `mow-tools.test.cjs` (stale).
2. Both are snapshots from Phase 1, significantly behind their `bin/` counterparts (812 and 383 lines respectively).
3. `install.sh` copies from `bin/mow-tools.cjs` (line 58), not `mowism/bin/mow-tools.cjs`. The stale copies are never used.
4. No other file depends on `mowism/bin/` -- it was an artifact of early fork structure.
5. Deleting the directory is cleaner than leaving an empty directory.

**Confidence: HIGH** -- verified by reading install.sh and comparing file sizes/line counts.

### Validation Depth: Grep Sweep Is Sufficient

**Recommendation: Grep sweep, not Docker-based testing.**

**Rationale:**
1. The transformation is a literal string replacement (`/home/max/.claude/` to `~/.claude/`). There is no logic to test -- the question is simply "are there zero remaining occurrences?"
2. `grep -r '/home/max/' . --include='*.md' --include='*.cjs' --include='*.sh'` provides a definitive binary answer.
3. The `checkAgentTeams()` fix can be validated by running the existing test suite (`node bin/mow-tools.test.cjs`) plus the new test case for `'true'` detection.
4. Docker-based install testing would verify end-to-end behavior but adds significant complexity (Dockerfile creation, image building, test orchestration) for marginal confidence gain. The failure mode (wrong path) is fully covered by grep.
5. If the planner or executor feels uncertain after making changes, a Docker test can be added as an optional verification step. But it should not be a blocking requirement.

**Confidence: HIGH** -- the validation criterion (zero grep matches) is trivially verifiable.

## Portability Sweep: Beyond Hardcoded Paths

Per the user's decision, the broader portability audit found:

### Confirmed Issues
1. **Hardcoded `/home/max/.claude/` paths** -- 411 occurrences, 106 files. This is the primary issue.
2. **`checkAgentTeams()` env var mismatch** -- Only accepts `'1'`, misses `'true'`.
3. **Stale `mowism/bin/` copies** -- Dead code, 2 files.

### No Additional Issues Found
4. **No fish-isms in distributed files.** The install script (`bin/install.sh`) uses `#!/bin/bash` with standard POSIX-compatible bash. All commands in markdown files use bash syntax (which Claude Code runs via bash regardless of the user's login shell). The only fish references are in `.planning/PROJECT.md` (documentation, not executable) and `.planning/research/PITFALLS.md` (advisory notes).
5. **No CachyOS-specific paths.** The WorkTrunk install instructions in `install.sh` show `yay -S worktrunk (Arch) | brew install worktrunk (macOS) | cargo install worktrunk` -- this covers Arch, macOS, and generic platforms. It is advisory text, not executable code.
6. **No Wayland/X11 dependencies.** No references to `ydotool`, `wl-copy`, `wl-paste`, `xdotool`, or `xclip` in any distributed file.
7. **No hardcoded tool paths.** `mow-tools.cjs` uses `#!/usr/bin/env node` (portable shebang). All tool invocations use `command -v` for detection (portable).
8. **No `/home/max/` outside of `.claude/` context.** Verified: no other `/home/max/` references exist.
9. **`install.sh` uses portable bash.** `BASH_SOURCE[0]` with `cd`/`pwd` for script directory detection (works on both Linux and macOS). No `readlink -f` (which would break on macOS without GNU coreutils).
10. **`mow-tools.cjs` uses `os.homedir()` and `process.env.HOME` for runtime path resolution.** Already portable -- no changes needed in the JavaScript runtime logic.

## Open Questions

1. **`$HOME` vs `~` in bash code blocks inside markdown**
   - What we know: Tilde expansion works in unquoted bash contexts. `$HOME` works in quoted contexts. Both work for `node` invocations.
   - What's unclear: In a few files (e.g., `help-open.md`), paths appear inside double-quoted bash strings like `HELP_FILE="$HOME/.claude/mowism/help/..."`. Tilde does NOT expand inside double quotes. However, these are not `@` references -- they are bash code that Claude executes. Inside double-quoted bash, `$HOME` is correct and `~` would be wrong.
   - Recommendation: For `@` references, use `~/.claude/`. For bash variable assignments inside double quotes, use `$HOME/.claude/`. The bulk sed replacement of `/home/max/.claude/` to `~/.claude/` will handle `@` references and unquoted `node` invocations correctly. For the handful of double-quoted bash assignments, manually verify after sed and fix any that need `$HOME` instead of `~`.
   - **Update after investigation:** Reviewed all current `$HOME` and `~` usage in the codebase. The pattern is clear: `help-open.md` uses `$HOME` inside double-quoted bash assignments (correct for that context). The sed replacement `/home/max/.claude/` to `~/.claude/` will work for the vast majority of cases. After the bulk replacement, a review pass should check for `~` inside double-quoted strings and convert those to `$HOME`. This is a small number of cases (estimated <10 occurrences based on the 74 "other references" that include template paths, documentation text, and bash assignments).

## Sources

### Primary (HIGH confidence)
- GSD upstream repository: `github.com/gsd-build/get-shit-done` -- verified `@~/.claude/` pattern in `commands/gsd/new-project.md` and `get-shit-done/workflows/new-project.md` via GitHub API
- Mowism source code: direct inspection of all 106 affected files, `bin/mow-tools.cjs`, `bin/install.sh`, `mowism/bin/` directory
- Claude Code official docs: `code.claude.com/docs/en/skills` -- confirmed `@` reference supports relative and absolute paths; tilde expansion documented as supported in home directory contexts
- v1.0 Milestone Audit: `.planning/v1.0-MILESTONE-AUDIT.md` -- documented all 4 gaps

### Secondary (MEDIUM confidence)
- Web search results confirming Claude Code supports `~` in `@` file references: [MCPcat guide](https://mcpcat.io/guides/reference-other-files/), [Steve Kinney course](https://stevekinney.com/courses/ai-development/referencing-files-in-claude-code)
- GSD issue #218 regarding command path handling after Claude Code update: [github.com/gsd-build/get-shit-done/issues/218](https://github.com/gsd-build/get-shit-done/issues/218)

### Tertiary (LOW confidence)
- None. All findings verified with primary sources.

## Metadata

**Confidence breakdown:**
- Path replacement strategy: HIGH -- verified against GSD upstream, Claude Code docs, and existing working files in Mowism
- checkAgentTeams fix: HIGH -- clear bug with documented cause and verified fix pattern
- Stale file cleanup: HIGH -- verified by comparing file sizes and install.sh copy source
- Portability sweep: HIGH -- exhaustive grep for platform-specific patterns found no additional issues
- Tilde vs $HOME edge case: MEDIUM -- the bulk sed approach works for ~95% of cases; a manual review pass handles the rest

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain; no external dependency changes expected)
