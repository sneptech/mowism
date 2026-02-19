# Pitfalls Research

**Domain:** Claude Code multi-agent workflow orchestration with git worktrees
**Researched:** 2026-02-19
**Confidence:** HIGH (official docs + multiple corroborating sources for most findings)

## Critical Pitfalls

These are mistakes that cause rewrites, architectural dead ends, or systemic failures.

### Pitfall 1: State File Write Conflicts Across Worktrees

**What goes wrong:**
Multiple worktrees share `.planning/` as part of the git repository. When Agent A in worktree-alpha writes to `STATE.md` while Agent B in worktree-beta also writes to `STATE.md`, these changes exist on different branches. At merge time, git produces textual merge conflicts in structured state files. Worse, if agents commit and push to the same branch (or if `.planning/` lives on a shared branch), one agent's writes silently overwrite the other's. The "last commit wins" problem means state is lost, not corrupted -- you get no error, just missing information.

**Why it happens:**
Git worktrees provide filesystem isolation (each worktree is a separate directory with its own checked-out branch) but share the same `.git` database. Files modified in one worktree do not affect others until committed and merged. Developers assume "shared state" means concurrent access, but git provides no concurrent write coordination -- it provides branching and merging. `.planning/STATE.md` as a single monolithic file is the worst possible structure for multi-writer scenarios because any two writes to different sections still produce a full-file merge conflict.

**How to avoid:**
- Split state into per-worktree files: `.planning/state/worktree-alpha.json`, `.planning/state/worktree-beta.json`. Each worktree only writes its own file. A coordinator reads all files.
- Use append-only log files instead of mutable state files. Appending to a log is merge-friendly; editing a structured document is not.
- If a single unified STATE.md is needed, designate one worktree (the "main" worktree or lead orchestrator) as the sole writer, and have other worktrees write to per-worktree status files that the lead merges.
- Consider storing coordination state outside git entirely (a local SQLite database, a Unix socket, or a temp file in `/tmp/mowism/`) for truly concurrent access.

