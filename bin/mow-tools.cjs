#!/usr/bin/env node

/**
 * MOW Tools — CLI utility for Mowism workflow operations
 *
 * Replaces repetitive inline bash patterns across ~50 GSD command/workflow/agent files.
 * Centralizes: config parsing, model resolution, phase lookup, git commits, summary verification.
 *
 * Usage: node mow-tools.cjs <command> [args] [--raw]
 *
 * Atomic Commands:
 *   state load                         Load project config + state
 *   state update <field> <value>       Update a STATE.md field
 *   state get [section]                Get STATE.md content or section
 *   state patch --field val ...        Batch update STATE.md fields
 *   resolve-model <agent-type>         Get model for agent based on profile
 *   find-phase <phase>                 Find phase directory by number
 *   commit <message> [--files f1 f2]   Commit planning docs
 *   verify-summary <path>              Verify a SUMMARY.md file
 *   generate-slug <text>               Convert text to URL-safe slug
 *   current-timestamp [format]         Get timestamp (full|date|filename)
 *   list-todos [area]                  Count and enumerate pending todos
 *   verify-path-exists <path>          Check file/directory existence
 *   config-ensure-section              Initialize .planning/config.json
 *   config nudge-dismiss               Dismiss Agent Teams nudge (writes to config.json)
 *   history-digest                     Aggregate all SUMMARY.md data
 *   summary-extract <path> [--fields]  Extract structured data from SUMMARY.md
 *   state-snapshot                     Structured parse of STATE.md
 *   phase-plan-index <phase>           Index plans with waves and status
 *   websearch <query>                  Search web via Brave API (if configured)
 *     [--limit N] [--freshness day|week|month]
 *
 * Phase Operations:
 *   phase next-decimal <phase>         Calculate next decimal phase number
 *   phase add <description>            Append new phase to roadmap + create dir
 *   phase insert <after> <description> Insert decimal phase after existing
 *   phase remove <phase> [--force]     Remove phase, renumber all subsequent
 *   phase complete <phase>             Mark phase done, update state + roadmap
 *
 * Roadmap Operations:
 *   roadmap get-phase <phase>          Extract phase section from ROADMAP.md
 *   roadmap analyze                    Full roadmap parse with disk status
 *   roadmap update-plan-progress <N>   Update progress table row from disk (PLAN vs SUMMARY counts)
 *
 * Requirements Operations:
 *   requirements mark-complete <ids>   Mark requirement IDs as complete in REQUIREMENTS.md
 *                                      Accepts: REQ-01,REQ-02 or REQ-01 REQ-02 or [REQ-01, REQ-02]
 *
 * Milestone Operations:
 *   milestone complete <version>       Archive milestone, create MILESTONES.md
 *     [--name <name>]
 *     [--archive-phases]               Move phase dirs to milestones/vX.Y-phases/
 *
 * Validation:
 *   validate consistency               Check phase numbering, disk/roadmap sync
 *   validate health [--repair]         Check .planning/ integrity, optionally repair
 *
 * Progress:
 *   progress [json|table|bar]          Render progress in various formats
 *
 * Todos:
 *   todo complete <filename>           Move todo from pending to completed
 *
 * Per-Phase Status:
 *   status init <phase>               Create STATUS.md from template in phase dir
 *   status read <phase>               Parse STATUS.md and return JSON
 *   status write <phase>              Update one plan row in STATUS.md
 *     --plan <id> --status <state>
 *     [--commit <sha>] [--duration <min>] [--tasks <progress>]
 *   status aggregate <phase>          Recalculate Aggregate section from plan data
 *
 * Agent Teams:
 *   team-status                        Read Agent Team Status from STATE.md
 *   team-update --action start         Start team (create section in STATE.md)
 *     --team-name <name>
 *   team-update --action add-teammate  Add teammate row
 *     --name <n> --worktree <wt> --task <t>
 *   team-update --action update-teammate  Update teammate row
 *     --name <n> --status <s> --task <t>
 *   team-update --action stop          Stop team (remove section from STATE.md)
 *
 * Message Protocol:
 *   message format <type>              Format a structured JSON message
 *     --phase N --plan M [--commit h]  Fields vary by event type
 *     [--summary] [--raw]              Include summary string, raw output
 *   message parse <json>               Validate and parse a JSON message
 *     [--raw]                          Raw output mode
 *   Event types: plan_started, plan_complete, phase_complete,
 *                error, blocker, state_change, ack
 *
 * Chat Logs:
 *   chat-log append --from <id>        Append message to peer chat log
 *     --to <id> --msg <text>           NDJSON storage, 500-char limit
 *   chat-log read --from <id>          Read all entries from chat log
 *     --to <id> [--raw]
 *   chat-log prune --from <id>         Keep only last N entries
 *     --to <id> [--keep N]             Default: 200
 *
 * Dashboard:
 *   dashboard render [--raw]           Render live dashboard (summary + events)
 *     [--width N]                      Override terminal width
 *   dashboard event add                Add event to dashboard event log
 *     --type <type> --phase <N>        Event type + phase number
 *     [--detail <text>] [--raw]        Optional detail text
 *   dashboard event prune --keep <N>   Prune event log to last N entries
 *     [--raw]
 *   dashboard state [--raw]            Output dashboard state JSON
 *   dashboard clear                    Remove event log + state files
 *
 * Scaffolding:
 *   scaffold context --phase <N>       Create CONTEXT.md template
 *   scaffold uat --phase <N>           Create UAT.md template
 *   scaffold verification --phase <N>  Create VERIFICATION.md template
 *   scaffold phase-dir --phase <N>     Create phase directory
 *     --name <name>
 *
 * Frontmatter CRUD:
 *   frontmatter get <file> [--field k] Extract frontmatter as JSON
 *   frontmatter set <file> --field k   Update single frontmatter field
 *     --value jsonVal
 *   frontmatter merge <file>           Merge JSON into frontmatter
 *     --data '{json}'
 *   frontmatter validate <file>        Validate required fields
 *     --schema plan|summary|verification
 *
 * Verification Suite:
 *   verify plan-structure <file>       Check PLAN.md structure + tasks
 *   verify phase-completeness <phase>  Check all plans have summaries
 *   verify references <file>           Check @-refs + paths resolve
 *   verify commits <h1> [h2] ...      Batch verify commit hashes
 *   verify artifacts <plan-file>       Check must_haves.artifacts
 *   verify key-links <plan-file>       Check must_haves.key_links
 *
 * Template Fill:
 *   template fill summary --phase N    Create pre-filled SUMMARY.md
 *     [--plan M] [--name "..."]
 *     [--fields '{json}']
 *   template fill plan --phase N       Create pre-filled PLAN.md
 *     [--plan M] [--type execute|tdd]
 *     [--wave N] [--fields '{json}']
 *   template fill verification         Create pre-filled VERIFICATION.md
 *     --phase N [--fields '{json}']
 *
 * State Progression:
 *   state advance-plan                 Increment plan counter
 *   state record-metric --phase N      Record execution metrics
 *     --plan M --duration Xmin
 *     [--tasks N] [--files N]
 *   state update-progress              Recalculate progress bar
 *   state add-decision --summary "..."  Add decision to STATE.md
 *     [--phase N] [--rationale "..."]
 *   state add-blocker --text "..."     Add blocker
 *   state resolve-blocker --text "..." Remove blocker
 *   state record-session               Update session continuity
 *     --stopped-at "..."
 *     [--resume-file path]
 *
 * Compound Commands (workflow-specific initialization):
 *   init execute-phase <phase>         All context for execute-phase workflow
 *   init plan-phase <phase>            All context for plan-phase workflow
 *   init new-project                   All context for new-project workflow
 *   init new-milestone                 All context for new-milestone workflow
 *   init quick <description>           All context for quick workflow
 *   init resume                        All context for resume-project workflow
 *   init verify-work <phase>           All context for verify-work workflow
 *   init phase-op <phase>              Generic phase operation context
 *   init todos [area]                  All context for todo workflows
 *   init milestone-op                  All context for milestone operations
 *   init map-codebase                  All context for map-codebase workflow
 *   init progress                      All context for progress workflow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Model Profile Table ─────────────────────────────────────────────────────

const MODEL_PROFILES = {
  'mow-planner':              { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
  'mow-roadmapper':           { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'mow-executor':             { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'mow-phase-researcher':     { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'mow-project-researcher':   { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'mow-research-synthesizer': { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'mow-debugger':             { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'mow-codebase-mapper':      { quality: 'sonnet', balanced: 'haiku', budget: 'haiku' },
  'mow-verifier':             { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'mow-plan-checker':         { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'mow-integration-checker':  { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
};

// ─── ANSI 256-Color Helpers ──────────────────────────────────────────────────

function supportsColor() {
  if (process.env.NO_COLOR !== undefined) return 'none';
  if (process.env.FORCE_COLOR !== undefined) return '256';
  if (!process.stdout.isTTY) return 'none';
  const term = process.env.TERM || '';
  if (term.includes('256color') || term.includes('truecolor')) return '256';
  return '16';
}

function color256fg(n, text) {
  if (supportsColor() === 'none') return text;
  return `\x1b[38;5;${n}m${text}\x1b[39m`;
}

function color256bg(n, text) {
  if (supportsColor() === 'none') return text;
  return `\x1b[48;5;${n}m${text}\x1b[49m`;
}

function color256(fg, bg, text) {
  if (supportsColor() === 'none') return text;
  return `\x1b[38;5;${fg}m\x1b[48;5;${bg}m${text}\x1b[0m`;
}

// ─── Phase Color Palette ─────────────────────────────────────────────────────

const PHASE_PALETTE = [33, 37, 71, 142, 166, 133, 44, 172, 63, 108, 175, 39];
const PHASE_PALETTE_FG = [231, 231, 16, 16, 16, 231, 16, 16, 231, 16, 16, 16];

function phaseColor(phaseNumber) {
  const n = Math.floor(parseFloat(phaseNumber));
  return { bg: PHASE_PALETTE[n % 12], fg: PHASE_PALETTE_FG[n % 12] };
}

// ─── Input Types ─────────────────────────────────────────────────────────────

const INPUT_TYPES = ['discussion_prompt', 'permission_prompt', 'error_resolution', 'worker_failed', 'verification_question', 'planning_approval'];

// ─── Message Protocol Schema ─────────────────────────────────────────────────

const MESSAGE_SCHEMA_VERSION = 2;

const MESSAGE_REQUIRED_FIELDS = {
  plan_started: ['phase', 'plan'],
  plan_complete: ['phase', 'plan', 'commit', 'duration_min'],
  phase_complete: ['phase', 'plans_completed', 'total_duration_min'],
  error: ['phase', 'plan', 'error'],
  blocker: ['phase', 'plan', 'blocker', 'action'],
  state_change: ['phase', 'plan', 'from_state', 'to_state'],
  ack: ['ref_type', 'ref_plan'],
  task_claimed: ['phase', 'plan', 'task'],
  commit_made: ['phase', 'plan', 'commit_hash'],
  task_complete: ['phase', 'plan', 'task'],
  stage_transition: ['phase', 'from_stage', 'to_stage'],
  input_needed: ['phase', 'input_type', 'detail'],
  plan_created: ['phase', 'plan'],
};

// VERBOSE VERSION (milestones + state transitions -- default)
const ENABLED_EVENTS = ['plan_started', 'plan_complete', 'phase_complete', 'error', 'blocker', 'state_change', 'ack', 'task_claimed', 'commit_made', 'task_complete', 'stage_transition', 'input_needed', 'plan_created'];
// LEAN VERSION (milestones only -- uncomment to switch)
// const ENABLED_EVENTS = ['plan_complete', 'phase_complete', 'error', 'blocker', 'ack'];

// ─── Banner & Progress Renderers ─────────────────────────────────────────────

function renderBanner(text, bgColor, fgColor, width) {
  width = width || process.stdout.columns || 80;
  const paddedText = (' ' + text + ' ').padEnd(width);
  const colorLevel = supportsColor();
  if (colorLevel === '256') {
    return `\x1b[48;5;${bgColor}m\x1b[38;5;${fgColor}m\x1b[1m${paddedText}\x1b[0m`;
  } else if (colorLevel === '16') {
    try {
      const util = require('util');
      return util.styleText(['bold', 'inverse'], paddedText);
    } catch {
      return paddedText;
    }
  }
  return paddedText;
}

function renderCautionBanner(text, width) {
  width = width || process.stdout.columns || 80;
  const colorLevel = supportsColor();
  const warning = '\u26A0';

  if (colorLevel === 'none') {
    const inner = ` ${warning} ${text} ${warning} `;
    return inner.padEnd(width);
  }

  // Build alternating yellow/black stripe
  const yellow = '\x1b[48;5;226m\x1b[38;5;0m';
  const black = '\x1b[48;5;0m\x1b[38;5;226m';
  const reset = '\x1b[0m';

  const innerText = ` ${warning}  ${text}  ${warning} `;
  const padTotal = width - innerText.length;
  const padLeft = Math.max(0, Math.floor(padTotal / 2));
  const padRight = Math.max(0, padTotal - padLeft);

  // Build stripe characters
  let stripe = '';
  for (let i = 0; i < padLeft; i++) {
    stripe += (i % 2 === 0) ? `${yellow} ` : `${black} `;
  }
  stripe += `${yellow}\x1b[1m${innerText}${reset}`;
  for (let i = 0; i < padRight; i++) {
    stripe += (i % 2 === 0) ? `${black} ` : `${yellow} `;
  }
  stripe += reset;

  return stripe;
}

function renderProgressBar(percent, width, isBlocked, colorCode) {
  width = width || 10;
  percent = Math.max(0, Math.min(100, percent));
  const fillCount = Math.round((percent / 100) * width);
  const emptyCount = width - fillCount;

  const fillChar = isBlocked ? '\u2592' : '\u2588';
  const emptyChar = '\u2591';

  let fillStr = fillChar.repeat(fillCount);
  const emptyStr = emptyChar.repeat(emptyCount);

  if (colorCode !== undefined && supportsColor() === '256') {
    fillStr = color256fg(colorCode, fillStr);
  }

  return `[${fillStr}${emptyStr}]`;
}

// ─── Dashboard Event Storage ─────────────────────────────────────────────────

function dashboardEventsPath(cwd) {
  return path.join(cwd, '.planning', 'dashboard-events.ndjson');
}

function dashboardStatePath(cwd) {
  return path.join(cwd, '.planning', 'dashboard-state.json');
}

function readDashboardState(cwd) {
  const sp = dashboardStatePath(cwd);
  if (!fs.existsSync(sp)) {
    return { pinned: [], last_line_count: 0, last_render_ts: null };
  }
  try {
    return JSON.parse(fs.readFileSync(sp, 'utf-8'));
  } catch {
    return { pinned: [], last_line_count: 0, last_render_ts: null };
  }
}

function writeDashboardState(cwd, state) {
  const sp = dashboardStatePath(cwd);
  fs.writeFileSync(sp, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

function readLastNEvents(cwd, n) {
  const ep = dashboardEventsPath(cwd);
  if (!fs.existsSync(ep)) return [];
  const content = fs.readFileSync(ep, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const entries = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  return entries.slice(-n);
}

function cmdDashboardEventAdd(cwd, type, phase, detail, raw) {
  if (!type) { error('--type required for dashboard event add'); }

  const ep = dashboardEventsPath(cwd);
  const dir = path.dirname(ep);
  fs.mkdirSync(dir, { recursive: true });

  const event = {
    type,
    phase: phase || null,
    detail: detail || '',
    ts: new Date().toISOString(),
  };

  fs.appendFileSync(ep, JSON.stringify(event) + '\n');

  // Auto-prune: if file exceeds 100 events after append, truncate to last 50
  const content = fs.readFileSync(ep, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  if (lines.length > 100) {
    const kept = lines.slice(-50);
    fs.writeFileSync(ep, kept.join('\n') + '\n', 'utf-8');
  }

  // Pinned notification management
  const state = readDashboardState(cwd);

  if (type === 'input_needed' || type === 'error') {
    // Auto-pin input_needed and error events
    state.pinned.push({
      phase: phase || null,
      type,
      input_type: type === 'input_needed' ? (detail || null) : null,
      ts: event.ts,
      detail: detail || '',
    });
    writeDashboardState(cwd, state);
  } else if (phase) {
    // Auto-dismiss: remove pinned notifications for this phase when a non-input_needed, non-error event arrives
    const before = state.pinned.length;
    state.pinned = state.pinned.filter(p => p.phase !== phase);
    if (state.pinned.length !== before) {
      writeDashboardState(cwd, state);
    }
  }

  output(event, raw, JSON.stringify(event));
}

function cmdDashboardEventPrune(cwd, keep, raw) {
  const ep = dashboardEventsPath(cwd);
  if (!fs.existsSync(ep)) {
    output({ pruned: false, reason: 'File not found' }, raw, JSON.stringify({ pruned: false, reason: 'File not found' }));
    return;
  }

  const content = fs.readFileSync(ep, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const before = lines.length;
  const kept = lines.slice(-keep);
  fs.writeFileSync(ep, kept.join('\n') + '\n', 'utf-8');

  const result = { pruned: true, before, after: kept.length };
  output(result, raw, JSON.stringify(result));
}

// ─── Dashboard Renderers ─────────────────────────────────────────────────────

function renderSummaryRow(phase, width) {
  width = width || 80;
  const pc = phaseColor(phase.number);

  // Completed phases: single collapsed line
  if (phase.status === 'complete' || phase.status === 'completed') {
    const line = `\u2713 Phase ${phase.number} (${phase.elapsed || '--'})`;
    return color256fg(pc.bg, line);
  }

  // Phase label: truncated to 25 chars
  let label = `Phase ${phase.number}: ${phase.name || ''}`;
  if (label.length > 25) label = label.slice(0, 22) + '...';
  label = label.padEnd(25);

  // Progress bar: 10 wide
  const bar = renderProgressBar(phase.percent || 0, 10, phase.isBlocked, pc.bg);

  // Percentage: right-aligned 4 chars
  const pct = String(Math.round(phase.percent || 0) + '%').padStart(4);

  // Activity: truncated to 22 chars
  let activity = phase.isBlocked ? 'Awaiting input' : (phase.activity || '');
  if (activity.length > 22) activity = activity.slice(0, 19) + '...';
  activity = activity.padEnd(22);

  // Elapsed: right-aligned 4 chars
  const elapsed = (phase.elapsed || '--').padStart(4);

  const rowText = `${label} ${bar} ${pct}  ${activity} ${elapsed}`;
  return color256fg(pc.bg, rowText);
}

function renderEventLine(event, width) {
  width = width || 80;
  const pc = event.phase ? phaseColor(event.phase) : { bg: 250, fg: 16 };

  // Phase-complete: bold separator line
  if (event.type === 'phase_complete') {
    const sepText = `\u2501\u2501\u2501 Phase ${event.phase}: Complete (${event.detail || ''}) \u2501\u2501\u2501`;
    const colorLevel = supportsColor();
    if (colorLevel === 'none') return sepText;
    try {
      const util = require('util');
      return color256fg(pc.bg, util.styleText('bold', sepText));
    } catch {
      return color256fg(pc.bg, sepText);
    }
  }

  // Timestamp: HH:MM from ISO ts
  let timeStr = '--:--';
  if (event.ts) {
    try {
      const d = new Date(event.ts);
      timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    } catch { /* keep default */ }
  }

  const phaseLabel = event.phase ? `[Phase ${event.phase}]` : '[--]';

  // Icon per event type
  let icon = '';
  let detail = event.detail || '';
  switch (event.type) {
    case 'commit_made':
    case 'plan_complete':
      icon = '\u2713 ';
      break;
    case 'error':
      icon = '\u2717 ';
      break;
    case 'input_needed':
      icon = '\u26A0 ';
      detail = `INPUT NEEDED: ${event.detail || 'unknown'} -- Switch to Phase ${event.phase} terminal`;
      break;
    case 'stage_transition':
      icon = '\u2192 ';
      break;
    case 'task_claimed':
    case 'plan_created':
    default:
      icon = '';
      break;
  }

  let line = `${timeStr} ${phaseLabel} ${icon}${detail}`;

  // Stage transitions and phase-level events: bold
  if (event.type === 'stage_transition') {
    const colorLevel = supportsColor();
    if (colorLevel !== 'none') {
      try {
        const util = require('util');
        line = util.styleText('bold', line);
      } catch { /* no bold fallback */ }
    }
  }

  if (line.length > width) line = line.slice(0, width - 3) + '...';

  return color256fg(pc.bg, line);
}

function renderPinnedNotification(pinned, width) {
  width = width || 80;
  const pc = pinned.phase ? phaseColor(pinned.phase) : { bg: 226, fg: 16 };

  let line;
  if (pinned.type === 'error') {
    line = `\u2717 [Phase ${pinned.phase || '--'}] ERROR: ${pinned.detail || 'unknown'}`;
  } else {
    line = `\u26A0 [Phase ${pinned.phase || '--'}] INPUT NEEDED: ${pinned.input_type || pinned.detail || 'unknown'} -- Switch to Phase ${pinned.phase} terminal`;
  }

  if (line.length > width) line = line.slice(0, width - 3) + '...';

  return color256fg(pc.bg, line);
}

function cmdDashboardRender(cwd, options, raw) {
  const width = options.width || process.stdout.columns || 80;

  // a. Read Active Phases table from STATE.md
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  let activeRows = [];
  if (fs.existsSync(statePath)) {
    const stateContent = fs.readFileSync(statePath, 'utf-8');
    if (stateContent.includes('## Active Phases')) {
      activeRows = parseActivePhasesTable(stateContent);
    }
  }

  // c. Read last N events
  let eventCount = 6;
  try {
    const configPath = path.join(cwd, '.planning', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.feedback && config.feedback.event_log_count) {
        eventCount = config.feedback.event_log_count;
      }
    }
  } catch { /* use default */ }
  // Also check CONFIG_DEFAULTS fallback
  if (eventCount === 6) eventCount = CONFIG_DEFAULTS.feedback.event_log_count;

  const events = readLastNEvents(cwd, eventCount);

  // d. Read pinned notifications
  const dashState = readDashboardState(cwd);
  const pinnedNotifications = dashState.pinned || [];

  // Build pinned phase set for isBlocked detection
  const pinnedPhases = new Set(pinnedNotifications.map(p => String(p.phase)));

  if (activeRows.length === 0) {
    if (raw) {
      output({ lines: 0, events: events.length, pinned: pinnedNotifications.length, phases: 0 }, true, JSON.stringify({ lines: 0, events: events.length, pinned: pinnedNotifications.length, phases: 0 }));
    } else {
      const lines = [];
      if (events.length > 0) {
        lines.push('No active phases');
        lines.push('\u2500'.repeat(width));
        for (const ev of events) {
          lines.push(renderEventLine(ev, width));
        }
      } else {
        lines.push('No active phases');
      }
      if (pinnedNotifications.length > 0) {
        lines.push('');
        for (const pin of pinnedNotifications) {
          lines.push(renderPinnedNotification(pin, width));
        }
      }
      process.stdout.write(lines.join('\n') + '\n');
      dashState.last_line_count = lines.length;
      dashState.last_render_ts = new Date().toISOString();
      writeDashboardState(cwd, dashState);
    }
    return;
  }

  // b. For each active phase, assemble row data
  const phaseRows = [];
  for (const row of activeRows) {
    // Skip phases not yet started
    if (row.status === 'not started') continue;

    const phaseNum = row.phase;
    let percent = 0;
    let planInfo = row.plans || '0/0';

    // Try to read STATUS.md for plan counts
    try {
      const resolved = resolveStatusPath(cwd, phaseNum);
      if (resolved && fs.existsSync(resolved.statusPath)) {
        const statusContent = fs.readFileSync(resolved.statusPath, 'utf-8');
        const plans = parsePlanProgressTable(statusContent);
        if (plans.length > 0) {
          const completed = plans.filter(p => p.status === 'complete' || p.status === 'completed').length;
          percent = Math.round((completed / plans.length) * 100);
          planInfo = `${completed}/${plans.length}`;
        }
      }
    } catch { /* use 0% */ }

    // Parse plans field fallback (e.g., "2/3")
    if (percent === 0 && planInfo.includes('/')) {
      const parts = planInfo.split('/');
      const done = parseInt(parts[0], 10);
      const total = parseInt(parts[1], 10);
      if (total > 0) percent = Math.min(100, Math.round((done / total) * 100));
    }

    // Activity: most recent event for this phase
    let activity = '';
    for (let i = events.length - 1; i >= 0; i--) {
      if (String(events[i].phase) === String(phaseNum)) {
        activity = events[i].detail || '';
        break;
      }
    }

    const isBlocked = pinnedPhases.has(String(phaseNum));

    phaseRows.push({
      number: phaseNum,
      name: row.name || '',
      status: row.status,
      plans: planInfo,
      worker: row.worker || '',
      lastUpdate: row.last_update || '',
      activity,
      elapsed: row.last_update || '--',
      percent,
      isBlocked,
    });
  }

  // e. Render summary rows
  const lines = [];
  for (const pr of phaseRows) {
    lines.push(renderSummaryRow(pr, width));
  }

  // f. Separator line
  lines.push('\u2500'.repeat(width));

  // g. Render event lines (non-pinned events)
  for (const ev of events) {
    lines.push(renderEventLine(ev, width));
  }

  // h. Render pinned notification lines
  if (pinnedNotifications.length > 0) {
    lines.push('');
    for (const pin of pinnedNotifications) {
      lines.push(renderPinnedNotification(pin, width));
    }
  }

  // i. Terminal bell if enabled and pinned notifications exist
  let bellChar = '';
  try {
    const configPath = path.join(cwd, '.planning', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.feedback && config.feedback.terminal_bell && pinnedNotifications.length > 0) {
        bellChar = '\x07';
      }
    }
  } catch { /* no bell */ }

  // j. Output
  if (raw) {
    output({ lines: lines.length, events: events.length, pinned: pinnedNotifications.length, phases: phaseRows.length }, true, JSON.stringify({ lines: lines.length, events: events.length, pinned: pinnedNotifications.length, phases: phaseRows.length }));
  } else {
    process.stdout.write(lines.join('\n') + '\n' + bellChar);
    dashState.last_line_count = lines.length;
    dashState.last_render_ts = new Date().toISOString();
    writeDashboardState(cwd, dashState);
  }
}

function cmdDashboardClear(cwd, raw) {
  const ep = dashboardEventsPath(cwd);
  const sp = dashboardStatePath(cwd);
  let removed = [];
  if (fs.existsSync(ep)) { fs.unlinkSync(ep); removed.push('events'); }
  if (fs.existsSync(sp)) { fs.unlinkSync(sp); removed.push('state'); }
  output({ cleared: true, removed }, raw, JSON.stringify({ cleared: true, removed }));
}

// ─── WorkTrunk Dependency ─────────────────────────────────────────────────────

function checkWorkTrunk() {
  try {
    execSync('command wt --version 2>&1', { encoding: 'utf-8', timeout: 5000 });
    return { installed: true };
  } catch {
    return { installed: false };
  }
}

function requireWorkTrunk() {
  const check = checkWorkTrunk();
  if (!check.installed) {
    error(`WorkTrunk (wt) is required but not found.

Mowism uses WorkTrunk for git worktree management in multi-agent workflows.

Install via:
  Arch/CachyOS: yay -S worktrunk
  macOS:        brew install max-sixty/tap/worktrunk
  Cargo:        cargo install worktrunk
  Other:        https://worktrunk.dev

After installing, run: wt config shell install`);
  }
}

// ─── Agent Teams Detection ──────────────────────────────────────────────────

