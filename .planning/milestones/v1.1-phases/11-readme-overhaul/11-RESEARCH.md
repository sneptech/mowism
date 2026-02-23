# Phase 11: README Overhaul - Research

**Researched:** 2026-02-20
**Domain:** Developer documentation / CLI tool README authoring
**Confidence:** HIGH

## Summary

Phase 11 replaces the current 104-line README with a comprehensive document that enables a new user to understand, install, configure, and use Mowism without external documentation. The current README is a v1.0-era skeleton -- it covers basic install and lists some commands, but omits the lifecycle narrative, brownfield workflow, v1.1 multi-agent features (DAG scheduling, parallel execution, live feedback, color-coded terminals), configuration options, security guidance, and troubleshooting.

This is a pure documentation phase. There is no code to write, no libraries to install, no architecture decisions to make. The deliverable is a single file (README.md) that documents what was actually built across v1.0 (6 phases, 248 files) and v1.1 (4 phases adding state coherence, DAG scheduling, multi-phase execution, and live feedback). The challenge is information architecture, not implementation.

**Primary recommendation:** Structure the README as a progressive disclosure document -- hook (what is this?), install (how do I get it?), quick start (show me the happy path), lifecycle narrative (how does the full system work?), brownfield entry (I already have code), all commands (reference), configuration (tuning), security (API keys/permissions), troubleshooting (common issues). Use the upstream GSD README structure as a reference but adapt it for Mowism's diverged feature set.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOC-01 | README includes lifecycle narrative covering full project workflow from install to milestone completion | Lifecycle sections identified: greenfield flow (new-project -> discuss -> plan -> execute -> refine -> verify -> complete-milestone), multi-agent parallel execution (DAG scheduling, worktree-based parallelism, close-shop), and milestone continuation (new-milestone). All 42 commands + 7 quality skills inventoried. v1.1 features (state coherence, DAG, live feedback, color terminals) fully documented in phase summaries. |
| DOC-02 | All 34 `/mow:*` commands documented with description, usage, and examples | Actual count is 35 `/mow:*` commands + 7 quality skills (42 total). Every command has been read and categorized. The help workflow already contains detailed descriptions that can serve as source material. Command taxonomy created (8 categories). Help files in `help/` directory provide usage/flags/examples for each command. |
| DOC-03 | Brownfield entry point documented (existing codebase -> map-codebase -> new-milestone) | `/mow:map-codebase` generates 7 codebase analysis documents. Brownfield flow: map-codebase -> new-project (or new-milestone if continuing) -> plan-phase -> execute-phase. The `map-codebase` command can run before or after `new-project`. This needs a dedicated section showing the brownfield-specific path. |
| DOC-04 | Configuration, security guidance, and troubleshooting sections included | Config system documented: `.planning/config.json` with model_profile, workflow toggles (research, plan_check, verifier, auto_advance), git branching strategy, planning.commit_docs, planning.search_gitignored. Security: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env var, no API keys stored by Mowism, `.claude/settings.local.json` for permissions. Troubleshooting: common issues inventoried from install script, dependency checks, WorkTrunk requirement. |
</phase_requirements>

## Standard Stack

This phase has no technology stack -- it is pure Markdown documentation.

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Markdown | GitHub Flavored | README format | GitHub renders it natively; universal for developer docs |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Collapsible sections | GFM `<details>` | Progressive disclosure for dense sections | Long command tables, configuration details, advanced workflows |
| ASCII diagrams | Plain text | Workflow visualization | Lifecycle flow, DAG scheduling concept |
| Mermaid | GitHub-native | Flowcharts (if needed) | Alternative to ASCII for complex flows; GitHub renders inline |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single README.md | Docs site (MkDocs, Docusaurus) | README alone is the requirement; a docs site is v2 scope |
| Mermaid diagrams | ASCII art | ASCII works everywhere (including `cat README.md`); Mermaid needs renderer |
| Embedded screenshots | Text-only descriptions | Screenshots break when UI changes; text is maintainable |

## Architecture Patterns

### Recommended README Structure

