# Phase 6: Cleanup Orphaned Workflows - Research

**Researched:** 2026-02-20
**Domain:** Codebase cleanup -- file archival, metadata correction, reference sweeps
**Confidence:** HIGH

## Summary

This phase is a straightforward housekeeping operation with no external dependencies or library concerns. The work breaks into three distinct tracks: (1) archiving two orphaned workflow files to `mowism/workflows/_archive/` with explanatory headers, (2) fixing stale ROADMAP.md metadata where Phase 4 plan checkboxes show `[ ]` instead of `[x]` and Phase 5 shows `[ ]` instead of `[x]`, and (3) sweeping the entire codebase for stale references to the archived workflows and updating them.

The codebase investigation reveals a precise, bounded set of files that reference `discovery-phase` or `verify-phase`. In the repo (`/home/max/git/mowism/`), there are 4 active source files with stale references (2 templates, 1 research doc, 1 research architecture doc) plus several `.planning/` historical documents. In the installed copy (`~/.claude/mowism/`), there are 2 files with stale references (the same 2 templates). The orphaned workflow files themselves exist in both locations. The `_archive/` directory does not yet exist in either location and must be created.

The ROADMAP.md has two specific metadata issues: Phase 4 plan checkboxes are `[ ]` when they should be `[x]` (3 plans: 04-01, 04-02, 04-03), and Phase 5's plan checkbox is `[ ]` when it should be `[x]` (1 plan: 05-01). The progress table already shows Phases 4 and 5 as "Complete" -- only the plan-level checkboxes are stale. The install script (`bin/install.sh`) uses `cp -r` for the workflows directory, so the `_archive/` subdirectory will automatically propagate on future installs. Existing installed copies must be manually cleaned during this phase.

**Primary recommendation:** Execute in three ordered plans: (1) archive files + create headers, (2) fix ROADMAP metadata + reference sweep, (3) test and verify. The first two could potentially be a single plan given the small scope.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Orphaned workflow fate
- Archive both discovery-phase.md and verify-phase.md to `mowism/workflows/_archive/`
- Do NOT delete -- keep for reference in case future work draws from their designs
- Add an archive header to each file explaining why it was archived and what replaced it
  - verify-phase.md -> replaced by refine-phase.md (implements the same tiered quality chain)
  - discovery-phase.md -> never wired into plan-phase.md; research-phase/mow-phase-researcher covers its purpose
- Clean up BOTH repo source (mowism/workflows/) AND installed copies (~/.claude/mowism/workflows/)

#### ROADMAP metadata sweep
- Fix only what's broken -- Phase 4 and 5 specifically
- Mark Phase 4 and 5 plan entries with `[x]` checkboxes (currently `[ ]`)
- Verify and fix plan counts by cross-checking against actual plan files in each phase directory
- Phase 6 plan should self-update its own ROADMAP entry when complete

#### Cleanup verification
- Run the full test suite after changes
- If any cleanup scenario isn't covered by existing tests, write new tests for it
- Full reference sweep: grep for "discovery-phase" and "verify-phase" across the entire codebase and fix/remove references
- Help files (??? suffix) should also be checked for stale references
- Installed files under ~/.claude/ must be updated alongside repo files

### Claude's Discretion
- Planning doc references (.planning/ files): Claude decides whether to update or leave as historical record based on whether they're historical artifacts vs active documentation
- Archive header wording and format
- Test coverage decisions for edge cases

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-01 (fix) | All GSD workflows forked and `/gsd:*` commands rebranded to `/mow:*` | Archiving orphaned workflows removes false claims about integration with plan-phase.md and execute-phase.md. Both files claim callers that don't reference them. Moving to _archive/ with headers documents the truth. |
</phase_requirements>

## Standard Stack

This phase requires no external libraries. All work is file operations (move, edit, create directories) and grep-based reference sweeps.

### Core
| Tool | Purpose | Why |
|------|---------|-----|
| `grep -r` / ripgrep | Reference sweep across codebase | Find all stale mentions of archived files |
| `mkdir -p` | Create `_archive/` directories | Both repo and installed locations |
| `mv` | Move files to archive | Preserves git history better than delete+create |
| `node --test` | Run test suite | Existing 103-test suite at `bin/mow-tools.test.cjs` |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `diff` | Compare repo vs installed files | Verify installed copies match repo after changes |
| `wc -l` / `find` | Count plan files per phase | Cross-check ROADMAP plan counts |

## Architecture Patterns

### File Locations Requiring Changes