function checkAgentTeams() {
  // Check shell-level env var first
  const envVal = (process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS || '').toLowerCase();
  if (envVal === '1' || envVal === 'true') {
    return { enabled: true, source: 'env' };
  }

  // Fallback: check ~/.claude/settings.json
  try {
    const homedir = require('os').homedir();
    const settingsPath = path.join(homedir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const settingsVal = (
      String(settings.env && settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS || '')
    ).toLowerCase();
    if (settingsVal === '1' || settingsVal === 'true') {
      return { enabled: true, source: 'settings' };
    }
  } catch {
    // settings.json doesn't exist or is malformed — that's fine
  }

  return { enabled: false, source: null };
}

function getAgentTeamsNudgeDismissed(cwd) {
  try {
    const configPath = path.join(cwd, '.planning', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.agent_teams_nudge_dismissed || false;
  } catch {
    return false;
  }
}

// ─── WorkTrunk Config Auto-Setup ─────────────────────────────────────────────

const WT_CONFIG_CONTENT = `# WorkTrunk project configuration for Mowism
# Auto-created by Mowism init. See: https://worktrunk.dev

[post-create]
# Copy .planning/ from main worktree to new worktree
planning-copy = """
SRC="{{ primary_worktree_path }}/.planning"
DEST="{{ worktree_path }}/.planning"
if [ -d "$SRC" ]; then
  cp -r "$SRC" "$DEST"
  echo "MOW: Copied .planning/ from $(basename {{ primary_worktree_path }})"
  if [ -f "$DEST/STATE.md" ]; then
    echo "MOW: State file verified"
  else
    echo "MOW: WARNING - STATE.md not found after copy" >&2
    exit 1
  fi
else
  echo "MOW: No .planning/ found in main worktree (skipping)"
fi
"""
`;

const WT_PLANNING_COPY_HOOK = `# Copy .planning/ from main worktree to new worktree
planning-copy = """
SRC="{{ primary_worktree_path }}/.planning"
DEST="{{ worktree_path }}/.planning"
if [ -d "$SRC" ]; then
  cp -r "$SRC" "$DEST"
  echo "MOW: Copied .planning/ from $(basename {{ primary_worktree_path }})"
  if [ -f "$DEST/STATE.md" ]; then
    echo "MOW: State file verified"
  else
    echo "MOW: WARNING - STATE.md not found after copy" >&2
    exit 1
  fi
else
  echo "MOW: No .planning/ found in main worktree (skipping)"
fi
"""`;

function ensureWtConfig(cwd) {
  const configDir = path.join(cwd, '.config');
  const configPath = path.join(configDir, 'wt.toml');

  if (!fs.existsSync(configPath)) {
    // Create .config/ directory if needed
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, WT_CONFIG_CONTENT, 'utf-8');
    process.stderr.write('MOW: Created .config/wt.toml with post-create hook\n');
    return;
  }

  // File exists — check if it has the planning-copy hook
  const content = fs.readFileSync(configPath, 'utf-8');
  const hasPostCreate = content.includes('[post-create]');
  const hasPlanningCopy = content.includes('planning-copy');

  if (hasPostCreate && hasPlanningCopy) {
    // Already configured — nothing to do
    return;
  }

  if (hasPostCreate && !hasPlanningCopy) {
    // Has post-create section but missing planning-copy hook — append to it
    const updated = content.replace(
      /(\[post-create\][^\[]*)/s,
      `$1\n${WT_PLANNING_COPY_HOOK}\n`
    );
    fs.writeFileSync(configPath, updated, 'utf-8');
    process.stderr.write('MOW: Added planning-copy hook to .config/wt.toml\n');
    return;
  }

  // No post-create section at all — append the whole block
  const updated = content.trimEnd() + '\n\n[post-create]\n' + WT_PLANNING_COPY_HOOK + '\n';
  fs.writeFileSync(configPath, updated, 'utf-8');
  process.stderr.write('MOW: Added planning-copy hook to .config/wt.toml\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIncludeFlag(args) {
  const includeIndex = args.indexOf('--include');
  if (includeIndex === -1) return new Set();
  const includeValue = args[includeIndex + 1];
  if (!includeValue) return new Set();
  return new Set(includeValue.split(',').map(s => s.trim()));
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function loadConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const defaults = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
    branching_strategy: 'none',
    phase_branch_template: 'mow/phase-{phase}-{slug}',
    milestone_branch_template: 'mow/{milestone}-{slug}',
    research: true,
    plan_checker: true,
    verifier: true,
    parallelization: true,
    brave_search: false,
    max_task_attempts: 5,
  };

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    const get = (key, nested) => {
      if (parsed[key] !== undefined) return parsed[key];
      if (nested && parsed[nested.section] && parsed[nested.section][nested.field] !== undefined) {
        return parsed[nested.section][nested.field];
      }
      return undefined;
    };

    const parallelization = (() => {
      const val = get('parallelization');
      if (typeof val === 'boolean') return val;
      if (typeof val === 'object' && val !== null && 'enabled' in val) return val.enabled;
      return defaults.parallelization;
    })();

    return {
      model_profile: get('model_profile') ?? defaults.model_profile,
      commit_docs: get('commit_docs', { section: 'planning', field: 'commit_docs' }) ?? defaults.commit_docs,
      search_gitignored: get('search_gitignored', { section: 'planning', field: 'search_gitignored' }) ?? defaults.search_gitignored,
      branching_strategy: get('branching_strategy', { section: 'git', field: 'branching_strategy' }) ?? defaults.branching_strategy,
      phase_branch_template: get('phase_branch_template', { section: 'git', field: 'phase_branch_template' }) ?? defaults.phase_branch_template,
      milestone_branch_template: get('milestone_branch_template', { section: 'git', field: 'milestone_branch_template' }) ?? defaults.milestone_branch_template,
      research: get('research', { section: 'workflow', field: 'research' }) ?? defaults.research,
      plan_checker: get('plan_checker', { section: 'workflow', field: 'plan_check' }) ?? defaults.plan_checker,
      verifier: get('verifier', { section: 'workflow', field: 'verifier' }) ?? defaults.verifier,
      parallelization,
      brave_search: get('brave_search') ?? defaults.brave_search,
      max_task_attempts: get('max_task_attempts', { section: 'executor', field: 'max_task_attempts' }) ?? defaults.max_task_attempts,
    };
  } catch {
    return defaults;
  }
}

function isGitIgnored(cwd, targetPath) {
  try {
    execSync('git check-ignore -q -- ' + targetPath.replace(/[^a-zA-Z0-9._\-/]/g, ''), {
      cwd,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function execGit(cwd, args) {
  try {
    const escaped = args.map(a => {
      if (/^[a-zA-Z0-9._\-/=:@]+$/.test(a)) return a;
      return "'" + a.replace(/'/g, "'\\''") + "'";
    });
    const stdout = execSync('git ' + escaped.join(' '), {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status ?? 1,
      stdout: (err.stdout ?? '').toString().trim(),
      stderr: (err.stderr ?? '').toString().trim(),
    };
  }
}

function normalizePhaseName(phase) {
  const match = phase.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return phase;
  const num = match[1];
  const parts = num.split('.');
  const padded = parts[0].padStart(2, '0');
  return parts.length > 1 ? `${padded}.${parts[1]}` : padded;
}

function extractFrontmatter(content) {
  const frontmatter = {};
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return frontmatter;

  const yaml = match[1];
  const lines = yaml.split('\n');

  // Stack to track nested objects: [{obj, key, indent}]
  // obj = object to write to, key = current key collecting array items, indent = indentation level
  let stack = [{ obj: frontmatter, key: null, indent: -1 }];

  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === '') continue;

    // Calculate indentation (number of leading spaces)
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Pop stack back to appropriate level
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];

    // Check for key: value pattern
    const keyMatch = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*(.*)/);
    if (keyMatch) {
      const key = keyMatch[2];
      const value = keyMatch[3].trim();

      if (value === '' || value === '[') {
        // Key with no value or opening bracket — could be nested object or array
        // We'll determine based on next lines, for now create placeholder
        current.obj[key] = value === '[' ? [] : {};
        current.key = null;
        // Push new context for potential nested content
        stack.push({ obj: current.obj[key], key: null, indent });
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array: key: [a, b, c]
        current.obj[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        current.key = null;
      } else {
        // Simple key: value
        current.obj[key] = value.replace(/^["']|["']$/g, '');
        current.key = null;
      }
    } else if (line.trim().startsWith('- ')) {
      // Array item
      const itemValue = line.trim().slice(2).replace(/^["']|["']$/g, '');

      // If current context is an empty object, convert to array
      if (typeof current.obj === 'object' && !Array.isArray(current.obj) && Object.keys(current.obj).length === 0) {
        // Find the key in parent that points to this object and convert it
        const parent = stack.length > 1 ? stack[stack.length - 2] : null;
        if (parent) {
          for (const k of Object.keys(parent.obj)) {
            if (parent.obj[k] === current.obj) {
              parent.obj[k] = [itemValue];
              current.obj = parent.obj[k];
              break;
            }
          }
        }
      } else if (Array.isArray(current.obj)) {
        current.obj.push(itemValue);
      }
    }
  }

  return frontmatter;
}

function reconstructFrontmatter(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (value.every(v => typeof v === 'string') && value.length <= 3 && value.join(', ').length < 60) {
        lines.push(`${key}: [${value.join(', ')}]`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${typeof item === 'string' && (item.includes(':') || item.includes('#')) ? `"${item}"` : item}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${key}:`);
      for (const [subkey, subval] of Object.entries(value)) {
        if (subval === null || subval === undefined) continue;
        if (Array.isArray(subval)) {
          if (subval.length === 0) {
            lines.push(`  ${subkey}: []`);
          } else if (subval.every(v => typeof v === 'string') && subval.length <= 3 && subval.join(', ').length < 60) {
            lines.push(`  ${subkey}: [${subval.join(', ')}]`);
          } else {
            lines.push(`  ${subkey}:`);
            for (const item of subval) {
              lines.push(`    - ${typeof item === 'string' && (item.includes(':') || item.includes('#')) ? `"${item}"` : item}`);
            }
          }
        } else if (typeof subval === 'object') {
          lines.push(`  ${subkey}:`);
          for (const [subsubkey, subsubval] of Object.entries(subval)) {
            if (subsubval === null || subsubval === undefined) continue;
            if (Array.isArray(subsubval)) {
              if (subsubval.length === 0) {
                lines.push(`    ${subsubkey}: []`);
              } else {
                lines.push(`    ${subsubkey}:`);
                for (const item of subsubval) {
                  lines.push(`      - ${item}`);
                }
              }
            } else {
              lines.push(`    ${subsubkey}: ${subsubval}`);
            }
          }
        } else {
          const sv = String(subval);
          lines.push(`  ${subkey}: ${sv.includes(':') || sv.includes('#') ? `"${sv}"` : sv}`);
        }
      }
    } else {
      const sv = String(value);
      if (sv.includes(':') || sv.includes('#') || sv.startsWith('[') || sv.startsWith('{')) {
        lines.push(`${key}: "${sv}"`);
      } else {
        lines.push(`${key}: ${sv}`);
      }
    }
  }
  return lines.join('\n');
}

function spliceFrontmatter(content, newObj) {
  const yamlStr = reconstructFrontmatter(newObj);
  const match = content.match(/^---\n[\s\S]+?\n---/);
  if (match) {
    return `---\n${yamlStr}\n---` + content.slice(match[0].length);
  }
  return `---\n${yamlStr}\n---\n\n` + content;
}

function parseMustHavesBlock(content, blockName) {
  // Extract a specific block from must_haves in raw frontmatter YAML
  // Handles 3-level nesting: must_haves > artifacts/key_links > [{path, provides, ...}]
  const fmMatch = content.match(/^---\n([\s\S]+?)\n---/);
  if (!fmMatch) return [];

  const yaml = fmMatch[1];
  // Find the block (e.g., "truths:", "artifacts:", "key_links:")
  const blockPattern = new RegExp(`^\\s{4}${blockName}:\\s*$`, 'm');
  const blockStart = yaml.search(blockPattern);
  if (blockStart === -1) return [];

  const afterBlock = yaml.slice(blockStart);
  const blockLines = afterBlock.split('\n').slice(1); // skip the header line

  const items = [];
  let current = null;

  for (const line of blockLines) {
    // Stop at same or lower indent level (non-continuation)
    if (line.trim() === '') continue;
    const indent = line.match(/^(\s*)/)[1].length;
    if (indent <= 4 && line.trim() !== '') break; // back to must_haves level or higher

    if (line.match(/^\s{6}-\s+/)) {
      // New list item at 6-space indent
      if (current) items.push(current);
      current = {};
      // Check if it's a simple string item
      const simpleMatch = line.match(/^\s{6}-\s+"?([^"]+)"?\s*$/);
      if (simpleMatch && !line.includes(':')) {
        current = simpleMatch[1];
      } else {
        // Key-value on same line as dash: "- path: value"
        const kvMatch = line.match(/^\s{6}-\s+(\w+):\s*"?([^"]*)"?\s*$/);
        if (kvMatch) {
          current = {};
          current[kvMatch[1]] = kvMatch[2];
        }
      }
    } else if (current && typeof current === 'object') {
      // Continuation key-value at 8+ space indent
      const kvMatch = line.match(/^\s{8,}(\w+):\s*"?([^"]*)"?\s*$/);
      if (kvMatch) {
        const val = kvMatch[2];
        // Try to parse as number
        current[kvMatch[1]] = /^\d+$/.test(val) ? parseInt(val, 10) : val;
      }
      // Array items under a key
      const arrMatch = line.match(/^\s{10,}-\s+"?([^"]+)"?\s*$/);
      if (arrMatch) {
        // Find the last key added and convert to array
        const keys = Object.keys(current);
        const lastKey = keys[keys.length - 1];
        if (lastKey && !Array.isArray(current[lastKey])) {
          current[lastKey] = current[lastKey] ? [current[lastKey]] : [];
        }
        if (lastKey) current[lastKey].push(arrMatch[1]);
      }
    }
  }
  if (current) items.push(current);

  return items;
}

function output(result, raw, rawValue) {
  if (raw && rawValue !== undefined) {
    process.stdout.write(String(rawValue));
  } else {
    const json = JSON.stringify(result, null, 2);
    // Large payloads exceed Claude Code's Bash tool buffer (~50KB).
    // Write to tmpfile and output the path prefixed with @file: so callers can detect it.
    if (json.length > 50000) {
      const tmpPath = path.join(require('os').tmpdir(), `mow-${Date.now()}.json`);
      fs.writeFileSync(tmpPath, json, 'utf-8');
      process.stdout.write('@file:' + tmpPath);
    } else {
      process.stdout.write(json);
    }
  }
  process.exit(0);
}

function error(message) {
  process.stderr.write('Error: ' + message + '\n');
  process.exit(1);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdGenerateSlug(text, raw) {
  if (!text) {
    error('text required for slug generation');
  }

  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const result = { slug };
  output(result, raw, slug);
}

function cmdCurrentTimestamp(format, raw) {
  const now = new Date();
  let result;

  switch (format) {
    case 'date':
      result = now.toISOString().split('T')[0];
      break;
    case 'filename':
      result = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
      break;
    case 'full':
    default:
      result = now.toISOString();
      break;
  }

  output({ timestamp: result }, raw, result);
}

function cmdListTodos(cwd, area, raw) {
  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');

  let count = 0;
  const todos = [];

  try {
    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(pendingDir, file), 'utf-8');
        const createdMatch = content.match(/^created:\s*(.+)$/m);
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        const areaMatch = content.match(/^area:\s*(.+)$/m);

        const todoArea = areaMatch ? areaMatch[1].trim() : 'general';

        // Apply area filter if specified
        if (area && todoArea !== area) continue;

        count++;
        todos.push({
          file,
          created: createdMatch ? createdMatch[1].trim() : 'unknown',
          title: titleMatch ? titleMatch[1].trim() : 'Untitled',
          area: todoArea,
          path: path.join('.planning', 'todos', 'pending', file),
        });
      } catch {}
    }
  } catch {}

  const result = { count, todos };
  output(result, raw, count.toString());
}

function cmdVerifyPathExists(cwd, targetPath, raw) {
  if (!targetPath) {
    error('path required for verification');
  }

  const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath);

  try {
    const stats = fs.statSync(fullPath);
    const type = stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other';
    const result = { exists: true, type };
    output(result, raw, 'true');
  } catch {
    const result = { exists: false, type: null };
    output(result, raw, 'false');
  }
}

function cmdConfigEnsureSection(cwd, raw) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const planningDir = path.join(cwd, '.planning');

  // Ensure .planning directory exists
  try {
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }
  } catch (err) {
    error('Failed to create .planning directory: ' + err.message);
  }

  // Check if config already exists
  if (fs.existsSync(configPath)) {
    const result = { created: false, reason: 'already_exists' };
    output(result, raw, 'exists');
    return;
  }

  // Detect Brave Search API key availability
  const homedir = require('os').homedir();
  const braveKeyFile = path.join(homedir, '.mowism', 'brave_api_key');
  const hasBraveSearch = !!(process.env.BRAVE_API_KEY || fs.existsSync(braveKeyFile));

  // Load user-level defaults from ~/.mowism/defaults.json if available
  const globalDefaultsPath = path.join(homedir, '.mowism', 'defaults.json');
  let userDefaults = {};
  try {
    if (fs.existsSync(globalDefaultsPath)) {
      userDefaults = JSON.parse(fs.readFileSync(globalDefaultsPath, 'utf-8'));
    }
  } catch (err) {
    // Ignore malformed global defaults, fall back to hardcoded
  }

  // Create default config (user-level defaults override hardcoded defaults)
  const hardcoded = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
    branching_strategy: 'none',
    phase_branch_template: 'mow/phase-{phase}-{slug}',
    milestone_branch_template: 'mow/{milestone}-{slug}',
    workflow: {
      research: true,
      plan_check: true,
      verifier: true,
    },
    parallelization: true,
    brave_search: hasBraveSearch,
  };
  const defaults = {
    ...hardcoded,
    ...userDefaults,
    workflow: { ...hardcoded.workflow, ...(userDefaults.workflow || {}) },
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8');
    const result = { created: true, path: '.planning/config.json' };
    output(result, raw, 'created');
  } catch (err) {
    error('Failed to create config.json: ' + err.message);
  }
}

function cmdConfigSet(cwd, keyPath, value, raw) {
  const configPath = path.join(cwd, '.planning', 'config.json');

  if (!keyPath) {
    error('Usage: config-set <key.path> <value>');
  }

  // Parse value (handle booleans and numbers)
  let parsedValue = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(value) && value !== '') parsedValue = Number(value);

  // Load existing config or start with empty object
  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    error('Failed to read config.json: ' + err.message);
  }

  // Set nested value using dot notation (e.g., "workflow.research")
  const keys = keyPath.split('.');
  let current = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = parsedValue;

  // Write back
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    const result = { updated: true, key: keyPath, value: parsedValue };
    output(result, raw, `${keyPath}=${parsedValue}`);
  } catch (err) {
    error('Failed to write config.json: ' + err.message);
  }
}

// Built-in defaults for keys that may not be in config.json yet
const CONFIG_DEFAULTS = {
  multi_phase: {
    circuit_breaker_threshold: 2,
    merge_timing: 'batch',
    worktree_metadata_push: false,
  },
  feedback: {
    terminal_bell: false,
    dashboard_redraw: false,
    event_log_count: 6,
  },
};

function cmdConfigGet(cwd, keyPath, raw) {
  const configPath = path.join(cwd, '.planning', 'config.json');

  if (!keyPath) {
    error('Usage: config-get <key.path>');
  }

  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      error('No config.json found at ' + configPath);
    }
  } catch (err) {
    if (err.message.startsWith('No config.json')) throw err;
    error('Failed to read config.json: ' + err.message);
  }

  // Traverse dot-notation path (e.g., "workflow.auto_advance")
  const keys = keyPath.split('.');
  let current = config;
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== 'object') {
      current = undefined;
      break;
    }
    current = current[key];
  }

  // Fall back to built-in defaults if not found in config
  if (current === undefined) {
    let fallback = CONFIG_DEFAULTS;
    for (const key of keys) {
      if (fallback === undefined || fallback === null || typeof fallback !== 'object') {
        fallback = undefined;
        break;
      }
      fallback = fallback[key];
    }
    if (fallback !== undefined) {
      current = fallback;
    } else {
      error(`Key not found: ${keyPath}`);
    }
  }

  output(current, raw, String(current));
}

function cmdConfigNudgeDismiss(cwd, raw) {
  const configPath = path.join(cwd, '.planning', 'config.json');

  // Load existing config or start fresh
  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    // Malformed JSON — start fresh
    config = {};
  }

  // Merge nudge dismiss fields
  config.agent_teams_nudge_dismissed = true;
  config.agent_teams_nudge_dismissed_at = new Date().toISOString().split('T')[0];

  // Ensure .planning/ exists
  const planningDir = path.join(cwd, '.planning');
  if (!fs.existsSync(planningDir)) {
    fs.mkdirSync(planningDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  const result = {
    dismissed: true,
    dismissed_at: config.agent_teams_nudge_dismissed_at,
  };
  output(result, raw, 'dismissed');
}

function cmdHistoryDigest(cwd, raw) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const digest = { phases: {}, decisions: [], tech_stack: new Set() };

  // Collect all phase directories: archived + current
  const allPhaseDirs = [];

  // Add archived phases first (oldest milestones first)
  const archived = getArchivedPhaseDirs(cwd);
  for (const a of archived) {
    allPhaseDirs.push({ name: a.name, fullPath: a.fullPath, milestone: a.milestone });
  }

  // Add current phases
  if (fs.existsSync(phasesDir)) {
    try {
      const currentDirs = fs.readdirSync(phasesDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort();
      for (const dir of currentDirs) {
        allPhaseDirs.push({ name: dir, fullPath: path.join(phasesDir, dir), milestone: null });
      }
    } catch {}
  }

  if (allPhaseDirs.length === 0) {
    digest.tech_stack = [];
    output(digest, raw);
    return;
  }

  try {
    for (const { name: dir, fullPath: dirPath } of allPhaseDirs) {
      const summaries = fs.readdirSync(dirPath).filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');

      for (const summary of summaries) {
        try {
          const content = fs.readFileSync(path.join(dirPath, summary), 'utf-8');
          const fm = extractFrontmatter(content);
          
          const phaseNum = fm.phase || dir.split('-')[0];
          
          if (!digest.phases[phaseNum]) {
            digest.phases[phaseNum] = {
              name: fm.name || dir.split('-').slice(1).join(' ') || 'Unknown',
              provides: new Set(),
              affects: new Set(),
              patterns: new Set(),
            };
          }

          // Merge provides
          if (fm['dependency-graph'] && fm['dependency-graph'].provides) {
            fm['dependency-graph'].provides.forEach(p => digest.phases[phaseNum].provides.add(p));
          } else if (fm.provides) {
            fm.provides.forEach(p => digest.phases[phaseNum].provides.add(p));
          }

          // Merge affects
          if (fm['dependency-graph'] && fm['dependency-graph'].affects) {
            fm['dependency-graph'].affects.forEach(a => digest.phases[phaseNum].affects.add(a));
          }

          // Merge patterns
          if (fm['patterns-established']) {
            fm['patterns-established'].forEach(p => digest.phases[phaseNum].patterns.add(p));
          }

          // Merge decisions
          if (fm['key-decisions']) {
            fm['key-decisions'].forEach(d => {
              digest.decisions.push({ phase: phaseNum, decision: d });
            });
          }

          // Merge tech stack
          if (fm['tech-stack'] && fm['tech-stack'].added) {
            fm['tech-stack'].added.forEach(t => digest.tech_stack.add(typeof t === 'string' ? t : t.name));
          }

        } catch (e) {
          // Skip malformed summaries
        }
      }
    }

    // Convert Sets to Arrays for JSON output
    Object.keys(digest.phases).forEach(p => {
      digest.phases[p].provides = [...digest.phases[p].provides];
      digest.phases[p].affects = [...digest.phases[p].affects];
      digest.phases[p].patterns = [...digest.phases[p].patterns];
    });
    digest.tech_stack = [...digest.tech_stack];

    output(digest, raw);
  } catch (e) {
    error('Failed to generate history digest: ' + e.message);
  }
}

function cmdPhasesList(cwd, options, raw) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const { type, phase, includeArchived } = options;

  // If no phases directory, return empty
  if (!fs.existsSync(phasesDir)) {
    if (type) {
      output({ files: [], count: 0 }, raw, '');
    } else {
      output({ directories: [], count: 0 }, raw, '');
    }
    return;
  }

  try {
    // Get all phase directories
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    let dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    // Include archived phases if requested
    if (includeArchived) {
      const archived = getArchivedPhaseDirs(cwd);
      for (const a of archived) {
        dirs.push(`${a.name} [${a.milestone}]`);
      }
    }

    // Sort numerically (handles decimals: 01, 02, 02.1, 02.2, 03)
    dirs.sort((a, b) => {
      const aNum = parseFloat(a.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
      const bNum = parseFloat(b.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
      return aNum - bNum;
    });

    // If filtering by phase number
    if (phase) {
      const normalized = normalizePhaseName(phase);
      const match = dirs.find(d => d.startsWith(normalized));
      if (!match) {
        output({ files: [], count: 0, phase_dir: null, error: 'Phase not found' }, raw, '');
        return;
      }
      dirs = [match];
    }

    // If listing files of a specific type
    if (type) {
      const files = [];
      for (const dir of dirs) {
        const dirPath = path.join(phasesDir, dir);
        const dirFiles = fs.readdirSync(dirPath);

        let filtered;
        if (type === 'plans') {
          filtered = dirFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
        } else if (type === 'summaries') {
          filtered = dirFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
        } else {
          filtered = dirFiles;
        }

        files.push(...filtered.sort());
      }

      const result = {
        files,
        count: files.length,
        phase_dir: phase ? dirs[0].replace(/^\d+(?:\.\d+)?-?/, '') : null,
      };
      output(result, raw, files.join('\n'));
      return;
    }

    // Default: list directories
    output({ directories: dirs, count: dirs.length }, raw, dirs.join('\n'));
  } catch (e) {
    error('Failed to list phases: ' + e.message);
  }
}

function cmdRoadmapGetPhase(cwd, phaseNum, raw) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!fs.existsSync(roadmapPath)) {
    output({ found: false, error: 'ROADMAP.md not found' }, raw, '');
    return;
  }

  try {
    const content = fs.readFileSync(roadmapPath, 'utf-8');

    // Escape special regex chars in phase number, handle decimal
    const escapedPhase = phaseNum.replace(/\./g, '\\.');

    // Match "## Phase X:", "### Phase X:", or "#### Phase X:" with optional name
    const phasePattern = new RegExp(
      `#{2,4}\\s*Phase\\s+${escapedPhase}:\\s*([^\\n]+)`,
      'i'
    );
    const headerMatch = content.match(phasePattern);

    if (!headerMatch) {
      // Fallback: check if phase exists in summary list but missing detail section
      const checklistPattern = new RegExp(
        `-\\s*\\[[ x]\\]\\s*\\*\\*Phase\\s+${escapedPhase}:\\s*([^*]+)\\*\\*`,
        'i'
      );
      const checklistMatch = content.match(checklistPattern);

      if (checklistMatch) {
        // Phase exists in summary but missing detail section - malformed ROADMAP
        output({
          found: false,
          phase_number: phaseNum,
          phase_name: checklistMatch[1].trim(),
          error: 'malformed_roadmap',
          message: `Phase ${phaseNum} exists in summary list but missing "### Phase ${phaseNum}:" detail section. ROADMAP.md needs both formats.`
        }, raw, '');
        return;
      }

      output({ found: false, phase_number: phaseNum }, raw, '');
      return;
    }

    const phaseName = headerMatch[1].trim();
    const headerIndex = headerMatch.index;

    // Find the end of this section (next ## or ### phase header, or end of file)
    const restOfContent = content.slice(headerIndex);
    const nextHeaderMatch = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i);
    const sectionEnd = nextHeaderMatch
      ? headerIndex + nextHeaderMatch.index
      : content.length;

    const section = content.slice(headerIndex, sectionEnd).trim();

    // Extract goal if present
    const goalMatch = section.match(/\*\*Goal(?::\*\*|\*\*:)\s*([^\n]+)/i);
    const goal = goalMatch ? goalMatch[1].trim() : null;

    // Extract success criteria as structured array
    const criteriaMatch = section.match(/\*\*Success Criteria\*\*[^\n]*:\s*\n((?:\s*\d+\.\s*[^\n]+\n?)+)/i);
    const success_criteria = criteriaMatch
      ? criteriaMatch[1].trim().split('\n').map(line => line.replace(/^\s*\d+\.\s*/, '').trim()).filter(Boolean)
      : [];

    output(
      {
        found: true,
        phase_number: phaseNum,
        phase_name: phaseName,
        goal,
        success_criteria,
        section,
      },
      raw,
      section
    );
  } catch (e) {
    error('Failed to read ROADMAP.md: ' + e.message);
  }
}

function cmdPhaseNextDecimal(cwd, basePhase, raw) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(basePhase);

  // Check if phases directory exists
  if (!fs.existsSync(phasesDir)) {
    output(
      {
        found: false,
        base_phase: normalized,
        next: `${normalized}.1`,
        existing: [],
      },
      raw,
      `${normalized}.1`
    );
    return;
  }

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    // Check if base phase exists
    const baseExists = dirs.some(d => d.startsWith(normalized + '-') || d === normalized);

    // Find existing decimal phases for this base
    const decimalPattern = new RegExp(`^${normalized}\\.(\\d+)`);
    const existingDecimals = [];

    for (const dir of dirs) {
      const match = dir.match(decimalPattern);
      if (match) {
        existingDecimals.push(`${normalized}.${match[1]}`);
      }
    }

    // Sort numerically
    existingDecimals.sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      return aNum - bNum;
    });

    // Calculate next decimal
    let nextDecimal;
    if (existingDecimals.length === 0) {
      nextDecimal = `${normalized}.1`;
    } else {
      const lastDecimal = existingDecimals[existingDecimals.length - 1];
      const lastNum = parseInt(lastDecimal.split('.')[1], 10);
      nextDecimal = `${normalized}.${lastNum + 1}`;
    }

    output(
      {
        found: baseExists,
        base_phase: normalized,
        next: nextDecimal,
        existing: existingDecimals,
      },
      raw,
      nextDecimal
    );
  } catch (e) {
    error('Failed to calculate next decimal phase: ' + e.message);
  }
}

function cmdStateLoad(cwd, raw) {
  const config = loadConfig(cwd);
  const planningDir = path.join(cwd, '.planning');

  let stateRaw = '';
  try {
    stateRaw = fs.readFileSync(path.join(planningDir, 'STATE.md'), 'utf-8');
  } catch {}

  const configExists = fs.existsSync(path.join(planningDir, 'config.json'));
  const roadmapExists = fs.existsSync(path.join(planningDir, 'ROADMAP.md'));
  const stateExists = stateRaw.length > 0;

  const result = {
    config,
    state_raw: stateRaw,
    state_exists: stateExists,
    roadmap_exists: roadmapExists,
    config_exists: configExists,
  };

  // For --raw, output a condensed key=value format
  if (raw) {
    const c = config;
    const lines = [
      `model_profile=${c.model_profile}`,
      `commit_docs=${c.commit_docs}`,
      `branching_strategy=${c.branching_strategy}`,
      `phase_branch_template=${c.phase_branch_template}`,
      `milestone_branch_template=${c.milestone_branch_template}`,
      `parallelization=${c.parallelization}`,
      `research=${c.research}`,
      `plan_checker=${c.plan_checker}`,
      `verifier=${c.verifier}`,
      `config_exists=${configExists}`,
      `roadmap_exists=${roadmapExists}`,
      `state_exists=${stateExists}`,
    ];
    process.stdout.write(lines.join('\n'));
    process.exit(0);
  }

  output(result);
}

function cmdStateGet(cwd, section, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    
    if (!section) {
      output({ content }, raw, content);
      return;
    }

    // Try to find markdown section or field
    const fieldEscaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Check for **field:** value
    const fieldPattern = new RegExp(`\\*\\*${fieldEscaped}:\\*\\*\\s*(.*)`, 'i');
    const fieldMatch = content.match(fieldPattern);
    if (fieldMatch) {
      output({ [section]: fieldMatch[1].trim() }, raw, fieldMatch[1].trim());
      return;
    }

    // Check for ## Section
    const sectionPattern = new RegExp(`##\\s*${fieldEscaped}\\s*\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const sectionMatch = content.match(sectionPattern);
    if (sectionMatch) {
      output({ [section]: sectionMatch[1].trim() }, raw, sectionMatch[1].trim());
      return;
    }

    output({ error: `Section or field "${section}" not found` }, raw, '');
  } catch {
    error('STATE.md not found');
  }
}

function cmdStatePatch(cwd, patches, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    let content = fs.readFileSync(statePath, 'utf-8');
    const results = { updated: [], failed: [] };

    for (const [field, value] of Object.entries(patches)) {
      const fieldEscaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(\\*\\*${fieldEscaped}:\\*\\*\\s*)(.*)`, 'i');
      
      if (pattern.test(content)) {
        content = content.replace(pattern, (_, prefix) => prefix + value);
        results.updated.push(field);
      } else {
        results.failed.push(field);
      }
    }

    if (results.updated.length > 0) {
      fs.writeFileSync(statePath, content, 'utf-8');
    }

    output(results, raw, results.updated.length > 0 ? 'true' : 'false');
  } catch {
    error('STATE.md not found');
  }
}

function cmdStateUpdate(cwd, field, value) {
  if (!field || value === undefined) {
    error('field and value required for state update');
  }

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    let content = fs.readFileSync(statePath, 'utf-8');
    const fieldEscaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(\\*\\*${fieldEscaped}:\\*\\*\\s*)(.*)`, 'i');
    if (pattern.test(content)) {
      content = content.replace(pattern, (_, prefix) => prefix + value);
      fs.writeFileSync(statePath, content, 'utf-8');
      output({ updated: true });
    } else {
      output({ updated: false, reason: `Field "${field}" not found in STATE.md` });
    }
  } catch {
    output({ updated: false, reason: 'STATE.md not found' });
  }
}

// ─── State Progression Engine ────────────────────────────────────────────────

function stateExtractField(content, fieldName) {
  const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function stateReplaceField(content, fieldName, newValue) {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\*\\*${escaped}:\\*\\*\\s*)(.*)`, 'i');
  if (pattern.test(content)) {
    return content.replace(pattern, (_, prefix) => prefix + newValue);
  }
  return null;
}

function cmdStateAdvancePlan(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const currentPlan = parseInt(stateExtractField(content, 'Current Plan'), 10);
  const totalPlans = parseInt(stateExtractField(content, 'Total Plans in Phase'), 10);
  const today = new Date().toISOString().split('T')[0];

  if (isNaN(currentPlan) || isNaN(totalPlans)) {
    output({ error: 'Cannot parse Current Plan or Total Plans in Phase from STATE.md' }, raw);
    return;
  }

  if (currentPlan >= totalPlans) {
    content = stateReplaceField(content, 'Status', 'Phase complete — ready for verification') || content;
    content = stateReplaceField(content, 'Last Activity', today) || content;
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ advanced: false, reason: 'last_plan', current_plan: currentPlan, total_plans: totalPlans, status: 'ready_for_verification' }, raw, 'false');
  } else {
    const newPlan = currentPlan + 1;
    content = stateReplaceField(content, 'Current Plan', String(newPlan)) || content;
    content = stateReplaceField(content, 'Status', 'Ready to execute') || content;
    content = stateReplaceField(content, 'Last Activity', today) || content;
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ advanced: true, previous_plan: currentPlan, current_plan: newPlan, total_plans: totalPlans }, raw, 'true');
  }
}

function cmdStateRecordMetric(cwd, options, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const { phase, plan, duration, tasks, files } = options;

  if (!phase || !plan || !duration) {
    output({ error: 'phase, plan, and duration required' }, raw);
    return;
  }

  // Find Performance Metrics section and its table
  const metricsPattern = /(##\s*Performance Metrics[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n)([\s\S]*?)(?=\n##|\n$|$)/i;
  const metricsMatch = content.match(metricsPattern);

  if (metricsMatch) {
    const tableHeader = metricsMatch[1];
    let tableBody = metricsMatch[2].trimEnd();
    const newRow = `| Phase ${phase} P${plan} | ${duration} | ${tasks || '-'} tasks | ${files || '-'} files |`;

    if (tableBody.trim() === '' || tableBody.includes('None yet')) {
      tableBody = newRow;
    } else {
      tableBody = tableBody + '\n' + newRow;
    }

    content = content.replace(metricsPattern, `${tableHeader}${tableBody}\n`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ recorded: true, phase, plan, duration }, raw, 'true');
  } else {
    output({ recorded: false, reason: 'Performance Metrics section not found in STATE.md' }, raw, 'false');
  }
}

function cmdStateUpdateProgress(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');

  // Count summaries across all phases
  const phasesDir = path.join(cwd, '.planning', 'phases');
  let totalPlans = 0;
  let totalSummaries = 0;

  if (fs.existsSync(phasesDir)) {
    const phaseDirs = fs.readdirSync(phasesDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);
    for (const dir of phaseDirs) {
      const files = fs.readdirSync(path.join(phasesDir, dir));
      totalPlans += files.filter(f => f.match(/-PLAN\.md$/i)).length;
      totalSummaries += files.filter(f => f.match(/-SUMMARY\.md$/i)).length;
    }
  }

  const percent = totalPlans > 0 ? Math.min(100, Math.round(totalSummaries / totalPlans * 100)) : 0;
  const barWidth = 10;
  const filled = Math.round(percent / 100 * barWidth);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
  const progressStr = `[${bar}] ${percent}%`;

  const progressPattern = /(\*\*Progress:\*\*\s*).*/i;
  if (progressPattern.test(content)) {
    content = content.replace(progressPattern, (_, prefix) => prefix + progressStr);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ updated: true, percent, completed: totalSummaries, total: totalPlans, bar: progressStr }, raw, progressStr);
  } else {
    output({ updated: false, reason: 'Progress field not found in STATE.md' }, raw, 'false');
  }
}