**Warning signs:**
- Merge conflicts in `.planning/` files during worktree merges
- STATE.md shows stale or missing information about a worktree's progress
- Two agents report completing the same task (because neither saw the other's claim)
- `git log --all -- .planning/STATE.md` shows commits from multiple worktrees touching the same file

**Phase to address:**
Phase 1 (Core Architecture). This is foundational -- every subsequent feature depends on state management being correct. Getting this wrong means rebuilding the entire coordination layer later.

---

### Pitfall 2: Agent Teams Session Resumption Failure

**What goes wrong:**
Agent Teams has a documented limitation: `/resume` and `/rewind` do not restore in-process teammates. After resuming a session, the lead may attempt to message teammates that no longer exist. Since Mowism's `/mow:resume-work` presumably wraps session resumption, any workflow that spans multiple user sessions (stop for the night, resume in the morning) will lose the entire agent team. The lead comes back but its teammates are gone, and it may hallucinate they still exist, sending messages into the void.

**Why it happens:**
Agent Teams stores team config in `~/.claude/teams/{team-name}/config.json` and task lists in `~/.claude/tasks/{team-name}/`. These persist, but the actual Claude Code processes for teammates do not survive session termination. The lead's context after `/resume` still contains memory of teammate existence, creating a mismatch between the lead's mental model and reality.

**How to avoid:**
- Design Mowism workflows to be session-bounded: an agent team is created, does its work, and is cleaned up within a single user session. Do not assume teams survive across sessions.
- When `/mow:resume-work` detects a previous agent team existed, it should explicitly spawn new teammates rather than trying to reconnect to old ones. Clear stale team config from `~/.claude/teams/`.
- Persist task state in `.planning/` files (which survive in git) rather than relying on Agent Teams' built-in task list (which is ephemeral). The Agent Teams task list is a coordination mechanism, not a persistence layer.
- Document this limitation prominently -- users will assume "resume" means "resume everything."

**Warning signs:**
- Lead agent says "I'll ask the researcher teammate" but no teammate responds
- Task list shows tasks "in progress" but no teammate is working on them
- User resumes a session and sees the lead idle with no active teammates

**Phase to address:**
Phase 2 (Agent Teams Integration). Must be addressed before Agent Teams is offered as a feature. The `/mow:resume-work` command must handle this gracefully from day one.

---

### Pitfall 3: Fork Drift Making GSD Upstream Unreachable

**What goes wrong:**
Mowism forks GSD and renames all commands from `/gsd:*` to `/mow:*`, modifies state management, adds worktree awareness, and changes the agent orchestration model. Each of these changes touches the core of GSD. Within weeks, the fork diverges so far that pulling upstream improvements requires manually cherry-picking and adapting every change. Within months, it becomes effectively impossible. The project loses access to upstream bug fixes, new features, and community contributions.

**Why it happens:**
Fork drift is exponential, not linear. Each structural change (renaming commands, changing file formats, altering orchestration patterns) means that upstream changes to those same areas cannot be automatically merged. The PROJECT.md already states "No expectation of merging back upstream," which is honest but also means the full maintenance burden falls on Mowism permanently. GSD is actively maintained -- bug fixes, new features, and Claude Code compatibility updates happen there, and Mowism must replicate all of that independently.

**How to avoid:**
- Identify which parts of GSD are "stable core" (unlikely to change) vs. "active surface" (templates, prompts, orchestration). Minimize changes to the stable core.
- Wrap rather than fork where possible. If GSD's research agent templates are good, use them as-is and add worktree awareness as a layer on top, rather than rewriting them.
- Maintain a "divergence ledger" -- a file tracking every intentional deviation from upstream GSD, why it was made, and what upstream file it diverges from. This makes periodic upstream audits feasible.
- Automate upstream diffing: a script that compares Mowism's versions of key files against upstream GSD and flags when upstream has changed something Mowism also modified.
- Accept the fork fully and early. If the architecture diverges enough, stop thinking of it as a fork and treat it as an independent project that was initially inspired by GSD. This is psychologically healthier than maintaining a fiction of compatibility.

**Warning signs:**
- `git diff upstream/main...HEAD` grows monotonically and never shrinks
- Upstream GSD releases features that would be useful but are impossible to integrate
- Bug reports that are "already fixed in upstream GSD" but can't be pulled in
- Time spent on "GSD compatibility" exceeds time spent on Mowism-specific features

**Phase to address:**
Phase 1 (Fork Setup). The decision of "how much to fork vs. wrap" must be made before any code is written. Once the fork structure is established, changing it is a rewrite.

---

### Pitfall 4: Quality Check Subagents Producing Contradictory Recommendations

**What goes wrong:**
Mowism runs parallel quality-check subagents (scope-check, simplify, prove-it, dead-code-sweep, etc.). Subagent A says "this function is too complex, split it into three smaller functions." Subagent B says "there are too many small functions, consolidate into a single cohesive module." Both are locally reasonable. Without a reconciliation mechanism, either the user must manually adjudicate every conflict, or the orchestrator picks one arbitrarily (or tries to apply both, creating incoherent code).

**Why it happens:**
Each quality-check subagent operates with its own system prompt optimized for a specific concern (simplicity, correctness, scope discipline, etc.). These concerns genuinely conflict in many real-world situations. "Simplify" wants fewer abstractions; "prove-it" wants explicit contracts and types that add abstraction. "Scope-check" wants minimal changes; "dead-code-sweep" wants to remove unused code that scope-check would say is out-of-scope. The subagents have no knowledge of each other's recommendations because subagents only report back to the caller -- they cannot communicate laterally.

**How to avoid:**
- Design a reconciliation layer in the orchestrator. After all subagents report, the orchestrator reviews all recommendations together and produces a unified set of actions, explicitly resolving conflicts. This is the "lead researcher synthesizes findings" pattern from Anthropic's own multi-agent research system.
- Assign priorities to quality dimensions: correctness > simplicity > scope > style. When recommendations conflict, higher-priority dimensions win.
- Include conflict detection in the orchestrator prompt: "If subagent A recommends X and subagent B recommends the opposite, flag this as a conflict for human review rather than silently choosing one."
- Consider running quality checks sequentially for high-complexity phases rather than always in parallel. Sequential execution lets later checks build on earlier ones.

**Warning signs:**
- Quality check reports contain directly contradictory action items
- Applying all quality check recommendations leaves the code in a worse state than before
- The user routinely ignores quality check output because "it's always contradictory"
- The VERIFICATION-CHAIN file contains recommendations that, if all applied, would conflict

**Phase to address:**
Phase 3 (Quality Gates / refine-phase). The reconciliation mechanism must be designed before quality checks are run in parallel. Running them in parallel without reconciliation is worse than running them sequentially.

---

### Pitfall 5: Context Loss Between Worktree Agents

**What goes wrong:**
Agent in worktree-alpha implements a new authentication system. Agent in worktree-beta is building the API layer. Worktree-beta's agent has no idea that authentication changed, because worktree-beta's branch was created before worktree-alpha's commits. When the branches merge, the API layer uses the old auth assumptions. This isn't a merge conflict (different files were touched) -- it's a semantic conflict that git cannot detect. The code merges cleanly but doesn't work.

**Why it happens:**
Git worktrees provide branch isolation. This is their purpose and their strength. But it means agents in different worktrees are working with different snapshots of the codebase. They don't see each other's changes until merge. CLAUDE.md is loaded at session start and doesn't update. `.planning/` files are per-branch. There is no mechanism for cross-worktree communication in git itself. Agent Teams' messaging system could bridge this gap, but only if agents are in the same team -- standalone Claude Code sessions in separate worktrees have zero communication channel.

**How to avoid:**
- Use Agent Teams (not standalone sessions) when worktrees need to coordinate. Agent Teams provides messaging and task lists that bridge the isolation gap.
- Define "interface contracts" in `.planning/` before splitting work into worktrees. Both agents reference the contract, not each other's implementations.
- Establish a "sync point" workflow: before merging, the orchestrator reads all worktrees' `.planning/` state files and checks for semantic conflicts (e.g., "worktree-alpha changed the auth interface; worktree-beta depends on the old auth interface").
- Keep worktree tasks truly independent. If two tasks have semantic dependencies, don't put them in separate worktrees -- run them sequentially in the same worktree.
- Use a shared `CLAUDE.md` or `.planning/INTERFACES.md` file that gets updated on main and rebased into active worktrees when interface-level decisions are made.

**Warning signs:**
- Branches merge cleanly but tests fail
- Agent in worktree B asks "what authentication system are we using?" (it should already know)
- Post-merge integration takes as long as the original development
- Users manually copy-pasting context between terminal windows running different agents

**Phase to address:**
Phase 2 (Worktree Coordination). Must be solved before offering multi-worktree workflows. Without this, worktrees are "parallel but uncoordinated," which is worse than sequential execution because it creates false confidence.

---

### Pitfall 6: Experimental API Dependency Creates Fragile Foundation

**What goes wrong:**
Agent Teams requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. The word "experimental" means Anthropic may change the API, behavior, or remove the feature entirely between Claude Code versions. Mowism builds core workflows on top of Agent Teams. A Claude Code update breaks the Agent Teams API. Mowism's multi-agent orchestration -- its primary differentiator -- stops working. Users who auto-update Claude Code (the default) wake up to a broken Mowism.

**Why it happens:**
Experimental features are, by definition, not subject to stability guarantees. Anthropic's changelog shows frequent changes to Claude Code internals. The Agent Teams architecture (team config in `~/.claude/teams/`, task lists in `~/.claude/tasks/`, the spawn/message/broadcast protocol) is undocumented at the implementation level and could change at any time. Building on experimental APIs is a calculated risk, but treating them as stable is a mistake.

**How to avoid:**
- Design Mowism to work at two tiers: "basic" (subagents only, no Agent Teams) and "enhanced" (Agent Teams when available). If Agent Teams breaks, Mowism degrades to subagent-based coordination rather than failing entirely.
- Pin Claude Code versions in documentation and test against specific versions. When a new version drops, test Mowism before recommending users update.
- Abstract the Agent Teams interface behind Mowism's own coordination layer. If Mowism calls `mow.spawnTeammate()` which internally calls Agent Teams, you can swap the implementation without changing Mowism's orchestration logic.
- Monitor Anthropic's changelog and Claude Code GitHub repo for breaking changes. Subscribe to releases.
- Consider `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` as a fallback flag users can set if Agent Teams breaks.

**Warning signs:**
- Claude Code update and Mowism commands start failing
- Agent Teams behavior changes subtly (e.g., teammate spawn order, message delivery timing)
- New Claude Code release notes mention Agent Teams changes
- Users report "this used to work yesterday"

**Phase to address:**
Phase 1 (Core Architecture). The abstraction layer between Mowism and Agent Teams must be designed from the start. Retrofitting an abstraction layer over tightly coupled code is a near-rewrite.

---

### Pitfall 7: Token Cost Explosion in Multi-Agent Workflows

**What goes wrong:**
Mowism's workflow involves: (1) parallel research subagents during project setup, (2) Agent Teams with multiple teammates during execution, (3) parallel quality-check subagents during refinement. Each of these multiplies token usage. Anthropic's own data shows multi-agent systems use ~15x more tokens than single-agent chat. GSD users already report rate limit exhaustion on Team plans. Mowism adds more agents on top of GSD's already-heavy token usage. Users hit rate limits mid-workflow, breaking the orchestration. Or they get a $200+ bill for what they thought was "just planning a project."

**Why it happens:**
Each agent (teammate or subagent) has its own context window. CLAUDE.md, `.planning/` files, and project context get loaded into every agent's context. With 5 teammates and 6 quality-check subagents, that's 11 context windows loading the same project context. Coordination messages between agents add more tokens. The "refine-phase" quality gate runs after every phase, multiplying the per-phase cost by the number of quality checks.

**How to avoid:**
- Implement effort scaling (Anthropic's own lesson): simple tasks get 1 agent, moderate tasks get 2-3, complex tasks get 5+. Never default to maximum parallelism.
- The tiered quality gate model (minimum, complex, algorithmic) is already the right idea -- enforce it. "Minimum" tier should run 1-2 checks, not all 8.
- Track and display token usage per workflow step. Users should see "this research phase used X tokens" before the system spawns more agents.
- Rate limit awareness: before spawning N subagents, check if the user's plan can handle it. GSD issue #208 documents this exact problem.
- Use Sonnet (not Opus) for quality-check subagents. Most quality checks don't need Opus-level reasoning. The Agent Teams docs explicitly mention specifying models per teammate.
- Cap maximum concurrent agents. Even if the user says "use 10 teammates," enforce a sensible maximum (3-5).

**Warning signs:**
- Users hitting rate limits during `/mow:refine-phase`
- Token usage per phase exceeds the cost of the phase's actual code changes
- Users skip quality checks because "they're too expensive"
- Claude Code sessions timing out waiting for rate limits to reset

**Phase to address:**
Phase 1 (Architecture) for the cost model, Phase 3 (Quality Gates) for the tier enforcement. Must be designed early because token costs compound -- discovering this in production means users have already been overcharged.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single monolithic STATE.md for all worktrees | Simple to implement, one file to read | Merge conflicts, lost state, race conditions | Never in multi-worktree mode; acceptable for single-worktree usage |
| Hardcoding Agent Teams API calls directly | Faster to build, less abstraction | Breaking when Anthropic changes the experimental API | Never -- always abstract experimental dependencies |
| Running all quality checks in parallel always | Maximum speed for refine-phase | Contradictory recommendations, wasted tokens on simple phases | Only for "algorithmic" tier; minimum tier should be sequential |
| Copying entire GSD codebase and renaming | Quick fork, everything works day one | Massive divergence surface, every file is a potential conflict with upstream | Acceptable as starting point if divergence ledger is maintained from day one |
| Storing coordination state only in git | No external dependencies, everything versioned | Cannot handle truly concurrent writes, merge conflicts in state files | Acceptable if per-worktree file splitting is done properly |
| Using Opus for all subagents | Best quality for every check | 10-15x cost of Sonnet for quality checks that don't need it | Never for routine quality checks; only for prove-it on algorithmic code |

## Integration Gotchas

Common mistakes when connecting to external services and tools.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| WorkTrunk (`wt` CLI) | Assuming `wt` is always in PATH; no error handling when it's missing | Check for `wt` at Mowism install time and at runtime. Provide clear error: "WorkTrunk not found. Install: `yay -S worktrunk`" |
| Agent Teams env var | Setting `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` globally and assuming it persists | Set it in `settings.json` (persists) rather than shell env (session-scoped). Check at runtime and provide fallback behavior if unset. |
| Claude Code hooks (TeammateIdle, TaskCompleted) | Writing hooks that assume specific Agent Teams internals (team config paths, task list format) | Use hooks for validation logic (run tests, check file contents) not coordination logic. Let Agent Teams handle coordination. |
| Git worktree creation | Creating worktrees without checking disk space; creating from stale branches | Always `git fetch` before creating worktrees. Implement worktree cleanup after merge. Monitor disk usage -- 5 worktrees of a 2GB repo = 10GB+. |
| `~/.claude/teams/` and `~/.claude/tasks/` | Assuming these directories are always clean; not handling stale team configs from crashed sessions | On `/mow:new-project` and `/mow:resume-work`, check for and clean up orphaned team configs. Stale configs cause the lead to reference nonexistent teammates. |
| CLAUDE.md loading | Assuming CLAUDE.md content is current across all worktrees | CLAUDE.md is loaded once at session start per worktree. Changes to CLAUDE.md in one worktree don't propagate to others until merged and session restarted. Design critical coordination info for `.planning/` files, not CLAUDE.md. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all `.planning/` files into every subagent's context | Works for small projects with few state files | Only load files relevant to the subagent's task. Quality-check subagents need the phase plan and code, not the full project history. | When `.planning/` exceeds 20-30 files (5+ phases with verification chains) |
| Spawning one subagent per quality check | Fast and parallel for 3 checks | Cap concurrent subagents. Batch checks by priority tier. | When running 8+ parallel subagents hits rate limits or exhausts context budget |
| Full git history traversal for state | `git log` works for 10 commits | Use shallow state files, not git history parsing. Track current state, not full audit trail. | When project has 100+ commits across multiple worktrees |
| Worktree-per-task granularity | Each small task gets isolation | One worktree per logical feature or phase, not per task. Tasks within a phase run in the same worktree sequentially. | When 10+ worktrees exist simultaneously -- disk space, mental overhead, merge complexity |
| Synchronous wait for all subagents | Orchestrator blocks until all subagents return | Implement streaming results: process each subagent's results as they arrive. Don't block the user if one subagent hangs. | When one subagent takes 5x longer than others and holds up the entire pipeline |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Quality-check subagents running with `--dangerously-skip-permissions` because the lead has it | Subagents can read/write/execute anything on the filesystem. A malicious or confused quality check could delete files, read secrets, or modify code outside its scope. | Agent Teams documentation confirms teammates inherit the lead's permission mode. Quality-check subagents should ideally run with read-only permissions. Currently no way to set per-teammate permissions at spawn -- this is a known limitation. Mitigate by not using `--dangerously-skip-permissions` on the lead when quality checks will run. |
| `.planning/` files containing sensitive project context committed to git | API keys, credentials, or internal architecture details in state files get pushed to a public repo | Add `.planning/` patterns to `.gitignore` for sensitive fields. Or use a `.planning/.gitignore` that excludes specific files. Review what gets committed. |
| WorkTrunk hooks executing arbitrary scripts on worktree events | If WorkTrunk's hook system runs user-defined scripts, a compromised hook could execute malicious code in every worktree | Audit WorkTrunk hooks. Only use hooks for known, reviewed scripts. Do not allow dynamic hook generation by agents. |
| Stale team configs containing agent IDs and workspace paths | `~/.claude/teams/` configs from old sessions could be read by new sessions, leaking information about previous work | Clean up team configs on session end. Mowism's cleanup routine should delete team configs, not just mark them inactive. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring users to understand git worktrees to use Mowism | Most developers have never used worktrees. Forcing them to learn worktree concepts before they can use the tool means high abandonment. | Abstract worktrees behind Mowism commands. User says "work on feature X in parallel"; Mowism creates the worktree. User never types `git worktree add`. |
| Agent Teams output flooding the terminal | Multiple agents printing simultaneously creates unreadable terminal output. In-process mode is particularly bad for this. | Default to summary mode: show one-line status per agent. Detailed output available on demand (Shift+Down to inspect). Mowism should recommend tmux split panes if available. |
| Quality check results as raw text dumps | Long, unstructured quality reports that require reading 500 lines to find actionable items | Structured output: summary (3 bullet points), action items (numbered list), conflicts (highlighted). Write to VERIFICATION-CHAIN file in structured format. |
| Silent failures in agent coordination | An agent silently fails, the orchestrator doesn't notice, the user thinks everything is working | Explicit status reporting: "Agent scope-check: RUNNING... COMPLETE (2 findings)" visible to the user. Timeout detection: if an agent doesn't report within N minutes, flag it. |
| Requiring manual tier selection for every refine-phase | "Which tier? minimum/complex/algorithmic?" for every single phase is friction | Auto-detect tier based on phase complexity. User can override. Default to minimum for simple phases, complex for medium, algorithmic for phases touching core logic. |
| The `???` documentation suffix being undiscoverable | Users don't know they can type `/mow:new-project???` to get docs | Show the hint in error messages: "Unknown command. Did you mean /mow:new-project? Add ??? for documentation." Include in initial CLAUDE.md. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Worktree state tracking:** Often missing cleanup -- worktrees are created but never removed after merge. Verify: `git worktree list` after a full project cycle shows only the main worktree.
- [ ] **Agent Teams cleanup:** Often missing stale config removal -- team appears "cleaned up" but `~/.claude/teams/` still has orphaned entries. Verify: directory is empty after cleanup.
- [ ] **Quality gate "pass":** Often missing reconciliation -- all individual checks pass but their recommendations contradict. Verify: a reconciliation step produces a unified action list.
- [ ] **Fork setup:** Often missing upstream tracking -- the fork works but has no mechanism to detect upstream changes. Verify: a command or script that shows "upstream GSD changed these files since last check."
- [ ] **Resume-work flow:** Often missing Agent Teams re-creation -- session resumes but without spawning new teammates. Verify: after resume, `Shift+Down` shows active teammates.
- [ ] **Token cost tracking:** Often missing per-step attribution -- total cost is tracked but not broken down by phase, agent, or quality tier. Verify: user can see "research phase: $X, execution: $Y, quality checks: $Z."
- [ ] **Worktree merge:** Often missing post-merge verification -- branches merge cleanly (no git conflicts) but semantic conflicts exist. Verify: integration tests run after merge, not just before.
- [ ] **Install script:** Often missing fish shell compatibility -- works in bash but fails in fish because of syntax differences (e.g., `export` vs `set -x`). Verify: test install in fish shell specifically.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| State file merge conflict | LOW | Manually resolve the conflict. Then refactor to per-worktree state files to prevent recurrence. State files are small; manual resolution is feasible. |
| Agent Teams session loss on resume | LOW | Spawn new teammates. Task state persists in `.planning/` files (not in Agent Teams' ephemeral task list). Re-read `.planning/STATE.md` to reconstruct what was in progress. |
| Fork drift from upstream GSD | HIGH | Audit divergence. If drift is beyond recovery, accept the fork as independent. Cherry-pick only critical upstream bug fixes. Stop attempting systematic syncs. |
| Contradictory quality recommendations applied | MEDIUM | Revert the quality-check commits. Re-run checks sequentially (not parallel) with the reconciliation prompt. Apply the unified recommendation. |
| Context loss between worktrees causing semantic conflicts | HIGH | Post-merge: run integration tests immediately. If failures, trace to which worktree introduced the incompatibility. Fix in a new branch. Prevention requires architectural change (interface contracts). |
| Experimental API breakage | MEDIUM | Pin Claude Code to last known working version (`npm install -g @anthropic-ai/claude-code@X.Y.Z`). Degrade to subagent-only mode. File an issue on the Claude Code repo. Update abstraction layer when new API is understood. |
| Token cost explosion | LOW | Stop the workflow. Review which agents are running. Switch to minimum quality tier. Use Sonnet instead of Opus for subagents. Implement cost caps for future runs. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| State file write conflicts | Phase 1: Core Architecture | Create two worktrees, have both write state simultaneously, verify no data loss on merge |
| Agent Teams session resumption failure | Phase 2: Agent Teams Integration | Start a team, terminate session, resume, verify teammates are re-created (not ghost-referenced) |
| Fork drift from upstream | Phase 1: Fork Setup | Establish divergence ledger. After 1 month, run upstream diff and verify it's manageable |
| Contradictory quality recommendations | Phase 3: Quality Gates | Run all quality checks on a deliberately messy codebase. Verify reconciliation produces coherent unified output |
| Context loss between worktrees | Phase 2: Worktree Coordination | Two agents working on interdependent features in separate worktrees. Verify post-merge correctness without manual intervention |
| Experimental API fragility | Phase 1: Core Architecture | Test Mowism with Agent Teams disabled. Verify graceful degradation to subagent-only mode |
| Token cost explosion | Phase 1: Architecture + Phase 3: Quality Gates | Run a full project cycle. Measure token usage per step. Verify cost is proportional to work complexity, not constant overhead |

## Sources

- [Orchestrate teams of Claude Code sessions - Official Docs](https://code.claude.com/docs/en/agent-teams) -- PRIMARY: Agent Teams limitations, hooks, architecture, best practices. HIGH confidence.
- [How we built our multi-agent research system - Anthropic Engineering](https://www.anthropic.com/engineering/multi-agent-research-system) -- Anthropic's own lessons on multi-agent failure modes: 50 subagent spawning, duplicate work, effort scaling. HIGH confidence.
- [Why Your Multi-Agent System is Failing: 17x Error Trap - Towards Data Science](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/) -- Error compounding in multi-agent topologies. MEDIUM confidence.
- [Why Multi-Agent LLM Systems Fail - Orq.ai](https://orq.ai/blog/why-do-multi-agent-llm-systems-fail) -- Four failure categories: specification ambiguity, organizational breakdown, inter-agent conflict, weak verification. MEDIUM confidence.
- [Why Multi-Agent LLM Systems Fail - Galileo](https://galileo.ai/blog/multi-agent-llm-systems-fail) -- Corroborating source on multi-agent failure modes. MEDIUM confidence.
- [Git worktrees for parallel AI coding agents - Upsun](https://devcenter.upsun.com/posts/git-worktrees-for-parallel-ai-coding-agents/) -- Disk space issues (9.82 GB in 20 minutes), merge conflict risks. MEDIUM confidence.
- [Using Git Worktrees for Multi-Feature Development with AI Agents - Nick Mitchinson](https://www.nrmitchi.com/2025/10/using-git-worktrees-for-multi-feature-development-with-ai-agents/) -- Practical worktree patterns and limitations. MEDIUM confidence.
- [Stop Forking Around: The Hidden Dangers of Fork Drift - Preset](https://preset.io/blog/stop-forking-around-the-hidden-dangers-of-fork-drift-in-open-source-adoption/) -- Fork divergence strategies and maintenance burden. MEDIUM confidence.
- [GSD Issue #208: Team Plan Detection - GitHub](https://github.com/gsd-build/get-shit-done/issues/208) -- Rate limit exhaustion on Team plans. HIGH confidence (primary source).
- [GSD Issue #218: Commands may not work after Claude Code update - GitHub](https://github.com/glittercowboy/get-shit-done/issues/218) -- Claude Code update breaking GSD commands. HIGH confidence (primary source).
- [Keeping your Claude Code subagents aligned - Andre Bremer](https://andrebremer.com/articles/keeping-your-claude-code-subagents-aligned/) -- Subagent alignment and conflict resolution. MEDIUM confidence.
- [How Git Worktrees Changed My AI Agent Workflow - Nx Blog](https://nx.dev/blog/git-worktrees-ai-agents) -- Build artifact multiplication across worktrees. MEDIUM confidence.
- [Addy Osmani - Claude Code Swarms](https://addyosmani.com/blog/claude-code-agent-teams/) -- Practical Agent Teams usage patterns. MEDIUM confidence.

---
*Pitfalls research for: Claude Code multi-agent workflow orchestration (Mowism)*
*Researched: 2026-02-19*