```
README.md
├── Opening (title, badges, one-liner)
├── What is Mowism (2-3 paragraphs)
├── Install (copy-paste commands)
├── Requirements (dependencies table)
├── Quick Start (greenfield happy path)
├── Lifecycle Narrative
│   ├── Greenfield flow diagram
│   ├── Step-by-step with commands
│   ├── Multi-agent parallel execution
│   └── Brownfield entry point
├── Commands Reference
│   ├── Getting Started (2 commands)
│   ├── Phase Planning (5 commands)
│   ├── Execution (3 commands)
│   ├── Quality & Verification (3 commands)
│   ├── Roadmap Management (3 commands)
│   ├── Milestone Management (4 commands)
│   ├── Session Management (3 commands)
│   ├── Debugging & Todos (4 commands)
│   ├── Multi-Agent (3 commands)
│   ├── Configuration (2 commands)
│   ├── Utility (5 commands)
│   └── Quality Skills (7 skills)
├── Configuration
│   ├── Settings overview
│   ├── Model profiles
│   ├── Workflow toggles
│   ├── Git branching strategies
│   ├── Planning artifact control
│   └── Per-agent model overrides
├── Security
│   ├── What Mowism accesses
│   ├── Environment variables
│   ├── Permissions model
│   └── Private planning mode
├── Troubleshooting
│   ├── Install issues
│   ├── Dependency problems
│   ├── Common runtime errors
│   └── Multi-agent issues
├── .planning/ Directory Structure
├── Common Workflows (recipes)
└── License and Attribution
```

### Pattern 1: Progressive Disclosure

**What:** Start with the simplest explanation and add detail as the reader scrolls. Each section stands alone -- a reader who stops at "Quick Start" gets enough to use the tool; a reader who reaches "Configuration" gets full control.

**When to use:** Always for CLI tool READMEs. New users scan; experienced users search.

**Example structure:**
- **Hook** (2 lines): What is this? Why should I care?
- **Install** (3 lines): Copy, paste, done.
- **Quick Start** (5 lines): The minimum to see it work.
- **Full Lifecycle** (2 pages): The complete workflow explained.
- **Reference** (tables): Every command, every option.
- **Advanced** (troubleshooting, security): When things go wrong.

### Pattern 2: Command Reference as Tables with Expandable Details

**What:** List commands in categorized tables (command | description). For each command, provide a collapsed `<details>` block with usage, flags, and examples. This keeps the reference scannable while providing depth on demand.

**When to use:** When documenting 30+ commands. A flat list becomes unreadable. Tables give structure; collapsible sections give detail without overwhelming.

### Pattern 3: Lifecycle Narrative as Numbered Steps with Code Blocks

**What:** Walk through the full workflow as a numbered sequence. Each step shows the exact command, what it does, and what it produces. Annotate with what files are created at each step.

**When to use:** For the DOC-01 requirement. The lifecycle must be walkable -- a new user should be able to follow it step by step and understand where they are.

### Anti-Patterns to Avoid

- **Wall of text without headers:** Kills scanability. Use headers every 3-5 paragraphs minimum.
- **Describing features that don't exist:** The current README mentions "30+ commands" -- actual count is 35 `/mow:*` + 7 skills = 42. Be precise.
- **Stale upstream references:** The help workflow references `/mow:join-discord` which does not exist as a command. Audit every cross-reference.
- **Explaining implementation details:** Users don't need to know about mow-tools.cjs internals or STATUS.md format. Focus on WHAT, not HOW.
- **Duplicating the help system:** The README should complement `???` help, not duplicate it. Reference the help system for flag details.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table of contents | Manual TOC with anchor links | GitHub auto-generates TOC from headers | Manual TOC drifts; GitHub's is always current |
| Badge generation | Hand-coded badge URLs | shields.io or similar badge service | Consistent formatting, auto-updating where possible |
| Command documentation | Prose descriptions of each command | Structured tables extracted from command files | Command files already have YAML frontmatter with name, description, argument-hint |
| Workflow diagrams | Hand-drawn ASCII art | Consistent ASCII notation derived from actual ROADMAP.md DAG format | Reuse the notation already in the codebase |

**Key insight:** The existing codebase already contains all the documentation content -- command descriptions in YAML frontmatter, help files with usage/flags/examples, workflow files with step-by-step processes, and research documents with feature inventories. The README authoring task is primarily curation and synthesis, not original writing.

## Common Pitfalls

### Pitfall 1: Command Count Mismatch
**What goes wrong:** README says "34 commands" but actual count changes as commands are added/removed.
**Why it happens:** Hard-coded count in prose instead of derived from the source.
**How to avoid:** Use "35+ /mow:* commands" or simply say "all /mow:* commands" without a number. If a number is used, verify against `ls commands/mow/*.md | wc -l` at write time.
**Warning signs:** README says one number, `commands/mow/` contains a different number.