function cmdStateAddDecision(cwd, options, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  const { phase, summary, rationale } = options;
  if (!summary) { output({ error: 'summary required' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const entry = `- [Phase ${phase || '?'}]: ${summary}${rationale ? ` — ${rationale}` : ''}`;

  // Find Decisions section (various heading patterns)
  const sectionPattern = /(###?\s*(?:Decisions|Decisions Made|Accumulated.*Decisions)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);

  if (match) {
    let sectionBody = match[2];
    // Remove placeholders
    sectionBody = sectionBody.replace(/None yet\.?\s*\n?/gi, '').replace(/No decisions yet\.?\s*\n?/gi, '');
    sectionBody = sectionBody.trimEnd() + '\n' + entry + '\n';
    content = content.replace(sectionPattern, `${match[1]}${sectionBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ added: true, decision: entry }, raw, 'true');
  } else {
    output({ added: false, reason: 'Decisions section not found in STATE.md' }, raw, 'false');
  }
}

function cmdStateAddBlocker(cwd, text, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }
  if (!text) { output({ error: 'text required' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const entry = `- ${text}`;

  const sectionPattern = /(###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);

  if (match) {
    let sectionBody = match[2];
    sectionBody = sectionBody.replace(/None\.?\s*\n?/gi, '').replace(/None yet\.?\s*\n?/gi, '');
    sectionBody = sectionBody.trimEnd() + '\n' + entry + '\n';
    content = content.replace(sectionPattern, `${match[1]}${sectionBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ added: true, blocker: text }, raw, 'true');
  } else {
    output({ added: false, reason: 'Blockers section not found in STATE.md' }, raw, 'false');
  }
}

function cmdStateResolveBlocker(cwd, text, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }
  if (!text) { output({ error: 'text required' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');

  const sectionPattern = /(###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);

  if (match) {
    const sectionBody = match[2];
    const lines = sectionBody.split('\n');
    const filtered = lines.filter(line => {
      if (!line.startsWith('- ')) return true;
      return !line.toLowerCase().includes(text.toLowerCase());
    });

    let newBody = filtered.join('\n');
    // If section is now empty, add placeholder
    if (!newBody.trim() || !newBody.includes('- ')) {
      newBody = 'None\n';
    }

    content = content.replace(sectionPattern, `${match[1]}${newBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ resolved: true, blocker: text }, raw, 'true');
  } else {
    output({ resolved: false, reason: 'Blockers section not found in STATE.md' }, raw, 'false');
  }
}

function cmdStateRecordSession(cwd, options, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const now = new Date().toISOString();
  const updated = [];

  // Update Last session / Last Date
  let result = stateReplaceField(content, 'Last session', now);
  if (result) { content = result; updated.push('Last session'); }
  result = stateReplaceField(content, 'Last Date', now);
  if (result) { content = result; updated.push('Last Date'); }

  // Update Stopped at
  if (options.stopped_at) {
    result = stateReplaceField(content, 'Stopped At', options.stopped_at);
    if (!result) result = stateReplaceField(content, 'Stopped at', options.stopped_at);
    if (result) { content = result; updated.push('Stopped At'); }
  }

  // Update Resume file
  const resumeFile = options.resume_file || 'None';
  result = stateReplaceField(content, 'Resume File', resumeFile);
  if (!result) result = stateReplaceField(content, 'Resume file', resumeFile);
  if (result) { content = result; updated.push('Resume File'); }

  if (updated.length > 0) {
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ recorded: true, updated }, raw, 'true');
  } else {
    output({ recorded: false, reason: 'No session fields found in STATE.md' }, raw, 'false');
  }
}

// ─── Message Protocol Commands ───────────────────────────────────────────────

function cmdMessageSummary(type, fields) {
  const phase = fields.phase || '?';
  const plan = fields.plan || '?';
  switch (type) {
    case 'plan_started':
      return `Phase ${phase}: plan ${plan} started`;
    case 'plan_complete':
      return `Phase ${phase}: plan ${plan} complete (${fields.duration_min || '?'}min)`;
    case 'phase_complete':
      return `Phase ${phase}: all plans complete`;
    case 'error':
      return `Phase ${phase}: error in ${plan}`;
    case 'blocker':
      return `Phase ${phase}: blocker in ${plan} (${fields.action || '?'})`;
    case 'state_change':
      return `Phase ${phase}: ${plan} ${fields.to_state || '?'}`;
    case 'ack':
      return `Ack: ${fields.ref_type || '?'} ${fields.ref_plan || '?'}`;
    case 'task_claimed':
      return `Phase ${phase}: task ${fields.task || '?'} claimed`;
    case 'commit_made':
      return `Phase ${phase}: commit ${fields.commit_hash || '?'}`;
    case 'task_complete':
      return `Phase ${phase}: task ${fields.task || '?'} complete`;
    case 'stage_transition':
      return `Phase ${phase}: ${fields.from_stage || '?'} -> ${fields.to_stage || '?'}`;
    case 'input_needed':
      return `Phase ${phase}: input needed (${fields.input_type || '?'})`;
    case 'plan_created':
      return `Phase ${phase}: plan ${plan} created`;
    default:
      return `Phase ${phase}: ${type}`;
  }
}

function cmdMessageFormat(type, fields, raw, includeSummary) {
  if (!type) {
    error('Event type required. Available: ' + Object.keys(MESSAGE_REQUIRED_FIELDS).join(', '));
  }
  if (!MESSAGE_REQUIRED_FIELDS[type]) {
    error(`Unknown event type: ${type}. Available: ${Object.keys(MESSAGE_REQUIRED_FIELDS).join(', ')}`);
  }

  const required = MESSAGE_REQUIRED_FIELDS[type];
  const missing = required.filter(f => fields[f] === undefined || fields[f] === null);
  if (missing.length > 0) {
    error(`Missing required fields for ${type}: ${missing.join(', ')}`);
  }

  // Validate input_type for input_needed messages
  if (type === 'input_needed' && fields.input_type && !INPUT_TYPES.includes(fields.input_type)) {
    process.stderr.write(`Warning: Unrecognized input_type: ${fields.input_type}. Known types: ${INPUT_TYPES.join(', ')}\n`);
  }

  const msg = {
    v: MESSAGE_SCHEMA_VERSION,
    type,
    ts: new Date().toISOString(),
    ...fields,
  };

  // Handle optional activity field (max 40 chars)
  if (fields.activity !== undefined) {
    msg.activity = String(fields.activity).slice(0, 40);
  }

  if (includeSummary) {
    msg.summary = cmdMessageSummary(type, fields);
  }

  const json = JSON.stringify(msg);
  if (json.length > 1024) {
    process.stderr.write(`Warning: Message exceeds 1KB (${json.length} bytes)\n`);
  }

  if (raw) {
    process.stdout.write(json);
    process.exit(0);
  } else {
    output({ message: json, size: json.length, type }, false);
  }
}

function cmdMessageParse(jsonString, raw) {
  if (!jsonString) {
    error('JSON string required for message parse');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    const result = { valid: false, error: 'Invalid JSON: ' + e.message };
    output(result, raw, JSON.stringify(result));
    return;
  }

  const warnings = [];

  // Check schema version
  if (parsed.v === undefined || parsed.v === null) {
    warnings.push('Missing schema version');
  } else if (typeof parsed.v !== 'number') {
    warnings.push('Schema version is not a number');
  } else if (parsed.v > MESSAGE_SCHEMA_VERSION) {
    warnings.push(`Unknown schema version ${parsed.v}, attempting parse`);
  }

  // Check type
  if (!parsed.type) {
    const result = { valid: false, error: 'Missing type field', warnings };
    output(result, raw, JSON.stringify(result));
    return;
  }

  if (!MESSAGE_REQUIRED_FIELDS[parsed.type]) {
    const result = { valid: false, error: `Unknown event type: ${parsed.type}`, warnings };
    output(result, raw, JSON.stringify(result));
    return;
  }

  // Validate required fields
  const required = MESSAGE_REQUIRED_FIELDS[parsed.type];
  const missing = required.filter(f => parsed[f] === undefined || parsed[f] === null);
  if (missing.length > 0) {
    const result = { valid: false, error: `Missing required fields for ${parsed.type}: ${missing.join(', ')}`, warnings };
    output(result, raw, JSON.stringify(result));
    return;
  }

  const result = { valid: true, ...parsed };
  if (warnings.length > 0) {
    result.warnings = warnings;
  }
  output(result, raw, JSON.stringify(result));
}

// ─── Chat Log Commands ──────────────────────────────────────────────────────

function chatLogResolvePath(cwd, from, to) {
  const sorted = [from, to].sort();
  const filename = `${sorted[0]}-to-${sorted[1]}.ndjson`;
  return path.join(cwd, '.planning', 'chat-logs', filename);
}

function cmdChatLogAppend(cwd, from, to, message, raw) {
  if (!from) { error('--from required for chat-log append'); }
  if (!to) { error('--to required for chat-log append'); }
  if (!message) { error('--msg required for chat-log append'); }

  const dir = path.join(cwd, '.planning', 'chat-logs');
  fs.mkdirSync(dir, { recursive: true });

  const filePath = chatLogResolvePath(cwd, from, to);
  const entry = {
    from,
    to,
    ts: new Date().toISOString(),
    msg: message.slice(0, 500),
  };

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(filePath, line);

  output({ appended: true, path: filePath, entry_size: line.length }, raw, JSON.stringify({ appended: true, path: filePath, entry_size: line.length }));
}

function cmdChatLogRead(cwd, from, to, raw) {
  if (!from) { error('--from required for chat-log read'); }
  if (!to) { error('--to required for chat-log read'); }

  const filePath = chatLogResolvePath(cwd, from, to);
  if (!fs.existsSync(filePath)) {
    output([], raw, '[]');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const entries = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  output(entries, raw, JSON.stringify(entries));
}

function cmdChatLogPrune(cwd, from, to, keep, raw) {
  if (!from) { error('--from required for chat-log prune'); }
  if (!to) { error('--to required for chat-log prune'); }

  const filePath = chatLogResolvePath(cwd, from, to);
  if (!fs.existsSync(filePath)) {
    output({ pruned: false, reason: 'File not found' }, raw, JSON.stringify({ pruned: false, reason: 'File not found' }));
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const before = lines.length;
  const kept = lines.slice(-keep);
  fs.writeFileSync(filePath, kept.join('\n') + '\n', 'utf-8');

  const result = { pruned: true, before, after: kept.length };
  output(result, raw, JSON.stringify(result));
}

function cmdResolveModel(cwd, agentType, raw) {
  if (!agentType) {
    error('agent-type required');
  }

  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';

  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) {
    const result = { model: 'sonnet', profile, unknown_agent: true };
    output(result, raw, 'sonnet');
    return;
  }

  const resolved = agentModels[profile] || agentModels['balanced'] || 'sonnet';
  const model = resolved === 'opus' ? 'inherit' : resolved;
  const result = { model, profile };
  output(result, raw, model);
}

function cmdFindPhase(cwd, phase, raw) {
  if (!phase) {
    error('phase identifier required');
  }

  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);

  const notFound = { found: false, directory: null, phase_number: null, phase_name: null, plans: [], summaries: [] };

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

    const match = dirs.find(d => d.startsWith(normalized));
    if (!match) {
      output(notFound, raw, '');
      return;
    }

    const dirMatch = match.match(/^(\d+(?:\.\d+)?)-?(.*)/);
    const phaseNumber = dirMatch ? dirMatch[1] : normalized;
    const phaseName = dirMatch && dirMatch[2] ? dirMatch[2] : null;

    const phaseDir = path.join(phasesDir, match);
    const phaseFiles = fs.readdirSync(phaseDir);
    const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
    const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').sort();

    const result = {
      found: true,
      directory: path.join('.planning', 'phases', match),
      phase_number: phaseNumber,
      phase_name: phaseName,
      plans,
      summaries,
    };

    output(result, raw, result.directory);
  } catch {
    output(notFound, raw, '');
  }
}

function cmdCommit(cwd, message, files, raw, amend) {
  if (!message && !amend) {
    error('commit message required');
  }

  const config = loadConfig(cwd);

  // Check commit_docs config
  if (!config.commit_docs) {
    const result = { committed: false, hash: null, reason: 'skipped_commit_docs_false' };
    output(result, raw, 'skipped');
    return;
  }

  // Check if .planning is gitignored
  if (isGitIgnored(cwd, '.planning')) {
    const result = { committed: false, hash: null, reason: 'skipped_gitignored' };
    output(result, raw, 'skipped');
    return;
  }

  // Stage files
  const filesToStage = files && files.length > 0 ? files : ['.planning/'];
  for (const file of filesToStage) {
    execGit(cwd, ['add', file]);
  }

  // Commit
  const commitArgs = amend ? ['commit', '--amend', '--no-edit'] : ['commit', '-m', message];
  const commitResult = execGit(cwd, commitArgs);
  if (commitResult.exitCode !== 0) {
    if (commitResult.stdout.includes('nothing to commit') || commitResult.stderr.includes('nothing to commit')) {
      const result = { committed: false, hash: null, reason: 'nothing_to_commit' };
      output(result, raw, 'nothing');
      return;
    }
    const result = { committed: false, hash: null, reason: 'nothing_to_commit', error: commitResult.stderr };
    output(result, raw, 'nothing');
    return;
  }

  // Get short hash
  const hashResult = execGit(cwd, ['rev-parse', '--short', 'HEAD']);
  const hash = hashResult.exitCode === 0 ? hashResult.stdout : null;
  const result = { committed: true, hash, reason: 'committed' };
  output(result, raw, hash || 'committed');
}

function cmdVerifySummary(cwd, summaryPath, checkFileCount, raw) {
  if (!summaryPath) {
    error('summary-path required');
  }

  const fullPath = path.join(cwd, summaryPath);
  const checkCount = checkFileCount || 2;

  // Check 1: Summary exists
  if (!fs.existsSync(fullPath)) {
    const result = {
      passed: false,
      checks: {
        summary_exists: false,
        files_created: { checked: 0, found: 0, missing: [] },
        commits_exist: false,
        self_check: 'not_found',
      },
      errors: ['SUMMARY.md not found'],
    };
    output(result, raw, 'failed');
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const errors = [];

  // Check 2: Spot-check files mentioned in summary
  const mentionedFiles = new Set();
  const patterns = [
    /`([^`]+\.[a-zA-Z]+)`/g,
    /(?:Created|Modified|Added|Updated|Edited):\s*`?([^\s`]+\.[a-zA-Z]+)`?/gi,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      const filePath = m[1];
      if (filePath && !filePath.startsWith('http') && filePath.includes('/')) {
        mentionedFiles.add(filePath);
      }
    }
  }

  const filesToCheck = Array.from(mentionedFiles).slice(0, checkCount);
  const missing = [];
  for (const file of filesToCheck) {
    if (!fs.existsSync(path.join(cwd, file))) {
      missing.push(file);
    }
  }

  // Check 3: Commits exist
  const commitHashPattern = /\b[0-9a-f]{7,40}\b/g;
  const hashes = content.match(commitHashPattern) || [];
  let commitsExist = false;
  if (hashes.length > 0) {
    for (const hash of hashes.slice(0, 3)) {
      const result = execGit(cwd, ['cat-file', '-t', hash]);
      if (result.exitCode === 0 && result.stdout === 'commit') {
        commitsExist = true;
        break;
      }
    }
  }

  // Check 4: Self-check section
  let selfCheck = 'not_found';
  const selfCheckPattern = /##\s*(?:Self[- ]?Check|Verification|Quality Check)/i;
  if (selfCheckPattern.test(content)) {
    const passPattern = /(?:all\s+)?(?:pass|✓|✅|complete|succeeded)/i;
    const failPattern = /(?:fail|✗|❌|incomplete|blocked)/i;
    const checkSection = content.slice(content.search(selfCheckPattern));
    if (failPattern.test(checkSection)) {
      selfCheck = 'failed';
    } else if (passPattern.test(checkSection)) {
      selfCheck = 'passed';
    }
  }

  if (missing.length > 0) errors.push('Missing files: ' + missing.join(', '));
  if (!commitsExist && hashes.length > 0) errors.push('Referenced commit hashes not found in git history');
  if (selfCheck === 'failed') errors.push('Self-check section indicates failure');

  const checks = {
    summary_exists: true,
    files_created: { checked: filesToCheck.length, found: filesToCheck.length - missing.length, missing },
    commits_exist: commitsExist,
    self_check: selfCheck,
  };

  const passed = missing.length === 0 && selfCheck !== 'failed';
  const result = { passed, checks, errors };
  output(result, raw, passed ? 'passed' : 'failed');
}

function cmdTemplateSelect(cwd, planPath, raw) {
  if (!planPath) {
    error('plan-path required');
  }

  try {
    const fullPath = path.join(cwd, planPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Simple heuristics
    const taskMatch = content.match(/###\s*Task\s*\d+/g) || [];
    const taskCount = taskMatch.length;
    
    const decisionMatch = content.match(/decision/gi) || [];
    const hasDecisions = decisionMatch.length > 0;
    
    // Count file mentions
    const fileMentions = new Set();
    const filePattern = /`([^`]+\.[a-zA-Z]+)`/g;
    let m;
    while ((m = filePattern.exec(content)) !== null) {
      if (m[1].includes('/') && !m[1].startsWith('http')) {
        fileMentions.add(m[1]);
      }
    }
    const fileCount = fileMentions.size;

    let template = 'templates/summary-standard.md';
    let type = 'standard';

    if (taskCount <= 2 && fileCount <= 3 && !hasDecisions) {
      template = 'templates/summary-minimal.md';
      type = 'minimal';
    } else if (hasDecisions || fileCount > 6 || taskCount > 5) {
      template = 'templates/summary-complex.md';
      type = 'complex';
    }

    const result = { template, type, taskCount, fileCount, hasDecisions };
    output(result, raw, template);
  } catch (e) {
    // Fallback to standard
    output({ template: 'templates/summary-standard.md', type: 'standard', error: e.message }, raw, 'templates/summary-standard.md');
  }
}

function cmdTemplateFill(cwd, templateType, options, raw) {
  if (!templateType) { error('template type required: summary, plan, verification, or checkpoint'); }
  if (!options.phase) { error('--phase required'); }

  const phaseInfo = findPhaseInternal(cwd, options.phase);
  if (!phaseInfo || !phaseInfo.found) { output({ error: 'Phase not found', phase: options.phase }, raw); return; }

  const padded = normalizePhaseName(options.phase);
  const today = new Date().toISOString().split('T')[0];
  const phaseName = options.name || phaseInfo.phase_name || 'Unnamed';
  const phaseSlug = phaseInfo.phase_slug || generateSlugInternal(phaseName);
  const phaseId = `${padded}-${phaseSlug}`;
  const planNum = (options.plan || '01').padStart(2, '0');
  const fields = options.fields || {};

  let frontmatter, body, fileName;

  switch (templateType) {
    case 'summary': {
      frontmatter = {
        phase: phaseId,
        plan: planNum,
        subsystem: '[primary category]',
        tags: [],
        provides: [],
        affects: [],
        'tech-stack': { added: [], patterns: [] },
        'key-files': { created: [], modified: [] },
        'key-decisions': [],
        'patterns-established': [],
        duration: '[X]min',
        completed: today,
        ...fields,
      };
      body = [
        `# Phase ${options.phase}: ${phaseName} Summary`,
        '',
        '**[Substantive one-liner describing outcome]**',
        '',
        '## Performance',
        '- **Duration:** [time]',
        '- **Tasks:** [count completed]',
        '- **Files modified:** [count]',
        '',
        '## Accomplishments',
        '- [Key outcome 1]',
        '- [Key outcome 2]',
        '',
        '## Task Commits',
        '1. **Task 1: [task name]** - `hash`',
        '',
        '## Files Created/Modified',
        '- `path/to/file.ts` - What it does',
        '',
        '## Decisions & Deviations',
        '[Key decisions or "None - followed plan as specified"]',
        '',
        '## Next Phase Readiness',
        '[What\'s ready for next phase]',
      ].join('\n');
      fileName = `${padded}-${planNum}-SUMMARY.md`;
      break;
    }
    case 'plan': {
      const planType = options.type || 'execute';
      const wave = parseInt(options.wave) || 1;
      frontmatter = {
        phase: phaseId,
        plan: planNum,
        type: planType,
        wave,
        depends_on: [],
        files_modified: [],
        autonomous: true,
        user_setup: [],
        must_haves: { truths: [], artifacts: [], key_links: [] },
        ...fields,
      };
      body = [
        `# Phase ${options.phase} Plan ${planNum}: [Title]`,
        '',
        '## Objective',
        '- **What:** [What this plan builds]',
        '- **Why:** [Why it matters for the phase goal]',
        '- **Output:** [Concrete deliverable]',
        '',
        '## Context',
        '@.planning/PROJECT.md',
        '@.planning/ROADMAP.md',
        '@.planning/STATE.md',
        '',
        '## Tasks',
        '',
        '<task type="code">',
        '  <name>[Task name]</name>',
        '  <files>[file paths]</files>',
        '  <action>[What to do]</action>',
        '  <verify>[How to verify]</verify>',
        '  <done>[Definition of done]</done>',
        '</task>',
        '',
        '## Verification',
        '[How to verify this plan achieved its objective]',
        '',
        '## Success Criteria',
        '- [ ] [Criterion 1]',
        '- [ ] [Criterion 2]',
      ].join('\n');
      fileName = `${padded}-${planNum}-PLAN.md`;
      break;
    }
    case 'verification': {
      frontmatter = {
        phase: phaseId,
        verified: new Date().toISOString(),
        status: 'pending',
        score: '0/0 must-haves verified',
        ...fields,
      };
      body = [
        `# Phase ${options.phase}: ${phaseName} — Verification`,
        '',
        '## Observable Truths',
        '| # | Truth | Status | Evidence |',
        '|---|-------|--------|----------|',
        '| 1 | [Truth] | pending | |',
        '',
        '## Required Artifacts',
        '| Artifact | Expected | Status | Details |',
        '|----------|----------|--------|---------|',
        '| [path] | [what] | pending | |',
        '',
        '## Key Link Verification',
        '| From | To | Via | Status | Details |',
        '|------|----|----|--------|---------|',
        '| [source] | [target] | [connection] | pending | |',
        '',
        '## Requirements Coverage',
        '| Requirement | Status | Blocking Issue |',
        '|-------------|--------|----------------|',
        '| [req] | pending | |',
        '',
        '## Result',
        '[Pending verification]',
      ].join('\n');
      fileName = `${padded}-VERIFICATION.md`;
      break;
    }
    case 'checkpoint': {
      // Read checkpoint template from disk
      const homedir = require('os').homedir();
      const repoTemplatePath = path.join(cwd, 'mowism', 'templates', 'checkpoint.md');
      const installTemplatePath = path.join(homedir, '.claude', 'mowism', 'templates', 'checkpoint.md');
      let templatePath = null;
      if (fs.existsSync(repoTemplatePath)) {
        templatePath = repoTemplatePath;
      } else if (fs.existsSync(installTemplatePath)) {
        templatePath = installTemplatePath;
      }
      if (!templatePath) {
        error('checkpoint.md template not found in mowism/templates/ or ~/.claude/mowism/templates/');
      }

      let templateContent = fs.readFileSync(templatePath, 'utf-8');
      const timestamp = new Date().toISOString();
      const workerName = options.worker || 'unknown';
      const worktreePath = options.worktree || '.worktrees/p' + padded;
      const status = options.status || 'failed';
      const reason = options.reason || 'error';

      // Replace placeholders
      templateContent = templateContent.replace(/\{phase\}/g, `${padded}-${phaseSlug}`);
      templateContent = templateContent.replace(/\{plan\}/g, planNum);
      templateContent = templateContent.replace(/\{status\}/g, status);
      templateContent = templateContent.replace(/\{worker-name\}/g, workerName);
      templateContent = templateContent.replace(/\{worktree-path\}/g, worktreePath);
      templateContent = templateContent.replace(/\{timestamp\}/g, timestamp);
      templateContent = templateContent.replace(/\{reason\}/g, reason);
      templateContent = templateContent.replace(/\{circuit_breaker_hit\}/g, 'false');

      // Replace plan-id with the full plan identifier
      templateContent = templateContent.replace(/\{plan-id\}/g, `${padded}-${planNum}`);

      // Output the filled template (don't write to disk -- caller decides)
      output({ filled: true, content: templateContent, template: 'checkpoint' }, raw, templateContent);
      return;
    }
    default:
      error(`Unknown template type: ${templateType}. Available: summary, plan, verification, checkpoint`);
      return;
  }

  const fullContent = `---\n${reconstructFrontmatter(frontmatter)}\n---\n\n${body}\n`;
  const outPath = path.join(cwd, phaseInfo.directory, fileName);

  if (fs.existsSync(outPath)) {
    output({ error: 'File already exists', path: path.relative(cwd, outPath) }, raw);
    return;
  }

  fs.writeFileSync(outPath, fullContent, 'utf-8');
  const relPath = path.relative(cwd, outPath);
  output({ created: true, path: relPath, template: templateType }, raw, relPath);
}

function cmdPhasePlanIndex(cwd, phase, raw) {
  if (!phase) {
    error('phase required for phase-plan-index');
  }

  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);

  // Find phase directory
  let phaseDir = null;
  let phaseDirName = null;
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    const match = dirs.find(d => d.startsWith(normalized));
    if (match) {
      phaseDir = path.join(phasesDir, match);
      phaseDirName = match;
    }
  } catch {
    // phases dir doesn't exist
  }

  if (!phaseDir) {
    output({ phase: normalized, error: 'Phase not found', plans: [], waves: {}, incomplete: [], has_checkpoints: false }, raw);
    return;
  }

  // Get all files in phase directory
  const phaseFiles = fs.readdirSync(phaseDir);
  const planFiles = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
  const summaryFiles = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');

  // Build set of plan IDs with summaries
  const completedPlanIds = new Set(
    summaryFiles.map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', ''))
  );

  const plans = [];
  const waves = {};
  const incomplete = [];
  let hasCheckpoints = false;

  for (const planFile of planFiles) {
    const planId = planFile.replace('-PLAN.md', '').replace('PLAN.md', '');
    const planPath = path.join(phaseDir, planFile);
    const content = fs.readFileSync(planPath, 'utf-8');
    const fm = extractFrontmatter(content);

    // Count tasks (## Task N patterns)
    const taskMatches = content.match(/##\s*Task\s*\d+/gi) || [];
    const taskCount = taskMatches.length;

    // Parse wave as integer
    const wave = parseInt(fm.wave, 10) || 1;

    // Parse autonomous (default true if not specified)
    let autonomous = true;
    if (fm.autonomous !== undefined) {
      autonomous = fm.autonomous === 'true' || fm.autonomous === true;
    }

    if (!autonomous) {
      hasCheckpoints = true;
    }

    // Parse files-modified
    let filesModified = [];
    if (fm['files-modified']) {
      filesModified = Array.isArray(fm['files-modified']) ? fm['files-modified'] : [fm['files-modified']];
    }

    const hasSummary = completedPlanIds.has(planId);
    if (!hasSummary) {
      incomplete.push(planId);
    }

    const plan = {
      id: planId,
      wave,
      autonomous,
      objective: fm.objective || null,
      files_modified: filesModified,
      task_count: taskCount,
      has_summary: hasSummary,
    };

    plans.push(plan);

    // Group by wave
    const waveKey = String(wave);
    if (!waves[waveKey]) {
      waves[waveKey] = [];
    }
    waves[waveKey].push(planId);
  }

  const result = {
    phase: normalized,
    plans,
    waves,
    incomplete,
    has_checkpoints: hasCheckpoints,
  };

  output(result, raw);
}

function cmdStateSnapshot(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');

  if (!fs.existsSync(statePath)) {
    output({ error: 'STATE.md not found' }, raw);
    return;
  }

  const content = fs.readFileSync(statePath, 'utf-8');

  // Helper to extract **Field:** value patterns
  const extractField = (fieldName) => {
    const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
    const match = content.match(pattern);
    return match ? match[1].trim() : null;
  };

  // Extract basic fields
  const currentPhase = extractField('Current Phase');
  const currentPhaseName = extractField('Current Phase Name');
  const totalPhasesRaw = extractField('Total Phases');
  const currentPlan = extractField('Current Plan');
  const totalPlansRaw = extractField('Total Plans in Phase');
  const status = extractField('Status');
  const progressRaw = extractField('Progress');
  const lastActivity = extractField('Last Activity');
  const lastActivityDesc = extractField('Last Activity Description');
  const pausedAt = extractField('Paused At');

  // Parse numeric fields
  const totalPhases = totalPhasesRaw ? parseInt(totalPhasesRaw, 10) : null;
  const totalPlansInPhase = totalPlansRaw ? parseInt(totalPlansRaw, 10) : null;
  const progressPercent = progressRaw ? parseInt(progressRaw.replace('%', ''), 10) : null;

  // Extract decisions table
  const decisions = [];
  const decisionsMatch = content.match(/##\s*Decisions Made[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n([\s\S]*?)(?=\n##|\n$|$)/i);
  if (decisionsMatch) {
    const tableBody = decisionsMatch[1];
    const rows = tableBody.trim().split('\n').filter(r => r.includes('|'));
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        decisions.push({
          phase: cells[0],
          summary: cells[1],
          rationale: cells[2],
        });
      }
    }
  }

  // Extract blockers list
  const blockers = [];
  const blockersMatch = content.match(/##\s*Blockers\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (blockersMatch) {
    const blockersSection = blockersMatch[1];
    const items = blockersSection.match(/^-\s+(.+)$/gm) || [];
    for (const item of items) {
      blockers.push(item.replace(/^-\s+/, '').trim());
    }
  }

  // Extract session info
  const session = {
    last_date: null,
    stopped_at: null,
    resume_file: null,
  };

  const sessionMatch = content.match(/##\s*Session\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (sessionMatch) {
    const sessionSection = sessionMatch[1];
    const lastDateMatch = sessionSection.match(/\*\*Last Date:\*\*\s*(.+)/i);
    const stoppedAtMatch = sessionSection.match(/\*\*Stopped At:\*\*\s*(.+)/i);
    const resumeFileMatch = sessionSection.match(/\*\*Resume File:\*\*\s*(.+)/i);

    if (lastDateMatch) session.last_date = lastDateMatch[1].trim();
    if (stoppedAtMatch) session.stopped_at = stoppedAtMatch[1].trim();
    if (resumeFileMatch) session.resume_file = resumeFileMatch[1].trim();
  }

  const result = {
    current_phase: currentPhase,
    current_phase_name: currentPhaseName,
    total_phases: totalPhases,
    current_plan: currentPlan,
    total_plans_in_phase: totalPlansInPhase,
    status,
    progress_percent: progressPercent,
    last_activity: lastActivity,
    last_activity_desc: lastActivityDesc,
    decisions,
    blockers,
    paused_at: pausedAt,
    session,
  };

  output(result, raw);
}

// ─── STATUS.md Per-Phase Status Commands ──────────────────────────────────────

/**
 * Parse the Plan Progress table from STATUS.md content.
 * Adapted from parseWorktreeTable() pattern.
 */
function parsePlanProgressTable(content) {
  const rows = [];
  const sectionMatch = content.match(
    /## Plan Progress\n[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n([\s\S]*?)(?=\n##|\n$|$)/
  );
  if (!sectionMatch) return rows;

  const tableBody = sectionMatch[1].trim();
  if (!tableBody) return rows;

  for (const line of tableBody.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 6) {
      rows.push({
        plan: cells[0],
        status: cells[1],
        started: cells[2],
        duration: cells[3],
        commit: cells[4],
        tasks: cells[5],
      });
    }
  }
  return rows;
}

/**
 * Write the Plan Progress table section back into STATUS.md content.
 */
function writePlanProgressTable(content, rows) {
  const header = `## Plan Progress

| Plan | Status | Started | Duration | Commit | Tasks |
|------|--------|---------|----------|--------|-------|`;

  const tableRows = rows.map(r =>
    `| ${r.plan} | ${r.status} | ${r.started} | ${r.duration} | ${r.commit} | ${r.tasks} |`
  ).join('\n');

  const newSection = tableRows ? header + '\n' + tableRows + '\n' : header + '\n';

  const sectionPattern = /## Plan Progress\n[\s\S]*?(?=\n## |\n$|$)/;
  if (sectionPattern.test(content)) {
    return content.replace(sectionPattern, newSection);
  }

  return content.trimEnd() + '\n\n' + newSection;
}

/**
 * Write the Aggregate section back into STATUS.md content.
 */
function writeAggregateSection(content, counts, commits) {
  const commitStr = commits.length > 0 ? commits.join(', ') : '--';
  const newSection = `## Aggregate

**Plans:** ${counts.complete} complete, ${counts.in_progress} in progress, ${counts.not_started} not started, ${counts.failed} failed
**Commits:** ${commitStr}
`;

  const sectionPattern = /## Aggregate\n[\s\S]*?(?=\n## |\n$|$)/;
  if (sectionPattern.test(content)) {
    return content.replace(sectionPattern, newSection);
  }

  return content.trimEnd() + '\n\n' + newSection;
}

/**
 * Calculate aggregate counts from Plan Progress rows.
 */
function calculateAggregate(rows) {
  const counts = { complete: 0, in_progress: 0, not_started: 0, failed: 0 };
  const commits = [];
  for (const row of rows) {
    const s = row.status.toLowerCase().trim();
    if (s === 'complete') { counts.complete++; }
    else if (s === 'in progress' || s === 'executing') { counts.in_progress++; }
    else if (s === 'not started') { counts.not_started++; }
    else if (s === 'failed') { counts.failed++; }
    if (row.commit && row.commit !== '--') {
      commits.push(row.commit);
    }
  }
  return { counts, commits };
}

/**
 * Resolve the STATUS.md path for a phase.
 * Convention: phases/{padded}-{slug}/{padded}-STATUS.md
 */
function resolveStatusPath(cwd, phase) {
  const phaseInfo = findPhaseInternal(cwd, phase);
  if (!phaseInfo || !phaseInfo.found) return null;
  const padded = normalizePhaseName(phase);
  const phaseDir = path.join(cwd, phaseInfo.directory);
  const statusFile = `${padded}-STATUS.md`;
  return { phaseDir, statusPath: path.join(phaseDir, statusFile), phaseInfo, padded };
}

/**
 * Resolve the STATUS.md template path.
 * Checks repo-relative mowism/templates/ first, then ~/.claude/mowism/templates/.
 */
function resolveStatusTemplatePath(cwd) {
  const repoPath = path.join(cwd, 'mowism', 'templates', 'status.md');
  if (fs.existsSync(repoPath)) return repoPath;

  const homedir = require('os').homedir();
  const installPath = path.join(homedir, '.claude', 'mowism', 'templates', 'status.md');
  if (fs.existsSync(installPath)) return installPath;

  return null;
}

/**
 * status init <phase> -- Create STATUS.md from template in the phase directory.
 */
function cmdStatusInit(cwd, phase, raw) {
  if (!phase) { error('phase required for status init'); }

  const resolved = resolveStatusPath(cwd, phase);
  if (!resolved) { error(`Phase ${phase} not found`); }

  const { phaseDir, statusPath, phaseInfo, padded } = resolved;

  // Read template
  const templatePath = resolveStatusTemplatePath(cwd);
  if (!templatePath) { error('STATUS.md template not found in mowism/templates/ or ~/.claude/mowism/templates/'); }
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Fill placeholders
  const phaseName = phaseInfo.phase_name
    ? phaseInfo.phase_name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Unnamed';
  template = template.replace(/\{phase_number\}/g, padded);
  template = template.replace(/\{phase_name\}/g, phaseName);

  // Scan for PLAN.md files and pre-populate Plan Progress table
  const planFiles = phaseInfo.plans || [];
  const rows = [];
  for (const planFile of planFiles) {
    const planId = planFile.replace('-PLAN.md', '').replace('PLAN.md', '');
    const planPath = path.join(phaseDir, planFile);
    let taskCount = 0;
    try {
      const planContent = fs.readFileSync(planPath, 'utf-8');
      const taskMatches = planContent.match(/<task[\s>]/g);
      taskCount = taskMatches ? taskMatches.length : 0;
    } catch { /* skip unreadable plans */ }
    rows.push({
      plan: planId,
      status: 'not started',
      started: '--',
      duration: '--',
      commit: '--',
      tasks: `0/${taskCount}`,
    });
  }

  // Write rows into template
  if (rows.length > 0) {
    template = writePlanProgressTable(template, rows);
    // Update aggregate to reflect plan count
    const { counts, commits } = calculateAggregate(rows);
    template = writeAggregateSection(template, counts, commits);
  }

  fs.writeFileSync(statusPath, template, 'utf-8');

  const relPath = path.relative(cwd, statusPath);
  output({ created: true, path: relPath, plans: planFiles.length }, raw, relPath);
}

/**
 * status read <phase> -- Parse STATUS.md and return JSON.
 */
function cmdStatusRead(cwd, phase, raw) {
  if (!phase) { error('phase required for status read'); }

  const resolved = resolveStatusPath(cwd, phase);
  if (!resolved) { error(`Phase ${phase} not found`); }

  const { statusPath } = resolved;

  if (!fs.existsSync(statusPath)) {
    error(`STATUS.md not found at ${statusPath}`);
  }

  const content = fs.readFileSync(statusPath, 'utf-8');

  // Extract metadata fields
  const phaseNum = stateExtractField(content, 'Phase');
  const status = stateExtractField(content, 'Status');
  const worker = stateExtractField(content, 'Worker');
  const worktree = stateExtractField(content, 'Worktree');
  const started = stateExtractField(content, 'Started');
  const lastUpdate = stateExtractField(content, 'Last update');
  const blockerMode = stateExtractField(content, 'Blocker mode');

  // Parse Plan Progress table
  const plans = parsePlanProgressTable(content);

  // Calculate aggregate
  const { counts, commits } = calculateAggregate(plans);

  // Extract blockers section
  const blockers = [];
  const blockersMatch = content.match(/## Blockers\n([\s\S]*?)(?=\n## |$)/);
  if (blockersMatch) {
    const blockersSection = blockersMatch[1].trim();
    if (blockersSection && blockersSection !== 'None.') {
      const items = blockersSection.match(/^-\s+(.+)$/gm) || [];
      for (const item of items) {
        blockers.push(item.replace(/^-\s+/, '').trim());
      }
    }
  }

  // Extract decisions section
  const decisions = [];
  const decisionsMatch = content.match(/## Decisions\n([\s\S]*?)(?=\n## |$)/);
  if (decisionsMatch) {
    const decisionsSection = decisionsMatch[1].trim();
    if (decisionsSection && decisionsSection !== 'None.') {
      const items = decisionsSection.match(/^-\s+(.+)$/gm) || [];
      for (const item of items) {
        decisions.push(item.replace(/^-\s+/, '').trim());
      }
    }
  }

  output({
    phase: phaseNum,
    status,
    worker,
    worktree,
    started,
    last_update: lastUpdate,
    blocker_mode: blockerMode,
    plans,
    aggregate: counts,
    commits,
    blockers,
    decisions,
  }, raw);
}

/**
 * status write <phase> --plan <id> --status <state> [--commit <sha>] [--duration <min>] [--tasks <progress>]
 * Update one plan row in STATUS.md.
 */
function cmdStatusWrite(cwd, phase, options, raw) {
  if (!phase) { error('phase required for status write'); }
  if (!options.plan) { error('--plan required for status write'); }

  const resolved = resolveStatusPath(cwd, phase);
  if (!resolved) { error(`Phase ${phase} not found`); }

  const { statusPath } = resolved;

  if (!fs.existsSync(statusPath)) {
    error(`STATUS.md not found at ${statusPath}. Run 'status init ${phase}' first.`);
  }

  let content = fs.readFileSync(statusPath, 'utf-8');
  const rows = parsePlanProgressTable(content);

  // Find matching row
  const rowIdx = rows.findIndex(r => r.plan === options.plan);
  if (rowIdx === -1) {
    error(`Plan ${options.plan} not found in STATUS.md Plan Progress table. Available: ${rows.map(r => r.plan).join(', ')}`);
  }

  const row = rows[rowIdx];
  const oldStatus = row.status;

  // Update fields (only specified ones)
  if (options.status) {
    row.status = options.status;

    // Auto-set Started timestamp on transition to in progress
    if (oldStatus === 'not started' && (options.status === 'in progress' || options.status === 'executing')) {
      if (row.started === '--') {
        const now = new Date();
        row.started = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }
    }
  }
  if (options.commit) { row.commit = options.commit; }
  if (options.duration) { row.duration = options.duration; }
  if (options.tasks) { row.tasks = options.tasks; }

  rows[rowIdx] = row;

  // Rewrite Plan Progress table
  content = writePlanProgressTable(content, rows);

  // Update Last update timestamp
  const now = new Date().toISOString();
  content = stateReplaceField(content, 'Last update', now) || content;

  // Update phase Status based on plan rows
  const hasInProgress = rows.some(r => r.status === 'in progress' || r.status === 'executing');
  const allComplete = rows.every(r => r.status === 'complete');
  const hasFailed = rows.some(r => r.status === 'failed');

  if (allComplete) {
    content = stateReplaceField(content, 'Status', 'complete') || content;
  } else if (hasFailed) {
    content = stateReplaceField(content, 'Status', 'failed') || content;
  } else if (hasInProgress) {
    content = stateReplaceField(content, 'Status', 'executing') || content;
  }

  // Recalculate aggregate
  const { counts, commits } = calculateAggregate(rows);
  content = writeAggregateSection(content, counts, commits);

  fs.writeFileSync(statusPath, content, 'utf-8');

  output({ updated: true, plan: options.plan, new_status: row.status }, raw);
}

/**
 * status aggregate <phase> -- Recalculate the Aggregate section from Plan Progress data.
 */
function cmdStatusAggregate(cwd, phase, raw) {
  if (!phase) { error('phase required for status aggregate'); }

  const resolved = resolveStatusPath(cwd, phase);
  if (!resolved) { error(`Phase ${phase} not found`); }

  const { statusPath } = resolved;

  if (!fs.existsSync(statusPath)) {
    error(`STATUS.md not found at ${statusPath}`);
  }

  let content = fs.readFileSync(statusPath, 'utf-8');
  const rows = parsePlanProgressTable(content);
  const { counts, commits } = calculateAggregate(rows);

  content = writeAggregateSection(content, counts, commits);
  fs.writeFileSync(statusPath, content, 'utf-8');

  output({ ...counts, commits }, raw);
}

function cmdSummaryExtract(cwd, summaryPath, fields, raw) {
  if (!summaryPath) {
    error('summary-path required for summary-extract');
  }

  const fullPath = path.join(cwd, summaryPath);

  if (!fs.existsSync(fullPath)) {
    output({ error: 'File not found', path: summaryPath }, raw);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);

  // Parse key-decisions into structured format
  const parseDecisions = (decisionsList) => {
    if (!decisionsList || !Array.isArray(decisionsList)) return [];
    return decisionsList.map(d => {
      const colonIdx = d.indexOf(':');
      if (colonIdx > 0) {
        return {
          summary: d.substring(0, colonIdx).trim(),
          rationale: d.substring(colonIdx + 1).trim(),
        };
      }
      return { summary: d, rationale: null };
    });
  };

  // Build full result
  const fullResult = {
    path: summaryPath,
    one_liner: fm['one-liner'] || null,
    key_files: fm['key-files'] || [],
    tech_added: (fm['tech-stack'] && fm['tech-stack'].added) || [],
    patterns: fm['patterns-established'] || [],
    decisions: parseDecisions(fm['key-decisions']),
    requirements_completed: fm['requirements-completed'] || [],
  };

  // If fields specified, filter to only those fields
  if (fields && fields.length > 0) {
    const filtered = { path: summaryPath };
    for (const field of fields) {
      if (fullResult[field] !== undefined) {
        filtered[field] = fullResult[field];
      }
    }
    output(filtered, raw);
    return;
  }

  output(fullResult, raw);
}

// ─── Web Search (Brave API) ──────────────────────────────────────────────────

async function cmdWebsearch(query, options, raw) {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    // No key = silent skip, agent falls back to built-in WebSearch
    output({ available: false, reason: 'BRAVE_API_KEY not set' }, raw, '');
    return;
  }

  if (!query) {
    output({ available: false, error: 'Query required' }, raw, '');
    return;
  }

  const params = new URLSearchParams({
    q: query,
    count: String(options.limit || 10),
    country: 'us',
    search_lang: 'en',
    text_decorations: 'false'
  });

  if (options.freshness) {
    params.set('freshness', options.freshness);
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      }
    );

    if (!response.ok) {
      output({ available: false, error: `API error: ${response.status}` }, raw, '');
      return;
    }

    const data = await response.json();

    const results = (data.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description,
      age: r.age || null
    }));

    output({
      available: true,
      query,
      count: results.length,
      results
    }, raw, results.map(r => `${r.title}\n${r.url}\n${r.description}`).join('\n\n'));
  } catch (err) {
    output({ available: false, error: err.message }, raw, '');
  }
}

// ─── Frontmatter CRUD ────────────────────────────────────────────────────────

function cmdFrontmatterGet(cwd, filePath, field, raw) {
  if (!filePath) { error('file path required'); }
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: filePath }, raw); return; }
  const fm = extractFrontmatter(content);
  if (field) {
    const value = fm[field];
    if (value === undefined) { output({ error: 'Field not found', field }, raw); return; }
    output({ [field]: value }, raw, JSON.stringify(value));
  } else {
    output(fm, raw);
  }
}

function cmdFrontmatterSet(cwd, filePath, field, value, raw) {
  if (!filePath || !field || value === undefined) { error('file, field, and value required'); }
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  if (!fs.existsSync(fullPath)) { output({ error: 'File not found', path: filePath }, raw); return; }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);
  let parsedValue;
  try { parsedValue = JSON.parse(value); } catch { parsedValue = value; }
  fm[field] = parsedValue;
  const newContent = spliceFrontmatter(content, fm);
  fs.writeFileSync(fullPath, newContent, 'utf-8');
  output({ updated: true, field, value: parsedValue }, raw, 'true');
}

