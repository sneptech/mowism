<purpose>
Gracefully shut down a multi-phase execution session. Ensures context is saved, pending git operations are handled, and new ideas/context are captured before cleaning up.
</purpose>

<process>

<step name="check_status">
## Step 1: Check Worker Status

Read the Active Phases table from STATE.md:
```bash
ACTIVE=$(node ~/.claude/mowism/bin/mow-tools.cjs state active-phases)
```

Parse the JSON to determine:
- How many workers are still active
- How many have signaled done (status: complete)
- How many have errors (status: failed)
- How many are still executing

**If workers are still executing:**
Report which phases are still running and ask user:
- "Wait for them to finish?" (default)
- "Send pause signal?" (saves state, workers checkpoint and stop)
- "Force cancel?" (workers stash, checkpoint, shut down immediately)

**If all workers are done or failed:**
Proceed to Step 2.
</step>

<step name="pending_merges">
## Step 2: Handle Pending Merges

Read worktree manifest:
```bash
MANIFEST=$(node ~/.claude/mowism/bin/mow-tools.cjs worktree list-manifest)
```

For each worktree where status is "active" and the phase is marked complete:
1. Merge into main: `node ~/.claude/mowism/bin/mow-tools.cjs worktree merge {phase}`
2. If conflicts: report and ask user to resolve (or delegate to merge subagent)
3. Update manifest entry to "merged"

Report: "Merged {N} phase branches into main."
</step>

<step name="capture_context">
## Step 3: Capture Deferred Items and Context

For each completed phase worker:
1. Read STATUS.md from the worktree: `cat .claude/worktrees/phase-{NN}/.planning/phases/{phase_dir}/{NN}-STATUS.md`
2. Look for deferred items, new ideas, or context notes
3. If any found, write to `.planning/phases/{phase_dir}/deferred-items.md` with YAML frontmatter:
   ```yaml
   ---
   phase: {phase}
   source: close-shop
   captured: {ISO-8601 timestamp}
   ---
   ```
4. Also check for any CHECKPOINT.md files from failed phases -- summarize what needs follow-up

Report: "Captured deferred items from {N} phases. {M} checkpoints need follow-up."
</step>

<step name="update_state">
## Step 4: Update STATE.md

Update all tracking:
1. Update Active Phases table with final statuses for all phases
2. Update Current Position to reflect the most advanced completed phase
3. Add session record: `node ~/.claude/mowism/bin/mow-tools.cjs state record-session --stopped-at "Multi-phase session close-shop" --resume "Review pending checkpoints and deferred items"`

Commit:
```bash
node ~/.claude/mowism/bin/mow-tools.cjs commit "docs: close-shop state update" --files .planning/STATE.md .planning/ROADMAP.md
```
</step>

<step name="shutdown_workers">
## Step 5: Shutdown Workers

For each active worker (from team config):
```
SendMessage({ type: "shutdown_request", recipient: "phase-{NN}", content: "Close-shop: session ending. Thank you for your work." })
```

Wait for acknowledgments (workers should approve shutdown since they are in done state).

After all workers acknowledge (or timeout after 30s):
1. Stop team tracking: `node ~/.claude/mowism/bin/mow-tools.cjs team-update --action stop`
2. Delete team: `TeamDelete()`
</step>

<step name="report">
## Step 6: Final Report

```markdown
## Session Complete

**Phases executed:** {list of phases with status}
**Merges completed:** {N}
**Deferred items captured:** {M}
**Checkpoints needing follow-up:** {K}

### Phase Summary
| Phase | Status | Plans | Duration |
|-------|--------|-------|----------|
| Phase {N} | Complete | {X}/{Y} | {duration} |
| Phase {M} | Failed (checkpoint saved) | {X}/{Y} | {duration} |

### Next Steps
{If checkpoints exist: "Review checkpoint files in .planning/phases/XX/ for failed phases"}
{If deferred items: "Review deferred-items.md files for captured ideas"}
{Suggest: /mow:progress for overview, /mow:resume-work to continue}

Worktrees preserved at .claude/worktrees/ for inspection. Run `git worktree remove .claude/worktrees/phase-NN` when no longer needed.
```
</step>

</process>
