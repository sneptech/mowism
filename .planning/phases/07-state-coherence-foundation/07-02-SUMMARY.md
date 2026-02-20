---
phase: 07-state-coherence-foundation
plan: 02
subsystem: messaging
tags: [json-schema, ndjson, cli, message-protocol, chat-log]

requires:
  - phase: 01-fork-and-foundation
    provides: mow-tools.cjs CLI framework and output/error helpers
provides:
  - "message format subcommand producing structured JSON for 7 event types"
  - "message parse subcommand validating incoming JSON against schema"
  - "chat-log append/read/prune subcommands with NDJSON storage"
  - "MESSAGE_SCHEMA_VERSION constant and MESSAGE_REQUIRED_FIELDS registry"
affects: [07-state-coherence-foundation, 10-coordinator-worker-orchestration]

tech-stack:
  added: []
  patterns: [structured-json-messaging, ndjson-append-log, deterministic-filename-sorting]

key-files:
  created: []
  modified:
    - bin/mow-tools.cjs
    - bin/mow-tools.test.cjs

key-decisions:
  - "Verbose event set shipped as default (all 7 types enabled), lean version commented out for easy toggling"
  - "Chat log filenames use alphabetically sorted peer IDs for deterministic deduplication"
  - "Messages truncated at 500 chars for chat logs, 1KB warning (not error) for message format"

patterns-established:
  - "JSON message schema with version field for forward compatibility"
  - "NDJSON append-only logs with prune-to-N for bounded storage"

requirements-completed: [STATE-03]

duration: 4min
completed: 2026-02-20
---

# Phase 7 Plan 2: Message Protocol Summary

**Structured JSON message schema with format/parse CLI, 7 event types, and NDJSON peer chat log infrastructure**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T04:52:17Z
- **Completed:** 2026-02-20T04:56:41Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Implemented message format/parse subcommands with schema validation for 7 event types (plan_started, plan_complete, phase_complete, error, blocker, state_change, ack)
- Added chat-log append/read/prune subcommands with NDJSON storage, deterministic filenames, and 500-char message truncation
- Added 16 tests covering all message and chat-log functionality (119 total tests, 0 failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement message format/parse and chat-log subcommands** - `4cebfca` (feat)
2. **Task 2: Add tests for message and chat-log subcommands** - `333ceef` (test)

## Files Created/Modified
- `bin/mow-tools.cjs` - Added MESSAGE_SCHEMA_VERSION, MESSAGE_REQUIRED_FIELDS, ENABLED_EVENTS constants; cmdMessageFormat, cmdMessageParse, cmdMessageSummary, cmdChatLogAppend, cmdChatLogRead, cmdChatLogPrune functions; CLI routing for message and chat-log commands
- `bin/mow-tools.test.cjs` - Added 16 tests: 7 message format, 4 message parse, 5 chat-log

## Decisions Made
- Verbose event set shipped as default (all 7 types enabled) with lean version commented out -- per locked research decision
- Chat log filenames use alphabetically sorted peer IDs (e.g., phase-07-to-phase-08.ndjson regardless of sender) for deterministic deduplication
- 1KB size warning on message format writes to stderr but still outputs the message -- avoids breaking valid but large payloads

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test for 1KB stderr warning capture**
- **Found during:** Task 2 (test suite)
- **Issue:** The `runMowTools` test helper only captures stderr on command failure (via catch block). The 1KB warning test needed stderr from a successful command.
- **Fix:** Used `spawnSync` directly in the specific test to capture both stdout and stderr independently
- **Files modified:** bin/mow-tools.test.cjs
- **Verification:** Test passes -- stderr captured correctly
- **Committed in:** 333ceef (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test helper limitation required workaround for stderr capture. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Message protocol infrastructure ready for coordinator-worker communication
- Chat log infrastructure ready for peer-to-peer worker messaging
- Schema version 1 established for forward-compatible message evolution

## Self-Check: PASSED

- FOUND: bin/mow-tools.cjs
- FOUND: bin/mow-tools.test.cjs
- FOUND: 07-02-SUMMARY.md
- FOUND: commit 4cebfca
- FOUND: commit 333ceef

---
*Phase: 07-state-coherence-foundation*
*Completed: 2026-02-20*