function cmdFrontmatterMerge(cwd, filePath, data, raw) {
  if (!filePath || !data) { error('file and data required'); }
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  if (!fs.existsSync(fullPath)) { output({ error: 'File not found', path: filePath }, raw); return; }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);
  let mergeData;
  try { mergeData = JSON.parse(data); } catch { error('Invalid JSON for --data'); return; }
  Object.assign(fm, mergeData);
  const newContent = spliceFrontmatter(content, fm);
  fs.writeFileSync(fullPath, newContent, 'utf-8');
  output({ merged: true, fields: Object.keys(mergeData) }, raw, 'true');
}

const FRONTMATTER_SCHEMAS = {
  plan: { required: ['phase', 'plan', 'type', 'wave', 'depends_on', 'files_modified', 'autonomous', 'must_haves'] },
  summary: { required: ['phase', 'plan', 'subsystem', 'tags', 'duration', 'completed'] },
  verification: { required: ['phase', 'verified', 'status', 'score'] },
};

function cmdFrontmatterValidate(cwd, filePath, schemaName, raw) {
  if (!filePath || !schemaName) { error('file and schema required'); }
  const schema = FRONTMATTER_SCHEMAS[schemaName];
  if (!schema) { error(`Unknown schema: ${schemaName}. Available: ${Object.keys(FRONTMATTER_SCHEMAS).join(', ')}`); }
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: filePath }, raw); return; }
  const fm = extractFrontmatter(content);
  const missing = schema.required.filter(f => fm[f] === undefined);
  const present = schema.required.filter(f => fm[f] !== undefined);
  output({ valid: missing.length === 0, missing, present, schema: schemaName }, raw, missing.length === 0 ? 'valid' : 'invalid');
}

// ─── Verification Suite ──────────────────────────────────────────────────────

function cmdVerifyPlanStructure(cwd, filePath, raw) {
  if (!filePath) { error('file path required'); }
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: filePath }, raw); return; }

  const fm = extractFrontmatter(content);
  const errors = [];
  const warnings = [];

  // Check required frontmatter fields
  const required = ['phase', 'plan', 'type', 'wave', 'depends_on', 'files_modified', 'autonomous', 'must_haves'];
  for (const field of required) {
    if (fm[field] === undefined) errors.push(`Missing required frontmatter field: ${field}`);
  }

  // Parse and check task elements
  const taskPattern = /<task[^>]*>([\s\S]*?)<\/task>/g;
  const tasks = [];
  let taskMatch;
  while ((taskMatch = taskPattern.exec(content)) !== null) {
    const taskContent = taskMatch[1];
    const nameMatch = taskContent.match(/<name>([\s\S]*?)<\/name>/);
    const taskName = nameMatch ? nameMatch[1].trim() : 'unnamed';
    const hasFiles = /<files>/.test(taskContent);
    const hasAction = /<action>/.test(taskContent);
    const hasVerify = /<verify>/.test(taskContent);
    const hasDone = /<done>/.test(taskContent);

    if (!nameMatch) errors.push('Task missing <name> element');
    if (!hasAction) errors.push(`Task '${taskName}' missing <action>`);
    if (!hasVerify) warnings.push(`Task '${taskName}' missing <verify>`);
    if (!hasDone) warnings.push(`Task '${taskName}' missing <done>`);
    if (!hasFiles) warnings.push(`Task '${taskName}' missing <files>`);

    tasks.push({ name: taskName, hasFiles, hasAction, hasVerify, hasDone });
  }

  if (tasks.length === 0) warnings.push('No <task> elements found');

  // Wave/depends_on consistency
  if (fm.wave && parseInt(fm.wave) > 1 && (!fm.depends_on || (Array.isArray(fm.depends_on) && fm.depends_on.length === 0))) {
    warnings.push('Wave > 1 but depends_on is empty');
  }

  // Autonomous/checkpoint consistency
  const hasCheckpoints = /<task\s+type=["']?checkpoint/.test(content);
  if (hasCheckpoints && fm.autonomous !== 'false' && fm.autonomous !== false) {
    errors.push('Has checkpoint tasks but autonomous is not false');
  }

  output({
    valid: errors.length === 0,
    errors,
    warnings,
    task_count: tasks.length,
    tasks,
    frontmatter_fields: Object.keys(fm),
  }, raw, errors.length === 0 ? 'valid' : 'invalid');
}

function cmdVerifyPhaseCompleteness(cwd, phase, raw) {
  if (!phase) { error('phase required'); }
  const phaseInfo = findPhaseInternal(cwd, phase);
  if (!phaseInfo || !phaseInfo.found) {
    output({ error: 'Phase not found', phase }, raw);
    return;
  }

  const errors = [];
  const warnings = [];
  const phaseDir = path.join(cwd, phaseInfo.directory);

  // List plans and summaries
  let files;
  try { files = fs.readdirSync(phaseDir); } catch { output({ error: 'Cannot read phase directory' }, raw); return; }

  const plans = files.filter(f => f.match(/-PLAN\.md$/i));
  const summaries = files.filter(f => f.match(/-SUMMARY\.md$/i));

  // Extract plan IDs (everything before -PLAN.md)
  const planIds = new Set(plans.map(p => p.replace(/-PLAN\.md$/i, '')));
  const summaryIds = new Set(summaries.map(s => s.replace(/-SUMMARY\.md$/i, '')));

  // Plans without summaries
  const incompletePlans = [...planIds].filter(id => !summaryIds.has(id));
  if (incompletePlans.length > 0) {
    errors.push(`Plans without summaries: ${incompletePlans.join(', ')}`);
  }

  // Summaries without plans (orphans)
  const orphanSummaries = [...summaryIds].filter(id => !planIds.has(id));
  if (orphanSummaries.length > 0) {
    warnings.push(`Summaries without plans: ${orphanSummaries.join(', ')}`);
  }

  output({
    complete: errors.length === 0,
    phase: phaseInfo.phase_number,
    plan_count: plans.length,
    summary_count: summaries.length,
    incomplete_plans: incompletePlans,
    orphan_summaries: orphanSummaries,
    errors,
    warnings,
  }, raw, errors.length === 0 ? 'complete' : 'incomplete');
}

function cmdVerifyReferences(cwd, filePath, raw) {
  if (!filePath) { error('file path required'); }
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: filePath }, raw); return; }

  const found = [];
  const missing = [];

  // Find @-references: @path/to/file (must contain / to be a file path)
  const atRefs = content.match(/@([^\s\n,)]+\/[^\s\n,)]+)/g) || [];
  for (const ref of atRefs) {
    const cleanRef = ref.slice(1); // remove @
    const resolved = cleanRef.startsWith('~/')
      ? path.join(process.env.HOME || '', cleanRef.slice(2))
      : path.join(cwd, cleanRef);
    if (fs.existsSync(resolved)) {
      found.push(cleanRef);
    } else {
      missing.push(cleanRef);
    }
  }

  // Find backtick file paths that look like real paths (contain / and have extension)
  const backtickRefs = content.match(/`([^`]+\/[^`]+\.[a-zA-Z]{1,10})`/g) || [];
  for (const ref of backtickRefs) {
    const cleanRef = ref.slice(1, -1); // remove backticks
    if (cleanRef.startsWith('http') || cleanRef.includes('${') || cleanRef.includes('{{')) continue;
    if (found.includes(cleanRef) || missing.includes(cleanRef)) continue; // dedup
    const resolved = path.join(cwd, cleanRef);
    if (fs.existsSync(resolved)) {
      found.push(cleanRef);
    } else {
      missing.push(cleanRef);
    }
  }

  output({
    valid: missing.length === 0,
    found: found.length,
    missing,
    total: found.length + missing.length,
  }, raw, missing.length === 0 ? 'valid' : 'invalid');
}

function cmdVerifyCommits(cwd, hashes, raw) {
  if (!hashes || hashes.length === 0) { error('At least one commit hash required'); }

  const valid = [];
  const invalid = [];
  for (const hash of hashes) {
    const result = execGit(cwd, ['cat-file', '-t', hash]);
    if (result.exitCode === 0 && result.stdout.trim() === 'commit') {
      valid.push(hash);
    } else {
      invalid.push(hash);
    }
  }

  output({
    all_valid: invalid.length === 0,
    valid,
    invalid,
    total: hashes.length,
  }, raw, invalid.length === 0 ? 'valid' : 'invalid');
}

function cmdVerifyArtifacts(cwd, planFilePath, raw) {
  if (!planFilePath) { error('plan file path required'); }
  const fullPath = path.isAbsolute(planFilePath) ? planFilePath : path.join(cwd, planFilePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: planFilePath }, raw); return; }

  const artifacts = parseMustHavesBlock(content, 'artifacts');
  if (artifacts.length === 0) {
    output({ error: 'No must_haves.artifacts found in frontmatter', path: planFilePath }, raw);
    return;
  }

  const results = [];
  for (const artifact of artifacts) {
    if (typeof artifact === 'string') continue; // skip simple string items
    const artPath = artifact.path;
    if (!artPath) continue;

    const artFullPath = path.join(cwd, artPath);
    const exists = fs.existsSync(artFullPath);
    const check = { path: artPath, exists, issues: [], passed: false };

    if (exists) {
      const fileContent = safeReadFile(artFullPath) || '';
      const lineCount = fileContent.split('\n').length;

      if (artifact.min_lines && lineCount < artifact.min_lines) {
        check.issues.push(`Only ${lineCount} lines, need ${artifact.min_lines}`);
      }
      if (artifact.contains && !fileContent.includes(artifact.contains)) {
        check.issues.push(`Missing pattern: ${artifact.contains}`);
      }
      if (artifact.exports) {
        const exports = Array.isArray(artifact.exports) ? artifact.exports : [artifact.exports];
        for (const exp of exports) {
          if (!fileContent.includes(exp)) check.issues.push(`Missing export: ${exp}`);
        }
      }
      check.passed = check.issues.length === 0;
    } else {
      check.issues.push('File not found');
    }

    results.push(check);
  }

  const passed = results.filter(r => r.passed).length;
  output({
    all_passed: passed === results.length,
    passed,
    total: results.length,
    artifacts: results,
  }, raw, passed === results.length ? 'valid' : 'invalid');
}

function cmdVerifyKeyLinks(cwd, planFilePath, raw) {
  if (!planFilePath) { error('plan file path required'); }
  const fullPath = path.isAbsolute(planFilePath) ? planFilePath : path.join(cwd, planFilePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: planFilePath }, raw); return; }

  const keyLinks = parseMustHavesBlock(content, 'key_links');
  if (keyLinks.length === 0) {
    output({ error: 'No must_haves.key_links found in frontmatter', path: planFilePath }, raw);
    return;
  }

  const results = [];
  for (const link of keyLinks) {
    if (typeof link === 'string') continue;
    const check = { from: link.from, to: link.to, via: link.via || '', verified: false, detail: '' };

    const sourceContent = safeReadFile(path.join(cwd, link.from || ''));
    if (!sourceContent) {
      check.detail = 'Source file not found';
    } else if (link.pattern) {
      try {
        const regex = new RegExp(link.pattern);
        if (regex.test(sourceContent)) {
          check.verified = true;
          check.detail = 'Pattern found in source';
        } else {
          const targetContent = safeReadFile(path.join(cwd, link.to || ''));
          if (targetContent && regex.test(targetContent)) {
            check.verified = true;
            check.detail = 'Pattern found in target';
          } else {
            check.detail = `Pattern "${link.pattern}" not found in source or target`;
          }
        }
      } catch {
        check.detail = `Invalid regex pattern: ${link.pattern}`;
      }
    } else {
      // No pattern: just check source references target
      if (sourceContent.includes(link.to || '')) {
        check.verified = true;
        check.detail = 'Target referenced in source';
      } else {
        check.detail = 'Target not referenced in source';
      }
    }

    results.push(check);
  }

  const verified = results.filter(r => r.verified).length;
  output({
    all_verified: verified === results.length,
    verified,
    total: results.length,
    links: results,
  }, raw, verified === results.length ? 'valid' : 'invalid');
}

// ─── Roadmap Analysis ─────────────────────────────────────────────────────────

function parseDependsOn(raw) {
  if (!raw || /nothing|none|n\/a|first phase/i.test(raw)) return [];
  return (raw.match(/Phase\s+(\d+(?:\.\d+)?)/gi) || [])
    .map(m => m.match(/\d+(?:\.\d+)?/)[0]);
}

function topoGenerations(nodes, edges) {
  const inDeg = new Map();
  const adj = new Map();
  for (const n of nodes) { inDeg.set(n, 0); adj.set(n, []); }
  for (const [from, to] of edges) {
    adj.get(from).push(to);
    inDeg.set(to, (inDeg.get(to) || 0) + 1);
  }
  let queue = [...nodes].filter(n => inDeg.get(n) === 0);
  const generations = [];
  let processed = 0;
  while (queue.length > 0) {
    generations.push([...queue]);
    processed += queue.length;
    const next = [];
    for (const n of queue) {
      for (const nb of adj.get(n)) {
        inDeg.set(nb, inDeg.get(nb) - 1);
        if (inDeg.get(nb) === 0) next.push(nb);
      }
    }
    queue = next;
  }
  if (processed !== nodes.length) {
    const cycleNodes = [...inDeg.entries()]
      .filter(([, deg]) => deg > 0)
      .map(([n]) => n);
    throw new Error(`Cycle detected involving: ${cycleNodes.join(', ')}`);
  }
  return generations;
}

function cmdRoadmapAnalyze(cwd, raw) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!fs.existsSync(roadmapPath)) {
    output({ error: 'ROADMAP.md not found', milestones: [], phases: [], current_phase: null }, raw);
    return;
  }

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const phasesDir = path.join(cwd, '.planning', 'phases');

  // Extract all phase headings: ## Phase N: Name or ### Phase N: Name
  const phasePattern = /#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)\s*:\s*([^\n]+)/gi;
  const phases = [];
  let match;

  while ((match = phasePattern.exec(content)) !== null) {
    const phaseNum = match[1];
    const phaseName = match[2].replace(/\(INSERTED\)/i, '').trim();

    // Extract goal from the section
    const sectionStart = match.index;
    const restOfContent = content.slice(sectionStart);
    const nextHeader = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i);
    const sectionEnd = nextHeader ? sectionStart + nextHeader.index : content.length;
    const section = content.slice(sectionStart, sectionEnd);

    const goalMatch = section.match(/\*\*Goal(?::\*\*|\*\*:)\s*([^\n]+)/i);
    const goal = goalMatch ? goalMatch[1].trim() : null;

    const dependsMatch = section.match(/\*\*Depends on(?::\*\*|\*\*:)\s*([^\n]+)/i);
    const depends_on = dependsMatch ? dependsMatch[1].trim() : null;

    // Check completion on disk
    const normalized = normalizePhaseName(phaseNum);
    let diskStatus = 'no_directory';
    let planCount = 0;
    let summaryCount = 0;
    let hasContext = false;
    let hasResearch = false;

    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      const dirMatch = dirs.find(d => d.startsWith(normalized + '-') || d === normalized);

      if (dirMatch) {
        const phaseFiles = fs.readdirSync(path.join(phasesDir, dirMatch));
        planCount = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
        summaryCount = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;
        hasContext = phaseFiles.some(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
        hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');

        if (summaryCount >= planCount && planCount > 0) diskStatus = 'complete';
        else if (summaryCount > 0) diskStatus = 'partial';
        else if (planCount > 0) diskStatus = 'planned';
        else if (hasResearch) diskStatus = 'researched';
        else if (hasContext) diskStatus = 'discussed';
        else diskStatus = 'empty';
      }
    } catch {}

    // Check ROADMAP checkbox status
    const checkboxPattern = new RegExp(`-\\s*\\[(x| )\\]\\s*.*Phase\\s+${phaseNum.replace('.', '\\.')}`, 'i');
    const checkboxMatch = content.match(checkboxPattern);
    const roadmapComplete = checkboxMatch ? checkboxMatch[1] === 'x' : false;

    phases.push({
      number: phaseNum,
      name: phaseName,
      goal,
      depends_on,
      depends_on_parsed: parseDependsOn(depends_on),
      plan_count: planCount,
      summary_count: summaryCount,
      has_context: hasContext,
      has_research: hasResearch,
      disk_status: diskStatus,
      roadmap_complete: roadmapComplete,
    });
  }

  // Extract milestone info
  const milestones = [];
  const milestonePattern = /##\s*(.*v(\d+\.\d+)[^(\n]*)/gi;
  let mMatch;
  while ((mMatch = milestonePattern.exec(content)) !== null) {
    milestones.push({
      heading: mMatch[1].trim(),
      version: 'v' + mMatch[2],
    });
  }

  // Find current and next phase
  const currentPhase = phases.find(p => p.disk_status === 'planned' || p.disk_status === 'partial') || null;
  const nextPhase = phases.find(p => p.disk_status === 'empty' || p.disk_status === 'no_directory' || p.disk_status === 'discussed' || p.disk_status === 'researched') || null;

  // Aggregated stats
  const totalPlans = phases.reduce((sum, p) => sum + p.plan_count, 0);
  const totalSummaries = phases.reduce((sum, p) => sum + p.summary_count, 0);
  const completedPhases = phases.filter(p => p.disk_status === 'complete').length;

  // Detect phases in summary list without detail sections (malformed ROADMAP)
  const checklistPattern = /-\s*\[[ x]\]\s*\*\*Phase\s+(\d+(?:\.\d+)?)/gi;
  const checklistPhases = new Set();
  let checklistMatch;
  while ((checklistMatch = checklistPattern.exec(content)) !== null) {
    checklistPhases.add(checklistMatch[1]);
  }
  const detailPhases = new Set(phases.map(p => p.number));
  const missingDetails = [...checklistPhases].filter(p => !detailPhases.has(p));

  const result = {
    milestones,
    phases,
    phase_count: phases.length,
    completed_phases: completedPhases,
    total_plans: totalPlans,
    total_summaries: totalSummaries,
    progress_percent: totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0,
    current_phase: currentPhase ? currentPhase.number : null,
    next_phase: nextPhase ? nextPhase.number : null,
    missing_phase_details: missingDetails.length > 0 ? missingDetails : null,
  };

  output(result, raw);
}

// ─── DAG Analysis ─────────────────────────────────────────────────────────────

