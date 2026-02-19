# Feature Research

**Domain:** Claude Code workflow orchestration / multi-agent coordination tooling
**Researched:** 2026-02-19
**Confidence:** MEDIUM (landscape is young and fast-moving; patterns well-established but implementations are weeks-old)

## Competitor Feature Analysis

Before categorizing, here is what each reference system actually provides:

### GSD (Get Shit Done) -- the upstream being forked

| Feature | How It Works |
|---------|-------------|
| Four-phase loop | discuss -> plan -> execute -> verify, per roadmap phase |
| Wave-based parallel execution | Independent tasks run in parallel; dependent tasks sequenced automatically |
| Atomic XML planning | Max 3 tasks per plan to keep subagent context clean |
| Fresh subagent contexts | Each task gets a clean 200K token window; Task 50 quality == Task 1 quality |
| Multi-agent spawning | 4 parallel researchers, 1 planner + 1 checker (looping), N executors, 1 verifier |
| Per-task git commits | Every completed task gets its own commit immediately |
| `.planning/` state directory | PROJECT.md, STATE.md, ROADMAP.md, phase directories, config.json |
| Session handoff | `/gsd:pause` writes `.continue-here.md` for next session to resume |
| Model profiles | Switch between quality/balanced/fast model routing per agent role |
| Phase-specific research | Optional domain research before planning each phase |
| Plan verification loop | Planner + checker iterate up to 3 times until plan meets phase goals |
| Milestone lifecycle | new-project -> phases -> audit-milestone -> complete-milestone -> new-milestone |
| Quick mode | `/gsd:quick` for small ad-hoc tasks with GSD guarantees but no milestone ceremony |
| Todo capture | `/gsd:add-todo` to capture ideas mid-session without losing context |
| Health check | `/gsd:health` validates `.planning/` integrity and auto-repairs |
| Codebase mapping | Parallel agents map codebase into structured docs in `.planning/codebase/` |
| Debug orchestration | Parallel debug agents investigate UAT gaps with pre-filled symptoms |
| Discovery phases | Depth-leveled discovery (level 1-3) before planning |
| Discuss phase | Extract implementation decisions interactively before research/planning |
| Gap planning | After audit finds gaps, auto-creates fix phases |

**What GSD does NOT have:**
- No worktree awareness (assumes single branch)
- No inter-session coordination (assumes single agent)
- No quality-check skill chain (verification is per-phase, not inter-phase)
- No Agent Teams integration

### WorkTrunk

| Feature | How It Works |
|---------|-------------|
| `wt switch` | Create/switch worktrees; shell integration keeps you in place |
| `wt list` | Status view with branch state, CI status, Claude session indicators |
| `wt merge` | Squash-merge with pre-merge testing, push, background cleanup |
| `wt remove` | Clean worktree removal |
| Hook system | post-create, post-start, post-switch, pre-commit, pre-merge, post-remove |
| Claude session tracking | Markers showing which worktrees have active Claude sessions |
| LLM commit messages | AI-generated commit messages as a hook option |
| Path templates | Worktrees addressed by branch name; paths from configurable template |
| Project hook approval | Security: project hooks require user approval on first run |

**What WorkTrunk does NOT have:**
- No orchestration (it manages worktrees, not agent coordination)
- No state management beyond git
- No planning or roadmap concepts
- No quality checks

### Anthropic Agent Teams

| Feature | How It Works |
|---------|-------------|
| Lead + Teammate model | One session coordinates; others execute independently |
| Shared task list | Dependency tracking, blocking/unblocking, self-claiming |
| Inter-agent messaging | @mentions between any pair of agents (lead-to-teammate, teammate-to-teammate) |
| Natural language setup | Describe team structure in prose; Claude creates and spawns it |
| Independent context windows | Each teammate gets its own full context window |
| File-lock based task claiming | Race-condition-safe claiming under the hood |
| Config storage | `~/.claude/teams/{team-name}/config.json` and `~/.claude/tasks/{team-name}/` |

**What Agent Teams does NOT have:**
- No persistent planning or roadmap structure
- No quality gate enforcement
- No worktree integration (teammates share one working directory)
- No phase lifecycle (it is task-oriented, not phase-oriented)
- Session resumption is unreliable (known limitation)
- Significant token overhead for coordination

### Karpathy/Cherny Skill Patterns

