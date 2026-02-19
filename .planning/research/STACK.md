# Stack Research

**Domain:** Claude Code workflow orchestration / multi-agent skill system
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

Mowism is a fork of GSD that lives in `~/.claude/` and orchestrates Claude Code sessions across git worktrees. The stack is intentionally minimal: Markdown workflows + a single-file Node.js CLI tool + shell scripts. This is not a typical web application -- it is a **prompt engineering and coordination system** where the "runtime" is Claude Code itself, and the primary outputs are Markdown files that shape agent behavior.

GSD's proven architecture (5300-line zero-dependency CJS file, Markdown workflows as prompts, JSON state files) is the right foundation. Mowism extends this with worktree awareness and Agent Teams integration, but the fundamental stack stays the same. The most important technology decisions are about Claude Code platform features (skills vs plugins, subagents vs agent teams), not framework choices.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js (CJS) | >=18.x (system: v25.4.0) | CLI tool runtime | GSD uses a single `.cjs` file with zero npm dependencies. No build step, no bundler, no package manager needed. Claude Code ships Node.js, so it is always available. CJS chosen over ESM for `require()` simplicity and compatibility with `node:test`. |
| Markdown (YAML frontmatter) | N/A | Skill/workflow definitions | Claude Code's native skill format. YAML frontmatter configures behavior (name, description, allowed-tools, model, context); Markdown body is the prompt. This is the Agent Skills open standard at agentskills.io -- cross-platform with Codex, Gemini CLI, Cursor. |
| JSON | N/A | State and config files | `.planning/config.json`, `.planning/STATE.md` frontmatter. Zero-dependency parsing via `JSON.parse()`. GSD stores all mutable state in JSON frontmatter within Markdown files or standalone JSON. |
| Git | >=2.20 | Version control + worktree isolation | Git worktrees are the isolation mechanism for parallel agents. Each agent operates in its own worktree with its own branch. Shared `.git` directory means all worktrees share history. |
| WorkTrunk (`wt`) | 0.25.0 | Git worktree management CLI | Purpose-built for multi-agent parallel workflows. Written in Rust (fast). Handles create, switch, list, merge, remove, hooks. Replaces custom `wt:*` skills. Installed via `paru worktrunk-bin` on Arch. |
| Claude Code | >=2.1.x (system: 2.1.47) | AI agent runtime | The platform Mowism extends. Provides skills system, subagents, agent teams, hooks, plugins, and the `Task` tool for spawning subagents. |

**Confidence: HIGH** -- Verified against official Claude Code docs (code.claude.com), WorkTrunk docs (worktrunk.dev), and the running GSD installation at `~/.claude/get-shit-done/`.

### Claude Code Platform Features (Critical Decisions)

| Feature | Use In Mowism | Maturity | Notes |
|---------|---------------|----------|-------|
| **Skills** (`.claude/skills/` or `.claude/commands/`) | All `/mow:*` commands | Stable | Primary delivery mechanism. Skills follow the Agent Skills open standard. `.claude/commands/` still works and is equivalent. Skills add supporting files, model/context control, and auto-invocation. |
| **Custom Agents** (`.claude/agents/`) | Quality-check subagents, researchers | Stable | Markdown files with YAML frontmatter. Define `name`, `description`, `tools`, `model`, `permissionMode`, `skills`, `memory`, `hooks`. Agents cannot spawn other agents. |
| **Agent Teams** | `/mow:new-project`, `/mow:resume-work` coordination | Experimental | Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Provides shared task list, inter-agent messaging, teammate lifecycle. Known limitations: no session resumption, task status lag, no nested teams. Use for high-level project coordination only. |
| **Hooks** (`settings.json`) | SessionStart, PostToolUse, SubagentStop | Stable | Shell commands triggered by lifecycle events. Used for: session setup, file linting, post-work chimes, state sync. |
| **Plugins** (`.claude-plugin/`) | Distribution format | Stable | Bundles skills + agents + hooks + MCP servers. Namespaced commands (`/mow:*`). Can be installed from marketplaces. This is the recommended distribution format for Mowism. |
| **Subagents** (Task tool) | Quality checks within `/mow:refine-phase` | Stable | Orchestrator spawns subagents for parallel quality checks. Each subagent gets its own context window. Cannot spawn nested subagents. Cheaper than agent teams. |

**Confidence: HIGH** -- All verified against official Claude Code documentation at code.claude.com/docs/en/{skills,sub-agents,agent-teams,hooks,plugins}.