function cmdRoadmapAnalyzeDag(cwd, raw) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  if (!fs.existsSync(roadmapPath)) {
    output({ error: 'ROADMAP.md not found' }, raw);
    return;
  }

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const phasesDir = path.join(cwd, '.planning', 'phases');

  // Extract all phase headings (same parsing as cmdRoadmapAnalyze)
  const phasePattern = /#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)\s*:\s*([^\n]+)/gi;
  const phases = [];
  let match;

  while ((match = phasePattern.exec(content)) !== null) {
    const phaseNum = match[1];
    const phaseName = match[2].replace(/\(INSERTED\)/i, '').trim();

    const sectionStart = match.index;
    const restOfContent = content.slice(sectionStart);
    const nextHeader = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i);
    const sectionEnd = nextHeader ? sectionStart + nextHeader.index : content.length;
    const section = content.slice(sectionStart, sectionEnd);

    const dependsMatch = section.match(/\*\*Depends on(?::\*\*|\*\*:)\s*([^\n]+)/i);
    const depends_on = dependsMatch ? dependsMatch[1].trim() : null;

    // Check completion on disk
    const normalized = normalizePhaseName(phaseNum);
    let diskStatus = 'no_directory';
    let planCount = 0;
    let summaryCount = 0;

    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      const dirMatch = dirs.find(d => d.startsWith(normalized + '-') || d === normalized);

      if (dirMatch) {
        const phaseFiles = fs.readdirSync(path.join(phasesDir, dirMatch));
        planCount = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
        summaryCount = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;

        if (summaryCount >= planCount && planCount > 0) diskStatus = 'complete';
        else if (summaryCount > 0) diskStatus = 'partial';
        else if (planCount > 0) diskStatus = 'planned';
        else diskStatus = 'empty';
      }
    } catch {}

    phases.push({
      number: phaseNum,
      name: phaseName,
      depends_on_raw: depends_on,
      depends_on_parsed: parseDependsOn(depends_on),
      disk_status: diskStatus,
    });
  }

  // Build nodes and edges
  const nodes = phases.map(p => p.number);
  const edges = [];
  const missingRefs = [];

  for (const phase of phases) {
    for (const dep of phase.depends_on_parsed) {
      if (!nodes.includes(dep)) {
        missingRefs.push({ phase: phase.number, references: dep });
        continue; // Treat missing ref as satisfied
      }
      edges.push([dep, phase.number]);
    }
  }

  // Run topological sort
  let waves, cycleError;
  try {
    const generations = topoGenerations(nodes, edges);
    waves = generations.map((gen, i) => ({ wave: i + 1, phases: gen }));
    cycleError = null;
  } catch (e) {
    waves = null;
    cycleError = e.message;
  }

  // Determine ready and blocked phases
  const completedPhases = phases.filter(p => p.disk_status === 'complete').map(p => p.number);
  const ready = [];
  const blocked = [];

  for (const phase of phases) {
    if (completedPhases.includes(phase.number)) continue;
    const unmetDeps = phase.depends_on_parsed.filter(d => !completedPhases.includes(d) && nodes.includes(d));
    if (unmetDeps.length === 0) {
      ready.push(phase.number);
    } else {
      blocked.push({ phase: phase.number, waiting_on: unmetDeps });
    }
  }

  // Build depended_by reverse edges
  const dependedBy = new Map();
  for (const phase of phases) {
    dependedBy.set(phase.number, []);
  }
  for (const [from, to] of edges) {
    dependedBy.get(from).push(to);
  }

  const result = {
    phases: phases.map(p => ({
      number: p.number,
      name: p.name,
      depends_on: p.depends_on_parsed,
      depended_by: dependedBy.get(p.number) || [],
      disk_status: p.disk_status,
    })),
    waves,
    ready,
    blocked,
    completed: completedPhases,
    validation: {
      is_dag: cycleError === null,
      cycle_error: cycleError,
      missing_refs: missingRefs,
      fully_sequential: waves ? waves.every(w => w.phases.length === 1) : null,
    },
  };

  if (raw) {
    output(result, raw);
  } else {
    // Human-readable text visualization
    let text = 'DAG Analysis:\n\n';
    if (waves) {
      for (const w of waves) {
        const phaseLabels = w.phases.map(pn => {
          const p = phases.find(pp => pp.number === pn);
          const status = completedPhases.includes(pn) ? ' (complete)' : '';
          return `Phase ${pn}${status}`;
        });
        text += `Wave ${w.wave}: ${phaseLabels.join(', ')}\n`;
      }
    } else {
      text += 'ERROR: ' + cycleError + '\n';
    }

    if (ready.length > 0) {
      text += `\nReady to execute: ${ready.map(p => 'Phase ' + p).join(', ')}\n`;
    }
    if (blocked.length > 0) {
      const blockedStr = blocked.map(b =>
        `Phase ${b.phase} (waiting on ${b.waiting_on.map(w => 'Phase ' + w).join(', ')})`
      ).join(', ');
      text += `Blocked: ${blockedStr}\n`;
    }
    if (missingRefs.length > 0) {
      text += `\nWarnings:\n`;
      for (const mr of missingRefs) {
        text += `  Phase ${mr.phase} references non-existent Phase ${mr.references}\n`;
      }
    }

    console.log(text.trim());
  }
}

// ─── Phase Add ────────────────────────────────────────────────────────────────

function cmdPhaseAdd(cwd, description, raw) {
  if (!description) {
    error('description required for phase add');
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    error('ROADMAP.md not found');
  }

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const slug = generateSlugInternal(description);

  // Find highest integer phase number
  const phasePattern = /#{2,4}\s*Phase\s+(\d+)(?:\.\d+)?:/gi;
  let maxPhase = 0;
  let m;
  while ((m = phasePattern.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    if (num > maxPhase) maxPhase = num;
  }

  const newPhaseNum = maxPhase + 1;
  const paddedNum = String(newPhaseNum).padStart(2, '0');
  const dirName = `${paddedNum}-${slug}`;
  const dirPath = path.join(cwd, '.planning', 'phases', dirName);

  // Create directory with .gitkeep so git tracks empty folders
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');

  // Build phase entry
  const phaseEntry = `\n### Phase ${newPhaseNum}: ${description}\n\n**Goal:** [To be planned]\n**Depends on:** Phase ${maxPhase}\n**Plans:** 0 plans\n\nPlans:\n- [ ] TBD (run /mow:plan-phase ${newPhaseNum} to break down)\n`;

  // Find insertion point: before last "---" or at end
  let updatedContent;
  const lastSeparator = content.lastIndexOf('\n---');
  if (lastSeparator > 0) {
    updatedContent = content.slice(0, lastSeparator) + phaseEntry + content.slice(lastSeparator);
  } else {
    updatedContent = content + phaseEntry;
  }

  fs.writeFileSync(roadmapPath, updatedContent, 'utf-8');

  const result = {
    phase_number: newPhaseNum,
    padded: paddedNum,
    name: description,
    slug,
    directory: `.planning/phases/${dirName}`,
  };

  output(result, raw, paddedNum);
}

// ─── Phase Insert (Decimal) ──────────────────────────────────────────────────

function cmdPhaseInsert(cwd, afterPhase, description, raw) {
  if (!afterPhase || !description) {
    error('after-phase and description required for phase insert');
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    error('ROADMAP.md not found');
  }

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const slug = generateSlugInternal(description);

  // Normalize input then strip leading zeros for flexible matching
  const normalizedAfter = normalizePhaseName(afterPhase);
  const unpadded = normalizedAfter.replace(/^0+/, '');
  const afterPhaseEscaped = unpadded.replace(/\./g, '\\.');
  const targetPattern = new RegExp(`#{2,4}\\s*Phase\\s+0*${afterPhaseEscaped}:`, 'i');
  if (!targetPattern.test(content)) {
    error(`Phase ${afterPhase} not found in ROADMAP.md`);
  }

  // Calculate next decimal using existing logic
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalizedBase = normalizePhaseName(afterPhase);
  let existingDecimals = [];

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    const decimalPattern = new RegExp(`^${normalizedBase}\\.(\\d+)`);
    for (const dir of dirs) {
      const dm = dir.match(decimalPattern);
      if (dm) existingDecimals.push(parseInt(dm[1], 10));
    }
  } catch {}

  const nextDecimal = existingDecimals.length === 0 ? 1 : Math.max(...existingDecimals) + 1;
  const decimalPhase = `${normalizedBase}.${nextDecimal}`;
  const dirName = `${decimalPhase}-${slug}`;
  const dirPath = path.join(cwd, '.planning', 'phases', dirName);

  // Create directory with .gitkeep so git tracks empty folders
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');

  // Build phase entry
  const phaseEntry = `\n### Phase ${decimalPhase}: ${description} (INSERTED)\n\n**Goal:** [Urgent work - to be planned]\n**Depends on:** Phase ${afterPhase}\n**Plans:** 0 plans\n\nPlans:\n- [ ] TBD (run /mow:plan-phase ${decimalPhase} to break down)\n`;

  // Insert after the target phase section
  const headerPattern = new RegExp(`(#{2,4}\\s*Phase\\s+0*${afterPhaseEscaped}:[^\\n]*\\n)`, 'i');
  const headerMatch = content.match(headerPattern);
  if (!headerMatch) {
    error(`Could not find Phase ${afterPhase} header`);
  }

  const headerIdx = content.indexOf(headerMatch[0]);
  const afterHeader = content.slice(headerIdx + headerMatch[0].length);
  const nextPhaseMatch = afterHeader.match(/\n#{2,4}\s+Phase\s+\d/i);

  let insertIdx;
  if (nextPhaseMatch) {
    insertIdx = headerIdx + headerMatch[0].length + nextPhaseMatch.index;
  } else {
    insertIdx = content.length;
  }

  const updatedContent = content.slice(0, insertIdx) + phaseEntry + content.slice(insertIdx);
  fs.writeFileSync(roadmapPath, updatedContent, 'utf-8');

  const result = {
    phase_number: decimalPhase,
    after_phase: afterPhase,
    name: description,
    slug,
    directory: `.planning/phases/${dirName}`,
  };

  output(result, raw, decimalPhase);
}

// ─── Phase Remove ─────────────────────────────────────────────────────────────

function cmdPhaseRemove(cwd, targetPhase, options, raw) {
  if (!targetPhase) {
    error('phase number required for phase remove');
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const force = options.force || false;

  if (!fs.existsSync(roadmapPath)) {
    error('ROADMAP.md not found');
  }

  // Normalize the target
  const normalized = normalizePhaseName(targetPhase);
  const isDecimal = targetPhase.includes('.');

  // Find and validate target directory
  let targetDir = null;
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    targetDir = dirs.find(d => d.startsWith(normalized + '-') || d === normalized);
  } catch {}

  // Check for executed work (SUMMARY.md files)
  if (targetDir && !force) {
    const targetPath = path.join(phasesDir, targetDir);
    const files = fs.readdirSync(targetPath);
    const summaries = files.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
    if (summaries.length > 0) {
      error(`Phase ${targetPhase} has ${summaries.length} executed plan(s). Use --force to remove anyway.`);
    }
  }

  // Delete target directory
  if (targetDir) {
    fs.rmSync(path.join(phasesDir, targetDir), { recursive: true, force: true });
  }

  // Renumber subsequent phases
  const renamedDirs = [];
  const renamedFiles = [];

  if (isDecimal) {
    // Decimal removal: renumber sibling decimals (e.g., removing 06.2 → 06.3 becomes 06.2)
    const baseParts = normalized.split('.');
    const baseInt = baseParts[0];
    const removedDecimal = parseInt(baseParts[1], 10);

    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

      // Find sibling decimals with higher numbers
      const decPattern = new RegExp(`^${baseInt}\\.(\\d+)-(.+)$`);
      const toRename = [];
      for (const dir of dirs) {
        const dm = dir.match(decPattern);
        if (dm && parseInt(dm[1], 10) > removedDecimal) {
          toRename.push({ dir, oldDecimal: parseInt(dm[1], 10), slug: dm[2] });
        }
      }

      // Sort descending to avoid conflicts
      toRename.sort((a, b) => b.oldDecimal - a.oldDecimal);

      for (const item of toRename) {
        const newDecimal = item.oldDecimal - 1;
        const oldPhaseId = `${baseInt}.${item.oldDecimal}`;
        const newPhaseId = `${baseInt}.${newDecimal}`;
        const newDirName = `${baseInt}.${newDecimal}-${item.slug}`;

        // Rename directory
        fs.renameSync(path.join(phasesDir, item.dir), path.join(phasesDir, newDirName));
        renamedDirs.push({ from: item.dir, to: newDirName });

        // Rename files inside
        const dirFiles = fs.readdirSync(path.join(phasesDir, newDirName));
        for (const f of dirFiles) {
          // Files may have phase prefix like "06.2-01-PLAN.md"
          if (f.includes(oldPhaseId)) {
            const newFileName = f.replace(oldPhaseId, newPhaseId);
            fs.renameSync(
              path.join(phasesDir, newDirName, f),
              path.join(phasesDir, newDirName, newFileName)
            );
            renamedFiles.push({ from: f, to: newFileName });
          }
        }
      }
    } catch {}

  } else {
    // Integer removal: renumber all subsequent integer phases
    const removedInt = parseInt(normalized, 10);

    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

      // Collect directories that need renumbering (integer phases > removed, and their decimals)
      const toRename = [];
      for (const dir of dirs) {
        const dm = dir.match(/^(\d+)(?:\.(\d+))?-(.+)$/);
        if (!dm) continue;
        const dirInt = parseInt(dm[1], 10);
        if (dirInt > removedInt) {
          toRename.push({
            dir,
            oldInt: dirInt,
            decimal: dm[2] ? parseInt(dm[2], 10) : null,
            slug: dm[3],
          });
        }
      }

      // Sort descending to avoid conflicts
      toRename.sort((a, b) => {
        if (a.oldInt !== b.oldInt) return b.oldInt - a.oldInt;
        return (b.decimal || 0) - (a.decimal || 0);
      });

      for (const item of toRename) {
        const newInt = item.oldInt - 1;
        const newPadded = String(newInt).padStart(2, '0');
        const oldPadded = String(item.oldInt).padStart(2, '0');
        const decimalSuffix = item.decimal !== null ? `.${item.decimal}` : '';
        const oldPrefix = `${oldPadded}${decimalSuffix}`;
        const newPrefix = `${newPadded}${decimalSuffix}`;
        const newDirName = `${newPrefix}-${item.slug}`;

        // Rename directory
        fs.renameSync(path.join(phasesDir, item.dir), path.join(phasesDir, newDirName));
        renamedDirs.push({ from: item.dir, to: newDirName });

        // Rename files inside
        const dirFiles = fs.readdirSync(path.join(phasesDir, newDirName));
        for (const f of dirFiles) {
          if (f.startsWith(oldPrefix)) {
            const newFileName = newPrefix + f.slice(oldPrefix.length);
            fs.renameSync(
              path.join(phasesDir, newDirName, f),
              path.join(phasesDir, newDirName, newFileName)
            );
            renamedFiles.push({ from: f, to: newFileName });
          }
        }
      }
    } catch {}
  }

  // Update ROADMAP.md
  let roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');

  // Remove the target phase section
  const targetEscaped = targetPhase.replace(/\./g, '\\.');
  const sectionPattern = new RegExp(
    `\\n?#{2,4}\\s*Phase\\s+${targetEscaped}\\s*:[\\s\\S]*?(?=\\n#{2,4}\\s+Phase\\s+\\d|$)`,
    'i'
  );
  roadmapContent = roadmapContent.replace(sectionPattern, '');

  // Remove from phase list (checkbox)
  const checkboxPattern = new RegExp(`\\n?-\\s*\\[[ x]\\]\\s*.*Phase\\s+${targetEscaped}[:\\s][^\\n]*`, 'gi');
  roadmapContent = roadmapContent.replace(checkboxPattern, '');

  // Remove from progress table
  const tableRowPattern = new RegExp(`\\n?\\|\\s*${targetEscaped}\\.?\\s[^|]*\\|[^\\n]*`, 'gi');
  roadmapContent = roadmapContent.replace(tableRowPattern, '');

  // Renumber references in ROADMAP for subsequent phases
  if (!isDecimal) {
    const removedInt = parseInt(normalized, 10);

    // Collect all integer phases > removedInt
    const maxPhase = 99; // reasonable upper bound
    for (let oldNum = maxPhase; oldNum > removedInt; oldNum--) {
      const newNum = oldNum - 1;
      const oldStr = String(oldNum);
      const newStr = String(newNum);
      const oldPad = oldStr.padStart(2, '0');
      const newPad = newStr.padStart(2, '0');

      // Phase headings: ## Phase 18: or ### Phase 18: → ## Phase 17: or ### Phase 17:
      roadmapContent = roadmapContent.replace(
        new RegExp(`(#{2,4}\\s*Phase\\s+)${oldStr}(\\s*:)`, 'gi'),
        `$1${newStr}$2`
      );

      // Checkbox items: - [ ] **Phase 18:** → - [ ] **Phase 17:**
      roadmapContent = roadmapContent.replace(
        new RegExp(`(Phase\\s+)${oldStr}([:\\s])`, 'g'),
        `$1${newStr}$2`
      );

      // Plan references: 18-01 → 17-01
      roadmapContent = roadmapContent.replace(
        new RegExp(`${oldPad}-(\\d{2})`, 'g'),
        `${newPad}-$1`
      );

      // Table rows: | 18. → | 17.
      roadmapContent = roadmapContent.replace(
        new RegExp(`(\\|\\s*)${oldStr}\\.\\s`, 'g'),
        `$1${newStr}. `
      );

      // Depends on references (match both **Depends on:** and **Depends on**: formats)
      roadmapContent = roadmapContent.replace(
        new RegExp(`(Depends on(?:\\*\\*:|:\\*\\*)\\s*Phase\\s+)${oldStr}\\b`, 'gi'),
        `$1${newStr}`
      );
    }
  }

  fs.writeFileSync(roadmapPath, roadmapContent, 'utf-8');

  // Update STATE.md phase count
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (fs.existsSync(statePath)) {
    let stateContent = fs.readFileSync(statePath, 'utf-8');
    // Update "Total Phases" field
    const totalPattern = /(\*\*Total Phases:\*\*\s*)(\d+)/;
    const totalMatch = stateContent.match(totalPattern);
    if (totalMatch) {
      const oldTotal = parseInt(totalMatch[2], 10);
      stateContent = stateContent.replace(totalPattern, `$1${oldTotal - 1}`);
    }
    // Update "Phase: X of Y" pattern
    const ofPattern = /(\bof\s+)(\d+)(\s*(?:\(|phases?))/i;
    const ofMatch = stateContent.match(ofPattern);
    if (ofMatch) {
      const oldTotal = parseInt(ofMatch[2], 10);
      stateContent = stateContent.replace(ofPattern, `$1${oldTotal - 1}$3`);
    }
    fs.writeFileSync(statePath, stateContent, 'utf-8');
  }

  const result = {
    removed: targetPhase,
    directory_deleted: targetDir || null,
    renamed_directories: renamedDirs,
    renamed_files: renamedFiles,
    roadmap_updated: true,
    state_updated: fs.existsSync(statePath),
  };

  output(result, raw);
}

// ─── Roadmap Update Plan Progress ────────────────────────────────────────────

function cmdRoadmapUpdatePlanProgress(cwd, phaseNum, raw) {
  if (!phaseNum) {
    error('phase number required for roadmap update-plan-progress');
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');

  const phaseInfo = findPhaseInternal(cwd, phaseNum);
  if (!phaseInfo) {
    error(`Phase ${phaseNum} not found`);
  }

  const planCount = phaseInfo.plans.length;
  const summaryCount = phaseInfo.summaries.length;

  if (planCount === 0) {
    output({ updated: false, reason: 'No plans found', plan_count: 0, summary_count: 0 }, raw, 'no plans');
    return;
  }

  const isComplete = summaryCount >= planCount;
  const status = isComplete ? 'Complete' : summaryCount > 0 ? 'In Progress' : 'Planned';
  const today = new Date().toISOString().split('T')[0];

  if (!fs.existsSync(roadmapPath)) {
    output({ updated: false, reason: 'ROADMAP.md not found', plan_count: planCount, summary_count: summaryCount }, raw, 'no roadmap');
    return;
  }

  let roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
  const phaseEscaped = phaseNum.replace('.', '\\.');

  // Progress table row: update Plans column (summaries/plans) and Status column
  const tablePattern = new RegExp(
    `(\\|\\s*${phaseEscaped}\\.?\\s[^|]*\\|)[^|]*(\\|)\\s*[^|]*(\\|)\\s*[^|]*(\\|)`,
    'i'
  );
  const dateField = isComplete ? ` ${today} ` : '  ';
  roadmapContent = roadmapContent.replace(
    tablePattern,
    `$1 ${summaryCount}/${planCount} $2 ${status.padEnd(11)}$3${dateField}$4`
  );

  // Update plan count in phase detail section
  const planCountPattern = new RegExp(
    `(#{2,4}\\s*Phase\\s+${phaseEscaped}[\\s\\S]*?\\*\\*Plans(?:\\*\\*:|:\\*\\*)\\s*)[^\\n]+`,
    'i'
  );
  const planCountText = isComplete
    ? `${summaryCount}/${planCount} plans complete`
    : `${summaryCount}/${planCount} plans executed`;
  roadmapContent = roadmapContent.replace(planCountPattern, `$1${planCountText}`);

  // If complete: check checkbox
  if (isComplete) {
    const checkboxPattern = new RegExp(
      `(-\\s*\\[)[ ](\\]\\s*.*Phase\\s+${phaseEscaped}[:\\s][^\\n]*)`,
      'i'
    );
    roadmapContent = roadmapContent.replace(checkboxPattern, `$1x$2 (completed ${today})`);
  }

  fs.writeFileSync(roadmapPath, roadmapContent, 'utf-8');

  output({
    updated: true,
    phase: phaseNum,
    plan_count: planCount,
    summary_count: summaryCount,
    status,
    complete: isComplete,
  }, raw, `${summaryCount}/${planCount} ${status}`);
}

// ─── Requirements Mark Complete ───────────────────────────────────────────────

function cmdRequirementsMarkComplete(cwd, reqIdsRaw, raw) {
  if (!reqIdsRaw || reqIdsRaw.length === 0) {
    error('requirement IDs required. Usage: requirements mark-complete REQ-01,REQ-02 or REQ-01 REQ-02');
  }

  // Accept comma-separated, space-separated, or bracket-wrapped: [REQ-01, REQ-02]
  const reqIds = reqIdsRaw
    .join(' ')
    .replace(/[\[\]]/g, '')
    .split(/[,\s]+/)
    .map(r => r.trim())
    .filter(Boolean);

  if (reqIds.length === 0) {
    error('no valid requirement IDs found');
  }

  const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
  if (!fs.existsSync(reqPath)) {
    output({ updated: false, reason: 'REQUIREMENTS.md not found', ids: reqIds }, raw, 'no requirements file');
    return;
  }

  let reqContent = fs.readFileSync(reqPath, 'utf-8');
  const updated = [];
  const notFound = [];

  for (const reqId of reqIds) {
    let found = false;

    // Update checkbox: - [ ] **REQ-ID** → - [x] **REQ-ID**
    const checkboxPattern = new RegExp(`(-\\s*\\[)[ ](\\]\\s*\\*\\*${reqId}\\*\\*)`, 'gi');
    if (checkboxPattern.test(reqContent)) {
      reqContent = reqContent.replace(checkboxPattern, '$1x$2');
      found = true;
    }

    // Update traceability table: | REQ-ID | Phase N | Pending | → | REQ-ID | Phase N | Complete |
    const tablePattern = new RegExp(`(\\|\\s*${reqId}\\s*\\|[^|]+\\|)\\s*Pending\\s*(\\|)`, 'gi');
    if (tablePattern.test(reqContent)) {
      // Re-read since test() advances lastIndex for global regex
      reqContent = reqContent.replace(
        new RegExp(`(\\|\\s*${reqId}\\s*\\|[^|]+\\|)\\s*Pending\\s*(\\|)`, 'gi'),
        '$1 Complete $2'
      );
      found = true;
    }

    if (found) {
      updated.push(reqId);
    } else {
      notFound.push(reqId);
    }
  }

  if (updated.length > 0) {
    fs.writeFileSync(reqPath, reqContent, 'utf-8');
  }

  output({
    updated: updated.length > 0,
    marked_complete: updated,
    not_found: notFound,
    total: reqIds.length,
  }, raw, `${updated.length}/${reqIds.length} requirements marked complete`);
}

// ─── Phase Complete (Transition) ──────────────────────────────────────────────

function cmdPhaseComplete(cwd, phaseNum, raw) {
  if (!phaseNum) {
    error('phase number required for phase complete');
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phaseNum);
  const today = new Date().toISOString().split('T')[0];

  // Verify phase info
  const phaseInfo = findPhaseInternal(cwd, phaseNum);
  if (!phaseInfo) {
    error(`Phase ${phaseNum} not found`);
  }

  const planCount = phaseInfo.plans.length;
  const summaryCount = phaseInfo.summaries.length;

  // Update ROADMAP.md: mark phase complete
  if (fs.existsSync(roadmapPath)) {
    let roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');

    // Checkbox: - [ ] Phase N: → - [x] Phase N: (...completed DATE)
    const checkboxPattern = new RegExp(
      `(-\\s*\\[)[ ](\\]\\s*.*Phase\\s+${phaseNum.replace('.', '\\.')}[:\\s][^\\n]*)`,
      'i'
    );
    roadmapContent = roadmapContent.replace(checkboxPattern, `$1x$2 (completed ${today})`);

    // Progress table: update Status to Complete, add date
    const phaseEscaped = phaseNum.replace('.', '\\.');
    const tablePattern = new RegExp(
      `(\\|\\s*${phaseEscaped}\\.?\\s[^|]*\\|[^|]*\\|)\\s*[^|]*(\\|)\\s*[^|]*(\\|)`,
      'i'
    );
    roadmapContent = roadmapContent.replace(
      tablePattern,
      `$1 Complete    $2 ${today} $3`
    );

    // Update plan count in phase section
    const planCountPattern = new RegExp(
      `(#{2,4}\\s*Phase\\s+${phaseEscaped}[\\s\\S]*?\\*\\*Plans(?:\\*\\*:|:\\*\\*)\\s*)[^\\n]+`,
      'i'
    );
    roadmapContent = roadmapContent.replace(
      planCountPattern,
      `$1${summaryCount}/${planCount} plans complete`
    );

    fs.writeFileSync(roadmapPath, roadmapContent, 'utf-8');

    // Update REQUIREMENTS.md traceability for this phase's requirements
    const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
    if (fs.existsSync(reqPath)) {
      // Extract Requirements line from roadmap for this phase
      const reqMatch = roadmapContent.match(
        new RegExp(`Phase\\s+${phaseNum.replace('.', '\\.')}[\\s\\S]*?\\*\\*Requirements(?:\\*\\*:|:\\*\\*)\\s*([^\\n]+)`, 'i')
      );

      if (reqMatch) {
        const reqIds = reqMatch[1].replace(/[\[\]]/g, '').split(/[,\s]+/).map(r => r.trim()).filter(Boolean);
        let reqContent = fs.readFileSync(reqPath, 'utf-8');

        for (const reqId of reqIds) {
          // Update checkbox: - [ ] **REQ-ID** → - [x] **REQ-ID**
          reqContent = reqContent.replace(
            new RegExp(`(-\\s*\\[)[ ](\\]\\s*\\*\\*${reqId}\\*\\*)`, 'gi'),
            '$1x$2'
          );
          // Update traceability table: | REQ-ID | Phase N | Pending | → | REQ-ID | Phase N | Complete |
          reqContent = reqContent.replace(
            new RegExp(`(\\|\\s*${reqId}\\s*\\|[^|]+\\|)\\s*Pending\\s*(\\|)`, 'gi'),
            '$1 Complete $2'
          );
        }

        fs.writeFileSync(reqPath, reqContent, 'utf-8');
      }
    }
  }

  // Find next phase
  let nextPhaseNum = null;
  let nextPhaseName = null;
  let isLastPhase = true;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    const currentFloat = parseFloat(phaseNum);

    // Find the next phase directory after current
    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)?)-?(.*)/);
      if (dm) {
        const dirFloat = parseFloat(dm[1]);
        if (dirFloat > currentFloat) {
          nextPhaseNum = dm[1];
          nextPhaseName = dm[2] || null;
          isLastPhase = false;
          break;
        }
      }
    }
  } catch {}

  // Update STATE.md
  if (fs.existsSync(statePath)) {
    let stateContent = fs.readFileSync(statePath, 'utf-8');

    // Update Current Phase
    stateContent = stateContent.replace(
      /(\*\*Current Phase:\*\*\s*).*/,
      `$1${nextPhaseNum || phaseNum}`
    );

    // Update Current Phase Name
    if (nextPhaseName) {
      stateContent = stateContent.replace(
        /(\*\*Current Phase Name:\*\*\s*).*/,
        `$1${nextPhaseName.replace(/-/g, ' ')}`
      );
    }

    // Update Status
    stateContent = stateContent.replace(
      /(\*\*Status:\*\*\s*).*/,
      `$1${isLastPhase ? 'Milestone complete' : 'Ready to plan'}`
    );

    // Update Current Plan
    stateContent = stateContent.replace(
      /(\*\*Current Plan:\*\*\s*).*/,
      `$1Not started`
    );

    // Update Last Activity
    stateContent = stateContent.replace(
      /(\*\*Last Activity:\*\*\s*).*/,
      `$1${today}`
    );

    // Update Last Activity Description
    stateContent = stateContent.replace(
      /(\*\*Last Activity Description:\*\*\s*).*/,
      `$1Phase ${phaseNum} complete${nextPhaseNum ? `, transitioned to Phase ${nextPhaseNum}` : ''}`
    );

    fs.writeFileSync(statePath, stateContent, 'utf-8');
  }

  const result = {
    completed_phase: phaseNum,
    phase_name: phaseInfo.phase_name,
    plans_executed: `${summaryCount}/${planCount}`,
    next_phase: nextPhaseNum,
    next_phase_name: nextPhaseName,
    is_last_phase: isLastPhase,
    date: today,
    roadmap_updated: fs.existsSync(roadmapPath),
    state_updated: fs.existsSync(statePath),
  };

  output(result, raw);
}

// ─── Milestone Complete ───────────────────────────────────────────────────────

function cmdMilestoneComplete(cwd, version, options, raw) {
  if (!version) {
    error('version required for milestone complete (e.g., v1.0)');
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const milestonesPath = path.join(cwd, '.planning', 'MILESTONES.md');
  const archiveDir = path.join(cwd, '.planning', 'milestones');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const today = new Date().toISOString().split('T')[0];
  const milestoneName = options.name || version;

  // Ensure archive directory exists
  fs.mkdirSync(archiveDir, { recursive: true });

  // Gather stats from phases
  let phaseCount = 0;
  let totalPlans = 0;
  let totalTasks = 0;
  const accomplishments = [];

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

    for (const dir of dirs) {
      phaseCount++;
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      totalPlans += plans.length;

      // Extract one-liners from summaries
      for (const s of summaries) {
        try {
          const content = fs.readFileSync(path.join(phasesDir, dir, s), 'utf-8');
          const fm = extractFrontmatter(content);
          if (fm['one-liner']) {
            accomplishments.push(fm['one-liner']);
          }
          // Count tasks
          const taskMatches = content.match(/##\s*Task\s*\d+/gi) || [];
          totalTasks += taskMatches.length;
        } catch {}
      }
    }
  } catch {}

  // Archive ROADMAP.md
  if (fs.existsSync(roadmapPath)) {
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
    fs.writeFileSync(path.join(archiveDir, `${version}-ROADMAP.md`), roadmapContent, 'utf-8');
  }

  // Archive REQUIREMENTS.md
  if (fs.existsSync(reqPath)) {
    const reqContent = fs.readFileSync(reqPath, 'utf-8');
    const archiveHeader = `# Requirements Archive: ${version} ${milestoneName}\n\n**Archived:** ${today}\n**Status:** SHIPPED\n\nFor current requirements, see \`.planning/REQUIREMENTS.md\`.\n\n---\n\n`;
    fs.writeFileSync(path.join(archiveDir, `${version}-REQUIREMENTS.md`), archiveHeader + reqContent, 'utf-8');
  }

  // Archive audit file if exists
  const auditFile = path.join(cwd, '.planning', `${version}-MILESTONE-AUDIT.md`);
  if (fs.existsSync(auditFile)) {
    fs.renameSync(auditFile, path.join(archiveDir, `${version}-MILESTONE-AUDIT.md`));
  }

  // Create/append MILESTONES.md entry
  const accomplishmentsList = accomplishments.map(a => `- ${a}`).join('\n');
  const milestoneEntry = `## ${version} ${milestoneName} (Shipped: ${today})\n\n**Phases completed:** ${phaseCount} phases, ${totalPlans} plans, ${totalTasks} tasks\n\n**Key accomplishments:**\n${accomplishmentsList || '- (none recorded)'}\n\n---\n\n`;

  if (fs.existsSync(milestonesPath)) {
    const existing = fs.readFileSync(milestonesPath, 'utf-8');
    fs.writeFileSync(milestonesPath, existing + '\n' + milestoneEntry, 'utf-8');
  } else {
    fs.writeFileSync(milestonesPath, `# Milestones\n\n${milestoneEntry}`, 'utf-8');
  }

  // Update STATE.md
  if (fs.existsSync(statePath)) {
    let stateContent = fs.readFileSync(statePath, 'utf-8');
    stateContent = stateContent.replace(
      /(\*\*Status:\*\*\s*).*/,
      `$1${version} milestone complete`
    );
    stateContent = stateContent.replace(
      /(\*\*Last Activity:\*\*\s*).*/,
      `$1${today}`
    );
    stateContent = stateContent.replace(
      /(\*\*Last Activity Description:\*\*\s*).*/,
      `$1${version} milestone completed and archived`
    );
    fs.writeFileSync(statePath, stateContent, 'utf-8');
  }

  // Archive phase directories if requested
  let phasesArchived = false;
  if (options.archivePhases) {
    try {
      const phaseArchiveDir = path.join(archiveDir, `${version}-phases`);
      fs.mkdirSync(phaseArchiveDir, { recursive: true });

      const phaseEntries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const phaseDirNames = phaseEntries.filter(e => e.isDirectory()).map(e => e.name);
      for (const dir of phaseDirNames) {
        fs.renameSync(path.join(phasesDir, dir), path.join(phaseArchiveDir, dir));
      }
      phasesArchived = phaseDirNames.length > 0;
    } catch {}
  }

  const result = {
    version,
    name: milestoneName,
    date: today,
    phases: phaseCount,
    plans: totalPlans,
    tasks: totalTasks,
    accomplishments,
    archived: {
      roadmap: fs.existsSync(path.join(archiveDir, `${version}-ROADMAP.md`)),
      requirements: fs.existsSync(path.join(archiveDir, `${version}-REQUIREMENTS.md`)),
      audit: fs.existsSync(path.join(archiveDir, `${version}-MILESTONE-AUDIT.md`)),
      phases: phasesArchived,
    },
    milestones_updated: true,
    state_updated: fs.existsSync(statePath),
  };

  output(result, raw);
}

// ─── Validate Consistency ─────────────────────────────────────────────────────

function cmdValidateConsistency(cwd, raw) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const errors = [];
  const warnings = [];

  // Check for ROADMAP
  if (!fs.existsSync(roadmapPath)) {
    errors.push('ROADMAP.md not found');
    output({ passed: false, errors, warnings }, raw, 'failed');
    return;
  }

  const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');

  // Extract phases from ROADMAP
  const roadmapPhases = new Set();
  const phasePattern = /#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)\s*:/gi;
  let m;
  while ((m = phasePattern.exec(roadmapContent)) !== null) {
    roadmapPhases.add(m[1]);
  }

  // Get phases on disk
  const diskPhases = new Set();
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)?)/);
      if (dm) diskPhases.add(dm[1]);
    }
  } catch {}

  // Check: phases in ROADMAP but not on disk
  for (const p of roadmapPhases) {
    if (!diskPhases.has(p) && !diskPhases.has(normalizePhaseName(p))) {
      warnings.push(`Phase ${p} in ROADMAP.md but no directory on disk`);
    }
  }

  // Check: phases on disk but not in ROADMAP
  for (const p of diskPhases) {
    const unpadded = String(parseInt(p, 10));
    if (!roadmapPhases.has(p) && !roadmapPhases.has(unpadded)) {
      warnings.push(`Phase ${p} exists on disk but not in ROADMAP.md`);
    }
  }

  // Check: sequential phase numbers (integers only)
  const integerPhases = [...diskPhases]
    .filter(p => !p.includes('.'))
    .map(p => parseInt(p, 10))
    .sort((a, b) => a - b);

  for (let i = 1; i < integerPhases.length; i++) {
    if (integerPhases[i] !== integerPhases[i - 1] + 1) {
      warnings.push(`Gap in phase numbering: ${integerPhases[i - 1]} → ${integerPhases[i]}`);
    }
  }

  // Check: plan numbering within phases
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

    for (const dir of dirs) {
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md')).sort();

      // Extract plan numbers
      const planNums = plans.map(p => {
        const pm = p.match(/-(\d{2})-PLAN\.md$/);
        return pm ? parseInt(pm[1], 10) : null;
      }).filter(n => n !== null);

      for (let i = 1; i < planNums.length; i++) {
        if (planNums[i] !== planNums[i - 1] + 1) {
          warnings.push(`Gap in plan numbering in ${dir}: plan ${planNums[i - 1]} → ${planNums[i]}`);
        }
      }

      // Check: plans without summaries (completed plans)
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md'));
      const planIds = new Set(plans.map(p => p.replace('-PLAN.md', '')));
      const summaryIds = new Set(summaries.map(s => s.replace('-SUMMARY.md', '')));

      // Summary without matching plan is suspicious
      for (const sid of summaryIds) {
        if (!planIds.has(sid)) {
          warnings.push(`Summary ${sid}-SUMMARY.md in ${dir} has no matching PLAN.md`);
        }
      }
    }
  } catch {}

  // Check: frontmatter in plans has required fields
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    for (const dir of dirs) {
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md'));

      for (const plan of plans) {
        const content = fs.readFileSync(path.join(phasesDir, dir, plan), 'utf-8');
        const fm = extractFrontmatter(content);

        if (!fm.wave) {
          warnings.push(`${dir}/${plan}: missing 'wave' in frontmatter`);
        }
      }
    }
  } catch {}

  const passed = errors.length === 0;
  output({ passed, errors, warnings, warning_count: warnings.length }, raw, passed ? 'passed' : 'failed');
}