| Feature | How It Works |
|---------|-------------|
| SKILL.md architecture | YAML frontmatter for discovery + markdown instructions; loaded on-demand |
| Goal-driven execution | Declare success criteria, not imperative steps; agent loops until met |
| Verify-everything mindset | Every change tested; AI verifies its own work (2-3x quality improvement) |
| CLAUDE.md as learning memory | "Anytime Claude does something wrong, add it to CLAUDE.md" |
| Specialization pipeline | Spec -> draft -> simplify -> verify; each phase is a different "mind" |
| Skills as reusable workflows | If you do something more than once a day, make it a skill |
| Parallel session management | 10-15 concurrent Claude sessions across terminal, browser, mobile |
| Progressive disclosure | Skills loaded in stages as needed, not all at startup |
| disable-model-invocation | Skills with side effects can be restricted to user-only invocation |

**Specific skills relevant to Mowism:**
- scope-check (did the agent stay in scope?)
- simplify (reduce complexity and abstraction)
- dead-code-sweep (find and remove dead code)
- prove-it (correctness proofs for algorithms)
- grill-me (adversarial code review)
- change-summary (summarize what changed)
- update-claude-md (maintain project memory)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any Claude Code orchestration framework is expected to have in 2026. Missing these makes the tool feel broken or incomplete relative to alternatives.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Phase lifecycle management (plan/execute/verify) | GSD established this as baseline; users expect structured phases, not just raw tasks | MEDIUM | Already in GSD upstream; rebrand to `/mow:*` |
| Fresh subagent contexts per task | Context degradation is *the* problem orchestrators solve; GSD, OMC, claude-flow all do this | LOW | Already in GSD upstream |
| Wave-based parallel execution | Sequential execution is unacceptably slow; parallelism is expected | MEDIUM | Already in GSD upstream |
| Per-task atomic git commits | Every tool in the space does this; users need `git bisect` and rollback granularity | LOW | Already in GSD upstream |
| `.planning/` state persistence | Session-survivable state is baseline; claude-flow, GSD, flashbacker all persist to disk | LOW | Already in GSD upstream; needs worktree-awareness extension |
| Session handoff / resume | Users close terminals, hit rate limits, switch machines. Must resume seamlessly | LOW | GSD has `pause`/`resume`; needs worktree-aware continue-here |
| CLAUDE.md integration | Karpathy/Cherny established this as universal practice; every serious setup has it | LOW | Already standard; `update-claude-md` skill handles maintenance |
| Slash command interface | `/command` is the UX pattern Claude Code users know; skills, GSD, OMC all use it | LOW | Rebrand `/gsd:*` to `/mow:*` |
| Model profile switching | Users need to control cost vs quality tradeoff per project or per phase | LOW | Already in GSD upstream |
| Milestone lifecycle | Projects have versions/milestones; need to close one and start the next cleanly | MEDIUM | Already in GSD upstream |
| Health / integrity checking | Corrupted `.planning/` state is common after crashes or manual edits; need diagnostic tool | LOW | Already in GSD upstream |
| Codebase mapping | Agent needs to understand project structure before planning; parallel mappers are standard | MEDIUM | Already in GSD upstream |

### Differentiators (Competitive Advantage)