### Pitfall 2: Documenting Aspirational Features
**What goes wrong:** README describes features as working that are only partially implemented or are v2 scope.
**Why it happens:** Confusing design intent with shipped capability. The v1.1 FEATURES.md document contains "deferred to v1.2+" items that must not appear as current features.
**How to avoid:** Cross-reference every feature claim against REQUIREMENTS.md traceability table. Only document requirements marked "Complete" in the traceability table. DOC-01 through DOC-04 are the only pending requirements -- everything else (STATE-*, DAG-*, EXEC-*, FEED-*) is Complete.
**Warning signs:** Phrases like "will support", "planned for", "upcoming" in a features section.

### Pitfall 3: Brownfield Path Not Clearly Differentiated
**What goes wrong:** The brownfield entry point is buried in the greenfield narrative. Users with existing codebases can't find the right starting command.
**Why it happens:** Most tool READMEs assume greenfield. Brownfield is an afterthought.
**How to avoid:** Dedicate a clear, prominent section to brownfield entry (DOC-03). Show the exact sequence: `map-codebase` -> `new-project` (or `new-milestone`). Make it visible from the table of contents.
**Warning signs:** The brownfield path requires reading the entire lifecycle section to find.

### Pitfall 4: Configuration Section Too Shallow
**What goes wrong:** Config section lists option names but doesn't explain what they do or when to change them.
**Why it happens:** Treating config documentation as an API reference instead of user guidance.
**How to avoid:** For each config option, include: what it does, the default, when you'd change it, and an example. The `model_profiles.md` reference already provides this for model profiles -- follow that pattern for all config options.
**Warning signs:** A config table with columns "Option | Default" but no "When to change" or "Example" columns.

### Pitfall 5: Security Section Missing or Perfunctory
**What goes wrong:** README omits security guidance, or includes a one-liner like "keep your API keys safe."
**Why it happens:** Security feels like overhead for a dev tool. But Mowism touches the user's `~/.claude/` directory, has an env var for experimental features, and uses Claude Code permissions.
**How to avoid:** Cover three areas: (1) what Mowism installs where (`~/.claude/` layout), (2) environment variables (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS), (3) permissions model (`.claude/settings.local.json`, what Mowism asks permission to do). The install script already reports these -- extract from there.
**Warning signs:** No "Security" section in the README at all.

### Pitfall 6: Stale Help Workflow Content
**What goes wrong:** The README's command reference contradicts the help workflow output.
**Why it happens:** The help workflow (`mowism/workflows/help.md`) was written during v1.0 and may reference commands that have changed or been added in v1.1.
**How to avoid:** Audit `mowism/workflows/help.md` against actual `commands/mow/` directory. The help workflow mentions `/mow:join-discord` which does not exist as a command file. The command count in the help workflow may also be stale.
**Warning signs:** Commands in the help workflow that aren't in `commands/mow/`, or commands in `commands/mow/` that aren't in the help workflow.

## Code Examples

No code examples needed -- this is a documentation-only phase. However, the README will contain many command-line examples. Source material for these:

### Command Usage Patterns (from help files)

```bash
# Greenfield: new project
/mow:new-project
/mow:plan-phase 1
/mow:execute-phase 1

# Brownfield: existing codebase
/mow:map-codebase
/mow:new-project

# Quick task (skip ceremony)
/mow:quick

# Debug an issue
/mow:debug "login button doesn't work"

# Multi-agent parallel execution (v1.1)
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
/mow:execute-phase 3  # DAG scheduler runs parallel phases

# Quality review
/mow:refine-phase 3   # Tiered quality gates
grill-me               # Aggressive code review
prove-it               # Evidence-based verification
```

### Configuration Examples (from config system)