// ─── Planning Backup ─────────────────────────────────────────────────────────

function createPlanningBackup(cwd) {
  const planningDir = path.join(cwd, '.planning');
  const backupsDir = path.join(planningDir, 'backups');

  // Create timestamped directory (colons → dashes, strip ms)
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z');
  const backupDir = path.join(backupsDir, ts);
  fs.mkdirSync(backupDir, { recursive: true });

  // Copy planning files that exist
  const filesToBackup = ['STATE.md', 'ROADMAP.md', 'REQUIREMENTS.md'];
  const backedUp = [];
  for (const file of filesToBackup) {
    const src = path.join(planningDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(backupDir, file));
      backedUp.push(file);
    }
  }

  // Count total backup directories
  let totalBackups = 0;
  try {
    totalBackups = fs.readdirSync(backupsDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).length;
  } catch {}

  return { dir: backupDir, files: backedUp, total_backups: totalBackups };
}

// ─── Validate Health ──────────────────────────────────────────────────────────

function cmdValidateHealth(cwd, options, raw) {
  const planningDir = path.join(cwd, '.planning');
  const projectPath = path.join(planningDir, 'PROJECT.md');
  const roadmapPath = path.join(planningDir, 'ROADMAP.md');
  const statePath = path.join(planningDir, 'STATE.md');
  const configPath = path.join(planningDir, 'config.json');
  const phasesDir = path.join(planningDir, 'phases');

  const errors = [];
  const warnings = [];
  const info = [];
  const repairs = [];

  // Helper to add issue
  const addIssue = (severity, code, message, fix, repairable = false) => {
    const issue = { code, message, fix, repairable };
    if (severity === 'error') errors.push(issue);
    else if (severity === 'warning') warnings.push(issue);
    else info.push(issue);
  };

  // ─── Check 1: .planning/ exists ───────────────────────────────────────────
  if (!fs.existsSync(planningDir)) {
    addIssue('error', 'E001', '.planning/ directory not found', 'Run /mow:new-project to initialize');
    output({
      status: 'broken',
      errors,
      warnings,
      info,
      repairable_count: 0,
    }, raw);
    return;
  }

  // ─── Check 2: PROJECT.md exists and has required sections ─────────────────
  if (!fs.existsSync(projectPath)) {
    addIssue('error', 'E002', 'PROJECT.md not found', 'Run /mow:new-project to create');
  } else {
    const content = fs.readFileSync(projectPath, 'utf-8');
    const requiredSections = ['## What This Is', '## Core Value', '## Requirements'];
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        addIssue('warning', 'W001', `PROJECT.md missing section: ${section}`, 'Add section manually');
      }
    }
  }

  // ─── Check 3: ROADMAP.md exists ───────────────────────────────────────────
  if (!fs.existsSync(roadmapPath)) {
    addIssue('error', 'E003', 'ROADMAP.md not found', 'Run /mow:new-milestone to create roadmap');
  }

  // ─── Check 4: STATE.md exists and references valid phases ─────────────────
  if (!fs.existsSync(statePath)) {
    addIssue('error', 'E004', 'STATE.md not found', 'Run /mow:health --repair to regenerate', true);
    repairs.push('regenerateState');
  } else {
    const stateContent = fs.readFileSync(statePath, 'utf-8');
    // Extract phase references from STATE.md
    const phaseRefs = [...stateContent.matchAll(/[Pp]hase\s+(\d+(?:\.\d+)?)/g)].map(m => m[1]);
    // Get disk phases
    const diskPhases = new Set();
    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) {
          const m = e.name.match(/^(\d+(?:\.\d+)?)/);
          if (m) diskPhases.add(m[1]);
        }
      }
    } catch {}
    // Check for invalid references
    for (const ref of phaseRefs) {
      const normalizedRef = String(parseInt(ref, 10)).padStart(2, '0');
      if (!diskPhases.has(ref) && !diskPhases.has(normalizedRef) && !diskPhases.has(String(parseInt(ref, 10)))) {
        // Only warn if phases dir has any content (not just an empty project)
        if (diskPhases.size > 0) {
          addIssue('warning', 'W002', `STATE.md references phase ${ref}, but only phases ${[...diskPhases].sort().join(', ')} exist`, 'Run /mow:health --repair to regenerate STATE.md', true);
          if (!repairs.includes('regenerateState')) repairs.push('regenerateState');
        }
      }
    }
  }

  // ─── Check 5: config.json valid JSON + valid schema ───────────────────────
  if (!fs.existsSync(configPath)) {
    addIssue('warning', 'W003', 'config.json not found', 'Run /mow:health --repair to create with defaults', true);
    repairs.push('createConfig');
  } else {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Validate known fields
      const validProfiles = ['quality', 'balanced', 'budget'];
      if (parsed.model_profile && !validProfiles.includes(parsed.model_profile)) {
        addIssue('warning', 'W004', `config.json: invalid model_profile "${parsed.model_profile}"`, `Valid values: ${validProfiles.join(', ')}`);
      }
    } catch (err) {
      addIssue('error', 'E005', `config.json: JSON parse error - ${err.message}`, 'Run /mow:health --repair to reset to defaults', true);
      repairs.push('resetConfig');
    }
  }

  // ─── Check 6: Phase directory naming (NN-name format) ─────────────────────
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !e.name.match(/^\d{2}(?:\.\d+)?-[\w-]+$/)) {
        addIssue('warning', 'W005', `Phase directory "${e.name}" doesn't follow NN-name format`, 'Rename to match pattern (e.g., 01-setup)');
      }
    }
  } catch {}

  // ─── Check 7: Orphaned plans (PLAN without SUMMARY) ───────────────────────
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const phaseFiles = fs.readdirSync(path.join(phasesDir, e.name));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      const summaryBases = new Set(summaries.map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', '')));

      for (const plan of plans) {
        const planBase = plan.replace('-PLAN.md', '').replace('PLAN.md', '');
        if (!summaryBases.has(planBase)) {
          addIssue('info', 'I001', `${e.name}/${plan} has no SUMMARY.md`, 'May be in progress');
        }
      }
    }
  } catch {}

  // ─── Check 8: Run existing consistency checks ─────────────────────────────
  // Inline subset of cmdValidateConsistency
  if (fs.existsSync(roadmapPath)) {
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
    const roadmapPhases = new Set();
    const phasePattern = /#{2,4}\s*Phase\s+(\d+(?:\.\d+)?)\s*:/gi;
    let m;
    while ((m = phasePattern.exec(roadmapContent)) !== null) {
      roadmapPhases.add(m[1]);
    }

    const diskPhases = new Set();
    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) {
          const dm = e.name.match(/^(\d+(?:\.\d+)?)/);
          if (dm) diskPhases.add(dm[1]);
        }
      }
    } catch {}

    // Phases in ROADMAP but not on disk
    for (const p of roadmapPhases) {
      const padded = String(parseInt(p, 10)).padStart(2, '0');
      if (!diskPhases.has(p) && !diskPhases.has(padded)) {
        addIssue('warning', 'W006', `Phase ${p} in ROADMAP.md but no directory on disk`, 'Create phase directory or remove from roadmap');
      }
    }

    // Phases on disk but not in ROADMAP
    for (const p of diskPhases) {
      const unpadded = String(parseInt(p, 10));
      if (!roadmapPhases.has(p) && !roadmapPhases.has(unpadded)) {
        addIssue('warning', 'W007', `Phase ${p} exists on disk but not in ROADMAP.md`, 'Add to roadmap or remove directory');
      }
    }
  }

  // ─── Perform repairs if requested ─────────────────────────────────────────
  const repairActions = [];
  let cleanupSuggestion = null;
  if (options.repair && repairs.length > 0) {
    // Create backup before any repair actions
    let backupResult;
    try {
      backupResult = createPlanningBackup(cwd);
      repairActions.push({ action: 'backup', success: true, dir: backupResult.dir, files: backupResult.files });
      if (backupResult.total_backups >= 5) {
        cleanupSuggestion = `${backupResult.total_backups} backups exist in .planning/backups/. Consider running /mow:cleanup to manage disk usage.`;
      }
    } catch (err) {
      repairActions.push({ action: 'backup', success: false, error: err.message });
    }

    for (const repair of repairs) {
      try {
        switch (repair) {
          case 'createConfig':
          case 'resetConfig': {
            const defaults = {
              model_profile: 'balanced',
              commit_docs: true,
              search_gitignored: false,
              branching_strategy: 'none',
              research: true,
              plan_checker: true,
              verifier: true,
              parallelization: true,
            };
            fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8');
            repairActions.push({ action: repair, success: true, path: 'config.json' });
            break;
          }
          case 'regenerateState': {
            // Read old STATE.md from backup for diff comparison
            let oldStateLines = [];
            if (backupResult && backupResult.files.includes('STATE.md')) {
              const oldContent = fs.readFileSync(path.join(backupResult.dir, 'STATE.md'), 'utf-8');
              oldStateLines = oldContent.split('\n');
            }

            // Generate minimal STATE.md from ROADMAP.md structure
            const milestone = getMilestoneInfo(cwd);
            let stateContent = `# Session State\n\n`;
            stateContent += `## Project Reference\n\n`;
            stateContent += `See: .planning/PROJECT.md\n\n`;
            stateContent += `## Position\n\n`;
            stateContent += `**Milestone:** ${milestone.version} ${milestone.name}\n`;
            stateContent += `**Current phase:** (determining...)\n`;
            stateContent += `**Status:** Resuming\n\n`;
            stateContent += `## Session Log\n\n`;
            stateContent += `- ${new Date().toISOString().split('T')[0]}: STATE.md regenerated by /mow:health --repair\n`;
            fs.writeFileSync(statePath, stateContent, 'utf-8');

            // Compute line-by-line diff
            const newStateLines = stateContent.split('\n');
            const diffLines = [];
            const maxLen = Math.max(oldStateLines.length, newStateLines.length);
            for (let i = 0; i < maxLen; i++) {
              const oldLine = i < oldStateLines.length ? oldStateLines[i] : undefined;
              const newLine = i < newStateLines.length ? newStateLines[i] : undefined;
              if (oldLine !== newLine) {
                diffLines.push({ line: i + 1, old: oldLine, new: newLine });
              }
            }

            // Format human-readable diff
            const diffFormatted = diffLines.map(d => {
              const parts = [];
              if (d.old !== undefined) parts.push(`- ${d.old}`);
              if (d.new !== undefined) parts.push(`+ ${d.new}`);
              return parts.join('\n');
            }).join('\n');

            repairActions.push({
              action: repair,
              success: true,
              path: 'STATE.md',
              diff_lines: diffLines,
              diff_formatted: diffFormatted,
            });
            break;
          }
        }
      } catch (err) {
        repairActions.push({ action: repair, success: false, error: err.message });
      }
    }
  }

  // ─── Determine overall status ─────────────────────────────────────────────
  let status;
  if (errors.length > 0) {
    status = 'broken';
  } else if (warnings.length > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  const repairableCount = errors.filter(e => e.repairable).length +
                         warnings.filter(w => w.repairable).length;

  const result = {
    status,
    errors,
    warnings,
    info,
    repairable_count: repairableCount,
    repairs_performed: repairActions.length > 0 ? repairActions : undefined,
  };
  if (cleanupSuggestion) {
    result.cleanup_suggestion = cleanupSuggestion;
  }
  output(result, raw);
}

// ─── Progress Render ──────────────────────────────────────────────────────────

function cmdProgressRender(cwd, format, raw) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const milestone = getMilestoneInfo(cwd);

  const phases = [];
  let totalPlans = 0;
  let totalSummaries = 0;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => {
      const aNum = parseFloat(a.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
      const bNum = parseFloat(b.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
      return aNum - bNum;
    });

    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)?)-?(.*)/);
      const phaseNum = dm ? dm[1] : dir;
      const phaseName = dm && dm[2] ? dm[2].replace(/-/g, ' ') : '';
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;

      totalPlans += plans;
      totalSummaries += summaries;

      let status;
      if (plans === 0) status = 'Pending';
      else if (summaries >= plans) status = 'Complete';
      else if (summaries > 0) status = 'In Progress';
      else status = 'Planned';

      phases.push({ number: phaseNum, name: phaseName, plans, summaries, status });
    }
  } catch {}

  const percent = totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0;

  if (format === 'table') {
    // Render markdown table
    const barWidth = 10;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    let out = `# ${milestone.version} ${milestone.name}\n\n`;
    out += `**Progress:** [${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)\n\n`;
    out += `| Phase | Name | Plans | Status |\n`;
    out += `|-------|------|-------|--------|\n`;
    for (const p of phases) {
      out += `| ${p.number} | ${p.name} | ${p.summaries}/${p.plans} | ${p.status} |\n`;
    }
    output({ rendered: out }, raw, out);
  } else if (format === 'bar') {
    const barWidth = 20;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    const text = `[${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)`;
    output({ bar: text, percent, completed: totalSummaries, total: totalPlans }, raw, text);
  } else {
    // JSON format
    output({
      milestone_version: milestone.version,
      milestone_name: milestone.name,
      phases,
      total_plans: totalPlans,
      total_summaries: totalSummaries,
      percent,
    }, raw);
  }
}

// ─── Todo Complete ────────────────────────────────────────────────────────────

function cmdTodoComplete(cwd, filename, raw) {
  if (!filename) {
    error('filename required for todo complete');
  }

  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');
  const completedDir = path.join(cwd, '.planning', 'todos', 'completed');
  const sourcePath = path.join(pendingDir, filename);

  if (!fs.existsSync(sourcePath)) {
    error(`Todo not found: ${filename}`);
  }

  // Ensure completed directory exists
  fs.mkdirSync(completedDir, { recursive: true });

  // Read, add completion timestamp, move
  let content = fs.readFileSync(sourcePath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  content = `completed: ${today}\n` + content;

  fs.writeFileSync(path.join(completedDir, filename), content, 'utf-8');
  fs.unlinkSync(sourcePath);

  output({ completed: true, file: filename, date: today }, raw, 'completed');
}

// ─── Scaffold ─────────────────────────────────────────────────────────────────

function cmdScaffold(cwd, type, options, raw) {
  const { phase, name } = options;
  const padded = phase ? normalizePhaseName(phase) : '00';
  const today = new Date().toISOString().split('T')[0];

  // Find phase directory
  const phaseInfo = phase ? findPhaseInternal(cwd, phase) : null;
  const phaseDir = phaseInfo ? path.join(cwd, phaseInfo.directory) : null;

  if (phase && !phaseDir && type !== 'phase-dir') {
    error(`Phase ${phase} directory not found`);
  }

  let filePath, content;

  switch (type) {
    case 'context': {
      filePath = path.join(phaseDir, `${padded}-CONTEXT.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — Context\n\n## Decisions\n\n_Decisions will be captured during /mow:discuss-phase ${phase}_\n\n## Discretion Areas\n\n_Areas where the executor can use judgment_\n\n## Deferred Ideas\n\n_Ideas to consider later_\n`;
      break;
    }
    case 'uat': {
      filePath = path.join(phaseDir, `${padded}-UAT.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\nstatus: pending\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — User Acceptance Testing\n\n## Test Results\n\n| # | Test | Status | Notes |\n|---|------|--------|-------|\n\n## Summary\n\n_Pending UAT_\n`;
      break;
    }
    case 'verification': {
      filePath = path.join(phaseDir, `${padded}-VERIFICATION.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\nstatus: pending\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — Verification\n\n## Goal-Backward Verification\n\n**Phase Goal:** [From ROADMAP.md]\n\n## Checks\n\n| # | Requirement | Status | Evidence |\n|---|------------|--------|----------|\n\n## Result\n\n_Pending verification_\n`;
      break;
    }
    case 'phase-dir': {
      if (!phase || !name) {
        error('phase and name required for phase-dir scaffold');
      }
      const slug = generateSlugInternal(name);
      const dirName = `${padded}-${slug}`;
      const phasesParent = path.join(cwd, '.planning', 'phases');
      fs.mkdirSync(phasesParent, { recursive: true });
      const dirPath = path.join(phasesParent, dirName);
      fs.mkdirSync(dirPath, { recursive: true });
      output({ created: true, directory: `.planning/phases/${dirName}`, path: dirPath }, raw, dirPath);
      return;
    }
    default:
      error(`Unknown scaffold type: ${type}. Available: context, uat, verification, phase-dir`);
  }

  if (fs.existsSync(filePath)) {
    output({ created: false, reason: 'already_exists', path: filePath }, raw, 'exists');
    return;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  const relPath = path.relative(cwd, filePath);
  output({ created: true, path: relPath }, raw, relPath);
}

// ─── Compound Commands ────────────────────────────────────────────────────────

function resolveModelInternal(cwd, agentType) {
  const config = loadConfig(cwd);

  // Check per-agent override first
  const override = config.model_overrides?.[agentType];
  if (override) {
    return override === 'opus' ? 'inherit' : override;
  }

  // Fall back to profile lookup
  const profile = config.model_profile || 'balanced';
  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) return 'sonnet';
  const resolved = agentModels[profile] || agentModels['balanced'] || 'sonnet';
  return resolved === 'opus' ? 'inherit' : resolved;
}

function getArchivedPhaseDirs(cwd) {
  const milestonesDir = path.join(cwd, '.planning', 'milestones');
  const results = [];

  if (!fs.existsSync(milestonesDir)) return results;

  try {
    const milestoneEntries = fs.readdirSync(milestonesDir, { withFileTypes: true });
    // Find v*-phases directories, sort newest first
    const phaseDirs = milestoneEntries
      .filter(e => e.isDirectory() && /^v[\d.]+-phases$/.test(e.name))
      .map(e => e.name)
      .sort()
      .reverse();

    for (const archiveName of phaseDirs) {
      const version = archiveName.match(/^(v[\d.]+)-phases$/)[1];
      const archivePath = path.join(milestonesDir, archiveName);
      const entries = fs.readdirSync(archivePath, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

      for (const dir of dirs) {
        results.push({
          name: dir,
          milestone: version,
          basePath: path.join('.planning', 'milestones', archiveName),
          fullPath: path.join(archivePath, dir),
        });
      }
    }
  } catch {}

  return results;
}

function searchPhaseInDir(baseDir, relBase, normalized) {
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    const match = dirs.find(d => d.startsWith(normalized));
    if (!match) return null;

    const dirMatch = match.match(/^(\d+(?:\.\d+)?)-?(.*)/);
    const phaseNumber = dirMatch ? dirMatch[1] : normalized;
    const phaseName = dirMatch && dirMatch[2] ? dirMatch[2] : null;
    const phaseDir = path.join(baseDir, match);
    const phaseFiles = fs.readdirSync(phaseDir);

    const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
    const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').sort();
    const hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
    const hasContext = phaseFiles.some(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
    const hasVerification = phaseFiles.some(f => f.endsWith('-VERIFICATION.md') || f === 'VERIFICATION.md');

    const completedPlanIds = new Set(
      summaries.map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', ''))
    );
    const incompletePlans = plans.filter(p => {
      const planId = p.replace('-PLAN.md', '').replace('PLAN.md', '');
      return !completedPlanIds.has(planId);
    });

    return {
      found: true,
      directory: path.join(relBase, match),
      phase_number: phaseNumber,
      phase_name: phaseName,
      phase_slug: phaseName ? phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null,
      plans,
      summaries,
      incomplete_plans: incompletePlans,
      has_research: hasResearch,
      has_context: hasContext,
      has_verification: hasVerification,
    };
  } catch {
    return null;
  }
}

function findPhaseInternal(cwd, phase) {
  if (!phase) return null;

  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);

  // Search current phases first
  const current = searchPhaseInDir(phasesDir, path.join('.planning', 'phases'), normalized);
  if (current) return current;

  // Search archived milestone phases (newest first)
  const milestonesDir = path.join(cwd, '.planning', 'milestones');
  if (!fs.existsSync(milestonesDir)) return null;

  try {
    const milestoneEntries = fs.readdirSync(milestonesDir, { withFileTypes: true });
    const archiveDirs = milestoneEntries
      .filter(e => e.isDirectory() && /^v[\d.]+-phases$/.test(e.name))
      .map(e => e.name)
      .sort()
      .reverse();

    for (const archiveName of archiveDirs) {
      const version = archiveName.match(/^(v[\d.]+)-phases$/)[1];
      const archivePath = path.join(milestonesDir, archiveName);
      const relBase = path.join('.planning', 'milestones', archiveName);
      const result = searchPhaseInDir(archivePath, relBase, normalized);
      if (result) {
        result.archived = version;
        return result;
      }
    }
  } catch {}

  return null;
}

function getRoadmapPhaseInternal(cwd, phaseNum) {
  if (!phaseNum) return null;
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) return null;

  try {
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    const escapedPhase = phaseNum.toString().replace(/\./g, '\\.');
    const phasePattern = new RegExp(`#{2,4}\\s*Phase\\s+${escapedPhase}:\\s*([^\\n]+)`, 'i');
    const headerMatch = content.match(phasePattern);
    if (!headerMatch) return null;

    const phaseName = headerMatch[1].trim();
    const headerIndex = headerMatch.index;
    const restOfContent = content.slice(headerIndex);
    const nextHeaderMatch = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i);
    const sectionEnd = nextHeaderMatch ? headerIndex + nextHeaderMatch.index : content.length;
    const section = content.slice(headerIndex, sectionEnd).trim();

    const goalMatch = section.match(/\*\*Goal(?::\*\*|\*\*:)\s*([^\n]+)/i);
    const goal = goalMatch ? goalMatch[1].trim() : null;

    return {
      found: true,
      phase_number: phaseNum.toString(),
      phase_name: phaseName,
      goal,
      section,
    };
  } catch {
    return null;
  }
}

function extractPhaseRequirementIds(cwd, phaseNum) {
  const phaseData = getRoadmapPhaseInternal(cwd, phaseNum);
  if (!phaseData || !phaseData.section) return [];
  const reqMatch = phaseData.section.match(/\*\*Requirements(?:\*\*:|\*\*:\s*|:\*\*\s*)([^\n]+)/i);
  if (!reqMatch) return [];
  const raw = reqMatch[1].replace(/^\s*\[?\s*/, '').replace(/\s*\]?\s*$/, '');
  return raw.split(/[,\s]+/).map(s => s.trim()).filter(s => /^[A-Z]+-\d+$/.test(s));
}

function pathExistsInternal(cwd, targetPath) {
  const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath);
  try {
    fs.statSync(fullPath);
    return true;
  } catch {
    return false;
  }
}

function generateSlugInternal(text) {
  if (!text) return null;
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getMilestoneInfo(cwd) {
  try {
    const roadmap = fs.readFileSync(path.join(cwd, '.planning', 'ROADMAP.md'), 'utf-8');
    const versionMatch = roadmap.match(/v(\d+\.\d+)/);
    const nameMatch = roadmap.match(/## .*v\d+\.\d+[:\s]+([^\n(]+)/);
    return {
      version: versionMatch ? versionMatch[0] : 'v1.0',
      name: nameMatch ? nameMatch[1].trim() : 'milestone',
    };
  } catch {
    return { version: 'v1.0', name: 'milestone' };
  }
}

function cmdInitExecutePhase(cwd, phase, includes, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  ensureWtConfig(cwd);
  if (!phase) {
    error('phase required for init execute-phase');
  }

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);
  const milestone = getMilestoneInfo(cwd);

  const result = {
    // Models
    executor_model: resolveModelInternal(cwd, 'mow-executor'),
    verifier_model: resolveModelInternal(cwd, 'mow-verifier'),

    // Config flags
    commit_docs: config.commit_docs,
    parallelization: config.parallelization,
    branching_strategy: config.branching_strategy,
    phase_branch_template: config.phase_branch_template,
    milestone_branch_template: config.milestone_branch_template,
    verifier_enabled: config.verifier,

    // Phase info
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,

    // Plan inventory
    plans: phaseInfo?.plans || [],
    summaries: phaseInfo?.summaries || [],
    incomplete_plans: phaseInfo?.incomplete_plans || [],
    plan_count: phaseInfo?.plans?.length || 0,
    incomplete_count: phaseInfo?.incomplete_plans?.length || 0,

    // Branch name (pre-computed)
    branch_name: config.branching_strategy === 'phase' && phaseInfo
      ? config.phase_branch_template
          .replace('{phase}', phaseInfo.phase_number)
          .replace('{slug}', phaseInfo.phase_slug || 'phase')
      : config.branching_strategy === 'milestone'
        ? config.milestone_branch_template
            .replace('{milestone}', milestone.version)
            .replace('{slug}', generateSlugInternal(milestone.name) || 'milestone')
        : null,

    // Milestone info
    milestone_version: milestone.version,
    milestone_name: milestone.name,
    milestone_slug: generateSlugInternal(milestone.name),

    // File existence
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    config_exists: pathExistsInternal(cwd, '.planning/config.json'),

    // Phase requirement IDs
    phase_requirement_ids: extractPhaseRequirementIds(cwd, phase),

    // Executor config
    max_task_attempts: config.max_task_attempts,

    // Agent Teams
    agent_teams_enabled: checkAgentTeams().enabled,
    agent_teams_nudge_dismissed: getAgentTeamsNudgeDismissed(cwd),
  };

  // Include file contents if requested via --include
  if (includes.has('state')) {
    result.state_content = safeReadFile(path.join(cwd, '.planning', 'STATE.md'));
  }
  if (includes.has('config')) {
    result.config_content = safeReadFile(path.join(cwd, '.planning', 'config.json'));
  }
  if (includes.has('roadmap')) {
    result.roadmap_content = safeReadFile(path.join(cwd, '.planning', 'ROADMAP.md'));
  }

  output(result, raw);
}

function cmdInitPlanPhase(cwd, phase, includes, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  if (!phase) {
    error('phase required for init plan-phase');
  }

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const result = {
    // Models
    researcher_model: resolveModelInternal(cwd, 'mow-phase-researcher'),
    planner_model: resolveModelInternal(cwd, 'mow-planner'),
    checker_model: resolveModelInternal(cwd, 'mow-plan-checker'),

    // Workflow flags
    research_enabled: config.research,
    plan_checker_enabled: config.plan_checker,
    commit_docs: config.commit_docs,

    // Phase info
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number?.padStart(2, '0') || null,

    // Existing artifacts
    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_plans: (phaseInfo?.plans?.length || 0) > 0,
    plan_count: phaseInfo?.plans?.length || 0,

    // Phase requirement IDs
    phase_requirement_ids: extractPhaseRequirementIds(cwd, phase),

    // Environment
    planning_exists: pathExistsInternal(cwd, '.planning'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
  };

  // Include file contents if requested via --include
  if (includes.has('state')) {
    result.state_content = safeReadFile(path.join(cwd, '.planning', 'STATE.md'));
  }
  if (includes.has('roadmap')) {
    result.roadmap_content = safeReadFile(path.join(cwd, '.planning', 'ROADMAP.md'));
  }
  if (includes.has('requirements')) {
    result.requirements_content = safeReadFile(path.join(cwd, '.planning', 'REQUIREMENTS.md'));
  }
  if (includes.has('context') && phaseInfo?.directory) {
    // Find *-CONTEXT.md in phase directory
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contextFile = files.find(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      if (contextFile) {
        result.context_content = safeReadFile(path.join(phaseDirFull, contextFile));
      }
    } catch {}
  }
  if (includes.has('research') && phaseInfo?.directory) {
    // Find *-RESEARCH.md in phase directory
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const researchFile = files.find(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
      if (researchFile) {
        result.research_content = safeReadFile(path.join(phaseDirFull, researchFile));
      }
    } catch {}
  }
  if (includes.has('verification') && phaseInfo?.directory) {
    // Find *-VERIFICATION.md in phase directory
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const verificationFile = files.find(f => f.endsWith('-VERIFICATION.md') || f === 'VERIFICATION.md');
      if (verificationFile) {
        result.verification_content = safeReadFile(path.join(phaseDirFull, verificationFile));
      }
    } catch {}
  }
  if (includes.has('uat') && phaseInfo?.directory) {
    // Find *-UAT.md in phase directory
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const uatFile = files.find(f => f.endsWith('-UAT.md') || f === 'UAT.md');
      if (uatFile) {
        result.uat_content = safeReadFile(path.join(phaseDirFull, uatFile));
      }
    } catch {}
  }

  output(result, raw);
}

function cmdInitNewProject(cwd, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);

  // Detect Brave Search API key availability
  const homedir = require('os').homedir();
  const braveKeyFile = path.join(homedir, '.mowism', 'brave_api_key');
  const hasBraveSearch = !!(process.env.BRAVE_API_KEY || fs.existsSync(braveKeyFile));

  // Detect existing code
  let hasCode = false;
  let hasPackageFile = false;
  try {
    const files = execSync('find . -maxdepth 3 \\( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.swift" -o -name "*.java" \\) 2>/dev/null | grep -v node_modules | grep -v .git | head -5', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    hasCode = files.trim().length > 0;
  } catch {}

  hasPackageFile = pathExistsInternal(cwd, 'package.json') ||
                   pathExistsInternal(cwd, 'requirements.txt') ||
                   pathExistsInternal(cwd, 'Cargo.toml') ||
                   pathExistsInternal(cwd, 'go.mod') ||
                   pathExistsInternal(cwd, 'Package.swift');

  const result = {
    // Models
    researcher_model: resolveModelInternal(cwd, 'mow-project-researcher'),
    synthesizer_model: resolveModelInternal(cwd, 'mow-research-synthesizer'),
    roadmapper_model: resolveModelInternal(cwd, 'mow-roadmapper'),

    // Config
    commit_docs: config.commit_docs,

    // Existing state
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    has_codebase_map: pathExistsInternal(cwd, '.planning/codebase'),
    planning_exists: pathExistsInternal(cwd, '.planning'),

    // Brownfield detection
    has_existing_code: hasCode,
    has_package_file: hasPackageFile,
    is_brownfield: hasCode || hasPackageFile,
    needs_codebase_map: (hasCode || hasPackageFile) && !pathExistsInternal(cwd, '.planning/codebase'),

    // Git state
    has_git: pathExistsInternal(cwd, '.git'),

    // Enhanced search
    brave_search_available: hasBraveSearch,

    // Agent Teams
    agent_teams_enabled: checkAgentTeams().enabled,
    agent_teams_nudge_dismissed: getAgentTeamsNudgeDismissed(cwd),
  };

  output(result, raw);
}

function cmdInitNewMilestone(cwd, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);

  const result = {
    // Models
    researcher_model: resolveModelInternal(cwd, 'mow-project-researcher'),
    synthesizer_model: resolveModelInternal(cwd, 'mow-research-synthesizer'),
    roadmapper_model: resolveModelInternal(cwd, 'mow-roadmapper'),

    // Config
    commit_docs: config.commit_docs,
    research_enabled: config.research,

    // Current milestone
    current_milestone: milestone.version,
    current_milestone_name: milestone.name,

    // File existence
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
  };

  output(result, raw);
}