Features that set Mowism apart from GSD and other orchestration tools. These are the reason someone would choose Mowism over stock GSD or alternatives.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Worktree-first design (WorkTrunk integration)** | No other orchestration framework treats worktrees as the fundamental unit of parallel work. GSD assumes single-branch. claude-squad uses worktrees but has no planning layer. WorkTrunk manages worktrees but has no orchestration. Mowism unifies both. | HIGH | Core differentiator. STATE.md must track worktree assignments. Phase execution must route to specific worktrees. Merge coordination needed. |
| **Inter-phase quality refinement (`/mow:refine-phase`)** | GSD verifies per-phase (did the phase meet its goals?) but doesn't check cross-cutting quality: complexity creep, dead code accumulation, scope drift, abstraction bloat. Cherny's pipeline (draft -> simplify -> verify) is manual. Mowism automates the full chain as a tiered gate. | HIGH | Three tiers (minimum/complex/algorithmic) with parallel subagents. Writes persistent VERIFICATION-CHAIN-P{phase}.md. This is the key quality differentiator. |
| **Bundled quality-check skills** | Other tools either have no quality checks (WorkTrunk, Agent Teams) or make you assemble them yourself (skills marketplace). Mowism ships 20+ curated, ordered, parallelized quality skills out of the box. | MEDIUM | scope-check, simplify, dead-code-sweep, prove-it, grill-me, change-summary, etc. Need to fork, adapt for worktree-awareness, and integrate with refine-phase. |
| **Agent Teams as first-class integration** | GSD spawns subagents (fire-and-forget within one session). Agent Teams enables peer-to-peer coordination across sessions. No other orchestration framework integrates Agent Teams into its lifecycle -- they are separate worlds. Mowism bridges them. | HIGH | `/mow:new-project` and `/mow:resume-work` offer Agent Teams setup. Lead tracks overall state. Human can interact with individual teammates. Experimental dependency is a risk. |
| **Worktree-aware state management** | `.planning/` files written in one worktree are invisible to agents in other worktrees until merged. This causes context fragmentation -- the core problem identified in PROJECT.md. Mowism solves this with worktree-aware STATE.md that tracks assignments and prevents conflicts. | HIGH | Hardest technical problem. Options: shared `.planning/` on main with frequent rebases, a coordination file outside worktrees, or Agent Teams messaging. Needs careful design. |
| **`???` suffix for inline documentation** | Zero-friction discoverability. Type `/mow:refine-phase???` and the command's docs open in your editor. No one else does this. Small feature, high UX impact. | LOW | Simple implementation: detect `???` suffix, resolve command to its workflow .md file, open with `$EDITOR`. |
| **Verification chain persistence** | Quality check results written to `.planning/phases/VERIFICATION-CHAIN-P{phase}.md`. Creates an auditable trail of what was checked, what passed, what was flagged. Feeds into milestone audits. No other tool persists quality gate results across phases. | MEDIUM | Written by refine-phase subagents. Consumed by audit-milestone. Enables "show me the quality history of this project" queries. |
| **Tiered quality checks** | Three explicit tiers: minimum (lint, scope, dead code), complex (simplify, review, prove-it), algorithmic (formal proofs, adversarial testing). User chooses tier per refinement. Other tools are all-or-nothing. | MEDIUM | Tier selection UI in `/mow:refine-phase`. Each tier runs different subagent combinations. Higher tiers include lower tier checks. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Mowism should explicitly NOT build these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Custom Agent Teams implementation** | Anthropic's is experimental and limited | Building a custom multi-session coordination layer is an enormous engineering effort that would immediately become the hardest thing in the project. It would also diverge from where Anthropic is investing, meaning you'd maintain an alternative to a feature the platform vendor is actively improving. | Use Anthropic's Agent Teams as-is. Wrap it with Mowism-specific setup helpers and state tracking, but don't reimplement the coordination primitives. |
| **GUI / web dashboard** | Visual monitoring of parallel agents is appealing | Mowism's users are CLI-first Claude Code power users. A web UI adds a maintenance surface, a web framework dependency, and a deployment requirement for something that can be done with `wt list` and STATE.md. | Use WorkTrunk's `wt list` with status indicators. Use `/mow:progress` for project state. If monitoring is needed, build a terminal TUI later, not a web app. |
| **Knowledge graph / vector database for long-term memory** | "What if agents could remember everything across all projects forever?" | Claude Code already has `.claude/` memory, CLAUDE.md, and `.planning/` files in git. Adding a vector DB adds infrastructure, embedding cost, retrieval complexity, and a new failure mode -- all for marginal improvement over just reading files. The filesystem is the knowledge graph. | Rely on CLAUDE.md + `.planning/` files + git history. If cross-project memory is needed, use `~/.claude/CLAUDE.md` (user-global instructions). |
| **60+ specialized agent roles** | Claude-flow has 60+ agents; more agents = more powerful? | More agent roles means more system prompts to maintain, more routing logic, more token overhead, and more confusion about which agent does what. GSD's focused set (researcher, planner, checker, executor, verifier) is effective because each role is well-defined. | Keep agent roles minimal and well-defined. Quality comes from good prompts per role, not from having many roles. Mowism adds quality-check subagents to GSD's set; that is sufficient. |
| **Automatic model routing based on task complexity** | oh-my-claudecode routes to cheaper models for simple tasks | Model routing adds a classification step that itself costs tokens, and misclassification (using a cheap model on a hard task) causes failures that are harder to debug than just using the right model. GSD's profile system (user picks quality/balanced/fast) is more predictable. | Keep GSD's model profiles. User picks profile at project or phase level. Don't auto-route. |
| **Plugin/extension marketplace** | "Let users add their own agents and skills!" | Mowism IS a skill/command package. Building a marketplace for extensions of extensions creates infinite recursion of maintenance. Skills are just .md files in a directory -- users can add their own without marketplace infrastructure. | Document how to add custom skills to the Mowism directory. Users copy .md files. No registry, no versioning infrastructure, no marketplace. |
| **Multi-year workflow persistence** | "Track projects across years with full history" | Scope explosion. Git already provides multi-year history. `.planning/` files in git provide project memory. Building persistence beyond this requires a database, schema migrations, and backup strategy for marginal benefit over `git log`. | Git IS the persistence layer. `.planning/` files committed to git provide full history. `git log --follow .planning/STATE.md` shows project evolution. |
| **Forking/modifying WorkTrunk itself** | "We need WorkTrunk to do X differently" | WorkTrunk is actively maintained by someone else. Forking it creates a maintenance burden and breaks the clean dependency boundary. Mowism should be a WorkTrunk consumer, not a WorkTrunk fork. | Use WorkTrunk as-is via its hook system. If customization is needed, use hooks (post-create, pre-merge, etc.) or request features upstream. |

