# Research Summary: Mowism

**Domain:** Claude Code workflow orchestration / multi-agent skill system
**Researched:** 2026-02-19
**Overall confidence:** HIGH

## Executive Summary

Mowism is a fork of GSD (Get Shit Done) that extends Claude Code's capabilities to support parallel multi-agent workflows across git worktrees, automated quality gates, and Anthropic's experimental Agent Teams. The ecosystem research reveals that Claude Code's native platform features (skills, subagents, agent teams, hooks, plugins) provide everything needed for orchestration -- no external agent frameworks are required.

The proven GSD architecture (zero-dependency single-file CJS CLI + Markdown workflows + JSON state) is the correct foundation. GSD has scaled to 5300+ lines of CLI tooling and 30+ workflow files without npm dependencies, build steps, or external frameworks. Mowism should preserve this architecture while adding worktree-aware state management, quality check orchestration via subagents, and opt-in Agent Teams integration.

The most critical ecosystem finding is that Claude Code's plugin system is the recommended distribution format for new projects. GSD uses a standalone `~/.claude/` install because it predates the plugin system, but Mowism should launch as a plugin. This gives namespaced commands (`/mow:*`), clean installation, marketplace distribution, and bundled agents/hooks/skills in one package.

WorkTrunk (v0.25.0) is a well-maintained Rust CLI for git worktree management, purpose-built for multi-agent AI workflows. It handles creation, switching, listing, merging, and cleanup with hooks support. It replaces the custom `wt:*` skills and is the correct dependency for worktree operations.

## Key Findings

**Stack:** Zero-dependency Node.js CJS + Markdown skills/agents + Claude Code plugin format + WorkTrunk for worktrees. No external agent frameworks, no npm dependencies, no build step.

**Architecture:** Plugin-based distribution with skills for commands, custom agents for quality checkers, subagents for parallel quality checks within `/mow:refine-phase`, and opt-in Agent Teams for project-level multi-session coordination. State stored in `.planning/` with worktree-aware isolation.

**Critical pitfall:** Agent Teams are experimental with known limitations (no session resumption, task status lag, no nested teams). Mowism must degrade gracefully to subagent-only mode when Agent Teams are not enabled or misbehave.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Fork and Rebrand** - Fork GSD, rename all `/gsd:*` to `/mow:*`, restructure as Claude Code plugin
   - Addresses: Core identity, distribution format
   - Avoids: Premature feature addition before stable base

2. **CLI Tool Fork** - Fork `gsd-tools.cjs` to `mow-tools.cjs`, add worktree-aware state operations
   - Addresses: `.planning/` worktree awareness, state tracking per worktree/agent
   - Avoids: Breaking existing GSD tool functionality during transition

3. **Quality Skills Integration** - Port Karpathy/Cherny skills into plugin, add persistent verification chain output
   - Addresses: `/mow:refine-phase` skill chain, verification persistence to `.planning/phases/VERIFICATION-CHAIN-P{phase}.md`
   - Avoids: Scope creep into orchestration before skills are working

4. **Refine Phase Orchestrator** - Build `/mow:refine-phase` with tiered quality checks (minimum/complex/algorithmic) using parallel subagents
   - Addresses: Automated quality gates, parallel subagent execution
   - Avoids: Agent Teams dependency (uses stable subagents first)

5. **WorkTrunk Integration** - Replace custom `wt:*` skills with WorkTrunk-backed commands, add worktree status to STATE.md
   - Addresses: Worktree management, state coherence across worktrees
   - Avoids: Reimplementing WorkTrunk functionality

6. **Agent Teams Integration** - Add opt-in Agent Teams support for `/mow:new-project` and `/mow:resume-work`
   - Addresses: Multi-session coordination, team lead orchestration
   - Avoids: Hard dependency on experimental feature (graceful fallback required)

7. **Documentation and Distribution** - `???` suffix help system, install script, marketplace publishing, README
   - Addresses: User onboarding, discoverability
   - Avoids: Documenting unstable features (done last)

**Phase ordering rationale:**
- Phases 1-2 establish the stable fork foundation before adding new features
- Phase 3 before Phase 4 because the quality skills must exist before they can be orchestrated
- Phase 5 before Phase 6 because worktree isolation is needed before multi-agent coordination
- Phase 6 is last feature phase because Agent Teams are experimental and may change
- Phase 7 is last because documentation should reflect the finished product

**Research flags for phases:**
- Phase 4: May need deeper research on subagent spawning patterns, context window limits, and how to synthesize findings from parallel subagents
- Phase 6: Likely needs deeper research as Agent Teams API may change between now and implementation. The experimental flag and known limitations need active monitoring.
- Phase 5: Standard patterns (git worktree + state files), unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against official docs, running GSD installation, and WorkTrunk docs. Zero-dependency CJS pattern proven by GSD at scale. |
| Features | HIGH | Feature list from PROJECT.md is well-defined. Karpathy/Cherny skills exist and are documented. Quality check chain documented in RECOMMENDED-WORKFLOW-CHAIN.md. |
| Architecture | HIGH | Plugin format, skill system, subagent system all verified against official Claude Code docs. GSD architecture proven in production. |
| Pitfalls | MEDIUM | Agent Teams limitations documented but may change. Worktree state isolation patterns are less proven at scale -- ccswarm and similar tools are early-stage. |

## Gaps to Address

- **Agent Teams API stability:** The experimental API may change. Monitor Anthropic releases during development. Phase 6 may need to be redesigned.
- **Worktree state merge conflicts:** How `.planning/STATE.md` merges when multiple worktrees update concurrently is not fully solved. WorkTrunk's merge workflow helps but custom merge drivers may be needed for state files.
- **Plugin marketplace mechanics:** The exact process for publishing to a marketplace and update distribution needs investigation during Phase 7.
- **Context window budget:** Skills consume context. With 20+ quality check skills, the description budget (2% of context window, ~16K chars fallback) may be exceeded. Need to measure and potentially use `disable-model-invocation: true` on infrequently auto-invoked skills.
- **Cross-platform testing:** PROJECT.md specifies CachyOS/fish/Wayland, but the tool should work on macOS and other Linux distros. Fish shell compatibility for hooks needs verification.

---
*Research summary for: Mowism*
*Researched: 2026-02-19*