function cmdInitQuick(cwd, description, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);
  const now = new Date();
  const slug = description ? generateSlugInternal(description)?.substring(0, 40) : null;

  // Find next quick task number
  const quickDir = path.join(cwd, '.planning', 'quick');
  let nextNum = 1;
  try {
    const existing = fs.readdirSync(quickDir)
      .filter(f => /^\d+-/.test(f))
      .map(f => parseInt(f.split('-')[0], 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) {
      nextNum = Math.max(...existing) + 1;
    }
  } catch {}

  const result = {
    // Models
    planner_model: resolveModelInternal(cwd, 'mow-planner'),
    executor_model: resolveModelInternal(cwd, 'mow-executor'),
    checker_model: resolveModelInternal(cwd, 'mow-plan-checker'),
    verifier_model: resolveModelInternal(cwd, 'mow-verifier'),

    // Config
    commit_docs: config.commit_docs,

    // Quick task info
    next_num: nextNum,
    slug: slug,
    description: description || null,

    // Timestamps
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),

    // Paths
    quick_dir: '.planning/quick',
    task_dir: slug ? `.planning/quick/${nextNum}-${slug}` : null,

    // File existence
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
  };

  output(result, raw);
}

function cmdInitResume(cwd, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);

  // Check for interrupted agent
  let interruptedAgentId = null;
  try {
    interruptedAgentId = fs.readFileSync(path.join(cwd, '.planning', 'current-agent-id.txt'), 'utf-8').trim();
  } catch {}

  const result = {
    // File existence
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),

    // Agent state
    has_interrupted_agent: !!interruptedAgentId,
    interrupted_agent_id: interruptedAgentId,

    // Config
    commit_docs: config.commit_docs,

    // Agent Teams
    agent_teams_enabled: checkAgentTeams().enabled,
    agent_teams_nudge_dismissed: getAgentTeamsNudgeDismissed(cwd),
  };

  output(result, raw);
}

function cmdInitVerifyWork(cwd, phase, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  if (!phase) {
    error('phase required for init verify-work');
  }

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const result = {
    // Models
    planner_model: resolveModelInternal(cwd, 'mow-planner'),
    checker_model: resolveModelInternal(cwd, 'mow-plan-checker'),

    // Config
    commit_docs: config.commit_docs,

    // Phase info
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,

    // Existing artifacts
    has_verification: phaseInfo?.has_verification || false,
  };

  output(result, raw);
}

function cmdInitPhaseOp(cwd, phase, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);
  let phaseInfo = findPhaseInternal(cwd, phase);

  // Fallback to ROADMAP.md if no directory exists (e.g., Plans: TBD)
  if (!phaseInfo) {
    const roadmapPhase = getRoadmapPhaseInternal(cwd, phase);
    if (roadmapPhase?.found) {
      const phaseName = roadmapPhase.phase_name;
      phaseInfo = {
        found: true,
        directory: null,
        phase_number: roadmapPhase.phase_number,
        phase_name: phaseName,
        phase_slug: phaseName ? phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null,
        plans: [],
        summaries: [],
        incomplete_plans: [],
        has_research: false,
        has_context: false,
        has_verification: false,
      };
    }
  }

  const result = {
    // Config
    commit_docs: config.commit_docs,
    brave_search: config.brave_search,

    // Phase info
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number?.padStart(2, '0') || null,

    // Existing artifacts
    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_plans: (phaseInfo?.plans?.length || 0) > 0,
    has_verification: phaseInfo?.has_verification || false,
    plan_count: phaseInfo?.plans?.length || 0,

    // Phase requirement IDs
    phase_requirement_ids: extractPhaseRequirementIds(cwd, phase),

    // File existence
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
  };

  output(result, raw);
}

function cmdInitTodos(cwd, area, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);
  const now = new Date();

  // List todos (reuse existing logic)
  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');
  let count = 0;
  const todos = [];

  try {
    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(pendingDir, file), 'utf-8');
        const createdMatch = content.match(/^created:\s*(.+)$/m);
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        const areaMatch = content.match(/^area:\s*(.+)$/m);
        const todoArea = areaMatch ? areaMatch[1].trim() : 'general';

        if (area && todoArea !== area) continue;

        count++;
        todos.push({
          file,
          created: createdMatch ? createdMatch[1].trim() : 'unknown',
          title: titleMatch ? titleMatch[1].trim() : 'Untitled',
          area: todoArea,
          path: path.join('.planning', 'todos', 'pending', file),
        });
      } catch {}
    }
  } catch {}

  const result = {
    // Config
    commit_docs: config.commit_docs,

    // Timestamps
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),

    // Todo inventory
    todo_count: count,
    todos,
    area_filter: area || null,

    // Paths
    pending_dir: '.planning/todos/pending',
    completed_dir: '.planning/todos/completed',

    // File existence
    planning_exists: pathExistsInternal(cwd, '.planning'),
    todos_dir_exists: pathExistsInternal(cwd, '.planning/todos'),
    pending_dir_exists: pathExistsInternal(cwd, '.planning/todos/pending'),
  };

  output(result, raw);
}

function cmdInitMilestoneOp(cwd, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);

  // Count phases
  let phaseCount = 0;
  let completedPhases = 0;
  const phasesDir = path.join(cwd, '.planning', 'phases');
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    phaseCount = dirs.length;

    // Count phases with summaries (completed)
    for (const dir of dirs) {
      try {
        const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
        const hasSummary = phaseFiles.some(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
        if (hasSummary) completedPhases++;
      } catch {}
    }
  } catch {}

  // Check archive
  const archiveDir = path.join(cwd, '.planning', 'archive');
  let archivedMilestones = [];
  try {
    archivedMilestones = fs.readdirSync(archiveDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {}

  const result = {
    // Config
    commit_docs: config.commit_docs,

    // Current milestone
    milestone_version: milestone.version,
    milestone_name: milestone.name,
    milestone_slug: generateSlugInternal(milestone.name),

    // Phase counts
    phase_count: phaseCount,
    completed_phases: completedPhases,
    all_phases_complete: phaseCount > 0 && phaseCount === completedPhases,

    // Archive
    archived_milestones: archivedMilestones,
    archive_count: archivedMilestones.length,

    // File existence
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    archive_exists: pathExistsInternal(cwd, '.planning/archive'),
    phases_dir_exists: pathExistsInternal(cwd, '.planning/phases'),
  };

  output(result, raw);
}

function cmdInitMapCodebase(cwd, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);

  // Check for existing codebase maps
  const codebaseDir = path.join(cwd, '.planning', 'codebase');
  let existingMaps = [];
  try {
    existingMaps = fs.readdirSync(codebaseDir).filter(f => f.endsWith('.md'));
  } catch {}

  const result = {
    // Models
    mapper_model: resolveModelInternal(cwd, 'mow-codebase-mapper'),

    // Config
    commit_docs: config.commit_docs,
    search_gitignored: config.search_gitignored,
    parallelization: config.parallelization,

    // Paths
    codebase_dir: '.planning/codebase',

    // Existing maps
    existing_maps: existingMaps,
    has_maps: existingMaps.length > 0,

    // File existence
    planning_exists: pathExistsInternal(cwd, '.planning'),
    codebase_dir_exists: pathExistsInternal(cwd, '.planning/codebase'),
  };

  output(result, raw);
}

function cmdInitProgress(cwd, includes, raw) {
  requireWorkTrunk();
  silentWorktreeClean(cwd);
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);

  // Analyze phases
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const phases = [];
  let currentPhase = null;
  let nextPhase = null;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

    for (const dir of dirs) {
      const match = dir.match(/^(\d+(?:\.\d+)?)-?(.*)/);
      const phaseNumber = match ? match[1] : dir;
      const phaseName = match && match[2] ? match[2] : null;

      const phasePath = path.join(phasesDir, dir);
      const phaseFiles = fs.readdirSync(phasePath);

      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      const hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');

      const status = summaries.length >= plans.length && plans.length > 0 ? 'complete' :
                     plans.length > 0 ? 'in_progress' :
                     hasResearch ? 'researched' : 'pending';

      const phaseInfo = {
        number: phaseNumber,
        name: phaseName,
        directory: path.join('.planning', 'phases', dir),
        status,
        plan_count: plans.length,
        summary_count: summaries.length,
        has_research: hasResearch,
      };

      phases.push(phaseInfo);

      // Find current (first incomplete with plans) and next (first pending)
      if (!currentPhase && (status === 'in_progress' || status === 'researched')) {
        currentPhase = phaseInfo;
      }
      if (!nextPhase && status === 'pending') {
        nextPhase = phaseInfo;
      }
    }
  } catch {}

  // Check for paused work
  let pausedAt = null;
  try {
    const state = fs.readFileSync(path.join(cwd, '.planning', 'STATE.md'), 'utf-8');
    const pauseMatch = state.match(/\*\*Paused At:\*\*\s*(.+)/);
    if (pauseMatch) pausedAt = pauseMatch[1].trim();
  } catch {}

  const result = {
    // Models
    executor_model: resolveModelInternal(cwd, 'mow-executor'),
    planner_model: resolveModelInternal(cwd, 'mow-planner'),

    // Config
    commit_docs: config.commit_docs,

    // Milestone
    milestone_version: milestone.version,
    milestone_name: milestone.name,

    // Phase overview
    phases,
    phase_count: phases.length,
    completed_count: phases.filter(p => p.status === 'complete').length,
    in_progress_count: phases.filter(p => p.status === 'in_progress').length,

    // Current state
    current_phase: currentPhase,
    next_phase: nextPhase,
    paused_at: pausedAt,
    has_work_in_progress: !!currentPhase,

    // File existence
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
  };

  // Include file contents if requested via --include
  if (includes.has('state')) {
    result.state_content = safeReadFile(path.join(cwd, '.planning', 'STATE.md'));
  }
  if (includes.has('roadmap')) {
    result.roadmap_content = safeReadFile(path.join(cwd, '.planning', 'ROADMAP.md'));
  }
  if (includes.has('project')) {
    result.project_content = safeReadFile(path.join(cwd, '.planning', 'PROJECT.md'));
  }
  if (includes.has('config')) {
    result.config_content = safeReadFile(path.join(cwd, '.planning', 'config.json'));
  }

  output(result, raw);
}

// ─── Worktree Lifecycle Management ────────────────────────────────────────────

function getRepoRoot(cwd) {
  // Get the main repo root, even if cwd is inside a worktree
  try {
    const superproject = execSync('git rev-parse --show-superproject-working-tree', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (superproject) return superproject;
  } catch {}
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return cwd;
  }
}

function readManifest(cwd) {
  const root = getRepoRoot(cwd);
  const manifestPath = path.join(root, '.worktrees', 'manifest.json');
  try {
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }
  } catch {}
  return { version: '1.0', worktrees: {}, updated: null };
}