```
REPO (mowism/workflows/):
  discovery-phase.md          -> mowism/workflows/_archive/discovery-phase.md
  verify-phase.md             -> mowism/workflows/_archive/verify-phase.md

INSTALLED (~/.claude/mowism/workflows/):
  discovery-phase.md          -> ~/.claude/mowism/workflows/_archive/discovery-phase.md
  verify-phase.md             -> ~/.claude/mowism/workflows/_archive/verify-phase.md

REPO FILES WITH STALE REFERENCES (active source -- MUST fix):
  mowism/templates/roadmap.md:120       "Verified by verify-phase after execution"
  mowism/templates/phase-prompt.md:569  "See ~/.claude/mowism/workflows/verify-phase.md for verification logic."

INSTALLED FILES WITH STALE REFERENCES (MUST fix):
  ~/.claude/mowism/templates/roadmap.md:120
  ~/.claude/mowism/templates/phase-prompt.md:569

REPO FILES WITH STALE REFERENCES (planning docs -- historical artifacts):
  .planning/research/ARCHITECTURE.md:538   "/mow:verify-phase" in a tree listing
  .planning/phases/01-fork-and-foundation/01-RESEARCH.md:467  file inventory listing
  .planning/phases/01-fork-and-foundation/01-RESEARCH.md:83   directory tree listing
  .planning/phases/01-fork-and-foundation/01-04-PLAN.md:89    task file list
  .planning/phases/01-fork-and-foundation/01-04-PLAN.md:151   task file list
  .planning/phases/01-fork-and-foundation/01-04-SUMMARY.md:91  file listing
  .planning/phases/01-fork-and-foundation/01-04-SUMMARY.md:114 file listing
  .planning/v1.0-MILESTONE-AUDIT.md:20,22,25,27,43,44,167,168,183,184  audit findings
  .planning/phases/06-cleanup-orphaned-workflows/06-CONTEXT.md  (self-referential)

ROADMAP.md METADATA ISSUES:
  Line 91: "- [ ] 04-01-PLAN.md" should be "- [x] 04-01-PLAN.md"
  Line 92: "- [ ] 04-02-PLAN.md" should be "- [x] 04-02-PLAN.md"
  Line 93: "- [ ] 04-03-PLAN.md" should be "- [x] 04-03-PLAN.md"
  Line 106: "- [ ] 05-01-PLAN.md" should be "- [x] 05-01-PLAN.md"
```

### Pattern: Archive Header Format

Each archived file gets a header block prepended explaining its status.

**Recommended format:**

```markdown
---
archived: 2026-02-20
reason: Orphaned workflow -- never called by any active workflow
replaced_by: [replacement description]
---

> **ARCHIVED**: This workflow is no longer active. It was archived on 2026-02-20
> because [specific reason]. Its functionality is now covered by [replacement].
> Kept for reference only.

[original file contents below]
```

### Pattern: Planning Doc Treatment (Claude's Discretion Decision)

**Recommendation: Leave `.planning/` historical docs unchanged.**

Rationale:
- Phase 1 RESEARCH.md, PLAN.md, and SUMMARY.md are historical records of what was planned and executed at that time. They accurately describe what happened during Phase 1 (all 32 workflows were forked, including these two).
- The v1.0 audit report accurately identifies the orphaned workflows as tech debt -- updating it would erase the record of the finding.
- `.planning/research/ARCHITECTURE.md` is a pre-Phase-1 research document listing the GSD workflows to fork -- it was correct at time of writing.
- Only the ROADMAP.md success criteria (line 114-115) mentions these files, and that text defines the Phase 6 goal itself, so it stays.

**Exception:** `mowism/templates/roadmap.md` and `mowism/templates/phase-prompt.md` are NOT historical -- they are active templates used when creating new projects. These MUST be updated.

### Pattern: Installed File Cleanup

The install script (`bin/install.sh` line 44) uses `cp -r` for workflows:
```bash
cp -r "$MOWISM_SRC/mowism/workflows" "$MOWISM_DEST/"
```

This means:
1. Future installs will automatically include the `_archive/` subdirectory
2. Future installs will NOT have the orphaned files in the main workflows dir
3. But the currently installed copy at `~/.claude/mowism/workflows/` still has the old files
4. Current cleanup must: create `_archive/` dir, move files there, and also update templates

