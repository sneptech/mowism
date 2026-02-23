# Phase 12: Audit Gap Closure - Research

**Researched:** 2026-02-20
**Domain:** Tech debt cleanup (agent messaging, templates, documentation counts)
**Confidence:** HIGH

## Summary

Phase 12 closes three specific gaps identified by the v1.1 milestone audit (`v1.1-MILESTONE-AUDIT.md`). All three are small, well-scoped fixes to existing files -- no new features, no architectural changes, no library additions.

**Gap 1: SendMessage recipient inconsistency.** `mowism/workflows/execute-plan.md` line 379 uses `recipient: "team-lead"` while `agents/mow-phase-worker.md` uses `recipient: "lead"` (15 occurrences). These must be standardized to a single value. The correct value depends on Agent Teams API naming conventions -- the recipient must match the name the team lead is registered with in the team.

**Gap 2: `requirements-completed` field missing from SUMMARY template variants.** The main `summary.md` template already has `requirements-completed: []`. However, three variant templates (`summary-standard.md`, `summary-complex.md`, `summary-minimal.md`) lack this field. Additionally, the `cmdSummaryExtract` function in `mow-tools.cjs` does not expose the `requirements-completed` field in its output, which is why the audit tool couldn't find it even though all 16 v1.1 SUMMARY files DO have the field populated.

**Gap 3: Stale "34 commands" count.** The actual command count is 35. REQUIREMENTS.md is already correct (says "35"). The stale count appears in ROADMAP.md (2 occurrences on lines 40 and 116) and PROJECT.md (2 occurrences on lines 34 and 63). These are the files that need updating.

**Primary recommendation:** Fix the three specific issues in one plan with three tasks. Standardize the SendMessage recipient to `"lead"` (matching mow-phase-worker.md's existing convention and the team lead's spawn name pattern), add `requirements-completed` to all template variants and to `cmdSummaryExtract` output, and update stale "34" references to "35" in ROADMAP.md and PROJECT.md.

## Standard Stack

No new libraries or tools. All changes are edits to existing Markdown instruction files, template files, and one JavaScript function.

### Core

| File | Type | Purpose | Change Needed |
|------|------|---------|---------------|
| `mowism/workflows/execute-plan.md` | Workflow | Plan execution instructions | Change `"team-lead"` to `"lead"` on line 379 |
| `agents/mow-phase-worker.md` | Agent def | Phase worker instructions | Already uses `"lead"` -- no change needed |
| `mowism/templates/summary-standard.md` | Template | Standard SUMMARY format | Add `requirements-completed: []` field |
| `mowism/templates/summary-complex.md` | Template | Complex SUMMARY format | Add `requirements-completed: []` field |
| `mowism/templates/summary-minimal.md` | Template | Minimal SUMMARY format | Add `requirements-completed: []` field |
| `bin/mow-tools.cjs` | Tool CLI | SUMMARY extraction | Add `requirements_completed` to `fullResult` output |
| `.planning/ROADMAP.md` | Roadmap | Phase descriptions | Change "34" to "35" (lines 40, 116) |
| `.planning/PROJECT.md` | Project | Feature list | Change "34" to "35" (lines 34, 63) |

## Architecture Patterns

### Pattern 1: SendMessage Recipient Naming Convention

**What:** Agent Teams uses the `name` parameter from `Task()` spawn calls as the addressable recipient name for SendMessage. The team lead spawns workers via `Task({ name: "phase-{NN}" })`, and workers address the lead using the `recipient` field of SendMessage.

**Current state:**
- `execute-plan.md` line 379: `recipient: "team-lead"`
- `mow-phase-worker.md` (15 occurrences): `recipient: "lead"`

**Resolution analysis:**

The team lead is spawned in two ways:
1. By `new-project.md` via `Task(subagent_type="mow-team-lead")` -- no explicit `name` parameter
2. By `resume-project.md` via `Task(subagent_type="mow-team-lead")` -- no explicit `name` parameter

In Agent Teams, the creating agent (the one calling TeamCreate) is the team leader. Based on the SendMessage tool documentation, messages from teammates are "automatically delivered" to the leader. The `recipient` field uses the teammate's **name** (set via the `name` parameter in Task()).

