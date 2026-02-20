---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/research/AGENT-TEAMS-API-RUNTIME.md
  - .planning/research/AGENT-TEAMS-API.md
autonomous: true
requirements: [QUICK-2]
must_haves:
  truths:
    - "All 8 open questions from AGENT-TEAMS-API.md have a tested answer or a documented 'could not test' with reason"
    - "Each answer includes the exact tool call used, exact response received, and conclusion"
    - "The assumptions table in AGENT-TEAMS-API.md is updated from ASSUMED to VERIFIED or DISPROVEN for every testable claim"
  artifacts:
    - path: ".planning/research/AGENT-TEAMS-API-RUNTIME.md"
      provides: "Runtime test results for all 8 open questions"
      contains: "## Test Results"
    - path: ".planning/research/AGENT-TEAMS-API.md"
      provides: "Updated assumptions table with VERIFIED/DISPROVEN statuses"
      contains: "VERIFIED"
  key_links:
    - from: ".planning/research/AGENT-TEAMS-API-RUNTIME.md"
      to: ".planning/research/AGENT-TEAMS-API.md"
      via: "Runtime results update assumption statuses"
      pattern: "VERIFIED|DISPROVEN"
---

<objective>
Runtime-test the Agent Teams API to answer the 8 open questions identified in the research doc.

Purpose: The research doc (`.planning/research/AGENT-TEAMS-API.md`) identified 8 questions that cannot be answered from documentation alone -- they require actually using the Agent Teams tools at runtime. This quick task creates a test team, spawns a worker, and systematically tests each question to convert ASSUMED claims into VERIFIED or DISPROVEN facts.

Output: Runtime test results document + updated assumptions table in the research doc.
</objective>

<execution_context>
@/home/max/.claude/get-shit-done/workflows/execute-plan.md
@/home/max/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/research/AGENT-TEAMS-API.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Execute Agent Teams runtime tests for all 8 open questions</name>
  <files>.planning/research/AGENT-TEAMS-API-RUNTIME.md</files>
  <action>