## Feature Dependencies

```
[WorkTrunk integration]
    |
    +--requires--> wt CLI installed and in PATH
    |
    +--enables--> [Worktree-aware state management]
    |                  |
    |                  +--enables--> [Agent Teams + worktree coordination]
    |                  |
    |                  +--enables--> [Parallel phase execution across worktrees]
    |
    +--enables--> [Verification chain persistence]
                       (needs to know which worktree produced which verification)

[GSD fork + /mow:* rebrand]
    |
    +--enables--> [All table stakes features] (inherited from GSD)
    |
    +--enables--> [/mow:refine-phase]
    |                  |
    |                  +--requires--> [Bundled quality-check skills]
    |                  |
    |                  +--produces--> [Verification chain persistence]
    |
    +--enables--> [??? suffix documentation]

[Agent Teams integration]
    |
    +--requires--> CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
    |
    +--requires--> [Worktree-aware state management] (otherwise agents conflict)
    |
    +--enhances--> [Phase execution] (multiple agents can work on sub-tasks)

[Bundled quality-check skills]
    |
    +--requires--> [GSD fork] (skills are .md files registered in skill system)
    |
    +--enables--> [/mow:refine-phase] (refine-phase orchestrates these skills)
    |
    +--enhances--> [Verification chain persistence] (skills write findings)

[??? suffix] ──independent──> (no dependencies, pure UX feature)
```

### Dependency Notes

- **WorkTrunk integration is the foundation:** Everything multi-agent depends on worktree isolation first. Without it, parallel execution is unsafe.
- **Worktree-aware state is the hardest problem:** All three differentiators (refine-phase, Agent Teams, verification chain) depend on agents in different worktrees sharing coherent state.
- **Agent Teams requires worktree-awareness:** Without worktree-aware state, Agent Teams teammates would write conflicting `.planning/` state or work on the same files.
- **Refine-phase requires skills to exist first:** The quality gate orchestrates skills; the skills must be forked and adapted before the gate can run them.
- **??? suffix is independent:** Can be built at any time, no dependencies, quick win.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to validate the core value proposition that "multiple Claude Code agents can work in parallel with coherent state and automated quality gates."

- [ ] GSD forked and rebranded to `/mow:*` -- establishes the project identity and inherits all table stakes
- [ ] WorkTrunk as required dependency -- validates the worktree-first premise
- [ ] Worktree-aware STATE.md -- the minimum viable state coherence (track which worktree is executing which phase, prevent double-execution)
- [ ] Quality-check skills forked and registered -- bundled scope-check, simplify, dead-code-sweep, change-summary (minimum tier)
- [ ] `/mow:refine-phase` (minimum tier only) -- the signature feature, even in simplest form
- [ ] `???` suffix for inline docs -- quick win, high UX impact, reinforces Mowism identity
- [ ] Install script -- one command to install globally to `~/.claude/`

### Add After Validation (v1.x)

Features to add once the core is working and initial users have validated the workflow.