**Key question: What name does the team leader have?** The leader is not spawned via Task with a team_name -- it IS the creator. Based on the Agent Teams system prompt:
- The leader's name appears in `~/.claude/teams/{team-name}/config.json` under the `members` array
- The system prompt says: "Always refer to teammates by their NAME"

Since the team lead is spawned with `subagent_type="mow-team-lead"` and no `name` parameter, Agent Teams would either:
- Auto-assign a name (possibly from `subagent_type`)
- Use the agent's role as the name

**Recommendation: Standardize to `"lead"`** for these reasons:
1. `mow-phase-worker.md` already uses `"lead"` consistently (15 occurrences vs 1 in execute-plan.md)
2. The word "lead" is shorter, clearer, and convention-consistent
3. If the actual Agent Teams registered name differs, BOTH files need updating anyway -- but standardizing them to the same value is the critical fix
4. The team lead spawn call should also add an explicit `name: "lead"` parameter to lock the name

**Files to change:**
- `mowism/workflows/execute-plan.md` line 379: `"team-lead"` -> `"lead"`
- `mowism/workflows/new-project.md` line 1043 area: add `name: "lead"` to Task() call (optional hardening)
- `mowism/workflows/resume-project.md` line 82 area: add `name: "lead"` to Task() call (optional hardening)

**Note:** The `07-04-PLAN.md` (line 109) also uses `"team-lead"` but that file is a completed plan document, not an active instruction file. Changing it is optional (historical accuracy vs consistency).

### Pattern 2: YAML Frontmatter Field Naming

**What:** SUMMARY.md frontmatter fields use hyphenated keys (e.g., `requirements-completed`, `key-files`, `tech-stack`).

**Convention:** The YAML parser in `mow-tools.cjs` (line 1021) supports both hyphens and underscores in key names via regex `[a-zA-Z0-9_-]+`. However, the JavaScript extraction code accesses fields using bracket notation with the exact YAML key: `fm['requirements-completed']`.

**Current state:**
- Template `summary.md` line 41: has `requirements-completed: []`
- Templates `summary-standard.md`, `summary-complex.md`, `summary-minimal.md`: MISSING the field
- `cmdSummaryExtract` (line 3492-3500): does NOT include `requirements-completed` in `fullResult`
- All 16 v1.1 SUMMARY files: DO have `requirements-completed` populated (verified by grep)

**The audit's finding was partially wrong.** The audit said "None of the 16 SUMMARY.md files contain a `requirements_completed` field." In fact, all 16 have `requirements-completed` (hyphen). The issue is that `cmdSummaryExtract` doesn't expose this field in its output, so the audit tool's extraction call returned nothing.

**Fix needed:**
1. Add `requirements-completed: []` to `summary-standard.md`, `summary-complex.md`, `summary-minimal.md`
2. Add `requirements_completed: fm['requirements-completed'] || []` to the `fullResult` object in `cmdSummaryExtract` (line ~3500)

### Anti-Patterns to Avoid

- **Changing historical SUMMARY.md files:** The 16 existing SUMMARY files already have `requirements-completed` populated. Do NOT retroactively modify them. The fix is forward-looking (template + extraction tool).
- **Changing REQUIREMENTS.md count:** REQUIREMENTS.md already says "35" (line 39: `All 35 /mow:* commands`). The stale "34" is in ROADMAP.md and PROJECT.md, not REQUIREMENTS.md. The audit description is misleading.
- **Using underscore in YAML key:** The established convention is hyphenated YAML keys (`requirements-completed`, `key-files`, `tech-stack`). The JS output uses underscores (`requirements_completed`, `key_files`, `tech_added`) for JSON compatibility. Maintain both conventions in their respective domains.

## Don't Hand-Roll

Not applicable. No custom solutions needed -- all changes are direct text edits and one small function modification.

## Common Pitfalls

### Pitfall 1: Changing the Wrong Files for "34 commands"

**What goes wrong:** The audit says "REQUIREMENTS.md says '34 commands'" but REQUIREMENTS.md actually already says "35" (DOC-02 on line 39). The stale "34" count is in ROADMAP.md and PROJECT.md.
**Why it happens:** The audit description was written before REQUIREMENTS.md was updated (it was fixed during Phase 11).
**How to avoid:** Verify the current state of each file BEFORE editing. The correct files to fix are ROADMAP.md (lines 40, 116) and PROJECT.md (lines 34, 63).
**Warning signs:** If you see `All 35` already in REQUIREMENTS.md, the audit description is stale.