### Distribution Format Decision

**Use: Claude Code Plugin** (not standalone `~/.claude/` install)

Rationale:
- Plugin format bundles skills, agents, hooks, and MCP configs in one directory
- Namespaced commands (`/mow:*`) come naturally from `plugin.json` `name: "mow"`
- Installation via `/plugin install` or marketplace
- Version management via `plugin.json` version field
- Clean separation from user's other skills/agents
- Can still test with `--plugin-dir ./mowism` during development

Plugin structure for Mowism:
```
mowism/
  .claude-plugin/
    plugin.json          # name: "mow", version, description
  skills/                # All /mow:* skills
    new-project/SKILL.md
    resume-work/SKILL.md
    execute-phase/SKILL.md
    plan-phase/SKILL.md
    refine-phase/SKILL.md
    ...
  agents/                # Custom subagents
    mow-quality-checker.md
    mow-researcher.md
    mow-roadmapper.md
    ...
  hooks/
    hooks.json           # SessionStart, PostToolUse, SubagentStop
  bin/
    mow-tools.cjs        # Single-file CLI tool (forked from gsd-tools.cjs)
  references/            # Supporting docs for skills
  templates/             # Markdown templates for state files
```

**Confidence: HIGH** -- Plugin format verified in official docs. GSD itself uses standalone install because it predates the plugin system, but plugins are the current recommendation for new projects.

### CLI Tool Architecture

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Single `.cjs` file | N/A | All CLI operations | GSD's `gsd-tools.cjs` (5326 lines) proves this pattern works at scale. Zero dependencies. No `npm install`. No `node_modules`. All Node.js built-ins only: `fs`, `path`, `child_process`, `crypto`, `os`. Fork as `mow-tools.cjs`. |
| `node:test` + `node:assert` | Built-in (Node >=18) | Testing | GSD uses Node's built-in test runner. No Jest, no Vitest, no Mocha needed. `node --test bin/mow-tools.test.cjs` runs all tests. Supports `describe`, `test`, `beforeEach`, mocking, and code coverage. |
| JSON output mode | N/A | Machine-readable CLI output | GSD tools output JSON by default, Markdown/human-readable with `--raw` flag removed. Workflows parse JSON output. Critical for composability. |
| YAML frontmatter parsing | Custom (regex) | State file parsing | GSD parses `---` frontmatter blocks with a simple regex parser, no `js-yaml` dependency. Store structured state in frontmatter, prose in body. |

**Confidence: HIGH** -- Verified by reading `gsd-tools.cjs` and `gsd-tools.test.cjs` source code.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **None (zero dependencies)** | N/A | N/A | The entire CLI tool uses only Node.js built-in modules. This is a deliberate design constraint inherited from GSD. No `package.json` dependencies. No `node_modules`. The tool must work anywhere Node.js is installed. |

This is not an oversight. The zero-dependency constraint is a feature:
1. Claude Code guarantees Node.js is available
2. No `npm install` step means instant installation
3. No version conflicts with user's projects
4. Single file copy = full deployment
5. GSD proved this works at 5300+ lines

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `node --test` | Run test suite | `node --test bin/mow-tools.test.cjs`. Built into Node >=18. |
| `node --test --coverage` | Code coverage | Built-in V8 coverage. No Istanbul/nyc needed. |
| `shellcheck` | Lint shell scripts | Already configured in Claude Code hooks (PostToolUse on .sh/.bash files). |
| `wt` (WorkTrunk) | Worktree management during development | Use `wt switch -c feature-name` to develop features in parallel worktrees. |
| `claude --plugin-dir .` | Test plugin locally | Load the plugin from the repo directory during development. |

## Installation

```bash
# WorkTrunk (required dependency)
# Arch Linux:
paru -S worktrunk-bin
# macOS:
brew install worktrunk
# From source:
cargo install worktrunk

# Shell integration (required for directory switching)
wt config shell install

# Enable Agent Teams (optional, experimental)
# Add to ~/.claude/settings.json:
# { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }

# Mowism installation (plugin method)
# Option 1: From marketplace (when published)
# /plugin marketplace add mowism/mowism

# Option 2: From local directory (development)
claude --plugin-dir /path/to/mowism

# Option 3: Direct install (alternative to plugin)
# /plugin add /path/to/mowism
```

