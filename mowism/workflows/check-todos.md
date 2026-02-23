<purpose>
List all pending and in-progress todos, allow selection, load full context for the selected todo, and route to appropriate action.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="init_context">
Load todo context:

```bash
INIT=$(node ~/.claude/mowism/bin/mow-tools.cjs init todos)
```

Extract from init JSON: `todo_count`, `in_progress_count`, `todos`, `pending_dir`, `in_progress_dir`.

If `todo_count` is 0:
```
No pending or in-progress todos.

Todos are captured during work sessions with /mow:add-todo.

---

Would you like to:

1. Continue with current phase (/mow:progress)
2. Add a todo now (/mow:add-todo)
```

Exit.
</step>

<step name="parse_filter">
Check for area filter in arguments:
- `/mow:check-todos` → show all
- `/mow:check-todos api` → filter to area:api only
</step>

<step name="list_todos">
Use the `todos` array from init context (already filtered by area if specified).

Parse and display with in-progress items first:

```
{If in-progress todos exist:}
Currently working on:

1. ⚡ Add auth token refresh (api, started 2d ago)
2. ⚡ Fix modal z-index issue (ui, started 1d ago)

{Always show pending section:}
Pending:

3. Add database connection pool refactor (database, 5h ago)
4. Update API error handling (api, 2d ago)

---

Reply with a number to view details, or:
- `/mow:check-todos [area]` to filter by area
- `q` to exit
```

Numbering is continuous across both sections. In-progress items use the ⚡ prefix for visual distinction. Format age as relative time from created/started timestamp.
</step>

<step name="handle_selection">
Wait for user to reply with a number.

If valid: load selected todo, proceed.
If invalid: "Invalid selection. Reply with a number (1-[N]) or `q` to exit."
</step>

<step name="load_context">
Read the todo file completely. Display:

```
## [title]

**Area:** [area]
**State:** [in-progress | pending]
**Created:** [date] ([relative time] ago)
**Started:** [date] ([relative time] ago)  ← only for in-progress
**Files:** [list or "None"]

### Problem
[problem section content]

### Solution
[solution section content]
```

If `files` field has entries, read and briefly summarize each.
</step>

<step name="check_roadmap">
Check for roadmap (can use init progress or directly check file existence):

If `.planning/ROADMAP.md` exists:
1. Check if todo's area matches an upcoming phase
2. Check if todo's files overlap with a phase's scope
3. Note any match for action options
</step>

<step name="offer_actions">
**If todo state is "in-progress":**

Use AskUserQuestion:
- header: "Action"
- question: "This todo is currently in progress. What would you like to do?"
- options:
  - "Continue working" — Resume work on this in-progress todo
  - "Complete" — Mark as done (run `todo complete`)
  - "Put it back" — Move back to pending (reverse of start)
  - "View list" — Return to todo list

**If todo state is "pending" and maps to a roadmap phase:**

Use AskUserQuestion:
- header: "Action"
- question: "This todo relates to Phase [N]: [name]. What would you like to do?"
- options:
  - "Start working" — Mark as in-progress and begin work
  - "Add to phase plan" — include when planning Phase [N]
  - "Brainstorm approach" — think through before deciding
  - "Put it back" — return to list

**If todo state is "pending" and no roadmap match:**

Use AskUserQuestion:
- header: "Action"
- question: "What would you like to do with this todo?"
- options:
  - "Start working" — Mark as in-progress and begin work
  - "Create a phase" — /mow:add-phase with this scope
  - "Brainstorm approach" — think through before deciding
  - "Put it back" — return to list
</step>

<step name="execute_action">
**Start working (pending → in-progress):**
```bash
node ~/.claude/mowism/bin/mow-tools.cjs todo start [filename]
```
Check output for interference warnings. If warnings present, display them:
```
⚠ File overlap detected with in-progress todo "[title]":
  - path/to/overlapping-file.ts

Proceeding anyway (files may be edited by multiple todos).
```
Present problem/solution context. Begin work or ask how to proceed.

**Continue working (already in-progress):**
Load todo context and begin work (no file move needed). Present problem/solution context.

**Complete (from pending or in-progress):**
```bash
node ~/.claude/mowism/bin/mow-tools.cjs todo complete [filename]
```
Confirm completion. Return to list or exit.

**Put it back (from in-progress → pending):**
```bash
# Move file back from in-progress/ to pending/, removing started: timestamp
CONTENT=$(cat ".planning/todos/in-progress/[filename]")
echo "$CONTENT" | sed '/^started:/d' > ".planning/todos/pending/[filename]"
rm ".planning/todos/in-progress/[filename]"
```
Confirm returned to pending. Return to list.

**Add to phase plan:**
Note todo reference in phase planning notes. Keep in pending. Return to list or exit.

**Create a phase:**
Display: `/mow:add-phase [description from todo]`
Keep in pending. User runs command in fresh context.

**Brainstorm approach:**
Keep in pending. Start discussion about problem and approaches.
</step>

<step name="update_state">
After any action that changes todo count or state:

Re-run `init todos` to get updated count, then update STATE.md "### Pending Todos" section if exists.
</step>

<step name="git_commit">
If todo state changed (started, completed, or returned to pending), commit the change:

**Started (pending → in-progress):**
```bash
node ~/.claude/mowism/bin/mow-tools.cjs commit "docs: start todo - [title]" --files .planning/todos/in-progress/[filename] .planning/STATE.md
```

**Completed (from pending or in-progress):**
```bash
node ~/.claude/mowism/bin/mow-tools.cjs commit "docs: complete todo - [title]" --files .planning/todos/completed/[filename] .planning/STATE.md
```

**Returned to pending (in-progress → pending):**
```bash
node ~/.claude/mowism/bin/mow-tools.cjs commit "docs: pause todo - [title]" --files .planning/todos/pending/[filename] .planning/STATE.md
```

Tool respects `commit_docs` config and gitignore automatically.

Confirm: "Committed: docs: [action] todo - [title]"
</step>

</process>

<success_criteria>
- [ ] In-progress todos listed first in "Currently working on" section
- [ ] Pending todos listed in "Pending" section below
- [ ] Continuous numbering across both sections
- [ ] Area filter applied if specified
- [ ] Selected todo's full context loaded (including started date for in-progress)
- [ ] Roadmap context checked for phase match
- [ ] Appropriate actions offered based on todo state (in-progress vs pending)
- [ ] Start working action runs `todo start` with interference warning display
- [ ] Continue working action resumes without file move
- [ ] Complete action runs `todo complete` (works from both states)
- [ ] Put it back action moves in-progress → pending with started: line removed
- [ ] STATE.md updated if todo count/state changed
- [ ] Changes committed to git with appropriate message
</success_criteria>