function writeManifest(cwd, manifest) {
  const root = getRepoRoot(cwd);
  const worktreeDir = path.join(root, '.worktrees');
  if (!fs.existsSync(worktreeDir)) {
    fs.mkdirSync(worktreeDir, { recursive: true });
  }
  manifest.updated = new Date().toISOString();
  const manifestPath = path.join(worktreeDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

function getDefaultBranch(cwd) {
  // Determine main or master
  try {
    const branches = execSync('git branch --list main master', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const lines = branches.split('\n').map(l => l.trim().replace(/^\*\s*/, ''));
    if (lines.includes('main')) return 'main';
    if (lines.includes('master')) return 'master';
  } catch {}
  return 'main';
}

function cmdWorktreeCreate(cwd, phase, options, raw) {
  if (!phase) { error('phase required for worktree create'); }

  const root = getRepoRoot(cwd);
  const padded = normalizePhaseName(phase);
  const wtKey = `p${padded}`;
  const wtPath = path.join('.worktrees', wtKey);
  const absWtPath = path.join(root, wtPath);
  const branch = `phase-${padded}`;
  const base = (options && options.base) || getDefaultBranch(root);

  // Read manifest
  const manifest = readManifest(root);

  // Check for existing worktree
  const existing = manifest.worktrees[wtKey];
  if (existing && fs.existsSync(absWtPath)) {
    // Reuse existing worktree
    process.stderr.write(`MOW: Reusing existing worktree for phase ${phase}\n`);

    let stashRestored = false;
    if (existing.stash_ref) {
      try {
        execSync('git stash pop', {
          cwd: absWtPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
        });
        stashRestored = true;
        existing.stash_ref = null;
      } catch {
        process.stderr.write(`MOW: Warning: could not restore stash ${existing.stash_ref}\n`);
      }
    }

    existing.status = 'active';
    writeManifest(root, manifest);

    output({ created: false, reused: true, path: wtPath, branch: existing.branch, stash_restored: stashRestored }, raw);
    return;
  }

  // If entry exists but directory is gone, remove stale entry
  if (existing && !fs.existsSync(absWtPath)) {
    delete manifest.worktrees[wtKey];
  }

  // Ensure .worktrees/ directory exists
  const worktreeDir = path.join(root, '.worktrees');
  if (!fs.existsSync(worktreeDir)) {
    fs.mkdirSync(worktreeDir, { recursive: true });
  }

  // Create new worktree
  try {
    execSync(`git worktree add ${wtPath} -b ${branch} ${base}`, {
      cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    error(`Failed to create worktree: ${err.stderr || err.message}`);
  }

  // Copy .planning/ from main worktree
  const planningDir = path.join(root, '.planning');
  const wtPlanningDir = path.join(absWtPath, '.planning');
  if (fs.existsSync(planningDir)) {
    try {
      execSync(`cp -r "${planningDir}" "${wtPlanningDir}"`, {
        encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      process.stderr.write('MOW: Warning: could not copy .planning/ to worktree\n');
    }
  }

  // Initialize STATUS.md in the new worktree
  try {
    execSync(`node "${path.join(root, 'bin', 'mow-tools.cjs')}" status init ${phase}`, {
      cwd: absWtPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    process.stderr.write('MOW: Warning: could not initialize STATUS.md in worktree\n');
  }

  // Get phase name from find-phase
  let phaseName = null;
  try {
    const phaseInfo = findPhaseInternal(root, phase);
    if (phaseInfo && phaseInfo.phase_name) {
      phaseName = phaseInfo.phase_name;
    }
  } catch {}

  // Get project name
  let projectName = 'mowism';
  try {
    projectName = path.basename(root);
  } catch {}

  // Update manifest with new entry
  manifest.project = manifest.project || projectName;
  manifest.worktrees[wtKey] = {
    path: wtPath,
    branch,
    phase: padded,
    phase_name: phaseName,
    created: new Date().toISOString(),
    status: 'active',
    stash_ref: null,
    last_commit: null,
    merged: false,
    merged_at: null,
  };
  writeManifest(root, manifest);

  output({ created: true, reused: false, path: wtPath, branch }, raw);
}

function cmdWorktreeListManifest(cwd, raw) {
  const manifest = readManifest(cwd);
  output(manifest, raw);
}

function cmdWorktreeMerge(cwd, phase, options, raw) {
  if (!phase) { error('phase required for worktree merge'); }

  const root = getRepoRoot(cwd);
  const padded = normalizePhaseName(phase);
  const branch = `phase-${padded}`;
  const into = (options && options.into) || getDefaultBranch(root);

  // Attempt merge from main worktree
  const mergeResult = execGit(root, ['merge', branch, '--no-ff', '-m', `merge: phase ${phase} into ${into}`]);

  if (mergeResult.exitCode !== 0) {
    // Check if it's a conflict
    const statusResult = execGit(root, ['diff', '--name-only', '--diff-filter=U']);
    const conflictFiles = statusResult.stdout ? statusResult.stdout.split('\n').filter(Boolean) : [];

    if (conflictFiles.length > 0) {
      output({ merged: false, conflicts: true, conflict_files: conflictFiles }, raw);
      return;
    }

    // Some other merge error
    error(`Merge failed: ${mergeResult.stderr || mergeResult.stdout}`);
  }

  // Merge succeeded -- update manifest
  const manifest = readManifest(root);
  const wtKey = `p${padded}`;
  if (manifest.worktrees[wtKey]) {
    manifest.worktrees[wtKey].merged = true;
    manifest.worktrees[wtKey].merged_at = new Date().toISOString();
    manifest.worktrees[wtKey].status = 'merged';
    writeManifest(root, manifest);
  }

  output({ merged: true, conflicts: false }, raw);
}

function cmdWorktreeStash(cwd, phase, raw) {
  if (!phase) { error('phase required for worktree stash'); }

  const root = getRepoRoot(cwd);
  const padded = normalizePhaseName(phase);
  const wtKey = `p${padded}`;
  const manifest = readManifest(root);
  const entry = manifest.worktrees[wtKey];

  if (!entry) {
    error(`No worktree found for phase ${phase} in manifest`);
  }

  const absWtPath = path.join(root, entry.path);
  if (!fs.existsSync(absWtPath)) {
    error(`Worktree directory not found: ${entry.path}`);
  }

  // Stash changes in the worktree
  try {
    execSync(`git stash push -m "mow-checkpoint-phase-${phase}"`, {
      cwd: absWtPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    // If nothing to stash, that's fine
    if (err.stderr && err.stderr.includes('No local changes')) {
      output({ stashed: false, reason: 'no changes to stash' }, raw);
      return;
    }
    error(`Failed to stash: ${err.stderr || err.message}`);
  }

  // Capture stash ref
  let stashRef = null;
  try {
    const stashList = execSync('git stash list', {
      cwd: absWtPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const firstLine = stashList.split('\n')[0];
    if (firstLine) {
      const refMatch = firstLine.match(/^(stash@\{\d+\})/);
      stashRef = refMatch ? refMatch[1] : 'stash@{0}';
    }
  } catch {}

  // Update manifest
  entry.stash_ref = stashRef;
  entry.status = 'stashed';
  writeManifest(root, manifest);

  output({ stashed: true, stash_ref: stashRef }, raw);
}

// ─── Worktree State Tracking ──────────────────────────────────────────────────

function getWorktreePath(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return cwd;
  }
}

function getCurrentBranch(cwd) {
  try {
    return execSync('git branch --show-current', { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return 'unknown';
  }
}

function ensureWorktreeSection(content) {
  if (!content.includes('## Worktree Assignments')) {
    const section = `\n## Worktree Assignments

| Worktree | Branch | Phase | Plan | Status | Started | Agent |
|----------|--------|-------|------|--------|---------|-------|\n`;
    // Insert before ## Session Continuity if it exists, otherwise append
    if (content.includes('## Session Continuity')) {
      content = content.replace('## Session Continuity', section + '\n## Session Continuity');
    } else {
      content = content.trimEnd() + '\n' + section;
    }
  }
  return content;
}

function ensureVerificationSection(content) {
  if (!content.includes('### Verification Results')) {
    const section = `\n### Verification Results

| Phase | Tier | Result | Date | Blockers |
|-------|------|--------|------|----------|\n`;
    // Insert after Worktree Assignments table, or before Session Continuity
    if (content.includes('## Worktree Assignments')) {
      // Find end of worktree table
      const wtIdx = content.indexOf('## Worktree Assignments');
      const afterWt = content.indexOf('\n##', wtIdx + 1);
      if (afterWt !== -1) {
        content = content.slice(0, afterWt) + section + content.slice(afterWt);
      } else {
        content = content.trimEnd() + section;
      }
    } else if (content.includes('## Session Continuity')) {
      content = content.replace('## Session Continuity', section + '\n## Session Continuity');
    } else {
      content = content.trimEnd() + section;
    }
  }
  return content;
}

function parseWorktreeTable(content) {
  const rows = [];
  const sectionMatch = content.match(/## Worktree Assignments\n[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n([\s\S]*?)(?=\n###|\n## |\n$|$)/);
  if (!sectionMatch) return rows;

  const tableBody = sectionMatch[1].trim();
  if (!tableBody) return rows;

  for (const line of tableBody.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 7) {
      rows.push({
        worktree: cells[0],
        branch: cells[1],
        phase: cells[2],
        plan: cells[3],
        status: cells[4],
        started: cells[5],
        agent: cells[6],
      });
    }
  }
  return rows;
}

function writeWorktreeTable(content, rows) {
  const header = `## Worktree Assignments

| Worktree | Branch | Phase | Plan | Status | Started | Agent |
|----------|--------|-------|------|--------|---------|-------|`;

  const tableRows = rows.map(r =>
    `| ${r.worktree} | ${r.branch} | ${r.phase} | ${r.plan} | ${r.status} | ${r.started} | ${r.agent} |`
  ).join('\n');

  const newSection = header + '\n' + tableRows;

  // Replace existing section
  const sectionPattern = /## Worktree Assignments\n[\s\S]*?(?=\n###|\n## |\n$|$)/;
  if (sectionPattern.test(content)) {
    return content.replace(sectionPattern, newSection);
  }
  return content;
}

function cmdWorktreeClaim(cwd, phase, raw) {
  if (!phase) { error('phase required for worktree claim'); }

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { error('STATE.md not found'); }

  let content = fs.readFileSync(statePath, 'utf-8');
  content = ensureWorktreeSection(content);

  const rows = parseWorktreeTable(content);
  const wtPath = getWorktreePath(cwd);

  // Check for conflict: phase already claimed by ANOTHER worktree
  const existing = rows.find(r => r.phase === phase && r.worktree !== wtPath);
  if (existing) {
    error(`Phase ${phase} is being executed by ${existing.worktree} (started ${existing.started}). Cannot claim the same phase from another worktree.\n\nRun \`/mow:worktree-status\` for details or \`/mow:progress\` for a summary, or execute a different phase.`);
  }

  // Check if already claimed by this worktree (idempotent)
  const selfClaim = rows.find(r => r.phase === phase && r.worktree === wtPath);
  if (selfClaim) {
    output({ claimed: true, already_claimed: true, worktree: wtPath, phase }, raw);
    return;
  }

  const branch = getCurrentBranch(cwd);
  const timestamp = new Date().toISOString();
  const agent = process.env.CLAUDE_SESSION_ID || process.env.HOSTNAME || 'unknown';

  rows.push({
    worktree: wtPath,
    branch,
    phase,
    plan: '\u2014',
    status: 'executing',
    started: timestamp,
    agent,
  });

  content = writeWorktreeTable(content, rows);
  fs.writeFileSync(statePath, content, 'utf-8');

  // Commit if configured
  const config = loadConfig(cwd);
  if (config.commit_docs) {
    try {
      execGit(cwd, ['add', '.planning/STATE.md']);
      execGit(cwd, ['commit', '-m', `chore: claim phase ${phase} for worktree ${path.basename(wtPath)}`]);
    } catch {}
  }

  output({ claimed: true, already_claimed: false, worktree: wtPath, phase, branch, agent }, raw);
}

function cmdWorktreeRelease(cwd, phase, raw) {
  if (!phase) { error('phase required for worktree release'); }

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { error('STATE.md not found'); }

  let content = fs.readFileSync(statePath, 'utf-8');
  content = ensureWorktreeSection(content);

  const rows = parseWorktreeTable(content);
  const wtPath = getWorktreePath(cwd);

  const newRows = rows.filter(r => !(r.worktree === wtPath && r.phase === phase));
  const released = newRows.length < rows.length;

  content = writeWorktreeTable(content, newRows);
  fs.writeFileSync(statePath, content, 'utf-8');

  output({ released, worktree: wtPath, phase }, raw);
}

function cmdWorktreeStatus(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) {
    output([], raw);
    return;
  }

  const content = fs.readFileSync(statePath, 'utf-8');
  const rows = parseWorktreeTable(content);
  output(rows, raw);
}

function cmdWorktreeUpdatePlan(cwd, phase, planId, raw) {
  if (!phase || !planId) { error('phase and plan-id required for worktree update-plan'); }

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { error('STATE.md not found'); }

  let content = fs.readFileSync(statePath, 'utf-8');
  content = ensureWorktreeSection(content);

  const rows = parseWorktreeTable(content);
  const wtPath = getWorktreePath(cwd);

  let updated = false;
  for (const row of rows) {
    if (row.worktree === wtPath && row.phase === phase) {
      row.plan = planId;
      updated = true;
      break;
    }
  }

  if (updated) {
    content = writeWorktreeTable(content, rows);
    fs.writeFileSync(statePath, content, 'utf-8');
  }

  output({ updated, worktree: wtPath, phase, plan: planId }, raw);
}

function getActiveWorktrees(cwd) {
  try {
    const wtOutput = execSync('wt list --format=json 2>&1', {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(wtOutput);
    // wt list returns array of objects with 'path' field
    return Array.isArray(parsed) ? parsed.map(w => w.path || w.directory || w.dir || '') : [];
  } catch {
    return null; // null means wt list failed — don't clean
  }
}

function cmdWorktreeClean(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) {
    output({ cleaned: 0, released: [] }, raw);
    return;
  }

  let content = fs.readFileSync(statePath, 'utf-8');
  if (!content.includes('## Worktree Assignments')) {
    output({ cleaned: 0, released: [] }, raw);
    return;
  }

  const activeWorktrees = getActiveWorktrees();
  if (activeWorktrees === null) {
    // wt list failed — don't clean
    output({ cleaned: 0, released: [], error: 'wt list failed' }, raw);
    return;
  }

  const rows = parseWorktreeTable(content);
  const released = [];
  const newRows = rows.filter(r => {
    const isActive = activeWorktrees.some(w => w === r.worktree || w.endsWith('/' + path.basename(r.worktree)));
    if (!isActive) {
      released.push(r.worktree);
      process.stderr.write(`MOW: Released stale claim for ${r.worktree} (worktree no longer exists)\n`);
    }
    return isActive;
  });

  if (released.length > 0) {
    content = writeWorktreeTable(content, newRows);
    fs.writeFileSync(statePath, content, 'utf-8');
  }

  output({ cleaned: released.length, released }, raw);
}

function silentWorktreeClean(cwd) {
  // Silent stale cleanup — called on every init, wrapped in try/catch
  try {
    const statePath = path.join(cwd, '.planning', 'STATE.md');
    if (!fs.existsSync(statePath)) return;
    const content = fs.readFileSync(statePath, 'utf-8');
    if (!content.includes('## Worktree Assignments')) return;

    const rows = parseWorktreeTable(content);
    if (rows.length === 0) return;

    const activeWorktrees = getActiveWorktrees();
    if (activeWorktrees === null) return;

    const released = [];
    const newRows = rows.filter(r => {
      const isActive = activeWorktrees.some(w => w === r.worktree || w.endsWith('/' + path.basename(r.worktree)));
      if (!isActive) {
        released.push(r.worktree);
        process.stderr.write(`MOW: Released stale claim for ${r.worktree} (worktree no longer exists)\n`);
      }
      return isActive;
    });

    if (released.length > 0) {
      const newContent = writeWorktreeTable(content, newRows);
      fs.writeFileSync(statePath, newContent, 'utf-8');
    }
  } catch {
    // Silent — never block init
  }
}

function cmdWorktreeVerifyResult(cwd, phase, options, raw) {
  if (!phase) { error('phase required for worktree verify-result'); }
  const { tier, result: verifyResult, blockers } = options;
  if (!tier || !verifyResult) { error('--tier and --result required for worktree verify-result'); }

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { error('STATE.md not found'); }

  let content = fs.readFileSync(statePath, 'utf-8');
  content = ensureWorktreeSection(content);
  content = ensureVerificationSection(content);

  const date = new Date().toISOString().split('T')[0];
  const blockersStr = blockers || 'none';
  const newRow = `| ${phase} | ${tier} | ${verifyResult} | ${date} | ${blockersStr} |`;

  // Find Verification Results table and append/update
  const vrPattern = /(### Verification Results\n[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n)([\s\S]*?)(?=\n###|\n## |\n$|$)/;
  const vrMatch = content.match(vrPattern);

  if (vrMatch) {
    let tableBody = vrMatch[2].trim();
    // Check if this phase+tier already has an entry — update it
    const existingPattern = new RegExp(`^\\|\\s*${phase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|\\s*${tier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|.*$`, 'm');
    if (existingPattern.test(tableBody)) {
      tableBody = tableBody.replace(existingPattern, newRow);
    } else {
      tableBody = tableBody ? tableBody + '\n' + newRow : newRow;
    }
    content = content.replace(vrPattern, vrMatch[1] + tableBody);
  }

  fs.writeFileSync(statePath, content, 'utf-8');
  output({ recorded: true, phase, tier, result: verifyResult, date, blockers: blockersStr }, raw);
}

// ─── Agent Team Status ──────────────────────────────────────────────────────

function parseTeammateTable(content) {
  const rows = [];
  const sectionMatch = content.match(/## Agent Team Status\n[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n([\s\S]*?)(?=\n###|\n## |\n$|$)/);
  if (!sectionMatch) return rows;

  const tableBody = sectionMatch[1].trim();
  if (!tableBody) return rows;

  for (const line of tableBody.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 5) {
      rows.push({
        name: cells[0],
        worktree: cells[1],
        task: cells[2],
        status: cells[3],
        last_update: cells[4],
      });
    }
  }
  return rows;
}

function writeTeammateTable(content, teamName, started, rows) {
  const header = `## Agent Team Status

**Team:** ${teamName}
**Started:** ${started}

| Teammate | Worktree | Task | Status | Last Update |
|----------|----------|------|--------|-------------|`;

  const tableRows = rows.map(r =>
    `| ${r.name} | ${r.worktree} | ${r.task} | ${r.status} | ${r.last_update} |`
  ).join('\n');

  const newSection = header + '\n' + tableRows;

  // Replace existing section
  const sectionPattern = /## Agent Team Status\n[\s\S]*?(?=\n## |\n$|$)/;
  if (sectionPattern.test(content)) {
    return content.replace(sectionPattern, newSection);
  }

  // Append before Session Continuity or at end
  const sessionPattern = /\n## Session Continuity/;
  if (sessionPattern.test(content)) {
    return content.replace(sessionPattern, '\n' + newSection + '\n\n## Session Continuity');
  }

  return content.trimEnd() + '\n\n' + newSection + '\n';
}

function parseTeamMeta(content) {
  const teamMatch = content.match(/## Agent Team Status\n\n\*\*Team:\*\*\s*(.+)\n\*\*Started:\*\*\s*(.+)\n/);
  if (!teamMatch) return { team_name: null, started: null };
  return { team_name: teamMatch[1].trim(), started: teamMatch[2].trim() };
}

function cmdTeamStatus(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) {
    output({ active: false, team_name: null, teammates: [], started: null }, raw);
    return;
  }

  const content = fs.readFileSync(statePath, 'utf-8');

  if (!content.includes('## Agent Team Status')) {
    output({ active: false, team_name: null, teammates: [], started: null }, raw);
    return;
  }

  const meta = parseTeamMeta(content);
  const teammates = parseTeammateTable(content);

  output({
    active: true,
    team_name: meta.team_name,
    teammates,
    started: meta.started,
  }, raw);
}

function cmdTeamUpdate(cwd, options, raw) {
  const { action, teamName, name, worktree, task, status } = options;

  if (!action) { error('--action required for team-update'); }

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { error('STATE.md not found'); }

  let content = fs.readFileSync(statePath, 'utf-8');
  const date = new Date().toISOString().split('T')[0];

  switch (action) {
    case 'start': {
      if (!teamName) { error('--team-name required for team-update start'); }

      // Create the Agent Team Status section
      const section = writeTeammateTable('', teamName, date, []);
      // If section already exists, replace it
      if (content.includes('## Agent Team Status')) {
        content = writeTeammateTable(content, teamName, date, []);
      } else {
        // Insert before Session Continuity or at end
        const sessionPattern = /\n## Session Continuity/;
        if (sessionPattern.test(content)) {
          content = content.replace(sessionPattern, '\n' + section + '\n\n## Session Continuity');
        } else {
          content = content.trimEnd() + '\n\n' + section + '\n';
        }
      }
      fs.writeFileSync(statePath, content, 'utf-8');
      output({ started: true, team_name: teamName, date }, raw);
      break;
    }

    case 'add-teammate': {
      if (!name) { error('--name required for team-update add-teammate'); }

      if (!content.includes('## Agent Team Status')) {
        error('No Agent Team Status section found. Run team-update --action start first.');
      }

      const meta = parseTeamMeta(content);
      const teammates = parseTeammateTable(content);
      teammates.push({
        name,
        worktree: worktree || '\u2014',
        task: task || '\u2014',
        status: status || 'active',
        last_update: date,
      });
      content = writeTeammateTable(content, meta.team_name, meta.started, teammates);
      fs.writeFileSync(statePath, content, 'utf-8');
      output({ added: true, name, worktree: worktree || '\u2014', task: task || '\u2014' }, raw);
      break;
    }

    case 'update-teammate': {
      if (!name) { error('--name required for team-update update-teammate'); }

      if (!content.includes('## Agent Team Status')) {
        error('No Agent Team Status section found.');
      }

      const meta = parseTeamMeta(content);
      const teammates = parseTeammateTable(content);
      const teammate = teammates.find(t => t.name === name);
      if (!teammate) {
        error(`Teammate not found: ${name}`);
      }

      if (status) teammate.status = status;
      if (task) teammate.task = task;
      teammate.last_update = date;

      content = writeTeammateTable(content, meta.team_name, meta.started, teammates);
      fs.writeFileSync(statePath, content, 'utf-8');
      output({ updated: true, name, status: teammate.status, task: teammate.task }, raw);
      break;
    }

    case 'stop': {
      // Remove the Agent Team Status section entirely
      const sectionPattern = /\n*## Agent Team Status\n[\s\S]*?(?=\n## |\n$|$)/;
      content = content.replace(sectionPattern, '');
      fs.writeFileSync(statePath, content, 'utf-8');
      output({ stopped: true }, raw);
      break;
    }

    default:
      error(`Unknown team-update action: ${action}. Available: start, add-teammate, update-teammate, stop`);
  }
}

// ─── Active Phases Table ──────────────────────────────────────────────────────

function parseActivePhasesTable(content) {
  const rows = [];
  const sectionMatch = content.match(
    /## Active Phases\n[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n([\s\S]*?)(?=\n\*\*Next unblockable|\n## |\n$|$)/
  );
  if (!sectionMatch) return rows;
  const tableBody = sectionMatch[1].trim();
  if (!tableBody) return rows;
  for (const line of tableBody.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 6) {
      rows.push({
        phase: cells[0],
        name: cells[1],
        status: cells[2],
        worker: cells[3],
        plans: cells[4],
        last_update: cells[5],
      });
    }
  }
  return rows;
}

function writeActivePhasesTable(content, rows, nextUnblockable) {
  const header = `## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|`;

  const tableRows = rows.map(r =>
    `| ${r.phase} | ${r.name} | ${r.status} | ${r.worker} | ${r.plans} | ${r.last_update} |`
  ).join('\n');

  const metaLine = `\n**Next unblockable:** ${nextUnblockable || '--'}`;

  const newSection = header + (tableRows ? '\n' + tableRows : '') + '\n' + metaLine;

  // Replace existing section
  const sectionPattern = /## Active Phases\n[\s\S]*?(?=\n## |\n$|$)/;
  if (sectionPattern.test(content)) {
    return content.replace(sectionPattern, newSection);
  }

  // Insert before Performance Metrics or at end
  const metricsPattern = /\n## Performance Metrics/;
  if (metricsPattern.test(content)) {
    return content.replace(metricsPattern, '\n' + newSection + '\n\n## Performance Metrics');
  }

  return content.trimEnd() + '\n\n' + newSection + '\n';
}

function computeNextUnblockable(rows) {
  // Find blocked phases and determine which will be unblocked first
  const blockedRows = rows.filter(r => r.status.startsWith('blocked'));
  if (blockedRows.length === 0) return '--';

  const completedPhases = new Set(
    rows.filter(r => r.status === 'complete').map(r => r.phase)
  );

  let bestCandidate = null;
  let fewestRemaining = Infinity;

  for (const row of blockedRows) {
    // Parse blocked dependencies: "blocked (7,8)" -> ["7", "8"]
    const depMatch = row.status.match(/blocked\s*\(([^)]+)\)/);
    if (!depMatch) continue;
    const deps = depMatch[1].split(',').map(d => d.trim());
    const remaining = deps.filter(d => !completedPhases.has(d)).length;
    if (remaining < fewestRemaining) {
      fewestRemaining = remaining;
      bestCandidate = row;
    }
  }

  if (bestCandidate && fewestRemaining === 0) {
    return `Phase ${bestCandidate.phase} (${bestCandidate.name}) -- ready to unblock`;
  } else if (bestCandidate) {
    return `Phase ${bestCandidate.phase} (${bestCandidate.name}) -- ${fewestRemaining} dep(s) remaining`;
  }

  return '--';
}

function cmdStateActivePhases(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) {
    output([], raw);
    return;
  }

  const content = fs.readFileSync(statePath, 'utf-8');

  if (!content.includes('## Active Phases')) {
    output({ warning: 'No Active Phases section found in STATE.md', rows: [] }, raw);
    return;
  }

  const rows = parseActivePhasesTable(content);
  output(rows, raw);
}

function cmdStateUpdatePhaseRow(cwd, phase, options, raw) {
  if (!phase) { error('phase number required for update-phase-row'); }

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { error('STATE.md not found'); }

  let content = fs.readFileSync(statePath, 'utf-8');

  if (!content.includes('## Active Phases')) {
    error('No Active Phases section found in STATE.md. Add the section first.');
  }

  const rows = parseActivePhasesTable(content);
  const existingIdx = rows.findIndex(r => r.phase === String(phase));
  const fieldsChanged = [];
  const timestamp = new Date().toISOString();

  if (existingIdx !== -1) {
    // Update existing row
    const row = rows[existingIdx];
    if (options.status !== null && options.status !== undefined) { row.status = options.status; fieldsChanged.push('status'); }
    if (options.worker !== null && options.worker !== undefined) { row.worker = options.worker; fieldsChanged.push('worker'); }
    if (options.plans !== null && options.plans !== undefined) { row.plans = options.plans; fieldsChanged.push('plans'); }
    if (options.name !== null && options.name !== undefined) { row.name = options.name; fieldsChanged.push('name'); }
    if (options.last_update !== null && options.last_update !== undefined) {
      row.last_update = options.last_update;
    } else {
      row.last_update = timestamp;
    }
    fieldsChanged.push('last_update');
  } else {
    // Insert new row -- require at minimum name and status
    if (!options.name || !options.status) {
      error(`Phase ${phase} not found in Active Phases table. To insert a new row, provide --name and --status.`);
    }
    rows.push({
      phase: String(phase),
      name: options.name,
      status: options.status,
      worker: options.worker || '--',
      plans: options.plans || '0/0',
      last_update: options.last_update || timestamp,
    });
    fieldsChanged.push('name', 'status', 'worker', 'plans', 'last_update');
    // Sort rows by phase number
    rows.sort((a, b) => parseInt(a.phase) - parseInt(b.phase));
  }

  const nextUnblockable = computeNextUnblockable(rows);
  content = writeActivePhasesTable(content, rows, nextUnblockable);
  fs.writeFileSync(statePath, content, 'utf-8');

  output({ updated: true, phase: String(phase), fields_changed: fieldsChanged }, raw);
}

// ─── CLI Router ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const rawIndex = args.indexOf('--raw');
  const raw = rawIndex !== -1;
  if (rawIndex !== -1) args.splice(rawIndex, 1);

  const command = args[0];
  const cwd = process.cwd();

  if (!command) {
    error('Usage: mow-tools <command> [args] [--raw]\nCommands: state, status, resolve-model, find-phase, commit, verify-summary, verify, frontmatter, template, generate-slug, current-timestamp, list-todos, verify-path-exists, config-ensure-section, message, chat-log, init');
  }

  switch (command) {
    case 'state': {
      const subcommand = args[1];
      if (subcommand === 'update') {
        cmdStateUpdate(cwd, args[2], args[3]);
      } else if (subcommand === 'get') {
        cmdStateGet(cwd, args[2], raw);
      } else if (subcommand === 'patch') {
        const patches = {};
        for (let i = 2; i < args.length; i += 2) {
          const key = args[i].replace(/^--/, '');
          const value = args[i + 1];
          if (key && value !== undefined) {
            patches[key] = value;
          }
        }
        cmdStatePatch(cwd, patches, raw);
      } else if (subcommand === 'advance-plan') {
        cmdStateAdvancePlan(cwd, raw);
      } else if (subcommand === 'record-metric') {
        const phaseIdx = args.indexOf('--phase');
        const planIdx = args.indexOf('--plan');
        const durationIdx = args.indexOf('--duration');
        const tasksIdx = args.indexOf('--tasks');
        const filesIdx = args.indexOf('--files');
        cmdStateRecordMetric(cwd, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          plan: planIdx !== -1 ? args[planIdx + 1] : null,
          duration: durationIdx !== -1 ? args[durationIdx + 1] : null,
          tasks: tasksIdx !== -1 ? args[tasksIdx + 1] : null,
          files: filesIdx !== -1 ? args[filesIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'update-progress') {
        cmdStateUpdateProgress(cwd, raw);
      } else if (subcommand === 'add-decision') {
        const phaseIdx = args.indexOf('--phase');
        const summaryIdx = args.indexOf('--summary');
        const rationaleIdx = args.indexOf('--rationale');
        cmdStateAddDecision(cwd, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          summary: summaryIdx !== -1 ? args[summaryIdx + 1] : null,
          rationale: rationaleIdx !== -1 ? args[rationaleIdx + 1] : '',
        }, raw);
      } else if (subcommand === 'add-blocker') {
        const textIdx = args.indexOf('--text');
        cmdStateAddBlocker(cwd, textIdx !== -1 ? args[textIdx + 1] : null, raw);
      } else if (subcommand === 'resolve-blocker') {
        const textIdx = args.indexOf('--text');
        cmdStateResolveBlocker(cwd, textIdx !== -1 ? args[textIdx + 1] : null, raw);
      } else if (subcommand === 'record-session') {
        const stoppedIdx = args.indexOf('--stopped-at');
        const resumeIdx = args.indexOf('--resume-file');
        cmdStateRecordSession(cwd, {
          stopped_at: stoppedIdx !== -1 ? args[stoppedIdx + 1] : null,
          resume_file: resumeIdx !== -1 ? args[resumeIdx + 1] : 'None',
        }, raw);
      } else if (subcommand === 'active-phases') {
        cmdStateActivePhases(cwd, raw);
      } else if (subcommand === 'update-phase-row') {
        const phase = args[2];
        const statusIdx = args.indexOf('--status');
        const workerIdx = args.indexOf('--worker');
        const plansIdx = args.indexOf('--plans');
        const lastUpdateIdx = args.indexOf('--last-update');
        const nameIdx = args.indexOf('--name');
        cmdStateUpdatePhaseRow(cwd, phase, {
          status: statusIdx !== -1 ? args[statusIdx + 1] : null,
          worker: workerIdx !== -1 ? args[workerIdx + 1] : null,
          plans: plansIdx !== -1 ? args[plansIdx + 1] : null,
          last_update: lastUpdateIdx !== -1 ? args[lastUpdateIdx + 1] : null,
          name: nameIdx !== -1 ? args[nameIdx + 1] : null,
        }, raw);
      } else {
        cmdStateLoad(cwd, raw);
      }
      break;
    }

    case 'worktree': {
      const subcommand = args[1];
      if (subcommand === 'create') {
        const baseIdx = args.indexOf('--base');
        cmdWorktreeCreate(cwd, args[2], {
          base: baseIdx !== -1 ? args[baseIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'list-manifest') {
        cmdWorktreeListManifest(cwd, raw);
      } else if (subcommand === 'merge') {
        const intoIdx = args.indexOf('--into');
        cmdWorktreeMerge(cwd, args[2], {
          into: intoIdx !== -1 ? args[intoIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'stash') {
        cmdWorktreeStash(cwd, args[2], raw);
      } else if (subcommand === 'claim') {
        cmdWorktreeClaim(cwd, args[2], raw);
      } else if (subcommand === 'release') {
        cmdWorktreeRelease(cwd, args[2], raw);
      } else if (subcommand === 'status') {
        cmdWorktreeStatus(cwd, raw);
      } else if (subcommand === 'update-plan') {
        cmdWorktreeUpdatePlan(cwd, args[2], args[3], raw);
      } else if (subcommand === 'clean') {
        cmdWorktreeClean(cwd, raw);
      } else if (subcommand === 'verify-result') {
        const tierIdx = args.indexOf('--tier');
        const resultIdx = args.indexOf('--result');
        const blockersIdx = args.indexOf('--blockers');
        cmdWorktreeVerifyResult(cwd, args[2], {
          tier: tierIdx !== -1 ? args[tierIdx + 1] : null,
          result: resultIdx !== -1 ? args[resultIdx + 1] : null,
          blockers: blockersIdx !== -1 ? args[blockersIdx + 1] : null,
        }, raw);
      } else {
        error('Unknown worktree subcommand. Available: create, list-manifest, merge, stash, claim, release, status, update-plan, clean, verify-result');
      }
      break;
    }

    case 'status': {
      const subcommand = args[1];
      if (subcommand === 'init') {
        cmdStatusInit(cwd, args[2], raw);
      } else if (subcommand === 'read') {
        cmdStatusRead(cwd, args[2], raw);
      } else if (subcommand === 'write') {
        const planIdx = args.indexOf('--plan');
        const statusIdx = args.indexOf('--status');
        const commitIdx = args.indexOf('--commit');
        const durationIdx = args.indexOf('--duration');
        const tasksIdx = args.indexOf('--tasks');
        cmdStatusWrite(cwd, args[2], {
          plan: planIdx !== -1 ? args[planIdx + 1] : null,
          status: statusIdx !== -1 ? args[statusIdx + 1] : null,
          commit: commitIdx !== -1 ? args[commitIdx + 1] : null,
          duration: durationIdx !== -1 ? args[durationIdx + 1] : null,
          tasks: tasksIdx !== -1 ? args[tasksIdx + 1] : null,
        }, raw);
      } else if (subcommand === 'aggregate') {
        cmdStatusAggregate(cwd, args[2], raw);
      } else {
        error('Unknown status subcommand. Available: init, read, write, aggregate');
      }
      break;
    }

    case 'team-status': {
      cmdTeamStatus(cwd, raw);
      break;
    }

    case 'team-update': {
      const actionIdx = args.indexOf('--action');
      const teamNameIdx = args.indexOf('--team-name');
      const nameIdx = args.indexOf('--name');
      const worktreeIdx = args.indexOf('--worktree');
      const taskIdx = args.indexOf('--task');
      const statusIdx = args.indexOf('--status');
      cmdTeamUpdate(cwd, {
        action: actionIdx !== -1 ? args[actionIdx + 1] : null,
        teamName: teamNameIdx !== -1 ? args[teamNameIdx + 1] : null,
        name: nameIdx !== -1 ? args[nameIdx + 1] : null,
        worktree: worktreeIdx !== -1 ? args[worktreeIdx + 1] : null,
        task: taskIdx !== -1 ? args[taskIdx + 1] : null,
        status: statusIdx !== -1 ? args[statusIdx + 1] : null,
      }, raw);
      break;
    }

    case 'resolve-model': {
      cmdResolveModel(cwd, args[1], raw);
      break;
    }

    case 'find-phase': {
      cmdFindPhase(cwd, args[1], raw);
      break;
    }

    case 'commit': {
      const amend = args.includes('--amend');
      const message = args[1];
      // Parse --files flag (collect args after --files, stopping at other flags)
      const filesIndex = args.indexOf('--files');
      const files = filesIndex !== -1 ? args.slice(filesIndex + 1).filter(a => !a.startsWith('--')) : [];
      cmdCommit(cwd, message, files, raw, amend);
      break;
    }

    case 'verify-summary': {
      const summaryPath = args[1];
      const countIndex = args.indexOf('--check-count');
      const checkCount = countIndex !== -1 ? parseInt(args[countIndex + 1], 10) : 2;
      cmdVerifySummary(cwd, summaryPath, checkCount, raw);
      break;
    }

    case 'template': {
      const subcommand = args[1];
      if (subcommand === 'select') {
        cmdTemplateSelect(cwd, args[2], raw);
      } else if (subcommand === 'fill') {
        const templateType = args[2];
        const phaseIdx = args.indexOf('--phase');
        const planIdx = args.indexOf('--plan');
        const nameIdx = args.indexOf('--name');
        const typeIdx = args.indexOf('--type');
        const waveIdx = args.indexOf('--wave');
        const fieldsIdx = args.indexOf('--fields');
        const statusIdx = args.indexOf('--status');
        const workerIdx = args.indexOf('--worker');
        const worktreeIdx = args.indexOf('--worktree');
        const reasonIdx = args.indexOf('--reason');
        cmdTemplateFill(cwd, templateType, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          plan: planIdx !== -1 ? args[planIdx + 1] : null,
          name: nameIdx !== -1 ? args[nameIdx + 1] : null,
          type: typeIdx !== -1 ? args[typeIdx + 1] : 'execute',
          wave: waveIdx !== -1 ? args[waveIdx + 1] : '1',
          fields: fieldsIdx !== -1 ? JSON.parse(args[fieldsIdx + 1]) : {},
          status: statusIdx !== -1 ? args[statusIdx + 1] : null,
          worker: workerIdx !== -1 ? args[workerIdx + 1] : null,
          worktree: worktreeIdx !== -1 ? args[worktreeIdx + 1] : null,
          reason: reasonIdx !== -1 ? args[reasonIdx + 1] : null,
        }, raw);
      } else {
        error('Unknown template subcommand. Available: select, fill');
      }
      break;
    }

    case 'frontmatter': {
      const subcommand = args[1];
      const file = args[2];
      if (subcommand === 'get') {
        const fieldIdx = args.indexOf('--field');
        cmdFrontmatterGet(cwd, file, fieldIdx !== -1 ? args[fieldIdx + 1] : null, raw);
      } else if (subcommand === 'set') {
        const fieldIdx = args.indexOf('--field');
        const valueIdx = args.indexOf('--value');
        cmdFrontmatterSet(cwd, file, fieldIdx !== -1 ? args[fieldIdx + 1] : null, valueIdx !== -1 ? args[valueIdx + 1] : undefined, raw);
      } else if (subcommand === 'merge') {
        const dataIdx = args.indexOf('--data');
        cmdFrontmatterMerge(cwd, file, dataIdx !== -1 ? args[dataIdx + 1] : null, raw);
      } else if (subcommand === 'validate') {
        const schemaIdx = args.indexOf('--schema');
        cmdFrontmatterValidate(cwd, file, schemaIdx !== -1 ? args[schemaIdx + 1] : null, raw);
      } else {
        error('Unknown frontmatter subcommand. Available: get, set, merge, validate');
      }
      break;
    }

    case 'verify': {
      const subcommand = args[1];
      if (subcommand === 'plan-structure') {
        cmdVerifyPlanStructure(cwd, args[2], raw);
      } else if (subcommand === 'phase-completeness') {
        cmdVerifyPhaseCompleteness(cwd, args[2], raw);
      } else if (subcommand === 'references') {
        cmdVerifyReferences(cwd, args[2], raw);
      } else if (subcommand === 'commits') {
        cmdVerifyCommits(cwd, args.slice(2), raw);
      } else if (subcommand === 'artifacts') {
        cmdVerifyArtifacts(cwd, args[2], raw);
      } else if (subcommand === 'key-links') {
        cmdVerifyKeyLinks(cwd, args[2], raw);
      } else {
        error('Unknown verify subcommand. Available: plan-structure, phase-completeness, references, commits, artifacts, key-links');
      }
      break;
    }

    case 'generate-slug': {
      cmdGenerateSlug(args[1], raw);
      break;
    }

    case 'current-timestamp': {
      cmdCurrentTimestamp(args[1] || 'full', raw);
      break;
    }

    case 'list-todos': {
      cmdListTodos(cwd, args[1], raw);
      break;
    }

    case 'verify-path-exists': {
      cmdVerifyPathExists(cwd, args[1], raw);
      break;
    }

    case 'config-ensure-section': {
      cmdConfigEnsureSection(cwd, raw);
      break;
    }

    case 'config-set': {
      cmdConfigSet(cwd, args[1], args[2], raw);
      break;
    }

    case 'config-get': {
      cmdConfigGet(cwd, args[1], raw);
      break;
    }

    case 'config': {
      const subcommand = args[1];
      if (subcommand === 'nudge-dismiss') {
        cmdConfigNudgeDismiss(cwd, raw);
      } else {
        error('Unknown config subcommand. Available: nudge-dismiss');
      }
      break;
    }

    case 'history-digest': {
      cmdHistoryDigest(cwd, raw);
      break;
    }

    case 'phases': {
      const subcommand = args[1];
      if (subcommand === 'list') {
        const typeIndex = args.indexOf('--type');
        const phaseIndex = args.indexOf('--phase');
        const options = {
          type: typeIndex !== -1 ? args[typeIndex + 1] : null,
          phase: phaseIndex !== -1 ? args[phaseIndex + 1] : null,
          includeArchived: args.includes('--include-archived'),
        };
        cmdPhasesList(cwd, options, raw);
      } else {
        error('Unknown phases subcommand. Available: list');
      }
      break;
    }

    case 'roadmap': {
      const subcommand = args[1];
      if (subcommand === 'get-phase') {
        cmdRoadmapGetPhase(cwd, args[2], raw);
      } else if (subcommand === 'analyze') {
        cmdRoadmapAnalyze(cwd, raw);
      } else if (subcommand === 'analyze-dag') {
        cmdRoadmapAnalyzeDag(cwd, raw);
      } else if (subcommand === 'update-plan-progress') {
        cmdRoadmapUpdatePlanProgress(cwd, args[2], raw);
      } else {
        error('Unknown roadmap subcommand. Available: get-phase, analyze, analyze-dag, update-plan-progress');
      }
      break;
    }

    case 'requirements': {
      const subcommand = args[1];
      if (subcommand === 'mark-complete') {
        cmdRequirementsMarkComplete(cwd, args.slice(2), raw);
      } else {
        error('Unknown requirements subcommand. Available: mark-complete');
      }
      break;
    }

    case 'phase': {
      const subcommand = args[1];
      if (subcommand === 'next-decimal') {
        cmdPhaseNextDecimal(cwd, args[2], raw);
      } else if (subcommand === 'add') {
        cmdPhaseAdd(cwd, args.slice(2).join(' '), raw);
      } else if (subcommand === 'insert') {
        cmdPhaseInsert(cwd, args[2], args.slice(3).join(' '), raw);
      } else if (subcommand === 'remove') {
        const forceFlag = args.includes('--force');
        cmdPhaseRemove(cwd, args[2], { force: forceFlag }, raw);
      } else if (subcommand === 'complete') {
        cmdPhaseComplete(cwd, args[2], raw);
      } else {
        error('Unknown phase subcommand. Available: next-decimal, add, insert, remove, complete');
      }
      break;
    }

    case 'milestone': {
      const subcommand = args[1];
      if (subcommand === 'complete') {
        const nameIndex = args.indexOf('--name');
        const archivePhases = args.includes('--archive-phases');
        // Collect --name value (everything after --name until next flag or end)
        let milestoneName = null;
        if (nameIndex !== -1) {
          const nameArgs = [];
          for (let i = nameIndex + 1; i < args.length; i++) {
            if (args[i].startsWith('--')) break;
            nameArgs.push(args[i]);
          }
          milestoneName = nameArgs.join(' ') || null;
        }
        cmdMilestoneComplete(cwd, args[2], { name: milestoneName, archivePhases }, raw);
      } else {
        error('Unknown milestone subcommand. Available: complete');
      }
      break;
    }

    case 'validate': {
      const subcommand = args[1];
      if (subcommand === 'consistency') {
        cmdValidateConsistency(cwd, raw);
      } else if (subcommand === 'health') {
        const repairFlag = args.includes('--repair');
        cmdValidateHealth(cwd, { repair: repairFlag }, raw);
      } else {
        error('Unknown validate subcommand. Available: consistency, health');
      }
      break;
    }

    case 'progress': {
      const subcommand = args[1] || 'json';
      cmdProgressRender(cwd, subcommand, raw);
      break;
    }

    case 'todo': {
      const subcommand = args[1];
      if (subcommand === 'complete') {
        cmdTodoComplete(cwd, args[2], raw);
      } else {
        error('Unknown todo subcommand. Available: complete');
      }
      break;
    }

    case 'scaffold': {
      const scaffoldType = args[1];
      const phaseIndex = args.indexOf('--phase');
      const nameIndex = args.indexOf('--name');
      const scaffoldOptions = {
        phase: phaseIndex !== -1 ? args[phaseIndex + 1] : null,
        name: nameIndex !== -1 ? args.slice(nameIndex + 1).join(' ') : null,
      };
      cmdScaffold(cwd, scaffoldType, scaffoldOptions, raw);
      break;
    }

    case 'init': {
      const workflow = args[1];
      const includes = parseIncludeFlag(args);
      switch (workflow) {
        case 'execute-phase':
          cmdInitExecutePhase(cwd, args[2], includes, raw);
          break;
        case 'plan-phase':
          cmdInitPlanPhase(cwd, args[2], includes, raw);
          break;
        case 'new-project':
          cmdInitNewProject(cwd, raw);
          break;
        case 'new-milestone':
          cmdInitNewMilestone(cwd, raw);
          break;
        case 'quick':
          cmdInitQuick(cwd, args.slice(2).join(' '), raw);
          break;
        case 'resume':
          cmdInitResume(cwd, raw);
          break;
        case 'verify-work':
          cmdInitVerifyWork(cwd, args[2], raw);
          break;
        case 'phase-op':
          cmdInitPhaseOp(cwd, args[2], raw);
          break;
        case 'todos':
          cmdInitTodos(cwd, args[2], raw);
          break;
        case 'milestone-op':
          cmdInitMilestoneOp(cwd, raw);
          break;
        case 'map-codebase':
          cmdInitMapCodebase(cwd, raw);
          break;
        case 'progress':
          cmdInitProgress(cwd, includes, raw);
          break;
        default:
          error(`Unknown init workflow: ${workflow}\nAvailable: execute-phase, plan-phase, new-project, new-milestone, quick, resume, verify-work, phase-op, todos, milestone-op, map-codebase, progress`);
      }
      break;
    }

    case 'phase-plan-index': {
      cmdPhasePlanIndex(cwd, args[1], raw);
      break;
    }

    case 'state-snapshot': {
      cmdStateSnapshot(cwd, raw);
      break;
    }

    case 'summary-extract': {
      const summaryPath = args[1];
      const fieldsIndex = args.indexOf('--fields');
      const fields = fieldsIndex !== -1 ? args[fieldsIndex + 1].split(',') : null;
      cmdSummaryExtract(cwd, summaryPath, fields, raw);
      break;
    }

    case 'websearch': {
      const query = args[1];
      const limitIdx = args.indexOf('--limit');
      const freshnessIdx = args.indexOf('--freshness');
      await cmdWebsearch(query, {
        limit: limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10,
        freshness: freshnessIdx !== -1 ? args[freshnessIdx + 1] : null,
      }, raw);
      break;
    }

    case 'format': {
      const formatSub = args[1];
      const textIdx = args.indexOf('--text');
      const bgIdx = args.indexOf('--bg');
      const fgIdx = args.indexOf('--fg');
      const widthIdx = args.indexOf('--width');
      const phaseIdx = args.indexOf('--phase');
      const percentIdx = args.indexOf('--percent');
      const colorIdx = args.indexOf('--color');
      const isBlocked = args.includes('--blocked');

      const fmtText = textIdx !== -1 ? args[textIdx + 1] : null;
      const fmtBg = bgIdx !== -1 ? parseInt(args[bgIdx + 1], 10) : null;
      const fmtFg = fgIdx !== -1 ? parseInt(args[fgIdx + 1], 10) : null;
      const fmtWidth = widthIdx !== -1 ? parseInt(args[widthIdx + 1], 10) : undefined;
      const fmtPhase = phaseIdx !== -1 ? args[phaseIdx + 1] : null;
      const fmtPercent = percentIdx !== -1 ? parseFloat(args[percentIdx + 1]) : 0;
      const fmtColor = colorIdx !== -1 ? parseInt(args[colorIdx + 1], 10) : undefined;

      if (formatSub === 'banner') {
        const rendered = renderBanner(fmtText || 'MOW ORCHESTRATOR', fmtBg !== null ? fmtBg : 196, fmtFg !== null ? fmtFg : 231, fmtWidth);
        if (raw) {
          output({ rendered }, true, JSON.stringify({ rendered }));
        } else {
          process.stdout.write(rendered + '\n');
          process.exit(0);
        }
      } else if (formatSub === 'banner-phase') {
        if (!fmtPhase) error('--phase required for banner-phase');
        const pc = phaseColor(fmtPhase);
        const bannerText = fmtText || `PHASE ${fmtPhase}`;
        const rendered = renderBanner(bannerText, pc.bg, pc.fg, fmtWidth);
        if (raw) {
          output({ rendered }, true, JSON.stringify({ rendered }));
        } else {
          process.stdout.write(rendered + '\n');
          process.exit(0);
        }
      } else if (formatSub === 'banner-error') {
        if (!fmtText) error('--text required for banner-error');
        const rendered = renderCautionBanner(fmtText, fmtWidth);
        if (raw) {
          output({ rendered }, true, JSON.stringify({ rendered }));
        } else {
          process.stdout.write(rendered + '\n');
          process.exit(0);
        }
      } else if (formatSub === 'progress') {
        const rendered = renderProgressBar(fmtPercent, fmtWidth || 10, isBlocked, fmtColor);
        if (raw) {
          output({ rendered }, true, JSON.stringify({ rendered }));
        } else {
          process.stdout.write(rendered + '\n');
          process.exit(0);
        }
      } else {
        error('Unknown format subcommand. Available: banner, banner-phase, banner-error, progress');
      }
      break;
    }

    case 'message': {
      const subcommand = args[1];
      if (subcommand === 'format') {
        const type = args[2];
        // Collect all --key value pairs as fields
        const fields = {};
        for (let i = 3; i < args.length; i++) {
          if (args[i].startsWith('--') && args[i] !== '--raw' && args[i] !== '--summary') {
            const key = args[i].replace(/^--/, '').replace(/-/g, '_');
            fields[key] = args[i + 1];
            i++; // skip value
          }
        }
        const includeSummary = args.includes('--summary');
        cmdMessageFormat(type, fields, raw, includeSummary);
      } else if (subcommand === 'parse') {
        cmdMessageParse(args[2], raw);
      } else {
        error('Unknown message subcommand. Available: format, parse');
      }
      break;
    }

    case 'chat-log': {
      const subcommand = args[1];
      const fromIdx = args.indexOf('--from');
      const toIdx = args.indexOf('--to');
      if (subcommand === 'append') {
        const msgIdx = args.indexOf('--msg');
        cmdChatLogAppend(cwd,
          fromIdx !== -1 ? args[fromIdx + 1] : null,
          toIdx !== -1 ? args[toIdx + 1] : null,
          msgIdx !== -1 ? args[msgIdx + 1] : null,
          raw
        );
      } else if (subcommand === 'read') {
        cmdChatLogRead(cwd,
          fromIdx !== -1 ? args[fromIdx + 1] : null,
          toIdx !== -1 ? args[toIdx + 1] : null,
          raw
        );
      } else if (subcommand === 'prune') {
        const keepIdx = args.indexOf('--keep');
        cmdChatLogPrune(cwd,
          fromIdx !== -1 ? args[fromIdx + 1] : null,
          toIdx !== -1 ? args[toIdx + 1] : null,
          keepIdx !== -1 ? parseInt(args[keepIdx + 1], 10) : 200,
          raw
        );
      } else {
        error('Unknown chat-log subcommand. Available: append, read, prune');
      }
      break;
    }

    case 'dashboard': {
      const subcommand = args[1];
      if (subcommand === 'render') {
        const widthIdx = args.indexOf('--width');
        cmdDashboardRender(cwd, {
          width: widthIdx !== -1 ? parseInt(args[widthIdx + 1], 10) : undefined,
        }, raw);
      } else if (subcommand === 'event') {
        const eventSub = args[2];
        if (eventSub === 'add') {
          const typeIdx = args.indexOf('--type');
          const phaseIdx = args.indexOf('--phase');
          const detailIdx = args.indexOf('--detail');
          cmdDashboardEventAdd(cwd,
            typeIdx !== -1 ? args[typeIdx + 1] : null,
            phaseIdx !== -1 ? args[phaseIdx + 1] : null,
            detailIdx !== -1 ? args[detailIdx + 1] : null,
            raw
          );
        } else if (eventSub === 'prune') {
          const keepIdx = args.indexOf('--keep');
          cmdDashboardEventPrune(cwd,
            keepIdx !== -1 ? parseInt(args[keepIdx + 1], 10) : 50,
            raw
          );
        } else {
          error('Unknown dashboard event subcommand. Available: add, prune');
        }
      } else if (subcommand === 'state') {
        const state = readDashboardState(cwd);
        output(state, raw, JSON.stringify(state));
      } else if (subcommand === 'clear') {
        cmdDashboardClear(cwd, raw);
      } else {
        error('Unknown dashboard subcommand. Available: render, event, state, clear');
      }
      break;
    }

    default:
      error(`Unknown command: ${command}`);
  }
}

main();