- [ ] `/mow:refine-phase` complex and algorithmic tiers -- add when minimum tier proves its value
- [ ] Verification chain persistence (VERIFICATION-CHAIN-P{phase}.md) -- add when users want audit trails
- [ ] Agent Teams integration in `/mow:new-project` and `/mow:resume-work` -- add once worktree-aware state is proven stable
- [ ] Full skill set (prove-it, grill-me, update-claude-md, etc.) -- add incrementally as skills are adapted for worktree-awareness
- [ ] STATE.md tracks agent team status and verification chain results -- add with Agent Teams integration

### Future Consideration (v2+)

Features to defer until product-market fit is established and the core workflow is battle-tested.

- [ ] Cross-worktree `.planning/` synchronization (real-time, not merge-based) -- technically hard, unclear if needed vs. rebasing
- [ ] Terminal TUI for monitoring parallel agents -- only if `wt list` + `/mow:progress` proves insufficient
- [ ] Custom subagent roles beyond GSD's core set -- only if users demonstrate clear need
- [ ] Upstream GSD feature parity tracking -- automated detection of upstream changes worth cherry-picking

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| GSD fork + `/mow:*` rebrand | HIGH | MEDIUM | P1 |
| WorkTrunk required dependency | HIGH | LOW | P1 |
| Worktree-aware STATE.md | HIGH | HIGH | P1 |
| Quality-check skills (minimum set) | HIGH | MEDIUM | P1 |
| `/mow:refine-phase` (minimum tier) | HIGH | MEDIUM | P1 |
| `???` suffix documentation | MEDIUM | LOW | P1 |
| Install script (one-command setup) | HIGH | MEDIUM | P1 |
| `/mow:refine-phase` (all tiers) | MEDIUM | MEDIUM | P2 |
| Verification chain persistence | MEDIUM | MEDIUM | P2 |
| Agent Teams integration | HIGH | HIGH | P2 |
| Full quality skill set | MEDIUM | MEDIUM | P2 |
| Cross-worktree state sync | MEDIUM | HIGH | P3 |
| Terminal monitoring TUI | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- validates the core premise
- P2: Should have, add when core is stable -- completes the vision
- P3: Nice to have, future consideration -- only if evidence demands it

## Confidence Notes

| Finding | Confidence | Source |
|---------|------------|--------|
| GSD feature set | HIGH | Installed locally at `~/.claude/get-shit-done/`, verified all 32 workflows |
| WorkTrunk capabilities | MEDIUM | WebSearch + official site; not locally verified |
| Agent Teams architecture | MEDIUM | Anthropic official docs + multiple corroborating sources; experimental feature may change |
| Karpathy/Cherny skill patterns | MEDIUM | Multiple sources agree on patterns; specific skill implementations need verification from `/home/max/git/ai-agent-tools-and-tips/` |
| Competitor landscape (claude-flow, OMC, claude-squad) | LOW | WebSearch only; star counts and feature claims not independently verified |
| Worktree-aware state management approaches | LOW | No established pattern exists; this is novel territory that needs design-phase research |

## Sources

- [GSD GitHub](https://github.com/gsd-build/get-shit-done) -- upstream repository
- [WorkTrunk](https://worktrunk.dev/) -- worktree management CLI
- [WorkTrunk GitHub](https://github.com/max-sixty/worktrunk) -- source repository
- [Anthropic Agent Teams docs](https://code.claude.com/docs/en/agent-teams) -- official documentation
- [Claude Code Skills docs](https://code.claude.com/docs/en/skills) -- official skill system documentation
- [Claude Code Subagents docs](https://code.claude.com/docs/en/sub-agents) -- official subagent documentation
- [Karpathy's Claude coding notes](https://x.com/karpathy/status/2015883857489522876) -- principles on LLM coding quality
- [Cherny's Claude Code workflow](https://venturebeat.com/technology/the-creator-of-claude-code-just-revealed-his-workflow-and-developers-are) -- creator's recommended patterns
- [Addy Osmani on Claude Code Swarms](https://addyosmani.com/blog/claude-code-agent-teams/) -- practical patterns
- [GSD team collaboration issue #243](https://github.com/gsd-build/get-shit-done/issues/243) -- multi-agent limitations discussion
- [GSD rate limit issue #208](https://github.com/gsd-build/get-shit-done/issues/208) -- team plan detection
- [Swarm Orchestration Skill gist](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea) -- coordination patterns