**The installed copy does NOT have a `.planning/` directory -- only repo source, templates, references, workflows, help, and bin.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reference sweep | Manual file-by-file checking | `grep -r` across entire repo AND installed dir | Manual search will miss files; grep is exhaustive |
| Plan count verification | Eyeballing ROADMAP | `ls .planning/phases/04-*/04-*-PLAN.md \| wc -l` | Exact count from filesystem is authoritative |
| Archive directory creation | Complex script | Simple `mkdir -p` + `mv` | No edge cases; these are just markdown files |

## Common Pitfalls

### Pitfall 1: Forgetting the Installed Copy
**What goes wrong:** Changes are made to repo source but the installed copy at `~/.claude/mowism/` still has orphaned files and stale references. Users running `/mow:*` commands hit stale content.
**Why it happens:** The repo and installed copy are separate file trees with no auto-sync.
**How to avoid:** Every file operation must be done in BOTH locations. Use a checklist: for each change, apply to repo, then apply to installed.
**Warning signs:** Running `grep -r "verify-phase" ~/.claude/mowism/` after cleanup should return zero matches.

### Pitfall 2: Breaking Help Files
**What goes wrong:** Help files reference `discovery-phase` or `verify-phase` and become stale.
**Why it happens:** Help files are a separate tree not always checked during sweeps.
**How to avoid:** The grep sweep already confirmed zero matches in `/home/max/git/mowism/help/` -- no help files reference these workflows. But the verification step should still confirm this.
**Warning signs:** N/A -- research confirms no matches currently exist.

### Pitfall 3: Incomplete ROADMAP Fix
**What goes wrong:** Only Phase 4 checkboxes are fixed, but Phase 5's checkbox is also `[ ]`.
**Why it happens:** The CONTEXT.md says "Phase 4 and 5 specifically" but the audit report's tech_debt section only explicitly calls out Phase 4.
**How to avoid:** The ROADMAP clearly shows Phase 5 line 106 has `[ ] 05-01-PLAN.md` which needs `[x]`. Fix BOTH Phase 4 AND Phase 5 checkboxes.
**Warning signs:** After fix, `grep '\- \[ \]' .planning/ROADMAP.md` should only match Phase 6 (which is the current/incomplete phase).

### Pitfall 4: Git History Loss
**What goes wrong:** Using `rm` + new file creation instead of `git mv` loses file history in the archive.
**Why it happens:** Treating archive as "delete old, create new" rather than "move."
**How to avoid:** Use `git mv` for the repo copy to preserve history. For installed copy, `mv` is fine (not in git).
**Warning signs:** After commit, `git log --follow mowism/workflows/_archive/discovery-phase.md` should show the full history.

### Pitfall 5: Self-Referential CONTEXT.md
**What goes wrong:** The Phase 6 CONTEXT.md itself mentions "discovery-phase" and "verify-phase" extensively. The reference sweep might flag it as needing cleanup.
**Why it happens:** It's the phase definition document describing the cleanup.
**How to avoid:** Exclude Phase 6 planning documents from the "fix references" scope -- they are documenting the cleanup itself.
**Warning signs:** Grep will find matches in `06-CONTEXT.md` and `06-RESEARCH.md` -- these are expected and should be ignored.

### Pitfall 6: Template References Need Content Updates, Not Just Deletion
**What goes wrong:** Simply deleting the reference line from `roadmap.md` template or `phase-prompt.md` template leaves an incomplete document.
**Why it happens:** The references are embedded in explanatory text that needs rewriting, not just line deletion.
**How to avoid:** Read the surrounding context and update the text to reference the current mechanism.
**Warning signs:** Read the templates after editing to confirm they still read coherently.

## Code Examples

### Archive Header for discovery-phase.md
```markdown
---
archived: 2026-02-20
reason: Orphaned workflow -- claims to be called from plan-phase.md but no reference exists
replaced_by: research-phase.md workflow + mow-phase-researcher agent
phase: 06-cleanup-orphaned-workflows
audit_ref: INT-02
---

> **ARCHIVED**: This workflow is no longer active. It was archived during Phase 6
> (cleanup orphaned workflows) because it was never wired into plan-phase.md despite
> claiming to be called from it. The research and discovery functionality it describes
> is now covered by `/mow:research-phase` and the `mow-phase-researcher` agent.
> Kept as a design reference.

```

### Archive Header for verify-phase.md
```markdown
---
archived: 2026-02-20
reason: Orphaned workflow -- claims to be executed by execute-phase.md but mow-verifier agent is self-contained
replaced_by: refine-phase.md workflow (tiered quality chain)
phase: 06-cleanup-orphaned-workflows
audit_ref: INT-03
---

> **ARCHIVED**: This workflow is no longer active. It was archived during Phase 6
> (cleanup orphaned workflows) because execute-phase.md spawns the mow-verifier agent
> with an inline prompt rather than referencing this file. The tiered verification
> chain it attempted to implement is now fully realized by `/mow:refine-phase`.
> Kept as a design reference.

```