Execute a systematic runtime test of the Agent Teams API. Use the Agent Teams tools directly (these are available in this session because `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set).

**IMPORTANT:** Before starting tests, verify Agent Teams tools are available by checking what tools you have access to. If TeamCreate/Teammate/TaskCreate/TaskUpdate/TaskList tools are NOT available, document that finding and skip to Task 2 with "tools not available" as the result for all questions.

**Setup:**

1. Create a test team: use the team creation tool (likely `Teammate({ operation: "spawnTeam", team_name: "mow-runtime-test" })` or equivalent TeamCreate tool)
2. Spawn one test worker teammate using `Task({ team_name: "mow-runtime-test", name: "test-worker-1", prompt: "You are a test worker. Wait for instructions from the lead via inbox messages. When you receive a message, follow its instructions exactly and report results back to the lead via Teammate write. If you have no pending instructions, remain idle.", run_in_background: true })`
3. Verify the worker spawned successfully

**Test each question in order:**

**Q1 - Message delivery timing:**
- Send a message to the worker while it should be idle: `Teammate({ operation: "write", teammate: "test-worker-1", message: "TEST-Q1: Reply with the exact text RECEIVED-Q1" })`
- Record: Did the message arrive? How quickly? Was there any indication of queuing?
- Then send a second message immediately after: observe if it queues or interrupts

**Q2 - Auto-unblocking behavior:**
- Create Task A: `TaskCreate({ subject: "Test Task A", description: "Blocking task for auto-unblock test" })`
- Create Task B: `TaskCreate({ subject: "Test Task B", description: "Blocked task for auto-unblock test" })`
- Block B on A: `TaskUpdate({ taskId: <B-id>, addBlockedBy: [<A-id>] })`
- Verify B is blocked: `TaskList()` -- check B's status
- Complete A: `TaskUpdate({ taskId: <A-id>, status: "completed" })`
- Check B again: `TaskList()` -- is B automatically unblocked? Or still blocked?
- Record: Exact status of B before and after A completion

**Q3 - Idle notification content:**
- After the worker finishes responding to Q1, observe what idle notification the lead receives
- Record: Exact content/format of idle notification. Does it say WHY the worker is idle?
- If possible, compare idle-after-task-complete vs idle-waiting-for-message

**Q4 - Worker spawn environment:**
- Check the worker's working directory by sending: `Teammate({ operation: "write", teammate: "test-worker-1", message: "TEST-Q4: Run pwd and report the output back to me" })`
- Record: Does the worker's cwd match the lead's cwd (`/home/max/git/mowism`)?
- Check if env vars from lead are visible: `Teammate({ operation: "write", teammate: "test-worker-1", message: "TEST-Q4b: Check if CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS is set in your environment and report its value" })`

**Q5 - Teammate status querying:**
- Try: `Teammate({ operation: "listTeammates" })` or any similar operation
- Try: `Teammate({ operation: "getTeamStatus", team_name: "mow-runtime-test" })`
- Record: Do these operations exist? What do they return? If they don't exist, what error?
- Check `TaskList()` -- does it include teammate/assignee information?

**Q6 - In-process vs background vs tmux:**
- The worker was spawned with `run_in_background: true`. Record observed behavior for background mode:
  - How do messages arrive? (in lead's conversation flow)
  - How does idle notification appear?
  - Can the lead see the worker's terminal? (expected: no)
- Note: Testing in-process and tmux modes would require respawning workers differently. Document what we CAN observe about background mode, and note what would need separate testing for the other modes.

**Q7 - Message size limits:**
- Send a small JSON message: `Teammate({ operation: "write", teammate: "test-worker-1", message: '{"type":"test","payload":"small"}' })`
- Send a medium JSON message (~1KB): construct a JSON string with repeated data fields
- Send a large JSON message (~10KB): construct a JSON string with a large payload
- Ask worker to report back what it received for each
- Record: At what size (if any) does truncation occur? Does JSON survive intact?

**Q8 - Team config persistence:**
- Check filesystem: `ls -la ~/.claude/teams/` and `ls -la ~/.claude/teams/mow-runtime-test/` if it exists
- Read any config files found: `cat ~/.claude/teams/mow-runtime-test/config.json` or similar
- Record: What files exist? What do they contain? Is there enough info to recreate the team?

**Cleanup:**
- Use `Teammate({ operation: "requestShutdown", team_name: "mow-runtime-test" })` or equivalent
- Then `Teammate({ operation: "cleanup", team_name: "mow-runtime-test" })`
- Verify cleanup: `ls ~/.claude/teams/mow-runtime-test/` should be gone

**Recording format:**
For EACH question, record in `.planning/research/AGENT-TEAMS-API-RUNTIME.md`:
- The exact tool call(s) used
- The exact response received (or summarized if very long)
- The conclusion: VERIFIED (assumption correct), DISPROVEN (assumption wrong), PARTIALLY VERIFIED (some aspects correct), or INCONCLUSIVE (could not determine)
- Design implications for Mowism v1.1

**Adaptability:** If any tool call fails or the API surface differs from what the research doc assumed, document the ACTUAL tool names and parameters discovered. If the team creation or worker spawn fails, pivot to testing what IS available (TaskCreate/TaskUpdate/TaskList can be tested without a team). Partial results are valuable -- do not abandon the task if some tests fail.
  </action>
  <verify>
- `.planning/research/AGENT-TEAMS-API-RUNTIME.md` exists and contains results for all 8 questions (or documented reasons why a question could not be tested)
- The cleanup step completed (no orphaned test team)
  </verify>
  <done>All 8 open questions have a runtime test result (VERIFIED, DISPROVEN, PARTIALLY VERIFIED, or INCONCLUSIVE with explanation). Test team is cleaned up.</done>
</task>

<task type="auto">
  <name>Task 2: Update research doc assumptions table with verified results</name>
  <files>.planning/research/AGENT-TEAMS-API.md</files>
  <action>
Read the runtime test results from `.planning/research/AGENT-TEAMS-API-RUNTIME.md` and update `.planning/research/AGENT-TEAMS-API.md`:

1. **Update the "Assumptions vs Verified Facts" table** (section near end of doc):
   - For each claim that was tested, change Status from `ASSUMED` to `VERIFIED`, `DISPROVEN`, or `PARTIALLY VERIFIED`
   - Update the Notes column with what the runtime test found
   - Add any NEW claims discovered during testing that weren't in the original table

2. **Update confidence levels in individual sections:**
   - Section 1 (Inbox Message Format): Update confidence from ASSUMED based on Q1 and Q7 results
   - Section 2 (Worker Output Visibility): Update confidence based on Q3 results
   - Section 3 (Permission/Input Proxying): Update confidence based on Q6 results
   - Section 4 (Terminal Spawning and Control): Update confidence based on Q4 and Q6 results
   - Section 5 (Task System): Update confidence based on Q2 results
   - Section 6 (Teammate Operations): Update confidence based on Q5 results

3. **Update the "Open Questions" section:**
   - For each of the 8 questions, add a one-line answer referencing the runtime doc
   - Change the section header to "## Open Questions (Resolved)" or keep unresolved ones separate

4. **Update the "What remains unverified" bullets** in each relevant section to reflect what IS now verified

5. **Add a cross-reference** at the top of the doc: "**Runtime verification:** See `AGENT-TEAMS-API-RUNTIME.md` for test results (2026-02-20)"

Do NOT rewrite sections that weren't affected by the tests. Surgical updates only.
  </action>
  <verify>
- `grep -c "VERIFIED" .planning/research/AGENT-TEAMS-API.md` shows more VERIFIED entries than before testing
- The "Open Questions" section reflects the test results
- The assumptions table has been updated
  </verify>
  <done>Research doc assumptions table updated with runtime test results. Every testable assumption now has VERIFIED, DISPROVEN, or PARTIALLY VERIFIED status. Open questions section reflects answers.</done>
</task>

</tasks>

<verification>
- `.planning/research/AGENT-TEAMS-API-RUNTIME.md` is a complete record of all runtime tests
- `.planning/research/AGENT-TEAMS-API.md` assumptions table updated with verified results
- No orphaned test team or config files remain after cleanup
- Every ASSUMED claim that could be tested now has a definitive status
</verification>

<success_criteria>
The 8 open questions from the Agent Teams research doc each have a runtime-tested answer (or a documented "could not test" with reason). The research doc's assumptions table reflects verified reality, not educated guesses. The Mowism v1.1 design decisions can now be made with HIGH confidence on the tested claims.
</success_criteria>

<output>
After completion, create `.planning/quick/2-runtime-test-agent-teams-api-verify-8-op/2-SUMMARY.md`
</output>