```json
{
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "auto_advance": false
  },
  "git": {
    "branching_strategy": "none"
  },
  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Current README (v1.0 era) | Comprehensive README (this phase) | v1.1 | README becomes the primary onboarding document |
| Linear phase chain (Phase N depends on N-1) | DAG-based phase scheduling with parallel execution | v1.1 Phase 8 | README must document dependency graph concept |
| Single-agent sequential execution | Multi-agent parallel across worktrees | v1.1 Phase 9 | README must explain Agent Teams integration |
| Silent workers (no feedback until done) | Live feedback with structured messages + dashboard | v1.1 Phase 10 | README must describe the feedback loop |
| No visual differentiation | Color-coded ANSI banners per agent terminal | v1.1 Phase 10 | README must explain terminal UX |

**Deprecated/outdated:**
- `/mow:join-discord` referenced in help workflow but command does not exist -- do NOT document it
- `npx mowism@latest` referenced in help workflow -- verify this is the actual install method (install.sh is the documented method)
- "30+ commands" claim in current README -- actual count is 42 (35 `/mow:*` + 7 skills)

## Existing Content Inventory

### What Exists Already and Can Be Reused

| Source | Content | Usability for README |
|--------|---------|---------------------|
| `README.md` (current) | 104 lines, basic overview | Rewrite entirely -- structure is too sparse for requirements |
| `mowism/workflows/help.md` | Full command reference with categories, usage, examples | HIGH -- best single source for command documentation. Needs audit for accuracy. |
| `help/*.md` (35 files) | Per-command help with usage, flags, examples, related commands | HIGH -- canonical source for each command's details |
| `commands/mow/*.md` (35 files) | YAML frontmatter with name, description, argument-hint, allowed-tools | MEDIUM -- good for command table, but frontmatter is agent-facing not user-facing |
| `commands/*.md` (7 files) | Quality skill definitions with objectives and processes | MEDIUM -- skill descriptions need simplification for README audience |
| `.planning/PROJECT.md` | Project vision, requirements, decisions, constraints | HIGH -- source for "What is Mowism" section |
| `.planning/research/v1.1-FEATURES.md` | Detailed v1.1 feature landscape | MEDIUM -- too detailed for README, but good for verifying feature claims |
| `bin/install.sh` | Install process, dependency checks, post-install summary | HIGH -- canonical source for install instructions and requirements |
| `mowism/references/model-profiles.md` | Model profile definitions and philosophy | HIGH -- source for configuration section |
| `mowism/references/planning-config.md` | Full config schema with examples | HIGH -- source for configuration section |
| `mowism/workflows/settings.md` | Settings workflow with all 6 configurable options | HIGH -- source for configuration section |
| `.config/wt.toml` | WorkTrunk configuration for Mowism | LOW -- implementation detail, not user-facing |
| `.claude/settings.local.json` | Permissions configuration | MEDIUM -- relevant for security section |

### What Does NOT Exist and Must Be Written

| Section | Current State | Required Work |
|---------|--------------|---------------|
| Lifecycle narrative | No narrative exists anywhere -- only individual command docs | Write from scratch using command flow knowledge |
| Brownfield entry section | `map-codebase` command docs exist but no brownfield workflow narrative | Write from scratch -- synthesize map-codebase + new-project/new-milestone flow |
| Security section | Scattered across install.sh and settings.local.json | Synthesize from multiple sources into coherent guidance |
| Troubleshooting section | No troubleshooting docs exist anywhere | Write from scratch based on dependency checks and common failure modes |
| Multi-agent explanation | v1.1 feature research exists but no user-facing explanation | Translate technical feature docs into user-oriented explanation |

## Command Inventory

### Complete Command List (35 `/mow:*` commands)

| # | Command | Category | Description |
|---|---------|----------|-------------|
| 1 | `/mow:new-project` | Getting Started | Initialize project with questioning -> research -> requirements -> roadmap |
| 2 | `/mow:help` | Getting Started | Show full command reference |
| 3 | `/mow:help-open` | Getting Started | Open help file for a command in editor |
| 4 | `/mow:discuss-phase` | Phase Planning | Gather phase context through questioning before planning |
| 5 | `/mow:research-phase` | Phase Planning | Research domain for a phase (standalone) |
| 6 | `/mow:list-phase-assumptions` | Phase Planning | Surface Claude's assumptions about a phase approach |
| 7 | `/mow:plan-phase` | Phase Planning | Create detailed execution plans for a phase |
| 8 | `/mow:execute-phase` | Execution | Execute all plans in a phase with wave-based parallelism |
| 9 | `/mow:quick` | Execution | Execute small tasks with MOW guarantees, skip optional agents |
| 10 | `/mow:refine-phase` | Quality | Run tiered quality gates (minimum/complex/algorithmic) |
| 11 | `/mow:verify-work` | Quality | Validate built features through conversational UAT |
| 12 | `/mow:add-phase` | Roadmap | Add phase to end of current milestone |
| 13 | `/mow:insert-phase` | Roadmap | Insert urgent work as decimal phase between existing phases |
| 14 | `/mow:remove-phase` | Roadmap | Remove future phase and renumber subsequent phases |
| 15 | `/mow:new-milestone` | Milestone | Start new milestone with questioning -> requirements -> roadmap |
| 16 | `/mow:complete-milestone` | Milestone | Archive completed milestone, create git tag |
| 17 | `/mow:audit-milestone` | Milestone | Audit milestone completion against original intent |
| 18 | `/mow:plan-milestone-gaps` | Milestone | Create phases to close gaps identified by audit |
| 19 | `/mow:progress` | Session | Check project progress and route to next action |
| 20 | `/mow:resume-work` | Session | Resume work from previous session |
| 21 | `/mow:pause-work` | Session | Create context handoff for pausing |
| 22 | `/mow:debug` | Debugging | Systematic debugging with persistent state |
| 23 | `/mow:add-todo` | Todos | Capture idea or task as todo |
| 24 | `/mow:check-todos` | Todos | List and work on pending todos |
| 25 | `/mow:team-status` | Multi-Agent | Show agent team and teammate assignments |
| 26 | `/mow:worktree-status` | Multi-Agent | Show detailed worktree assignment status |
| 27 | `/mow:close-shop` | Multi-Agent | Gracefully shut down multi-phase execution session |
| 28 | `/mow:settings` | Configuration | Configure workflow toggles and model profile |
| 29 | `/mow:set-profile` | Configuration | Quick switch model profile (quality/balanced/budget) |
| 30 | `/mow:health` | Utility | Diagnose planning directory health, optionally repair |
| 31 | `/mow:cleanup` | Utility | Archive phase directories from completed milestones |
| 32 | `/mow:update` | Utility | Update Mowism to latest version |
| 33 | `/mow:migrate` | Utility | Migrate existing GSD .planning/ to Mowism format |
| 34 | `/mow:reapply-patches` | Utility | Reapply local modifications after update |
| 35 | N/A | -- | The current README and ROADMAP say "34 commands" but the actual count is 35. The discrepancy may be due to `/mow:close-shop` being added in v1.1 Phase 9. |

### Quality Skills (7 standalone commands, no `/mow:` prefix)

| # | Skill | Source | Description |
|---|-------|--------|-------------|
| 1 | `scope-check` | Karpathy | Verify changes stay within original task scope |
| 2 | `simplify` | Karpathy | Audit code for unnecessary complexity |
| 3 | `dead-code-sweep` | Karpathy | Find unreachable code after refactors |
| 4 | `change-summary` | Karpathy | Generate structured post-change report |
| 5 | `prove-it` | Cherny | Demand evidence that changes work correctly |
| 6 | `grill-me` | Cherny | Aggressive code review before shipping |
| 7 | `update-claude-md` | Cherny | Update CLAUDE.md with session learnings |

## Configuration Reference

### Complete Config Options (for DOC-04)

| Option | Default | Type | Description | When to Change |
|--------|---------|------|-------------|----------------|
| `model_profile` | `"balanced"` | string | Which Claude model each agent uses | Switch to `"budget"` to conserve quota, `"quality"` for critical architecture |
| `workflow.research` | `true` | boolean | Spawn researcher during plan-phase | Disable for well-understood domains |
| `workflow.plan_check` | `true` | boolean | Spawn plan checker during plan-phase | Disable for faster iteration |
| `workflow.verifier` | `true` | boolean | Spawn verifier during execute-phase | Disable for non-critical phases |
| `workflow.auto_advance` | `false` | boolean | Chain stages via subagents automatically | Enable for hands-off execution |
| `git.branching_strategy` | `"none"` | string | `"none"`, `"phase"`, or `"milestone"` | Use `"phase"` for code review per phase |
| `planning.commit_docs` | `true` | boolean | Commit .planning/ artifacts to git | Disable for OSS contributions, client projects |
| `planning.search_gitignored` | `false` | boolean | Include .planning/ in broad searches | Enable when .planning/ is gitignored |
| `model_overrides` | `{}` | object | Per-agent model overrides | Override specific agents without changing profile |

### Model Profiles (for DOC-04)

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| mow-planner | opus | opus | sonnet |
| mow-roadmapper | opus | sonnet | sonnet |
| mow-executor | opus | sonnet | sonnet |
| mow-phase-researcher | opus | sonnet | haiku |
| mow-project-researcher | opus | sonnet | haiku |
| mow-research-synthesizer | sonnet | sonnet | haiku |
| mow-debugger | opus | sonnet | sonnet |
| mow-codebase-mapper | sonnet | haiku | haiku |
| mow-verifier | sonnet | sonnet | haiku |
| mow-plan-checker | sonnet | sonnet | haiku |
| mow-integration-checker | sonnet | sonnet | haiku |

### Environment Variables (for Security section)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | No | unset | Set to `1` or `true` to enable multi-agent parallel execution |
| `VISUAL` / `EDITOR` | No | system default | Used by `???` help system to open help files |

### Dependencies (for Requirements section)

| Dependency | Required | Purpose | Install |
|------------|----------|---------|---------|
| Claude Code | Yes | Runtime environment | claude.ai/code |
| Node.js | Yes | Powers mow-tools.cjs (state management, roadmap updates) | nodejs.org |
| WorkTrunk | Yes | Multi-worktree management (`wt` CLI) | `yay -S worktrunk` (Arch), `brew install worktrunk` (macOS), `cargo install worktrunk` |
| Agent Teams env var | No | Enables parallel agent execution | `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |

## Open Questions

1. **Should the README document all 42 commands or only the 35 `/mow:*` commands?**
   - What we know: DOC-02 says "All 34 `/mow:*` commands" (actual count: 35). Quality skills are separate commands without the `/mow:` prefix.
   - What's unclear: Whether quality skills should be in the main command reference or a separate section.
   - Recommendation: Document all 42. Group `/mow:*` commands in the main reference table and quality skills in a separate "Quality Skills" subsection. The README is the primary documentation -- omitting 7 commands would create a gap.

2. **Should the README include the `npx mowism@latest` install method?**
   - What we know: The help workflow mentions `npx mowism@latest`. The install.sh uses `git clone` + `./bin/install.sh`. There is no npm package visible in the repo.
   - What's unclear: Whether `npx mowism@latest` is a real install path or a GSD-upstream artifact.
   - Recommendation: Document only the verified install path (`git clone` + `install.sh`). If an npm package exists, the planner should verify before documenting it.

3. **How should v1.1 multi-agent features be presented?**
   - What we know: v1.1 adds state coherence, DAG scheduling, multi-phase execution, live feedback, and color-coded terminals. These are completed features (all v1.1 requirements marked Complete except DOC-*).
   - What's unclear: How prominently to feature multi-agent vs. single-agent workflows. Most users will start single-agent.
   - Recommendation: Present single-agent as the default workflow. Add a "Multi-Agent Execution" section that explains how to enable Agent Teams and what changes. This matches the progressive disclosure pattern -- basic first, advanced later.

4. **What troubleshooting content is needed?**
   - What we know: Install script checks 3 dependencies. Common issues: missing Node.js, missing WorkTrunk, Agent Teams not enabled.
   - What's unclear: What runtime issues users actually hit. No issue tracker or user feedback data exists.
   - Recommendation: Start with dependency-based troubleshooting (what the install script checks). Add a "Common Issues" section with the most likely failure modes: missing `wt` command, stale STATE.md after git operations, context window exhaustion in long sessions, and permission prompt handling in multi-agent mode.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: all 35 command files in `commands/mow/`, 7 quality skill files in `commands/`, 14 agent definitions, 32 workflows, 13 references, 23 templates, install.sh, mow-tools.cjs
- `.planning/PROJECT.md` -- project vision, requirements, decisions, constraints
- `.planning/REQUIREMENTS.md` -- all 18 v1.1 requirements with traceability
- `.planning/ROADMAP.md` -- phase structure, success criteria, dependency graph
- `.planning/MILESTONES.md` -- v1.0 milestone summary
- Phase 7-10 SUMMARY.md files -- what was actually built in v1.1
- `mowism/references/model-profiles.md` -- model profile definitions
- `mowism/references/planning-config.md` -- full config schema
- `mowism/workflows/help.md` -- existing command reference
- `mowism/workflows/settings.md` -- settings workflow
- `bin/install.sh` -- install process, dependency checks

### Secondary (MEDIUM confidence)
- [GSD README structure](https://github.com/gsd-build/get-shit-done) -- upstream README structure as reference (progressive disclosure pattern, command categorization)
- [README best practices](https://github.com/jehna/readme-best-practices) -- general README authoring guidance

### Tertiary (LOW confidence)
- None -- all findings are derived from direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no technology stack; pure documentation phase
- Architecture: HIGH - README structure patterns are well-established; source material fully inventoried in the codebase
- Pitfalls: HIGH - pitfalls derived from direct analysis of current README gaps and codebase inconsistencies (command count mismatch, stale references, missing sections)

**Research date:** 2026-02-20
**Valid until:** Indefinite (documentation patterns are stable; content accuracy depends on codebase state at write time)