No `npm install` step. No build step. The plugin contains only Markdown files and a single `.cjs` file.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Single `.cjs` file (zero deps) | TypeScript + tsup/esbuild bundling | If the CLI grows beyond ~8000 lines and type safety becomes critical. At that point, write in TS and bundle to a single CJS file with `tsup --format cjs --no-splitting`. But GSD has been maintained at 5300 lines without TS successfully. |
| `node:test` built-in runner | Vitest / Jest | If you need watch mode, snapshot testing with UI, or complex mocking. `node:test` covers GSD/Mowism needs. Vitest would add dependencies. |
| Plugin format (`.claude-plugin/`) | Standalone `~/.claude/` install | If you need to override user's existing skills (plugins have lower priority than user-level skills). GSD uses standalone install. Mowism should use plugin format for cleaner distribution. |
| Skills (`.claude/skills/`) | Commands (`.claude/commands/`) | Commands still work and are simpler (single .md file). Skills add supporting files, auto-invocation, and agent type control. Use skills for new development. |
| WorkTrunk (`wt`) | Raw `git worktree` commands | If WorkTrunk is not installed. The `wt:*` skills in the source repo wrap git worktree directly. But WorkTrunk adds hooks, interactive picker, merge workflow, and Claude Code integration that raw git lacks. |
| Subagents for quality checks | Agent Teams for quality checks | Agent Teams if quality check agents need to communicate findings to each other (e.g., scope-check result influences prove-it focus). But subagents are cheaper, simpler, and sufficient for independent parallel checks. Use agent teams only for project-level orchestration. |
| Custom frontmatter parser (regex) | `js-yaml` or `yaml` npm package | If YAML parsing becomes complex (nested arrays, anchors, etc.). GSD's regex parser handles flat key-value and simple nested fields. Adding `js-yaml` would break the zero-dependency constraint. |
| JSON state files | SQLite (`node:sqlite` in Node 22+) | If state queries become complex (joins, aggregation, history). Node 22+ has built-in SQLite. But Markdown + JSON files are human-readable, git-diffable, and Claude-friendly. SQLite is opaque to agents. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **npm dependencies** | Breaks instant installation. Requires `npm install`. Creates `node_modules`. Version conflicts with user projects. GSD proved zero-deps works. | Node.js built-in modules only (`fs`, `path`, `child_process`, `crypto`, `os`, `node:test`). |
| **TypeScript source files** (unbundled) | Requires compilation step. Claude Code doesn't ship `tsc`. Users would need to build before using. | Plain `.cjs` files. If TS is desired later, bundle to single CJS with tsup. |
| **ESM modules** (`.mjs`) | Breaks `require()` patterns. GSD's entire codebase is CJS. `node:test` works better with CJS. Mixed ESM/CJS causes headaches. | CommonJS (`.cjs`). |
| **Commander.js / Yargs** | CLI argument parsing libraries add dependencies for minimal benefit. GSD's hand-rolled `process.argv` parsing is sufficient for its command structure (single top-level command + flags). | `process.argv` manual parsing, same as GSD. |
| **Express / Fastify / any HTTP server** | Mowism is not a web service. It is a CLI tool + prompt files. There is no HTTP layer. | Direct file I/O and `child_process.execSync` for git operations. |
| **React / Vue / any UI framework** | No web UI. No Electron. Mowism runs inside Claude Code's terminal. | Markdown-formatted terminal output. Claude Code renders the UI. |
| **Docker / containers** | Mowism must run in the user's local environment where Claude Code runs. Containers would isolate it from the git repo and worktrees. | Direct installation to `~/.claude/` or plugin system. |
| **Anthropic API SDK (`@anthropic-ai/sdk`)** | Mowism does not call the Anthropic API directly. Claude Code IS the API client. Mowism orchestrates via skills and the Task tool. | Claude Code's built-in subagent system (Task tool), agent teams. |
| **LangChain / LangGraph / CrewAI** | External agent orchestration frameworks are redundant. Claude Code has its own orchestration (subagents, agent teams, skills). Adding another layer creates confusion and conflicts. | Claude Code's native skill/subagent/agent-team system. |
| **Database (PostgreSQL, MongoDB, Redis)** | State is stored in git-tracked Markdown/JSON files. Databases break the "everything in the repo" model and require separate infrastructure. | `.planning/` directory with Markdown + JSON files. Git is the database. |

## Stack Patterns by Variant

**If developing locally (recommended):**
- Clone repo, use `claude --plugin-dir ./mowism` to test
- Edit skills/agents directly, restart Claude Code session to reload
- Use `wt switch -c feature-name` for parallel feature development

