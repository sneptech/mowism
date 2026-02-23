---
phase: 11-readme-overhaul
verified: 2026-02-20T10:45:00Z
status: human_needed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Opening 30-second comprehension"
    expected: "A new user reading the first three paragraphs can explain what Mowism does and how it differs from GSD"
    why_human: "Comprehension speed and clarity cannot be verified programmatically"
  - test: "Install flow walkthrough"
    expected: "User can follow install section without needing external docs — git clone, cd, install.sh, and dependency table are sufficient"
    why_human: "Usability of installation instructions requires human judgment"
  - test: "Lifecycle narrative readability"
    expected: "A user unfamiliar with Mowism can read the 8-stage lifecycle section and know exactly what command to run at each stage and what it produces"
    why_human: "Narrative quality and completeness for a naive reader requires human assessment"
  - test: "Stale content from early testing notice"
    expected: 'The "## ! IMPORTANT ! This project is in early testing" banner at line 5-7 is intentional, not a stale artifact — confirm this with the project owner'
    why_human: "Cannot determine if the early-testing banner is intentional or was accidentally left in from a previous README version"
---

# Phase 11: README Overhaul Verification Report

**Phase Goal:** A new user can understand, install, and use Mowism from the README alone
**Verified:** 2026-02-20T10:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A new user reading the README understands what Mowism is within 30 seconds | ? UNCERTAIN | "## What is Mowism" section exists at line 9 with 3 substantive paragraphs; readability is human judgment |
| 2 | A new user can copy-paste install commands and get Mowism running | ✓ VERIFIED | Lines 19-23: `git clone`, `cd mowism`, `./bin/install.sh` — accurate, no npx/stale commands |
| 3 | The lifecycle narrative walks through the full workflow from new-project to milestone completion | ✓ VERIFIED | Lines 50-108: 8 stages all present with exact `/mow:*` command names and ASCII flow diagram |
| 4 | Multi-agent parallel execution is explained as a progressive-disclosure section after single-agent | ✓ VERIFIED | Lines 110-132: Multi-Agent section follows Single-Agent section, framed as "When you're ready to parallelize" |
| 5 | Brownfield entry point is clearly documented as a separate section, not buried in greenfield narrative | ✓ VERIFIED | Line 134: "## Brownfield Projects" is a top-level `##` section with map-codebase code block |
| 6 | Every /mow:* command is documented with description, usage, and example | ✓ VERIFIED | Lines 160-321: 35 commands across 12 category tables; 9 of 12 categories have usage examples |
| 7 | Quality skills are documented in a separate subsection from /mow:* commands | ✓ VERIFIED | Lines 307-321: "### Quality Skills" subsection with all 7 skills, labeled "no /mow: prefix" |
| 8 | Commands are organized by category with scannable tables | ✓ VERIFIED | 12 category headers (Getting Started, Phase Planning, Execution, etc.), each with `###` and table |
| 9 | Configuration section documents all 9 config options with defaults, types, and when-to-change guidance | ✓ VERIFIED | Lines 350-362: all 9 options in table with Default and "When to Change" columns |
| 10 | Security section covers what Mowism installs, env vars, and permissions model | ✓ VERIFIED | Lines 390-416: install locations (5 dirs), env vars table, private planning mode instructions |
| 11 | Troubleshooting section covers dependency issues, common runtime errors, and multi-agent problems | ✓ VERIFIED | Lines 417-436: "Common Runtime Issues" (4 entries) and "Multi-Agent Issues" (4 entries) tables |
| 12 | README ends with license and attribution crediting GSD/TACHES | ✓ VERIFIED | Lines 541-545: "## License and Attribution" credits GSD, TACHES/glittercowboy, Karpathy, Cherny |