### Pitfall 2: Not Verifying Agent Teams Name Resolution

**What goes wrong:** Standardizing recipient names without confirming what name the Agent Teams API actually assigns to the team leader.
**Why it happens:** Agent Teams is experimental and naming behavior is not fully documented. The team lead is spawned without an explicit `name` parameter.
**How to avoid:** The safest approach is: (a) standardize both files to the same value (`"lead"`), AND (b) add an explicit `name: "lead"` parameter to the Task() calls that spawn the team lead. This guarantees the name matches regardless of Agent Teams defaults.
**Warning signs:** If testing reveals messages not being delivered, check the team config at `~/.claude/teams/{team-name}/config.json` for actual member names.

### Pitfall 3: Hyphen vs Underscore Mismatch

**What goes wrong:** Adding `requirements_completed` (underscore) to YAML frontmatter instead of `requirements-completed` (hyphen), or looking for the wrong key in the extraction code.
**Why it happens:** YAML keys use hyphens, JS property names use underscores. Easy to confuse.
**How to avoid:** YAML templates: use `requirements-completed` (hyphen). JS code: access via `fm['requirements-completed']`, output as `requirements_completed`.

## Code Examples

### Fix 1: execute-plan.md Recipient (Line 379)

**Before:**
```markdown
Use SendMessage({ type: "message", recipient: "team-lead", content: $MSG, summary: "Phase ${PHASE_NUMBER}: plan ${PHASE}-${PLAN} complete (${DURATION})" })
```

**After:**
```markdown
Use SendMessage({ type: "message", recipient: "lead", content: $MSG, summary: "Phase ${PHASE_NUMBER}: plan ${PHASE}-${PLAN} complete (${DURATION})" })
```

### Fix 2: cmdSummaryExtract in mow-tools.cjs (Line ~3500)

**Before (line 3492-3500):**
```javascript
  const fullResult = {
    path: summaryPath,
    one_liner: fm['one-liner'] || null,
    key_files: fm['key-files'] || [],
    tech_added: (fm['tech-stack'] && fm['tech-stack'].added) || [],
    patterns: fm['patterns-established'] || [],
    decisions: parseDecisions(fm['key-decisions']),
  };
```

**After:**
```javascript
  const fullResult = {
    path: summaryPath,
    one_liner: fm['one-liner'] || null,
    key_files: fm['key-files'] || [],
    tech_added: (fm['tech-stack'] && fm['tech-stack'].added) || [],
    patterns: fm['patterns-established'] || [],
    decisions: parseDecisions(fm['key-decisions']),
    requirements_completed: fm['requirements-completed'] || [],
  };
```

### Fix 3: Template Field Addition

Add this line to the frontmatter of `summary-standard.md`, `summary-complex.md`, and `summary-minimal.md`:
```yaml
requirements-completed: []
```

Place it after `key-decisions` and before `duration` to match the field order in the main `summary.md` template.

### Fix 4: Stale Count in ROADMAP.md

**Line 40 before:**
```markdown
- [x] **Phase 11: README Overhaul** - Lifecycle narrative, all 34 commands, brownfield entry, config/security/troubleshooting (completed 2026-02-20)
```
**After:** Change "34" to "35".

**Line 116 before:**
```markdown
  2. All 34+ `/mow:*` commands are documented with description, usage, and examples
```
**After:** Change "34+" to "35".

### Fix 5: Stale Count in PROJECT.md

**Line 34:** Change "all 34 commands" to "all 35 commands".
**Line 63:** Change "all 34 commands" to "all 35 commands".

## State of the Art

Not applicable -- this phase is internal cleanup, not technology adoption.

## Open Questions

1. **What name does Agent Teams assign to the team creator/leader?**
   - What we know: The team lead is spawned via `Task(subagent_type="mow-team-lead")` without an explicit `name` parameter. Workers use `recipient: "lead"`.
   - What's unclear: Whether the auto-assigned name for the team creator matches `"lead"`, `"mow-team-lead"`, or something else.
   - Recommendation: Add explicit `name: "lead"` to the Task() spawn calls for the team lead in `new-project.md` and `resume-project.md`. This is defensive hardening that guarantees the name matches the workers' recipient field regardless of Agent Teams defaults. Mark this as a bonus hardening task, not a strict Phase 12 requirement.