**If distributing via plugin marketplace:**
- Publish to a GitHub-based marketplace
- Users install with `/plugin marketplace add mowism/mowism`
- Updates via `/plugin update mow`

**If user has no WorkTrunk:**
- Mowism should detect missing `wt` on SessionStart hook
- Provide installation instructions for their platform
- Degrade gracefully: single-worktree mode (no parallel agents)

**If Agent Teams is not enabled:**
- Detect missing `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var
- Fall back to subagent-based orchestration (stable, no experimental features)
- Offer to enable via settings.json update

## Version Compatibility

| Component | Minimum Version | Tested On | Notes |
|-----------|-----------------|-----------|-------|
| Node.js | 18.x | 25.4.0 | `node:test` requires >=18. `node:assert` requires >=18. Built-in `fetch` requires >=18. |
| Claude Code | 2.1.x | 2.1.47 | Skills system, plugins, subagents, agent teams all available in 2.1.x. |
| WorkTrunk | 0.20.0 | 0.25.0 | Core commands (`switch`, `list`, `merge`, `remove`) stable since 0.20. Hooks added later. |
| Git | 2.20 | System | `git worktree` stable since 2.15. WorkTrunk requires >=2.20 for some features. |
| GSD (upstream fork base) | 1.20.x | 1.20.4 | Fork point. `gsd-tools.cjs` is the base for `mow-tools.cjs`. |

## Key Architecture Decisions for Stack

### Decision 1: Plugin vs. Standalone Install
**Choose:** Plugin format
**Why:** Namespaced commands, clean distribution, marketplace support, bundled agents+hooks+skills. GSD's standalone install is legacy; new projects should use the plugin system.

### Decision 2: Subagents vs. Agent Teams for Quality Checks
**Choose:** Subagents (with Agent Teams as opt-in enhancement)
**Why:** Subagents are stable, cheap, and sufficient for independent parallel quality checks. Agent Teams are experimental with known limitations. `/mow:refine-phase` should use subagents by default, with an option to use agent teams when the user has them enabled and wants cross-check coordination.

### Decision 3: Worktree State Isolation
**Choose:** `.planning/` files in each worktree + shared state via git
**Why:** Each worktree has its own copy of `.planning/`. Agent-specific state (what this agent is doing) stays local. Shared state (overall project progress) merges via git. WorkTrunk's merge workflow handles this. This is the same model that ccswarm and similar tools use.

### Decision 4: Skill Format
**Choose:** Agent Skills open standard (SKILL.md with YAML frontmatter)
**Why:** Cross-platform compatibility (Codex, Gemini CLI, Cursor). Progressive disclosure (description loaded first, full content on invocation). Supporting files for complex skills. Future-proof as the standard evolves.

## Sources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) -- Verified 2026-02-19. Skills system, YAML frontmatter fields, supporting files, invocation control, subagent execution.
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- Verified 2026-02-19. Custom agents, frontmatter fields, built-in agents, model selection, permission modes, persistent memory.
- [Claude Code Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams) -- Verified 2026-02-19. Experimental feature, enable via env var, shared task list, messaging, limitations.
- [Claude Code Plugins Documentation](https://code.claude.com/docs/en/plugins) -- Verified 2026-02-19. Plugin structure, manifest format, distribution, marketplace.
- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks) -- Referenced via search results, 2026-02-19.
- [Agent Skills Open Standard](https://agentskills.io/specification) -- Verified 2026-02-19. Cross-platform skill format specification.
- [WorkTrunk Documentation](https://worktrunk.dev/) -- Verified 2026-02-19. Installation, core commands, hooks, Claude Code integration.
- [WorkTrunk GitHub](https://github.com/max-sixty/worktrunk) -- Verified via search, 2026-02-19.
- [GSD (Get Shit Done) GitHub](https://github.com/gsd-build/get-shit-done) -- Verified via search, 2026-02-19.
- GSD source code at `~/.claude/get-shit-done/` -- Read directly, 2026-02-19. `gsd-tools.cjs` (5326 lines), `gsd-tools.test.cjs`, workflow files, command files.
- Mowism PROJECT.md at `/home/max/git/mowism/.planning/PROJECT.md` -- Read directly, 2026-02-19.
- Source skills at `/home/max/git/ai-agent-tools-and-tips/` -- Read directly, 2026-02-19. Karpathy/Cherny skills, RECOMMENDED-WORKFLOW-CHAIN.md.

---
*Stack research for: Mowism -- Claude Code workflow orchestration system*
*Researched: 2026-02-19*