### Template Fix: roadmap.md line 120
**Before:**
```markdown
- Verified by verify-phase after execution
```
**After:**
```markdown
- Verified by execute-phase verification subagent after execution
```

### Template Fix: phase-prompt.md line 569
**Before:**
```markdown
See `~/.claude/mowism/workflows/verify-phase.md` for verification logic.
```
**After:**
```markdown
See the mow-verifier agent definition for verification logic (spawned by execute-phase.md).
```

### ROADMAP.md Plan Checkbox Fixes
**Phase 4 (lines 91-93), before:**
```markdown
- [ ] 04-01-PLAN.md -- Replace hardcoded ~/.claude/ paths...
- [ ] 04-02-PLAN.md -- Fix checkAgentTeams() env var mismatch...
- [ ] 04-03-PLAN.md -- End-to-end portability validation sweep...
```
**After:**
```markdown
- [x] 04-01-PLAN.md -- Replace hardcoded ~/.claude/ paths...
- [x] 04-02-PLAN.md -- Fix checkAgentTeams() env var mismatch...
- [x] 04-03-PLAN.md -- End-to-end portability validation sweep...
```

**Phase 5 (line 106), before:**
```markdown
- [ ] 05-01-PLAN.md -- Rewrite update workflow with dual-path support...
```
**After:**
```markdown
- [x] 05-01-PLAN.md -- Rewrite update workflow with dual-path support...
```

### Reference Sweep Verification Command
```bash
# After all changes, run this to confirm zero stale references
# (excluding .planning/ historical docs and .git/)
grep -rn "discovery-phase\|verify-phase" \
  --include="*.md" --include="*.cjs" --include="*.sh" \
  /home/max/git/mowism/ \
  | grep -v ".planning/" \
  | grep -v ".git/" \
  | grep -v "_archive/"

# Same for installed copy
grep -rn "discovery-phase\|verify-phase" \
  ~/.claude/mowism/ \
  | grep -v "_archive/"

# Confirm test suite still passes
cd /home/max/git/mowism && node --test bin/mow-tools.test.cjs
```

## Complete Reference Inventory

### Active Source Files Needing Updates (MUST FIX)

| File | Line | Content | Action |
|------|------|---------|--------|
| `mowism/templates/roadmap.md` | 120 | "Verified by verify-phase after execution" | Rewrite to reference verification subagent |
| `mowism/templates/phase-prompt.md` | 569 | "See ~/.claude/.../verify-phase.md for verification logic" | Rewrite to reference mow-verifier agent |

### Installed Files Needing Updates (MUST FIX)

| File | Line | Content | Action |
|------|------|---------|--------|
| `~/.claude/mowism/templates/roadmap.md` | 120 | Same as repo | Apply same fix |
| `~/.claude/mowism/templates/phase-prompt.md` | 569 | Same as repo | Apply same fix |

### Files to Archive (MUST MOVE)

| Source | Destination |
|--------|-------------|
| `mowism/workflows/discovery-phase.md` | `mowism/workflows/_archive/discovery-phase.md` |
| `mowism/workflows/verify-phase.md` | `mowism/workflows/_archive/verify-phase.md` |
| `~/.claude/mowism/workflows/discovery-phase.md` | `~/.claude/mowism/workflows/_archive/discovery-phase.md` |
| `~/.claude/mowism/workflows/verify-phase.md` | `~/.claude/mowism/workflows/_archive/verify-phase.md` |

### Historical Planning Docs (LEAVE AS-IS per discretion decision)

| File | Reason to Keep |
|------|---------------|
| `.planning/research/ARCHITECTURE.md` | Pre-Phase-1 research; accurate at time of writing |
| `.planning/phases/01-fork-and-foundation/01-RESEARCH.md` | Phase 1 research; accurately lists GSD source files |
| `.planning/phases/01-fork-and-foundation/01-04-PLAN.md` | Phase 1 plan; accurately describes work done |
| `.planning/phases/01-fork-and-foundation/01-04-SUMMARY.md` | Phase 1 summary; accurately describes what was forked |
| `.planning/v1.0-MILESTONE-AUDIT.md` | Audit findings; this IS the record of the problem |
| `.planning/phases/06-cleanup-orphaned-workflows/06-CONTEXT.md` | Phase 6 self-reference; defines the cleanup |