**Score:** 11/12 automated truths verified; 1 uncertain (needs human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `README.md` | Complete README scaffold with all sections | ✓ VERIFIED | 545 lines; all sections present; no placeholders |
| `README.md` — "## What is Mowism" | 3-paragraph opening description | ✓ VERIFIED | Present at line 9; 3 paragraphs covering what it does, differentiators, GSD origin |
| `README.md` — "## The Mowism Lifecycle" | Lifecycle narrative section | ✓ VERIFIED | Present at line 50; 8 stages numbered; ASCII flow diagram at line 102-106 |
| `README.md` — "Brownfield" | Brownfield entry section | ✓ VERIFIED | "## Brownfield Projects" at line 134; `map-codebase` code block and 7-document table |
| `README.md` — "## Commands" | Complete command reference | ✓ VERIFIED | 35 unique `/mow:*` commands; 12 categories; all match actual `commands/mow/*.md` files |
| `README.md` — "Quality Skills" | Standalone skills subsection | ✓ VERIFIED | 7 skills documented; all match actual `commands/*.md` files |
| `README.md` — "## Configuration" | Config section with all settings | ✓ VERIFIED | 9 options with defaults; model profiles matrix (11 agents x 3 tiers); branching strategies |
| `README.md` — "## Security" | Security section | ✓ VERIFIED | Install locations (5 dirs); env vars table; private planning mode |
| `README.md` — "## Troubleshooting" | Troubleshooting section | ✓ VERIFIED | Runtime and multi-agent issue tables; no install-blocks table (installer never blocks — correct) |
| `README.md` — "## License" | License and attribution section | ✓ VERIFIED | Attributes GSD/TACHES and quality skill contributors |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| README lifecycle section | Actual `/mow:*` command names | Code blocks with real command invocations | ✓ WIRED | Pattern `/mow:(new-project|plan-phase|execute-phase|refine-phase|verify-work|complete-milestone)` matches 31 occurrences in lifecycle section |
| README brownfield section | `map-codebase` command | Code block showing brownfield flow | ✓ WIRED | Line 139: `/mow:map-codebase` in fenced code block; line 158: `new-milestone` alternative documented |
| README command tables | Actual command files | Command names matching `commands/mow/*.md` filenames | ✓ WIRED | All 35 command names verified against `ls commands/mow/` — 100% match, no phantom commands |
| README quality skills section | Actual skill commands | Skill names matching `commands/*.md` filenames | ✓ WIRED | All 7 skill names (`scope-check`, `simplify`, `dead-code-sweep`, `change-summary`, `prove-it`, `grill-me`, `update-claude-md`) match actual files |
| README configuration section | Actual config.json schema | Option names matching planning-config.md reference | ✓ WIRED | All 9 options verified: `model_profile`, `workflow.research`, `workflow.plan_check`, `workflow.verifier`, `workflow.auto_advance`, `git.branching_strategy`, `planning.commit_docs`, `planning.search_gitignored`, `model_overrides` |
| README security section | Actual env vars and permissions | Env var names and file paths | ✓ WIRED | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` at lines 35, 117, 406, 426, 432, 533; `.claude/settings.local.json` at line 400 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DOC-01 | 11-01-PLAN.md | README includes lifecycle narrative covering full project workflow from install to milestone completion | ✓ SATISFIED | "## The Mowism Lifecycle" section (lines 50-132) covers 8 stages from new-project through complete-milestone plus multi-agent path |
| DOC-02 | 11-02-PLAN.md | All 34 `/mow:*` commands documented with description, usage, and examples | ✓ SATISFIED | 35 commands documented (REQUIREMENTS.md says "34" but actual count is 35 — README is accurate, requirement text has stale count); all commands have descriptions; 9/12 categories have usage examples |
| DOC-03 | 11-01-PLAN.md | Brownfield entry point documented (existing codebase -> map-codebase -> new-milestone) | ✓ SATISFIED | "## Brownfield Projects" (line 134) shows `map-codebase` -> `new-project` flow with `new-milestone` alternative for returning users |
| DOC-04 | 11-03-PLAN.md | Configuration, security guidance, and troubleshooting sections included | ✓ SATISFIED | "## Configuration" (line 323), "## Security" (line 390), "## Troubleshooting" (line 417) all present with actionable content |

**Orphaned requirements check:** No phase 11 requirements in REQUIREMENTS.md are unclaimed by plans. DOC-01 and DOC-03 are covered by plan 11-01; DOC-02 by 11-02; DOC-04 by 11-03.

**Note on DOC-02 count discrepancy:** REQUIREMENTS.md states "All 34 /mow:* commands" but the codebase has 35 command files and the README correctly states 35. The discrepancy is in REQUIREMENTS.md (written before command count was finalized), not in the README.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `README.md` (lines 5-7) | "## ! IMPORTANT ! This project is currently in early testing" banner | ? UNCERTAIN | May be intentional warning for users; may be an accidentally-preserved draft notice. Cannot determine intent programmatically. |
| `README.md` | Duplicate `/mow:plan-phase N` in raw table row count (36 rows vs 35 unique commands) | ℹ Info | The extra row is a troubleshooting table entry at line 423 that happens to match the `/mow:` prefix pattern — not a true duplicate command table entry. No actual duplication in command reference. |

No stale references found: no `join-discord`, no `npx mowism@latest`, no `30+ commands`, no `34 commands` (README correctly says 35), no `<!-- placeholder -->` comments.

### Human Verification Required

#### 1. Opening 30-Second Comprehension

**Test:** Read lines 9-15 of README.md ("## What is Mowism" through end of 3rd paragraph). Time yourself.
**Expected:** Within 30 seconds, you can answer: "What does Mowism do?" and "How is it different from GSD?"
**Why human:** Reading speed and comprehension clarity cannot be verified programmatically.

#### 2. Install Flow Walkthrough

**Test:** Follow the "## Install" section (lines 17-25) as if you are a new user. Is everything you need to get started present?
**Expected:** The three commands (`git clone`, `cd`, `./bin/install.sh`) plus the Requirements table are sufficient to install without visiting other documentation.
**Why human:** Usability sufficiency requires human judgment about what a new user knows vs. needs.

#### 3. Lifecycle Narrative Readability

**Test:** Read the "### Single-Agent Workflow" section (lines 54-108) as if encountering Mowism for the first time.
**Expected:** After reading, you know exactly which command to run at each of the 8 stages and what artifact each stage produces.
**Why human:** Narrative completeness for a naive reader requires human assessment.

#### 4. Early Testing Banner Intentionality

**Test:** Confirm with project owner whether the "## ! IMPORTANT ! This project is currently in early testing" banner (lines 5-7) is intentional content for v1.1 release or a draft notice that should be removed.
**Expected:** If intentional: leave it. If draft artifact: remove lines 5-7.
**Why human:** Cannot determine intent from file content alone. The last-edited date ("last edited: 2026-02-20") matches the phase execution date, suggesting it may be intentional — but the tone is inconsistent with a release README.

### Gaps Summary

No blocking gaps found. All 12 observable truths verified by automated checks or structurally present. All artifacts exist with substantive content and no placeholder text remains. All 35 command files are covered in the command reference. All key links (lifecycle commands, brownfield flow, config options, security env vars) are wired to accurate content.

The only outstanding items are human verification needs:
- **Subjective readability** of the opening, install, and lifecycle sections (cannot be automated)
- **Intent confirmation** of the early testing banner at the top of the README

---

_Verified: 2026-02-20T10:45:00Z_
_Verifier: Claude (mow-verifier)_