2. **Should historical plan/audit documents be updated?**
   - What we know: `07-04-PLAN.md` line 109 and `v1.1-MILESTONE-AUDIT.md` both reference the old `"team-lead"` value. These are historical documents, not active instruction files.
   - What's unclear: Whether updating historical docs is in scope.
   - Recommendation: Do NOT update historical plan/audit documents. They represent the state at the time they were written. Only update active instruction files (execute-plan.md, templates, mow-tools.cjs).

3. **Should other "34" references in historical files be updated?**
   - What we know: Files like `MILESTONES.md`, `v1.1-FEATURES.md`, `.continue-here.md`, and various v1.0 audit/verification docs also say "34 commands." These reflect the historical state when v1.0 shipped (there were 34 commands; `close-shop` was added in v1.1).
   - Recommendation: Only update ROADMAP.md and PROJECT.md (active planning documents). Historical docs like MILESTONES.md and v1.0 audit files should keep their original counts since they were accurate at the time of writing.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STATE-03 | Workers communicate state changes to the lead via structured JSON inbox messages (<1KB, defined schema) | Recipient inconsistency fix ensures messages actually reach the lead. Currently `execute-plan.md` uses `"team-lead"` while `mow-phase-worker.md` uses `"lead"` -- if they don't match the registered name, messages silently fail. Fix: standardize to `"lead"` in both files. |
| FEED-01 | Workers send structured milestone messages at defined checkpoints (task claimed, commit made, task complete, error) | Same SendMessage recipient fix as STATE-03. The milestone message delivery path goes through the same `recipient` field. The message formatting is correct; only the delivery address is inconsistent. |
| DOC-02 | All 35 `/mow:*` commands documented with description, usage, and examples | REQUIREMENTS.md already says "35" (corrected during Phase 11). The stale "34" count persists in ROADMAP.md (lines 40, 116) and PROJECT.md (lines 34, 63). Fix: update these four occurrences. |
</phase_requirements>

## Sources

### Primary (HIGH confidence)
- `mowism/workflows/execute-plan.md` line 379 -- verified `"team-lead"` recipient
- `agents/mow-phase-worker.md` lines 84-388 -- verified 15 occurrences of `recipient: "lead"`
- `agents/mow-team-lead.md` line 133 -- verified workers spawned with `name: "phase-{NN}"`
- `mowism/templates/summary.md` line 41 -- verified `requirements-completed: []` present
- `mowism/templates/summary-standard.md` -- verified MISSING `requirements-completed`
- `mowism/templates/summary-complex.md` -- verified MISSING `requirements-completed`
- `mowism/templates/summary-minimal.md` -- verified MISSING `requirements-completed`
- `bin/mow-tools.cjs` lines 3492-3500 -- verified `cmdSummaryExtract` omits `requirements-completed` from output
- `.planning/phases/*/07-*-SUMMARY.md` through `11-*-SUMMARY.md` -- verified all 16 SUMMARY files HAVE `requirements-completed` populated
- `.planning/REQUIREMENTS.md` line 39 -- verified already says "All 35"
- `.planning/ROADMAP.md` lines 40, 116 -- verified stale "34"
- `.planning/PROJECT.md` lines 34, 63 -- verified stale "34"
- `.planning/v1.1-MILESTONE-AUDIT.md` -- the source audit that defined these gaps

### Secondary (MEDIUM confidence)
- `.planning/research/AGENT-TEAMS-API.md` -- Agent Teams naming conventions (ASSUMED, not runtime-verified)
- Agent Teams system prompt (SendMessage tool) -- `recipient` field uses teammate NAME

## Metadata

**Confidence breakdown:**
- Recipient fix: HIGH -- both files examined, exact lines and values identified, clear inconsistency
- Template fix: HIGH -- all 4 templates examined, exact gap confirmed, extraction code read
- Count fix: HIGH -- all relevant files checked, exact lines identified, REQUIREMENTS.md already correct
- Agent Teams naming: MEDIUM -- based on documentation review, not runtime testing

**Research date:** 2026-02-20
**Valid until:** No expiry (internal codebase facts, not external dependencies)