### Files Confirmed Clean (NO matches found)

| Location | Scope |
|----------|-------|
| `help/*.md` (34 files) | Zero matches for discovery-phase or verify-phase |
| `commands/**/*.md` | Zero matches |
| `agents/*.md` | Zero matches |
| `bin/mow-tools.cjs` | Zero matches |
| `bin/mow-tools.test.cjs` | Zero matches |
| `bin/install.sh` | Zero matches |
| `~/.claude/agents/` | Zero matches |
| `~/.claude/commands/` | Zero matches |

## State of the Art

| Old State | Current State | Impact |
|-----------|---------------|--------|
| `discovery-phase.md` claims called from `plan-phase.md` | `plan-phase.md` has no reference to it; `research-phase.md` + `mow-phase-researcher` agent cover its purpose | File is orphaned, must archive |
| `verify-phase.md` claims executed by `execute-phase.md` | `execute-phase.md` spawns `mow-verifier` with inline prompt; `refine-phase.md` implements the tiered quality chain | File is orphaned, must archive |
| ROADMAP Phase 4 checkboxes `[ ]` | Phase 4 has 3 PLAN files, 3 SUMMARY files, 1 VERIFICATION.md (passed) | Checkboxes must be `[x]` |
| ROADMAP Phase 5 checkbox `[ ]` | Phase 5 has 1 PLAN file, 1 SUMMARY file, 1 VERIFICATION.md (passed) | Checkbox must be `[x]` |
| Progress table shows Phase 4: "3/3 Complete" and Phase 5: "1/1 Complete" | Accurate -- only the per-plan checkboxes are stale, not the table | Table is correct, checkboxes are not |

## Test Suite Status

The test suite (`bin/mow-tools.test.cjs`, 103 tests, all passing) tests `mow-tools.cjs` functionality -- it does not test workflow file existence, template content, or ROADMAP metadata. This is expected since the test suite covers the JavaScript tooling, not the markdown content.

**New tests needed:** Likely none. The cleanup involves moving markdown files and editing markdown content. The existing test suite covers tool functionality which is unaffected by this phase. The verification step is better served by grep-based sweeps confirming zero stale references than by adding unit tests for markdown content. However, if the planner identifies a testable scenario (e.g., verifying that `install.sh` correctly deploys the archive directory), a small integration test could be added.

## Open Questions

1. **Phase 6 ROADMAP self-update timing**
   - What we know: CONTEXT.md says "Phase 6 plan should self-update its own ROADMAP entry when complete"
   - What's unclear: Whether the ROADMAP update happens as part of a cleanup plan or as part of the verification/completion step
   - Recommendation: Include ROADMAP Phase 6 update (plan count, checkboxes) as the final step of the last plan, or as part of the verification workflow's update_roadmap step. This is standard practice -- Phases 1-3 all had their ROADMAP entries updated during execution.

2. **PROJECT.md staleness**
   - What we know: `PROJECT.md` line 19-31 shows Active requirements all still as `[ ]` (unchecked), even though all are complete
   - What's unclear: Whether updating PROJECT.md is in scope for this phase
   - Recommendation: OUT OF SCOPE. PROJECT.md staleness is a separate concern not related to orphaned workflows or the INT-02/INT-03 audit findings. Note it as future tech debt if desired.

## Sources

### Primary (HIGH confidence)
- Direct file inspection of all files in `/home/max/git/mowism/` (repo source)
- Direct file inspection of all files in `~/.claude/mowism/` (installed copy)
- `grep -r` sweeps across both locations for "discovery-phase" and "verify-phase"
- `.planning/v1.0-MILESTONE-AUDIT.md` -- the audit that identified INT-02 and INT-03
- `.planning/ROADMAP.md` -- current state of metadata
- `bin/mow-tools.test.cjs` -- test suite run (103/103 passing)

## Metadata

**Confidence breakdown:**
- File inventory: HIGH -- direct filesystem inspection, exhaustive grep
- ROADMAP issues: HIGH -- directly observed stale checkboxes vs verification reports
- Reference sweep: HIGH -- grep across entire repo and installed directory
- Template fixes: HIGH -- read the specific lines, verified the current wording
- Test coverage: HIGH -- ran the test suite, confirmed it tests tools not markdown

**Research date:** 2026-02-20
**Valid until:** Indefinite -- this is a snapshot of current filesystem state; changes only if someone edits these files before phase execution
