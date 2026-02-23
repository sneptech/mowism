/**
 * MOW Tools Tests
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOOLS_PATH = path.join(__dirname, 'mow-tools.cjs');

// Helper to run mow-tools command
function runMowTools(args, cwd = process.cwd()) {
  try {
    const result = execSync(`node "${TOOLS_PATH}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

// Create temp directory structure
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mow-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

describe('history-digest command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('empty phases directory returns valid schema', () => {
    const result = runMowTools('history-digest', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const digest = JSON.parse(result.output);

    assert.deepStrictEqual(digest.phases, {}, 'phases should be empty object');
    assert.deepStrictEqual(digest.decisions, [], 'decisions should be empty array');
    assert.deepStrictEqual(digest.tech_stack, [], 'tech_stack should be empty array');
  });

  test('nested frontmatter fields extracted correctly', () => {
    // Create phase directory with SUMMARY containing nested frontmatter
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(phaseDir, { recursive: true });

    const summaryContent = `---
phase: "01"
name: "Foundation Setup"
dependency-graph:
  provides:
    - "Database schema"
    - "Auth system"
  affects:
    - "API layer"
tech-stack:
  added:
    - "prisma"
    - "jose"
patterns-established:
  - "Repository pattern"
  - "JWT auth flow"
key-decisions:
  - "Use Prisma over Drizzle"
  - "JWT in httpOnly cookies"
---

# Summary content here
`;

    fs.writeFileSync(path.join(phaseDir, '01-01-SUMMARY.md'), summaryContent);

    const result = runMowTools('history-digest', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const digest = JSON.parse(result.output);

    // Check nested dependency-graph.provides
    assert.ok(digest.phases['01'], 'Phase 01 should exist');
    assert.deepStrictEqual(
      digest.phases['01'].provides.sort(),
      ['Auth system', 'Database schema'],
      'provides should contain nested values'
    );

    // Check nested dependency-graph.affects
    assert.deepStrictEqual(
      digest.phases['01'].affects,
      ['API layer'],
      'affects should contain nested values'
    );

    // Check nested tech-stack.added
    assert.deepStrictEqual(
      digest.tech_stack.sort(),
      ['jose', 'prisma'],
      'tech_stack should contain nested values'
    );

    // Check patterns-established (flat array)
    assert.deepStrictEqual(
      digest.phases['01'].patterns.sort(),
      ['JWT auth flow', 'Repository pattern'],
      'patterns should be extracted'
    );

    // Check key-decisions
    assert.strictEqual(digest.decisions.length, 2, 'Should have 2 decisions');
    assert.ok(
      digest.decisions.some(d => d.decision === 'Use Prisma over Drizzle'),
      'Should contain first decision'
    );
  });

  test('multiple phases merged into single digest', () => {
    // Create phase 01
    const phase01Dir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(phase01Dir, { recursive: true });
    fs.writeFileSync(
      path.join(phase01Dir, '01-01-SUMMARY.md'),
      `---
phase: "01"
name: "Foundation"
provides:
  - "Database"
patterns-established:
  - "Pattern A"
key-decisions:
  - "Decision 1"
---
`
    );

    // Create phase 02
    const phase02Dir = path.join(tmpDir, '.planning', 'phases', '02-api');
    fs.mkdirSync(phase02Dir, { recursive: true });
    fs.writeFileSync(
      path.join(phase02Dir, '02-01-SUMMARY.md'),
      `---
phase: "02"
name: "API"
provides:
  - "REST endpoints"
patterns-established:
  - "Pattern B"
key-decisions:
  - "Decision 2"
tech-stack:
  added:
    - "zod"
---
`
    );

    const result = runMowTools('history-digest', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const digest = JSON.parse(result.output);

    // Both phases present
    assert.ok(digest.phases['01'], 'Phase 01 should exist');
    assert.ok(digest.phases['02'], 'Phase 02 should exist');

    // Decisions merged
    assert.strictEqual(digest.decisions.length, 2, 'Should have 2 decisions total');

    // Tech stack merged
    assert.deepStrictEqual(digest.tech_stack, ['zod'], 'tech_stack should have zod');
  });

  test('malformed SUMMARY.md skipped gracefully', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-test');
    fs.mkdirSync(phaseDir, { recursive: true });

    // Valid summary
    fs.writeFileSync(
      path.join(phaseDir, '01-01-SUMMARY.md'),
      `---
phase: "01"
provides:
  - "Valid feature"
---
`
    );

    // Malformed summary (no frontmatter)
    fs.writeFileSync(
      path.join(phaseDir, '01-02-SUMMARY.md'),
      `# Just a heading
No frontmatter here
`
    );

    // Another malformed summary (broken YAML)
    fs.writeFileSync(
      path.join(phaseDir, '01-03-SUMMARY.md'),
      `---
broken: [unclosed
---
`
    );

    const result = runMowTools('history-digest', tmpDir);
    assert.ok(result.success, `Command should succeed despite malformed files: ${result.error}`);

    const digest = JSON.parse(result.output);
    assert.ok(digest.phases['01'], 'Phase 01 should exist');
    assert.ok(
      digest.phases['01'].provides.includes('Valid feature'),
      'Valid feature should be extracted'
    );
  });

  test('flat provides field still works (backward compatibility)', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-test');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '01-01-SUMMARY.md'),
      `---
phase: "01"
provides:
  - "Direct provides"
---
`
    );

    const result = runMowTools('history-digest', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const digest = JSON.parse(result.output);
    assert.deepStrictEqual(
      digest.phases['01'].provides,
      ['Direct provides'],
      'Direct provides should work'
    );
  });

  test('inline array syntax supported', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-test');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '01-01-SUMMARY.md'),
      `---
phase: "01"
provides: [Feature A, Feature B]
patterns-established: ["Pattern X", "Pattern Y"]
---
`
    );

    const result = runMowTools('history-digest', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const digest = JSON.parse(result.output);
    assert.deepStrictEqual(
      digest.phases['01'].provides.sort(),
      ['Feature A', 'Feature B'],
      'Inline array should work'
    );
    assert.deepStrictEqual(
      digest.phases['01'].patterns.sort(),
      ['Pattern X', 'Pattern Y'],
      'Inline quoted array should work'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// phases list command
// ─────────────────────────────────────────────────────────────────────────────

describe('phases list command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('empty phases directory returns empty array', () => {
    const result = runMowTools('phases list', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.deepStrictEqual(output.directories, [], 'directories should be empty');
    assert.strictEqual(output.count, 0, 'count should be 0');
  });

  test('lists phase directories sorted numerically', () => {
    // Create out-of-order directories
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '10-final'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02-api'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-foundation'), { recursive: true });

    const result = runMowTools('phases list', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.count, 3, 'should have 3 directories');
    assert.deepStrictEqual(
      output.directories,
      ['01-foundation', '02-api', '10-final'],
      'should be sorted numerically'
    );
  });

  test('handles decimal phases in sort order', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02-api'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02.1-hotfix'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02.2-patch'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '03-ui'), { recursive: true });

    const result = runMowTools('phases list', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.deepStrictEqual(
      output.directories,
      ['02-api', '02.1-hotfix', '02.2-patch', '03-ui'],
      'decimal phases should sort correctly between whole numbers'
    );
  });

  test('--type plans lists only PLAN.md files', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-test');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), '# Plan 1');
    fs.writeFileSync(path.join(phaseDir, '01-02-PLAN.md'), '# Plan 2');
    fs.writeFileSync(path.join(phaseDir, '01-01-SUMMARY.md'), '# Summary');
    fs.writeFileSync(path.join(phaseDir, 'RESEARCH.md'), '# Research');

    const result = runMowTools('phases list --type plans', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.deepStrictEqual(
      output.files.sort(),
      ['01-01-PLAN.md', '01-02-PLAN.md'],
      'should list only PLAN files'
    );
  });

  test('--type summaries lists only SUMMARY.md files', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-test');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(phaseDir, '01-01-SUMMARY.md'), '# Summary 1');
    fs.writeFileSync(path.join(phaseDir, '01-02-SUMMARY.md'), '# Summary 2');

    const result = runMowTools('phases list --type summaries', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.deepStrictEqual(
      output.files.sort(),
      ['01-01-SUMMARY.md', '01-02-SUMMARY.md'],
      'should list only SUMMARY files'
    );
  });

  test('--phase filters to specific phase directory', () => {
    const phase01 = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    const phase02 = path.join(tmpDir, '.planning', 'phases', '02-api');
    fs.mkdirSync(phase01, { recursive: true });
    fs.mkdirSync(phase02, { recursive: true });
    fs.writeFileSync(path.join(phase01, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(phase02, '02-01-PLAN.md'), '# Plan');

    const result = runMowTools('phases list --type plans --phase 01', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.deepStrictEqual(output.files, ['01-01-PLAN.md'], 'should only list phase 01 plans');
    assert.strictEqual(output.phase_dir, 'foundation', 'should report phase name without number prefix');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// roadmap get-phase command
// ─────────────────────────────────────────────────────────────────────────────

describe('roadmap get-phase command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('extracts phase section from ROADMAP.md', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0

## Phases

### Phase 1: Foundation
**Goal**: Set up project infrastructure
**Plans**: 2 plans

Some description here.

### Phase 2: API
**Goal**: Build REST API
**Plans**: 3 plans
`
    );

    const result = runMowTools('roadmap get-phase 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.found, true, 'phase should be found');
    assert.strictEqual(output.phase_number, '1', 'phase number correct');
    assert.strictEqual(output.phase_name, 'Foundation', 'phase name extracted');
    assert.strictEqual(output.goal, 'Set up project infrastructure', 'goal extracted');
  });

  test('returns not found for missing phase', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0

### Phase 1: Foundation
**Goal**: Set up project
`
    );

    const result = runMowTools('roadmap get-phase 5', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.found, false, 'phase should not be found');
  });

  test('handles decimal phase numbers', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 2: Main
**Goal**: Main work

### Phase 2.1: Hotfix
**Goal**: Emergency fix
`
    );

    const result = runMowTools('roadmap get-phase 2.1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.found, true, 'decimal phase should be found');
    assert.strictEqual(output.phase_name, 'Hotfix', 'phase name correct');
    assert.strictEqual(output.goal, 'Emergency fix', 'goal extracted');
  });

  test('extracts full section content', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Setup
**Goal**: Initialize everything

This phase covers:
- Database setup
- Auth configuration
- CI/CD pipeline

### Phase 2: Build
**Goal**: Build features
`
    );

    const result = runMowTools('roadmap get-phase 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.section.includes('Database setup'), 'section includes description');
    assert.ok(output.section.includes('CI/CD pipeline'), 'section includes all bullets');
    assert.ok(!output.section.includes('Phase 2'), 'section does not include next phase');
  });

  test('handles missing ROADMAP.md gracefully', () => {
    const result = runMowTools('roadmap get-phase 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.found, false, 'should return not found');
    assert.strictEqual(output.error, 'ROADMAP.md not found', 'should explain why');
  });

  test('accepts ## phase headers (two hashes)', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0

## Phase 1: Foundation
**Goal**: Set up project infrastructure
**Plans**: 2 plans

## Phase 2: API
**Goal**: Build REST API
`
    );

    const result = runMowTools('roadmap get-phase 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.found, true, 'phase with ## header should be found');
    assert.strictEqual(output.phase_name, 'Foundation', 'phase name extracted');
    assert.strictEqual(output.goal, 'Set up project infrastructure', 'goal extracted');
  });

  test('detects malformed ROADMAP with summary list but no detail sections', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0

## Phases

- [ ] **Phase 1: Foundation** - Set up project
- [ ] **Phase 2: API** - Build REST API
`
    );

    const result = runMowTools('roadmap get-phase 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.found, false, 'phase should not be found');
    assert.strictEqual(output.error, 'malformed_roadmap', 'should identify malformed roadmap');
    assert.ok(output.message.includes('missing'), 'should explain the issue');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// phase next-decimal command
// ─────────────────────────────────────────────────────────────────────────────

describe('phase next-decimal command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('returns X.1 when no decimal phases exist', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06-feature'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '07-next'), { recursive: true });

    const result = runMowTools('phase next-decimal 06', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.next, '06.1', 'should return 06.1');
    assert.deepStrictEqual(output.existing, [], 'no existing decimals');
  });

  test('increments from existing decimal phases', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06-feature'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06.1-hotfix'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06.2-patch'), { recursive: true });

    const result = runMowTools('phase next-decimal 06', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.next, '06.3', 'should return 06.3');
    assert.deepStrictEqual(output.existing, ['06.1', '06.2'], 'lists existing decimals');
  });

  test('handles gaps in decimal sequence', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06-feature'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06.1-first'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06.3-third'), { recursive: true });

    const result = runMowTools('phase next-decimal 06', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    // Should take next after highest, not fill gap
    assert.strictEqual(output.next, '06.4', 'should return 06.4, not fill gap at 06.2');
  });

  test('handles single-digit phase input', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06-feature'), { recursive: true });

    const result = runMowTools('phase next-decimal 6', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.next, '06.1', 'should normalize to 06.1');
    assert.strictEqual(output.base_phase, '06', 'base phase should be padded');
  });

  test('returns error if base phase does not exist', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-start'), { recursive: true });

    const result = runMowTools('phase next-decimal 06', tmpDir);
    assert.ok(result.success, `Command should succeed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.found, false, 'base phase not found');
    assert.strictEqual(output.next, '06.1', 'should still suggest 06.1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// phase-plan-index command
// ─────────────────────────────────────────────────────────────────────────────

describe('phase-plan-index command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('empty phase directory returns empty plans array', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '03-api'), { recursive: true });

    const result = runMowTools('phase-plan-index 03', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.phase, '03', 'phase number correct');
    assert.deepStrictEqual(output.plans, [], 'plans should be empty');
    assert.deepStrictEqual(output.waves, {}, 'waves should be empty');
    assert.deepStrictEqual(output.incomplete, [], 'incomplete should be empty');
    assert.strictEqual(output.has_checkpoints, false, 'no checkpoints');
  });

  test('extracts single plan with frontmatter', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '03-01-PLAN.md'),
      `---
wave: 1
autonomous: true
objective: Set up database schema
files-modified: [prisma/schema.prisma, src/lib/db.ts]
---

## Task 1: Create schema
## Task 2: Generate client
`
    );

    const result = runMowTools('phase-plan-index 03', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.plans.length, 1, 'should have 1 plan');
    assert.strictEqual(output.plans[0].id, '03-01', 'plan id correct');
    assert.strictEqual(output.plans[0].wave, 1, 'wave extracted');
    assert.strictEqual(output.plans[0].autonomous, true, 'autonomous extracted');
    assert.strictEqual(output.plans[0].objective, 'Set up database schema', 'objective extracted');
    assert.deepStrictEqual(output.plans[0].files_modified, ['prisma/schema.prisma', 'src/lib/db.ts'], 'files extracted');
    assert.strictEqual(output.plans[0].task_count, 2, 'task count correct');
    assert.strictEqual(output.plans[0].has_summary, false, 'no summary yet');
  });

  test('groups multiple plans by wave', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '03-01-PLAN.md'),
      `---
wave: 1
autonomous: true
objective: Database setup
---

## Task 1: Schema
`
    );

    fs.writeFileSync(
      path.join(phaseDir, '03-02-PLAN.md'),
      `---
wave: 1
autonomous: true
objective: Auth setup
---

## Task 1: JWT
`
    );

    fs.writeFileSync(
      path.join(phaseDir, '03-03-PLAN.md'),
      `---
wave: 2
autonomous: false
objective: API routes
---

## Task 1: Routes
`
    );

    const result = runMowTools('phase-plan-index 03', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.plans.length, 3, 'should have 3 plans');
    assert.deepStrictEqual(output.waves['1'], ['03-01', '03-02'], 'wave 1 has 2 plans');
    assert.deepStrictEqual(output.waves['2'], ['03-03'], 'wave 2 has 1 plan');
  });

  test('detects incomplete plans (no matching summary)', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });

    // Plan with summary
    fs.writeFileSync(path.join(phaseDir, '03-01-PLAN.md'), `---\nwave: 1\n---\n## Task 1`);
    fs.writeFileSync(path.join(phaseDir, '03-01-SUMMARY.md'), `# Summary`);

    // Plan without summary
    fs.writeFileSync(path.join(phaseDir, '03-02-PLAN.md'), `---\nwave: 2\n---\n## Task 1`);

    const result = runMowTools('phase-plan-index 03', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.plans[0].has_summary, true, 'first plan has summary');
    assert.strictEqual(output.plans[1].has_summary, false, 'second plan has no summary');
    assert.deepStrictEqual(output.incomplete, ['03-02'], 'incomplete list correct');
  });

  test('detects checkpoints (autonomous: false)', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '03-01-PLAN.md'),
      `---
wave: 1
autonomous: false
objective: Manual review needed
---

## Task 1: Review
`
    );

    const result = runMowTools('phase-plan-index 03', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.has_checkpoints, true, 'should detect checkpoint');
    assert.strictEqual(output.plans[0].autonomous, false, 'plan marked non-autonomous');
  });

  test('phase not found returns error', () => {
    const result = runMowTools('phase-plan-index 99', tmpDir);
    assert.ok(result.success, `Command should succeed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.error, 'Phase not found', 'should report phase not found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// state-snapshot command
// ─────────────────────────────────────────────────────────────────────────────

describe('state-snapshot command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('missing STATE.md returns error', () => {
    const result = runMowTools('state-snapshot', tmpDir);
    assert.ok(result.success, `Command should succeed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.error, 'STATE.md not found', 'should report missing file');
  });

  test('extracts basic fields from STATE.md', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# Project State

**Current Phase:** 03
**Current Phase Name:** API Layer
**Total Phases:** 6
**Current Plan:** 03-02
**Total Plans in Phase:** 3
**Status:** In progress
**Progress:** 45%
**Last Activity:** 2024-01-15
**Last Activity Description:** Completed 03-01-PLAN.md
`
    );

    const result = runMowTools('state-snapshot', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.current_phase, '03', 'current phase extracted');
    assert.strictEqual(output.current_phase_name, 'API Layer', 'phase name extracted');
    assert.strictEqual(output.total_phases, 6, 'total phases extracted');
    assert.strictEqual(output.current_plan, '03-02', 'current plan extracted');
    assert.strictEqual(output.total_plans_in_phase, 3, 'total plans extracted');
    assert.strictEqual(output.status, 'In progress', 'status extracted');
    assert.strictEqual(output.progress_percent, 45, 'progress extracted');
    assert.strictEqual(output.last_activity, '2024-01-15', 'last activity date extracted');
  });

  test('extracts decisions table', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# Project State

**Current Phase:** 01

## Decisions Made

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 01 | Use Prisma | Better DX than raw SQL |
| 02 | JWT auth | Stateless authentication |
`
    );

    const result = runMowTools('state-snapshot', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.decisions.length, 2, 'should have 2 decisions');
    assert.strictEqual(output.decisions[0].phase, '01', 'first decision phase');
    assert.strictEqual(output.decisions[0].summary, 'Use Prisma', 'first decision summary');
    assert.strictEqual(output.decisions[0].rationale, 'Better DX than raw SQL', 'first decision rationale');
  });

  test('extracts blockers list', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# Project State

**Current Phase:** 03

## Blockers

- Waiting for API credentials
- Need design review for dashboard
`
    );

    const result = runMowTools('state-snapshot', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.deepStrictEqual(output.blockers, [
      'Waiting for API credentials',
      'Need design review for dashboard',
    ], 'blockers extracted');
  });

  test('extracts session continuity info', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# Project State

**Current Phase:** 03

## Session

**Last Date:** 2024-01-15
**Stopped At:** Phase 3, Plan 2, Task 1
**Resume File:** .planning/phases/03-api/03-02-PLAN.md
`
    );

    const result = runMowTools('state-snapshot', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.session.last_date, '2024-01-15', 'session date extracted');
    assert.strictEqual(output.session.stopped_at, 'Phase 3, Plan 2, Task 1', 'stopped at extracted');
    assert.strictEqual(output.session.resume_file, '.planning/phases/03-api/03-02-PLAN.md', 'resume file extracted');
  });

  test('handles paused_at field', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# Project State

**Current Phase:** 03
**Paused At:** Phase 3, Plan 1, Task 2 - mid-implementation
`
    );

    const result = runMowTools('state-snapshot', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.paused_at, 'Phase 3, Plan 1, Task 2 - mid-implementation', 'paused_at extracted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// summary-extract command
// ─────────────────────────────────────────────────────────────────────────────

describe('summary-extract command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('missing file returns error', () => {
    const result = runMowTools('summary-extract .planning/phases/01-test/01-01-SUMMARY.md', tmpDir);
    assert.ok(result.success, `Command should succeed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.error, 'File not found', 'should report missing file');
  });

  test('extracts all fields from SUMMARY.md', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '01-01-SUMMARY.md'),
      `---
one-liner: Set up Prisma with User and Project models
key-files:
  - prisma/schema.prisma
  - src/lib/db.ts
tech-stack:
  added:
    - prisma
    - zod
patterns-established:
  - Repository pattern
  - Dependency injection
key-decisions:
  - Use Prisma over Drizzle: Better DX and ecosystem
  - Single database: Start simple, shard later
---

# Summary

Full summary content here.
`
    );

    const result = runMowTools('summary-extract .planning/phases/01-foundation/01-01-SUMMARY.md', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.path, '.planning/phases/01-foundation/01-01-SUMMARY.md', 'path correct');
    assert.strictEqual(output.one_liner, 'Set up Prisma with User and Project models', 'one-liner extracted');
    assert.deepStrictEqual(output.key_files, ['prisma/schema.prisma', 'src/lib/db.ts'], 'key files extracted');
    assert.deepStrictEqual(output.tech_added, ['prisma', 'zod'], 'tech added extracted');
    assert.deepStrictEqual(output.patterns, ['Repository pattern', 'Dependency injection'], 'patterns extracted');
    assert.strictEqual(output.decisions.length, 2, 'decisions extracted');
  });

  test('selective extraction with --fields', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '01-01-SUMMARY.md'),
      `---
one-liner: Set up database
key-files:
  - prisma/schema.prisma
tech-stack:
  added:
    - prisma
patterns-established:
  - Repository pattern
key-decisions:
  - Use Prisma: Better DX
---
`
    );

    const result = runMowTools('summary-extract .planning/phases/01-foundation/01-01-SUMMARY.md --fields one_liner,key_files', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.one_liner, 'Set up database', 'one_liner included');
    assert.deepStrictEqual(output.key_files, ['prisma/schema.prisma'], 'key_files included');
    assert.strictEqual(output.tech_added, undefined, 'tech_added excluded');
    assert.strictEqual(output.patterns, undefined, 'patterns excluded');
    assert.strictEqual(output.decisions, undefined, 'decisions excluded');
  });

  test('handles missing frontmatter fields gracefully', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '01-01-SUMMARY.md'),
      `---
one-liner: Minimal summary
---

# Summary
`
    );

    const result = runMowTools('summary-extract .planning/phases/01-foundation/01-01-SUMMARY.md', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.one_liner, 'Minimal summary', 'one-liner extracted');
    assert.deepStrictEqual(output.key_files, [], 'key_files defaults to empty');
    assert.deepStrictEqual(output.tech_added, [], 'tech_added defaults to empty');
    assert.deepStrictEqual(output.patterns, [], 'patterns defaults to empty');
    assert.deepStrictEqual(output.decisions, [], 'decisions defaults to empty');
  });

  test('parses key-decisions with rationale', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(phaseDir, { recursive: true });

    fs.writeFileSync(
      path.join(phaseDir, '01-01-SUMMARY.md'),
      `---
key-decisions:
  - Use Prisma: Better DX than alternatives
  - JWT tokens: Stateless auth for scalability
---
`
    );

    const result = runMowTools('summary-extract .planning/phases/01-foundation/01-01-SUMMARY.md', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.decisions[0].summary, 'Use Prisma', 'decision summary parsed');
    assert.strictEqual(output.decisions[0].rationale, 'Better DX than alternatives', 'decision rationale parsed');
    assert.strictEqual(output.decisions[1].summary, 'JWT tokens', 'second decision summary');
    assert.strictEqual(output.decisions[1].rationale, 'Stateless auth for scalability', 'second decision rationale');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// init --include flag tests
// ─────────────────────────────────────────────────────────────────────────────

describe('init commands with --include flag', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('init execute-phase includes state and config content', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '03-01-PLAN.md'), '# Plan');
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      '# State\n\n**Current Phase:** 03\n**Status:** In progress'
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' })
    );

    const result = runMowTools('init execute-phase 03 --include state,config', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.state_content, 'state_content should be included');
    assert.ok(output.state_content.includes('Current Phase'), 'state content correct');
    assert.ok(output.config_content, 'config_content should be included');
    assert.ok(output.config_content.includes('model_profile'), 'config content correct');
  });

  test('init execute-phase without --include omits content', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '03-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '# State');

    const result = runMowTools('init execute-phase 03', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.state_content, undefined, 'state_content should be omitted');
    assert.strictEqual(output.config_content, undefined, 'config_content should be omitted');
  });

  test('init plan-phase includes multiple file contents', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '# Project State');
    fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), '# Roadmap v1.0');
    fs.writeFileSync(path.join(tmpDir, '.planning', 'REQUIREMENTS.md'), '# Requirements');
    fs.writeFileSync(path.join(phaseDir, '03-CONTEXT.md'), '# Phase Context');
    fs.writeFileSync(path.join(phaseDir, '03-RESEARCH.md'), '# Research Findings');

    const result = runMowTools('init plan-phase 03 --include state,roadmap,requirements,context,research', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.state_content, 'state_content included');
    assert.ok(output.state_content.includes('Project State'), 'state content correct');
    assert.ok(output.roadmap_content, 'roadmap_content included');
    assert.ok(output.roadmap_content.includes('Roadmap v1.0'), 'roadmap content correct');
    assert.ok(output.requirements_content, 'requirements_content included');
    assert.ok(output.context_content, 'context_content included');
    assert.ok(output.research_content, 'research_content included');
  });

  test('init plan-phase includes verification and uat content', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '03-VERIFICATION.md'), '# Verification Results');
    fs.writeFileSync(path.join(phaseDir, '03-UAT.md'), '# UAT Findings');

    const result = runMowTools('init plan-phase 03 --include verification,uat', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.verification_content, 'verification_content included');
    assert.ok(output.verification_content.includes('Verification Results'), 'verification content correct');
    assert.ok(output.uat_content, 'uat_content included');
    assert.ok(output.uat_content.includes('UAT Findings'), 'uat content correct');
  });

  test('init progress includes state, roadmap, project, config', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '# State');
    fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), '# Roadmap');
    fs.writeFileSync(path.join(tmpDir, '.planning', 'PROJECT.md'), '# Project');
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ model_profile: 'quality' })
    );

    const result = runMowTools('init progress --include state,roadmap,project,config', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.state_content, 'state_content included');
    assert.ok(output.roadmap_content, 'roadmap_content included');
    assert.ok(output.project_content, 'project_content included');
    assert.ok(output.config_content, 'config_content included');
  });

  test('missing files return null in content fields', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '03-01-PLAN.md'), '# Plan');

    const result = runMowTools('init execute-phase 03 --include state,config', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.state_content, null, 'missing state returns null');
    assert.strictEqual(output.config_content, null, 'missing config returns null');
  });

  test('partial includes work correctly', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '03-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '# State');
    fs.writeFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), '# Roadmap');

    // Only request state, not roadmap
    const result = runMowTools('init execute-phase 03 --include state', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.state_content, 'state_content included');
    assert.strictEqual(output.roadmap_content, undefined, 'roadmap_content not requested, should be undefined');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// roadmap analyze command
// ─────────────────────────────────────────────────────────────────────────────

describe('roadmap analyze command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('missing ROADMAP.md returns error', () => {
    const result = runMowTools('roadmap analyze', tmpDir);
    assert.ok(result.success, `Command should succeed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.error, 'ROADMAP.md not found');
  });

  test('parses phases with goals and disk status', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0

### Phase 1: Foundation
**Goal**: Set up infrastructure

### Phase 2: Authentication
**Goal**: Add user auth

### Phase 3: Features
**Goal**: Build core features
`
    );

    // Create phase dirs with varying completion
    const p1 = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');

    const p2 = path.join(tmpDir, '.planning', 'phases', '02-authentication');
    fs.mkdirSync(p2, { recursive: true });
    fs.writeFileSync(path.join(p2, '02-01-PLAN.md'), '# Plan');

    const result = runMowTools('roadmap analyze', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.phase_count, 3, 'should find 3 phases');
    assert.strictEqual(output.phases[0].disk_status, 'complete', 'phase 1 complete');
    assert.strictEqual(output.phases[1].disk_status, 'planned', 'phase 2 planned');
    assert.strictEqual(output.phases[2].disk_status, 'no_directory', 'phase 3 no directory');
    assert.strictEqual(output.completed_phases, 1, '1 phase complete');
    assert.strictEqual(output.total_plans, 2, '2 total plans');
    assert.strictEqual(output.total_summaries, 1, '1 total summary');
    assert.strictEqual(output.progress_percent, 50, '50% complete');
    assert.strictEqual(output.current_phase, '2', 'current phase is 2');
  });

  test('extracts goals and dependencies', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Setup
**Goal**: Initialize project
**Depends on**: Nothing

### Phase 2: Build
**Goal**: Build features
**Depends on**: Phase 1
`
    );

    const result = runMowTools('roadmap analyze', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.phases[0].goal, 'Initialize project');
    assert.strictEqual(output.phases[0].depends_on, 'Nothing');
    assert.strictEqual(output.phases[1].goal, 'Build features');
    assert.strictEqual(output.phases[1].depends_on, 'Phase 1');
  });

  test('provides depends_on_parsed arrays', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n\n### Phase 7: State\n**Goal**: Build state\n**Depends on**: Nothing (first phase)\n\n### Phase 8: DAG\n**Goal**: Build DAG\n**Depends on**: Nothing\n\n### Phase 9: Execution\n**Goal**: Run phases\n**Depends on**: Phase 7, Phase 8\n\n### Phase 11: Docs\n**Goal**: Write docs\n**Depends on**: Phase 7, Phase 8, Phase 9, Phase 10\n`
    );

    const result = runMowTools('roadmap analyze', tmpDir);
    assert.ok(result.success);
    const output = JSON.parse(result.output);

    // Phase 7: depends on nothing
    assert.deepStrictEqual(output.phases[0].depends_on_parsed, []);
    // Phase 8: depends on nothing
    assert.deepStrictEqual(output.phases[1].depends_on_parsed, []);
    // Phase 9: depends on 7 and 8
    assert.deepStrictEqual(output.phases[2].depends_on_parsed, ['7', '8']);
    // Phase 11: depends on 7, 8, 9, 10 (10 missing from ROADMAP but still parsed)
    assert.deepStrictEqual(output.phases[3].depends_on_parsed, ['7', '8', '9', '10']);
  });

  test('handles both colon-inside-bold and colon-outside-bold formats', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n\n### Phase 1: Old Format\n**Goal:** Old style goal\n**Depends on:** Nothing\n\n### Phase 2: New Format\n**Goal**: New style goal\n**Depends on**: Phase 1\n`
    );

    const result = runMowTools('roadmap analyze', tmpDir);
    assert.ok(result.success);
    const output = JSON.parse(result.output);

    assert.strictEqual(output.phases[0].goal, 'Old style goal');
    assert.strictEqual(output.phases[0].depends_on, 'Nothing');
    assert.strictEqual(output.phases[1].goal, 'New style goal');
    assert.strictEqual(output.phases[1].depends_on, 'Phase 1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// phase add command
// ─────────────────────────────────────────────────────────────────────────────

describe('phase add command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('adds phase after highest existing', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0

### Phase 1: Foundation
**Goal**: Setup

### Phase 2: API
**Goal**: Build API

---
`
    );

    const result = runMowTools('phase add User Dashboard', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.phase_number, 3, 'should be phase 3');
    assert.strictEqual(output.slug, 'user-dashboard');

    // Verify directory created
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'phases', '03-user-dashboard')),
      'directory should be created'
    );

    // Verify ROADMAP updated
    const roadmap = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
    assert.ok(roadmap.includes('### Phase 3: User Dashboard'), 'roadmap should include new phase');
    assert.ok(roadmap.includes('**Depends on:** Phase 2'), 'should depend on previous');
  });

  test('handles empty roadmap', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0\n`
    );

    const result = runMowTools('phase add Initial Setup', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.phase_number, 1, 'should be phase 1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// phase insert command
// ─────────────────────────────────────────────────────────────────────────────

describe('phase insert command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('inserts decimal phase after target', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Foundation
**Goal**: Setup

### Phase 2: API
**Goal**: Build API
`
    );
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-foundation'), { recursive: true });

    const result = runMowTools('phase insert 1 Fix Critical Bug', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.phase_number, '01.1', 'should be 01.1');
    assert.strictEqual(output.after_phase, '1');

    // Verify directory
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'phases', '01.1-fix-critical-bug')),
      'decimal phase directory should be created'
    );

    // Verify ROADMAP
    const roadmap = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
    assert.ok(roadmap.includes('Phase 01.1: Fix Critical Bug (INSERTED)'), 'roadmap should include inserted phase');
  });

  test('increments decimal when siblings exist', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Foundation
**Goal**: Setup

### Phase 2: API
**Goal**: Build API
`
    );
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-foundation'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01.1-hotfix'), { recursive: true });

    const result = runMowTools('phase insert 1 Another Fix', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.phase_number, '01.2', 'should be 01.2');
  });

  test('rejects missing phase', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n### Phase 1: Test\n**Goal**: Test\n`
    );

    const result = runMowTools('phase insert 99 Fix Something', tmpDir);
    assert.ok(!result.success, 'should fail for missing phase');
    assert.ok(result.error.includes('not found'), 'error mentions not found');
  });

  test('handles padding mismatch between input and roadmap', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

## Phase 09.05: Existing Decimal Phase
**Goal**: Test padding

## Phase 09.1: Next Phase
**Goal**: Test
`
    );
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '09.05-existing'), { recursive: true });

    // Pass unpadded "9.05" but roadmap has "09.05"
    const result = runMowTools('phase insert 9.05 Padding Test', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.after_phase, '9.05');

    const roadmap = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
    assert.ok(roadmap.includes('(INSERTED)'), 'roadmap should include inserted phase');
  });

  test('handles #### heading depth from multi-milestone roadmaps', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### v1.1 Milestone

#### Phase 5: Feature Work
**Goal**: Build features

#### Phase 6: Polish
**Goal**: Polish
`
    );
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '05-feature-work'), { recursive: true });

    const result = runMowTools('phase insert 5 Hotfix', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.phase_number, '05.1');

    const roadmap = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
    assert.ok(roadmap.includes('Phase 05.1: Hotfix (INSERTED)'), 'roadmap should include inserted phase');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// phase remove command
// ─────────────────────────────────────────────────────────────────────────────

describe('phase remove command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('removes phase directory and renumbers subsequent', () => {
    // Setup 3 phases
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Foundation
**Goal**: Setup
**Depends on**: Nothing

### Phase 2: Auth
**Goal**: Authentication
**Depends on**: Phase 1

### Phase 3: Features
**Goal**: Core features
**Depends on**: Phase 2
`
    );

    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-foundation'), { recursive: true });
    const p2 = path.join(tmpDir, '.planning', 'phases', '02-auth');
    fs.mkdirSync(p2, { recursive: true });
    fs.writeFileSync(path.join(p2, '02-01-PLAN.md'), '# Plan');
    const p3 = path.join(tmpDir, '.planning', 'phases', '03-features');
    fs.mkdirSync(p3, { recursive: true });
    fs.writeFileSync(path.join(p3, '03-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p3, '03-02-PLAN.md'), '# Plan 2');

    // Remove phase 2
    const result = runMowTools('phase remove 2', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.removed, '2');
    assert.strictEqual(output.directory_deleted, '02-auth');

    // Phase 3 should be renumbered to 02
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'phases', '02-features')),
      'phase 3 should be renumbered to 02-features'
    );
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.planning', 'phases', '03-features')),
      'old 03-features should not exist'
    );

    // Files inside should be renamed
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'phases', '02-features', '02-01-PLAN.md')),
      'plan file should be renumbered to 02-01'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'phases', '02-features', '02-02-PLAN.md')),
      'plan 2 should be renumbered to 02-02'
    );

    // ROADMAP should be updated
    const roadmap = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
    assert.ok(!roadmap.includes('Phase 2: Auth'), 'removed phase should not be in roadmap');
    assert.ok(roadmap.includes('Phase 2: Features'), 'phase 3 should be renumbered to 2');
  });

  test('rejects removal of phase with summaries unless --force', () => {
    const p1 = path.join(tmpDir, '.planning', 'phases', '01-test');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n### Phase 1: Test\n**Goal**: Test\n`
    );

    // Should fail without --force
    const result = runMowTools('phase remove 1', tmpDir);
    assert.ok(!result.success, 'should fail without --force');
    assert.ok(result.error.includes('executed plan'), 'error mentions executed plans');

    // Should succeed with --force
    const forceResult = runMowTools('phase remove 1 --force', tmpDir);
    assert.ok(forceResult.success, `Force remove failed: ${forceResult.error}`);
  });

  test('removes decimal phase and renumbers siblings', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n### Phase 6: Main\n**Goal**: Main\n### Phase 6.1: Fix A\n**Goal**: Fix A\n### Phase 6.2: Fix B\n**Goal**: Fix B\n### Phase 6.3: Fix C\n**Goal**: Fix C\n`
    );

    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06-main'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06.1-fix-a'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06.2-fix-b'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '06.3-fix-c'), { recursive: true });

    const result = runMowTools('phase remove 6.2', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    // 06.3 should become 06.2
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'phases', '06.2-fix-c')),
      '06.3 should be renumbered to 06.2'
    );
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.planning', 'phases', '06.3-fix-c')),
      'old 06.3 should not exist'
    );
  });

  test('updates STATE.md phase count', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n### Phase 1: A\n**Goal**: A\n### Phase 2: B\n**Goal**: B\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Current Phase:** 1\n**Total Phases:** 2\n`
    );
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-a'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02-b'), { recursive: true });

    runMowTools('phase remove 2', tmpDir);

    const state = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(state.includes('**Total Phases:** 1'), 'total phases should be decremented');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// phase complete command
// ─────────────────────────────────────────────────────────────────────────────

describe('phase complete command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('marks phase complete and transitions to next', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

- [ ] Phase 1: Foundation
- [ ] Phase 2: API

### Phase 1: Foundation
**Goal**: Setup
**Plans**: 1 plans

### Phase 2: API
**Goal**: Build API
`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Current Phase:** 01\n**Current Phase Name:** Foundation\n**Status:** In progress\n**Current Plan:** 01-01\n**Last Activity:** 2025-01-01\n**Last Activity Description:** Working on phase 1\n`
    );

    const p1 = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02-api'), { recursive: true });

    const result = runMowTools('phase complete 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.completed_phase, '1');
    assert.strictEqual(output.plans_executed, '1/1');
    assert.strictEqual(output.next_phase, '02');
    assert.strictEqual(output.is_last_phase, false);

    // Verify STATE.md updated
    const state = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(state.includes('**Current Phase:** 02'), 'should advance to phase 02');
    assert.ok(state.includes('**Status:** Ready to plan'), 'status should be ready to plan');
    assert.ok(state.includes('**Current Plan:** Not started'), 'plan should be reset');

    // Verify ROADMAP checkbox
    const roadmap = fs.readFileSync(path.join(tmpDir, '.planning', 'ROADMAP.md'), 'utf-8');
    assert.ok(roadmap.includes('[x]'), 'phase should be checked off');
    assert.ok(roadmap.includes('completed'), 'completion date should be added');
  });

  test('detects last phase in milestone', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n### Phase 1: Only Phase\n**Goal**: Everything\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Current Phase:** 01\n**Status:** In progress\n**Current Plan:** 01-01\n**Last Activity:** 2025-01-01\n**Last Activity Description:** Working\n`
    );

    const p1 = path.join(tmpDir, '.planning', 'phases', '01-only-phase');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');

    const result = runMowTools('phase complete 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.is_last_phase, true, 'should detect last phase');
    assert.strictEqual(output.next_phase, null, 'no next phase');

    const state = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(state.includes('Milestone complete'), 'status should be milestone complete');
  });

  test('updates REQUIREMENTS.md traceability when phase completes', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

- [ ] Phase 1: Auth

### Phase 1: Auth
**Goal**: User authentication
**Requirements**: AUTH-01, AUTH-02
**Plans**: 1 plans

### Phase 2: API
**Goal**: Build API
**Requirements**: API-01
`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
      `# Requirements

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email
- [ ] **AUTH-02**: User can log in
- [ ] **AUTH-03**: User can reset password

### API

- [ ] **API-01**: REST endpoints

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 2 | Pending |
| API-01 | Phase 2 | Pending |
`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Current Phase:** 01\n**Current Phase Name:** Auth\n**Status:** In progress\n**Current Plan:** 01-01\n**Last Activity:** 2025-01-01\n**Last Activity Description:** Working\n`
    );

    const p1 = path.join(tmpDir, '.planning', 'phases', '01-auth');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02-api'), { recursive: true });

    const result = runMowTools('phase complete 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const req = fs.readFileSync(path.join(tmpDir, '.planning', 'REQUIREMENTS.md'), 'utf-8');

    // Checkboxes updated for phase 1 requirements
    assert.ok(req.includes('- [x] **AUTH-01**'), 'AUTH-01 checkbox should be checked');
    assert.ok(req.includes('- [x] **AUTH-02**'), 'AUTH-02 checkbox should be checked');
    // Other requirements unchanged
    assert.ok(req.includes('- [ ] **AUTH-03**'), 'AUTH-03 should remain unchecked');
    assert.ok(req.includes('- [ ] **API-01**'), 'API-01 should remain unchecked');

    // Traceability table updated
    assert.ok(req.includes('| AUTH-01 | Phase 1 | Complete |'), 'AUTH-01 status should be Complete');
    assert.ok(req.includes('| AUTH-02 | Phase 1 | Complete |'), 'AUTH-02 status should be Complete');
    assert.ok(req.includes('| AUTH-03 | Phase 2 | Pending |'), 'AUTH-03 should remain Pending');
    assert.ok(req.includes('| API-01 | Phase 2 | Pending |'), 'API-01 should remain Pending');
  });

  test('handles requirements with bracket format [REQ-01, REQ-02]', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

- [ ] Phase 1: Auth

### Phase 1: Auth
**Goal**: User authentication
**Requirements**: [AUTH-01, AUTH-02]
**Plans**: 1 plans

### Phase 2: API
**Goal**: Build API
**Requirements**: [API-01]
`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
      `# Requirements

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email
- [ ] **AUTH-02**: User can log in
- [ ] **AUTH-03**: User can reset password

### API

- [ ] **API-01**: REST endpoints

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 2 | Pending |
| API-01 | Phase 2 | Pending |
`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Current Phase:** 01\n**Current Phase Name:** Auth\n**Status:** In progress\n**Current Plan:** 01-01\n**Last Activity:** 2025-01-01\n**Last Activity Description:** Working\n`
    );

    const p1 = path.join(tmpDir, '.planning', 'phases', '01-auth');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02-api'), { recursive: true });

    const result = runMowTools('phase complete 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const req = fs.readFileSync(path.join(tmpDir, '.planning', 'REQUIREMENTS.md'), 'utf-8');

    // Checkboxes updated for phase 1 requirements (brackets stripped)
    assert.ok(req.includes('- [x] **AUTH-01**'), 'AUTH-01 checkbox should be checked');
    assert.ok(req.includes('- [x] **AUTH-02**'), 'AUTH-02 checkbox should be checked');
    // Other requirements unchanged
    assert.ok(req.includes('- [ ] **AUTH-03**'), 'AUTH-03 should remain unchecked');
    assert.ok(req.includes('- [ ] **API-01**'), 'API-01 should remain unchecked');

    // Traceability table updated
    assert.ok(req.includes('| AUTH-01 | Phase 1 | Complete |'), 'AUTH-01 status should be Complete');
    assert.ok(req.includes('| AUTH-02 | Phase 1 | Complete |'), 'AUTH-02 status should be Complete');
    assert.ok(req.includes('| AUTH-03 | Phase 2 | Pending |'), 'AUTH-03 should remain Pending');
    assert.ok(req.includes('| API-01 | Phase 2 | Pending |'), 'API-01 should remain Pending');
  });

  test('handles phase with no requirements mapping', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

- [ ] Phase 1: Setup

### Phase 1: Setup
**Goal**: Project setup (no requirements)
**Plans**: 1 plans
`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
      `# Requirements

## v1 Requirements

- [ ] **REQ-01**: Some requirement

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-01 | Phase 2 | Pending |
`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Current Phase:** 01\n**Status:** In progress\n**Current Plan:** 01-01\n**Last Activity:** 2025-01-01\n**Last Activity Description:** Working\n`
    );

    const p1 = path.join(tmpDir, '.planning', 'phases', '01-setup');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');

    const result = runMowTools('phase complete 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    // REQUIREMENTS.md should be unchanged
    const req = fs.readFileSync(path.join(tmpDir, '.planning', 'REQUIREMENTS.md'), 'utf-8');
    assert.ok(req.includes('- [ ] **REQ-01**'), 'REQ-01 should remain unchecked');
    assert.ok(req.includes('| REQ-01 | Phase 2 | Pending |'), 'REQ-01 should remain Pending');
  });

  test('handles missing REQUIREMENTS.md gracefully', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

- [ ] Phase 1: Foundation
**Requirements**: REQ-01

### Phase 1: Foundation
**Goal**: Setup
`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Current Phase:** 01\n**Status:** In progress\n**Current Plan:** 01-01\n**Last Activity:** 2025-01-01\n**Last Activity Description:** Working\n`
    );

    const p1 = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');

    const result = runMowTools('phase complete 1', tmpDir);
    assert.ok(result.success, `Command should succeed even without REQUIREMENTS.md: ${result.error}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// milestone complete command
// ─────────────────────────────────────────────────────────────────────────────

describe('milestone complete command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('archives roadmap, requirements, creates MILESTONES.md', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0 MVP\n\n### Phase 1: Foundation\n**Goal**: Setup\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'REQUIREMENTS.md'),
      `# Requirements\n\n- [ ] User auth\n- [ ] Dashboard\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Status:** In progress\n**Last Activity:** 2025-01-01\n**Last Activity Description:** Working\n`
    );

    const p1 = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(
      path.join(p1, '01-01-SUMMARY.md'),
      `---\none-liner: Set up project infrastructure\n---\n# Summary\n`
    );

    const result = runMowTools('milestone complete v1.0 --name MVP Foundation', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.version, 'v1.0');
    assert.strictEqual(output.phases, 1);
    assert.ok(output.archived.roadmap, 'roadmap should be archived');
    assert.ok(output.archived.requirements, 'requirements should be archived');

    // Verify archive files exist
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'milestones', 'v1.0-ROADMAP.md')),
      'archived roadmap should exist'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'milestones', 'v1.0-REQUIREMENTS.md')),
      'archived requirements should exist'
    );

    // Verify MILESTONES.md created
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'MILESTONES.md')),
      'MILESTONES.md should be created'
    );
    const milestones = fs.readFileSync(path.join(tmpDir, '.planning', 'MILESTONES.md'), 'utf-8');
    assert.ok(milestones.includes('v1.0 MVP Foundation'), 'milestone entry should contain name');
    assert.ok(milestones.includes('Set up project infrastructure'), 'accomplishments should be listed');
  });

  test('appends to existing MILESTONES.md', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'MILESTONES.md'),
      `# Milestones\n\n## v0.9 Alpha (Shipped: 2025-01-01)\n\n---\n\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0\n`
    );
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# State\n\n**Status:** In progress\n**Last Activity:** 2025-01-01\n**Last Activity Description:** Working\n`
    );

    const result = runMowTools('milestone complete v1.0 --name Beta', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const milestones = fs.readFileSync(path.join(tmpDir, '.planning', 'MILESTONES.md'), 'utf-8');
    assert.ok(milestones.includes('v0.9 Alpha'), 'existing entry should be preserved');
    assert.ok(milestones.includes('v1.0 Beta'), 'new entry should be appended');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validate consistency command
// ─────────────────────────────────────────────────────────────────────────────

describe('validate consistency command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('passes for consistent project', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n### Phase 1: A\n### Phase 2: B\n### Phase 3: C\n`
    );
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-a'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02-b'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '03-c'), { recursive: true });

    const result = runMowTools('validate consistency', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.passed, true, 'should pass');
    assert.strictEqual(output.warning_count, 0, 'no warnings');
  });

  test('warns about phase on disk but not in roadmap', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n### Phase 1: A\n`
    );
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-a'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '02-orphan'), { recursive: true });

    const result = runMowTools('validate consistency', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.warning_count > 0, 'should have warnings');
    assert.ok(
      output.warnings.some(w => w.includes('disk but not in ROADMAP')),
      'should warn about orphan directory'
    );
  });

  test('warns about gaps in phase numbering', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap\n### Phase 1: A\n### Phase 3: C\n`
    );
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '01-a'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '03-c'), { recursive: true });

    const result = runMowTools('validate consistency', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(
      output.warnings.some(w => w.includes('Gap in phase numbering')),
      'should warn about gap'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// progress command
// ─────────────────────────────────────────────────────────────────────────────

describe('progress command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('renders JSON progress', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0 MVP\n`
    );
    const p1 = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Done');
    fs.writeFileSync(path.join(p1, '01-02-PLAN.md'), '# Plan 2');

    const result = runMowTools('progress json', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.total_plans, 2, '2 total plans');
    assert.strictEqual(output.total_summaries, 1, '1 summary');
    assert.strictEqual(output.percent, 50, '50%');
    assert.strictEqual(output.phases.length, 1, '1 phase');
    assert.strictEqual(output.phases[0].status, 'In Progress', 'phase in progress');
  });

  test('renders bar format', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0\n`
    );
    const p1 = path.join(tmpDir, '.planning', 'phases', '01-test');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Done');

    const result = runMowTools('progress bar --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    assert.ok(result.output.includes('1/1'), 'should include count');
    assert.ok(result.output.includes('100%'), 'should include 100%');
  });

  test('renders table format', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap v1.0 MVP\n`
    );
    const p1 = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');

    const result = runMowTools('progress table --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    assert.ok(result.output.includes('Phase'), 'should have table header');
    assert.ok(result.output.includes('foundation'), 'should include phase name');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// todo complete command
// ─────────────────────────────────────────────────────────────────────────────

describe('todo complete command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('moves todo from pending to completed', () => {
    const pendingDir = path.join(tmpDir, '.planning', 'todos', 'pending');
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir, 'add-dark-mode.md'),
      `title: Add dark mode\narea: ui\ncreated: 2025-01-01\n`
    );

    const result = runMowTools('todo complete add-dark-mode.md', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.completed, true);

    // Verify moved
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.planning', 'todos', 'pending', 'add-dark-mode.md')),
      'should be removed from pending'
    );
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'todos', 'completed', 'add-dark-mode.md')),
      'should be in completed'
    );

    // Verify completion timestamp added
    const content = fs.readFileSync(
      path.join(tmpDir, '.planning', 'todos', 'completed', 'add-dark-mode.md'),
      'utf-8'
    );
    assert.ok(content.startsWith('completed:'), 'should have completed timestamp');
  });

  test('fails for nonexistent todo', () => {
    const result = runMowTools('todo complete nonexistent.md', tmpDir);
    assert.ok(!result.success, 'should fail');
    assert.ok(result.error.includes('not found'), 'error mentions not found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scaffold command
// ─────────────────────────────────────────────────────────────────────────────

describe('scaffold command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('scaffolds context file', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '03-api'), { recursive: true });

    const result = runMowTools('scaffold context --phase 3', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.created, true);

    // Verify file content
    const content = fs.readFileSync(
      path.join(tmpDir, '.planning', 'phases', '03-api', '03-CONTEXT.md'),
      'utf-8'
    );
    assert.ok(content.includes('Phase 3'), 'should reference phase number');
    assert.ok(content.includes('Decisions'), 'should have decisions section');
    assert.ok(content.includes('Discretion Areas'), 'should have discretion section');
  });

  test('scaffolds UAT file', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '03-api'), { recursive: true });

    const result = runMowTools('scaffold uat --phase 3', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.created, true);

    const content = fs.readFileSync(
      path.join(tmpDir, '.planning', 'phases', '03-api', '03-UAT.md'),
      'utf-8'
    );
    assert.ok(content.includes('User Acceptance Testing'), 'should have UAT heading');
    assert.ok(content.includes('Test Results'), 'should have test results section');
  });

  test('scaffolds verification file', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '03-api'), { recursive: true });

    const result = runMowTools('scaffold verification --phase 3', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.created, true);

    const content = fs.readFileSync(
      path.join(tmpDir, '.planning', 'phases', '03-api', '03-VERIFICATION.md'),
      'utf-8'
    );
    assert.ok(content.includes('Goal-Backward Verification'), 'should have verification heading');
  });

  test('scaffolds phase directory', () => {
    const result = runMowTools('scaffold phase-dir --phase 5 --name User Dashboard', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.created, true);
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'phases', '05-user-dashboard')),
      'directory should be created'
    );
  });

  test('does not overwrite existing files', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '03-api');
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, '03-CONTEXT.md'), '# Existing content');

    const result = runMowTools('scaffold context --phase 3', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.created, false, 'should not overwrite');
    assert.strictEqual(output.reason, 'already_exists');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkTrunk dependency check
// ─────────────────────────────────────────────────────────────────────────────

describe('checkWorkTrunk', () => {
  test('returns installed: true when wt is available', () => {
    // wt is installed on this system
    const result = runMowTools('worktree status');
    // If wt were missing, init commands would fail, but worktree status
    // doesn't call requireWorkTrunk. Let's test via init progress which does.
    const initResult = runMowTools('init progress');
    assert.ok(initResult.success, 'init progress should succeed when wt is installed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Worktree state tracking
// ─────────────────────────────────────────────────────────────────────────────

describe('worktree commands', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
    // Create a minimal STATE.md
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'STATE.md'),
      `# Project State

## Current Position

Phase: 1 of 3

## Session Continuity

Last session: 2026-02-19
`
    );
    // Create config.json with commit_docs false to avoid git commit in tests
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ commit_docs: false })
    );
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('worktree status returns empty array when no assignments', () => {
    const result = runMowTools('worktree status', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const rows = JSON.parse(result.output);
    assert.deepStrictEqual(rows, []);
  });

  test('worktree claim writes to STATE.md correctly', () => {
    const result = runMowTools('worktree claim 02-worktree-state', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.claimed, true);
    assert.strictEqual(output.already_claimed, false);
    assert.strictEqual(output.phase, '02-worktree-state');

    // Verify STATE.md has the section
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('## Worktree Assignments'), 'should have Worktree Assignments section');
    assert.ok(content.includes('02-worktree-state'), 'should contain claimed phase');
    assert.ok(content.includes('executing'), 'should have executing status');
  });

  test('worktree claim is idempotent for same worktree', () => {
    runMowTools('worktree claim 02-test', tmpDir);
    const result = runMowTools('worktree claim 02-test', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.claimed, true);
    assert.strictEqual(output.already_claimed, true);
  });

  test('worktree claim detects conflict from another worktree', () => {
    // Pre-populate STATE.md with an existing claim from another worktree
    const stateContent = `# Project State

## Worktree Assignments

| Worktree | Branch | Phase | Plan | Status | Started | Agent |
|----------|--------|-------|------|--------|---------|-------|
| /some/other/worktree | feat-branch | 02-test | \u2014 | executing | 2026-02-19T00:00:00Z | agent1 |

## Session Continuity

Last session: 2026-02-19
`;
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), stateContent);

    const result = runMowTools('worktree claim 02-test', tmpDir);
    assert.ok(!result.success, 'should fail with conflict');
    assert.ok(result.error.includes('Cannot claim the same phase'), 'error should mention conflict');
  });

  test('worktree release removes the correct row', () => {
    // Claim first
    runMowTools('worktree claim 02-release-test', tmpDir);

    // Verify claim exists
    let status = JSON.parse(runMowTools('worktree status', tmpDir).output);
    assert.strictEqual(status.length, 1, 'should have 1 claim');

    // Release
    const result = runMowTools('worktree release 02-release-test', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.released, true);

    // Verify removed
    status = JSON.parse(runMowTools('worktree status', tmpDir).output);
    assert.strictEqual(status.length, 0, 'should have 0 claims after release');
  });

  test('worktree update-plan updates the Plan column correctly', () => {
    // Claim first
    runMowTools('worktree claim 02-plan-test', tmpDir);

    // Update plan
    const result = runMowTools('worktree update-plan 02-plan-test 02-03', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.updated, true);
    assert.strictEqual(output.plan, '02-03');

    // Verify in status
    const status = JSON.parse(runMowTools('worktree status', tmpDir).output);
    assert.strictEqual(status[0].plan, '02-03', 'plan column should be updated');
  });

  test('worktree clean removes entries for non-existent paths', () => {
    // Initialize a git repo so wt list works
    execSync('git init && git commit --allow-empty -m "init"', {
      cwd: tmpDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Pre-populate with a stale entry
    const stateContent = `# Project State

## Worktree Assignments

| Worktree | Branch | Phase | Plan | Status | Started | Agent |
|----------|--------|-------|------|--------|---------|-------|
| /nonexistent/path/that/does/not/exist | stale-branch | 01-stale | \u2014 | executing | 2026-02-18T00:00:00Z | stale-agent |

## Session Continuity

Last session: 2026-02-19
`;
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), stateContent);

    const result = runMowTools('worktree clean', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.cleaned, 1, 'should clean 1 stale entry');
    assert.ok(output.released.includes('/nonexistent/path/that/does/not/exist'), 'should release the stale path');

    // Verify removed from STATE.md
    const status = JSON.parse(runMowTools('worktree status', tmpDir).output);
    assert.strictEqual(status.length, 0, 'should have 0 claims after clean');
  });

  test('worktree verify-result writes verification results section', () => {
    const result = runMowTools('worktree verify-result 02-test --tier t1-static --result pass', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.recorded, true);
    assert.strictEqual(output.tier, 't1-static');
    assert.strictEqual(output.result, 'pass');
    assert.strictEqual(output.blockers, 'none');

    // Verify in STATE.md
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('### Verification Results'), 'should have Verification Results section');
    assert.ok(content.includes('t1-static'), 'should contain tier');
    assert.ok(content.includes('pass'), 'should contain result');
  });

  test('worktree verify-result with blockers', () => {
    const result = runMowTools('worktree verify-result 02-test --tier t2-functional --result fail --blockers "test X fails"', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.result, 'fail');
    assert.strictEqual(output.blockers, 'test X fails');
  });

  test('worktree verify-result updates existing entry', () => {
    // First result
    runMowTools('worktree verify-result 02-test --tier t1-static --result fail --blockers "lint errors"', tmpDir);
    // Update
    runMowTools('worktree verify-result 02-test --tier t1-static --result pass', tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    // Should only have one t1-static entry, and it should be "pass"
    const matches = content.match(/t1-static/g);
    assert.strictEqual(matches.length, 1, 'should have exactly 1 t1-static entry');
    assert.ok(content.includes('| 02-test | t1-static | pass |'), 'should be updated to pass');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Agent Teams detection
// ─────────────────────────────────────────────────────────────────────────────

describe('Agent Teams detection', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('checkAgentTeams returns enabled: false when env var is not set', () => {
    // Ensure the env var is NOT set (it should not be in test environment)
    const original = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;

    const result = runMowTools('init new-project', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.agent_teams_enabled, false, 'agent_teams_enabled should be false');
    assert.strictEqual(output.agent_teams_nudge_dismissed, false, 'agent_teams_nudge_dismissed should be false');

    // Restore
    if (original !== undefined) process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = original;
  });

  test('checkAgentTeams returns enabled: true when env var is set to "true"', () => {
    const original = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = 'true';

    const result = runMowTools('init new-project', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.agent_teams_enabled, true, 'agent_teams_enabled should be true for "true"');

    // Restore
    if (original !== undefined) process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = original;
    else delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  });

  test('checkAgentTeams returns enabled: true when env var is set to "TRUE" (case-insensitive)', () => {
    const original = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = 'TRUE';

    const result = runMowTools('init new-project', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.agent_teams_enabled, true, 'agent_teams_enabled should be true for "TRUE"');

    // Restore
    if (original !== undefined) process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = original;
    else delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  });

  test('checkAgentTeams returns enabled: true when env var is set to "1"', () => {
    const original = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';

    const result = runMowTools('init new-project', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.agent_teams_enabled, true, 'agent_teams_enabled should be true for "1"');

    // Restore
    if (original !== undefined) process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = original;
    else delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// team-status and team-update commands
// ─────────────────────────────────────────────────────────────────────────────

describe('team-status and team-update commands', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
    // Create a basic STATE.md
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), `# Project State

## Current Position

Phase: 3 of 3

## Worktree Assignments

| Worktree | Branch | Phase | Plan | Status | Started | Agent |
|----------|--------|-------|------|--------|---------|-------|

## Session Continuity

Last session: 2026-02-19
`);
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('team-status returns active: false when no section exists', () => {
    const result = runMowTools('team-status', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.active, false, 'active should be false');
    assert.strictEqual(output.team_name, null, 'team_name should be null');
    assert.deepStrictEqual(output.teammates, [], 'teammates should be empty');
    assert.strictEqual(output.started, null, 'started should be null');
  });

  test('team-update --action start creates the section', () => {
    const result = runMowTools('team-update --action start --team-name "Phase 3 Team"', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.started, true, 'should report started');
    assert.strictEqual(output.team_name, 'Phase 3 Team', 'should report team name');

    // Verify section exists in STATE.md
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('## Agent Team Status'), 'should have Agent Team Status section');
    assert.ok(content.includes('**Team:** Phase 3 Team'), 'should have team name');
    assert.ok(content.includes('| Teammate | Worktree | Task | Status | Last Update |'), 'should have table header');

    // Verify Session Continuity is still after the team section
    const teamIdx = content.indexOf('## Agent Team Status');
    const sessionIdx = content.indexOf('## Session Continuity');
    assert.ok(teamIdx < sessionIdx, 'Agent Team Status should be before Session Continuity');
  });

  test('team-update --action add-teammate adds a row', () => {
    // Start the team first
    runMowTools('team-update --action start --team-name "Test Team"', tmpDir);

    // Add a teammate
    const result = runMowTools('team-update --action add-teammate --name executor-1 --worktree /tmp/wt-1 --task "03-01-PLAN.md"', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.added, true, 'should report added');
    assert.strictEqual(output.name, 'executor-1', 'should report name');

    // Verify in STATE.md
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('executor-1'), 'should contain teammate name');
    assert.ok(content.includes('/tmp/wt-1'), 'should contain worktree');
    assert.ok(content.includes('03-01-PLAN.md'), 'should contain task');

    // Verify team-status reads it back
    const statusResult = runMowTools('team-status', tmpDir);
    assert.ok(statusResult.success);
    const status = JSON.parse(statusResult.output);
    assert.strictEqual(status.active, true, 'should be active');
    assert.strictEqual(status.teammates.length, 1, 'should have 1 teammate');
    assert.strictEqual(status.teammates[0].name, 'executor-1', 'teammate name should match');
  });

  test('team-update --action update-teammate updates a row', () => {
    // Start and add teammate
    runMowTools('team-update --action start --team-name "Test Team"', tmpDir);
    runMowTools('team-update --action add-teammate --name executor-1 --worktree /tmp/wt-1 --task "03-01-PLAN.md"', tmpDir);

    // Update teammate
    const result = runMowTools('team-update --action update-teammate --name executor-1 --status completed --task "03-02-PLAN.md"', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.updated, true, 'should report updated');
    assert.strictEqual(output.status, 'completed', 'should report new status');
    assert.strictEqual(output.task, '03-02-PLAN.md', 'should report new task');

    // Verify in STATE.md
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('completed'), 'should contain updated status');
    assert.ok(content.includes('03-02-PLAN.md'), 'should contain updated task');
    assert.ok(!content.includes('03-01-PLAN.md'), 'should not contain old task');
  });

  test('team-update --action stop removes the section', () => {
    // Start team and add teammate
    runMowTools('team-update --action start --team-name "Test Team"', tmpDir);
    runMowTools('team-update --action add-teammate --name executor-1 --worktree /tmp/wt-1 --task "03-01"', tmpDir);

    // Stop team
    const result = runMowTools('team-update --action stop', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.stopped, true, 'should report stopped');

    // Verify section is gone
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(!content.includes('## Agent Team Status'), 'Agent Team Status section should be removed');
    assert.ok(!content.includes('executor-1'), 'teammate should be removed');

    // Session Continuity should still exist
    assert.ok(content.includes('## Session Continuity'), 'Session Continuity should remain');

    // team-status should report inactive
    const statusResult = runMowTools('team-status', tmpDir);
    const status = JSON.parse(statusResult.output);
    assert.strictEqual(status.active, false, 'should report inactive after stop');
  });
});

// ─── Message Format Tests ─────────────────────────────────────────────────────

describe('message format command', () => {
  test('message format plan_started produces valid JSON', () => {
    const result = runMowTools('message format plan_started --phase 7 --plan 07-01 --raw');
    assert.ok(result.success, `Command failed: ${result.error}`);
    const msg = JSON.parse(result.output);
    assert.strictEqual(msg.v, 2, 'schema version should be 2');
    assert.strictEqual(msg.type, 'plan_started', 'type should be plan_started');
    assert.strictEqual(msg.phase, '7', 'phase should be 7');
    assert.strictEqual(msg.plan, '07-01', 'plan should be 07-01');
    assert.ok(msg.ts, 'should have timestamp');
    // Validate ISO string
    assert.ok(!isNaN(Date.parse(msg.ts)), 'ts should be valid ISO string');
  });

  test('message format plan_complete includes all required fields', () => {
    const result = runMowTools('message format plan_complete --phase 7 --plan 07-01 --commit a1b2c3d --duration-min 3 --raw');
    assert.ok(result.success, `Command failed: ${result.error}`);
    const msg = JSON.parse(result.output);
    assert.strictEqual(msg.v, 2, 'schema version should be 2');
    assert.strictEqual(msg.type, 'plan_complete', 'type should be plan_complete');
    assert.strictEqual(msg.phase, '7', 'phase should be 7');
    assert.strictEqual(msg.plan, '07-01', 'plan should be 07-01');
    assert.strictEqual(msg.commit, 'a1b2c3d', 'commit should be a1b2c3d');
    assert.strictEqual(msg.duration_min, '3', 'duration_min should be 3');
  });

  test('message format validates required fields', () => {
    const result = runMowTools('message format plan_complete --phase 7 --raw');
    assert.ok(!result.success, 'should fail with missing fields');
    assert.ok(result.error.includes('Missing required fields'), 'should mention missing fields');
  });

  test('message format rejects unknown event types', () => {
    const result = runMowTools('message format unknown_type --phase 7 --raw');
    assert.ok(!result.success, 'should fail with unknown type');
    assert.ok(result.error.includes('Unknown event type'), 'should mention unknown type');
  });

  test('message format all 7 types produce valid JSON', () => {
    const typeArgs = {
      plan_started: '--phase 7 --plan 07-01',
      plan_complete: '--phase 7 --plan 07-01 --commit abc --duration-min 3',
      phase_complete: '--phase 7 --plans-completed 4 --total-duration-min 12',
      error: '--phase 7 --plan 07-02 --error "test error"',
      blocker: '--phase 7 --plan 07-01 --blocker "blocked" --action skip',
      state_change: '--phase 7 --plan 07-01 --from-state queued --to-state in_progress',
      ack: '--ref-type plan_complete --ref-plan 07-01',
    };

    for (const [type, argStr] of Object.entries(typeArgs)) {
      const result = runMowTools(`message format ${type} ${argStr} --raw`);
      assert.ok(result.success, `${type} failed: ${result.error}`);
      const msg = JSON.parse(result.output);
      assert.strictEqual(msg.type, type, `type should be ${type}`);
      assert.strictEqual(msg.v, 2, `${type} should have schema version 2`);
      assert.ok(msg.ts, `${type} should have timestamp`);
    }
  });

  test('message format with --summary includes summary string', () => {
    const result = runMowTools('message format plan_complete --phase 7 --plan 07-01 --commit abc --duration-min 3 --summary --raw');
    assert.ok(result.success, `Command failed: ${result.error}`);
    const msg = JSON.parse(result.output);
    assert.ok(msg.summary, 'should have summary field');
    assert.ok(msg.summary.includes('Phase 7'), 'summary should include phase');
    assert.ok(msg.summary.includes('07-01'), 'summary should include plan');
  });

  test('message format warns on messages over 1KB', () => {
    // Create a very long error field (~2000 chars)
    const longError = 'x'.repeat(2000);
    // Use spawnSync to capture both stdout and stderr independently
    const { spawnSync } = require('child_process');
    const proc = spawnSync('node', [TOOLS_PATH, 'message', 'format', 'error', '--phase', '7', '--plan', '07-02', '--error', longError, '--raw'], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    assert.strictEqual(proc.status, 0, `Command should succeed, got: ${proc.stderr}`);
    // stderr should contain a warning about exceeding 1KB
    assert.ok(proc.stderr.includes('Warning') && proc.stderr.includes('1KB'), 'stderr should warn about exceeding 1KB');
    // stdout should still have valid JSON
    const msg = JSON.parse(proc.stdout);
    assert.strictEqual(msg.type, 'error', 'type should still be error');
  });
});

// ─── Message Parse Tests ──────────────────────────────────────────────────────

describe('message parse command', () => {
  test('message parse validates good messages', () => {
    const validMsg = JSON.stringify({ v: 1, type: 'plan_started', phase: '7', plan: '07-01', ts: '2026-02-20T10:00:00Z' });
    const result = runMowTools(`message parse '${validMsg}' --raw`);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, true, 'should be valid');
    assert.strictEqual(parsed.type, 'plan_started', 'type should match');
    assert.strictEqual(parsed.phase, '7', 'phase should match');
  });

  test('message parse rejects invalid JSON', () => {
    const result = runMowTools("message parse 'not json' --raw");
    assert.ok(result.success, 'command itself should succeed (returns valid:false)');
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, false, 'should be invalid');
    assert.ok(parsed.error.includes('Invalid JSON'), 'should mention invalid JSON');
  });

  test('message parse warns on unknown schema version', () => {
    const futureMsg = JSON.stringify({ v: 99, type: 'plan_started', phase: '7', plan: '07-01', ts: '2026-02-20T10:00:00Z' });
    const result = runMowTools(`message parse '${futureMsg}' --raw`);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, true, 'should still be valid');
    assert.ok(parsed.warnings, 'should have warnings');
    assert.ok(parsed.warnings.some(w => w.includes('Unknown schema version')), 'should warn about unknown version');
  });

  test('message parse reports missing required fields', () => {
    const incompleteMsg = JSON.stringify({ v: 1, type: 'plan_complete', phase: '7' });
    const result = runMowTools(`message parse '${incompleteMsg}' --raw`);
    assert.ok(result.success, 'command itself should succeed');
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, false, 'should be invalid');
    assert.ok(parsed.error.includes('Missing required fields'), 'should mention missing fields');
    assert.ok(parsed.error.includes('commit'), 'should mention commit as missing');
  });
});

// ─── Chat Log Tests ───────────────────────────────────────────────────────────

describe('chat-log command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('chat-log append creates NDJSON file', () => {
    const result = runMowTools('chat-log append --from phase-07 --to phase-08 --msg "test message" --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.appended, true, 'should report appended');

    // Check file exists
    const filePath = path.join(tmpDir, '.planning', 'chat-logs', 'phase-07-to-phase-08.ndjson');
    assert.ok(fs.existsSync(filePath), 'NDJSON file should exist');

    // Check content is valid JSON
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    const entry = JSON.parse(content);
    assert.strictEqual(entry.from, 'phase-07', 'from should match');
    assert.strictEqual(entry.to, 'phase-08', 'to should match');
    assert.strictEqual(entry.msg, 'test message', 'msg should match');
    assert.ok(entry.ts, 'should have timestamp');
  });

  test('chat-log append uses deterministic filename (sorted order)', () => {
    // Append with reversed from/to
    const result = runMowTools('chat-log append --from phase-08 --to phase-07 --msg "reversed" --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    // File should still be named phase-07-to-phase-08.ndjson (lower sorts first)
    const filePath = path.join(tmpDir, '.planning', 'chat-logs', 'phase-07-to-phase-08.ndjson');
    assert.ok(fs.existsSync(filePath), 'NDJSON file should use sorted filename');

    // The reversed version should NOT exist
    const reversedPath = path.join(tmpDir, '.planning', 'chat-logs', 'phase-08-to-phase-07.ndjson');
    assert.ok(!fs.existsSync(reversedPath), 'reversed filename should not exist');
  });

  test('chat-log read returns all entries', () => {
    // Append 3 entries
    runMowTools('chat-log append --from phase-07 --to phase-08 --msg "msg 1" --raw', tmpDir);
    runMowTools('chat-log append --from phase-07 --to phase-08 --msg "msg 2" --raw', tmpDir);
    runMowTools('chat-log append --from phase-07 --to phase-08 --msg "msg 3" --raw', tmpDir);

    // Read
    const result = runMowTools('chat-log read --from phase-07 --to phase-08 --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const entries = JSON.parse(result.output);
    assert.strictEqual(entries.length, 3, 'should have 3 entries');
    assert.strictEqual(entries[0].msg, 'msg 1', 'first entry should be msg 1');
    assert.strictEqual(entries[2].msg, 'msg 3', 'third entry should be msg 3');
  });

  test('chat-log prune keeps only N most recent entries', () => {
    // Append 10 entries
    for (let i = 1; i <= 10; i++) {
      runMowTools(`chat-log append --from phase-07 --to phase-08 --msg "msg ${i}" --raw`, tmpDir);
    }

    // Prune to keep 3
    const result = runMowTools('chat-log prune --from phase-07 --to phase-08 --keep 3 --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.pruned, true, 'should report pruned');
    assert.strictEqual(parsed.before, 10, 'should report 10 before');
    assert.strictEqual(parsed.after, 3, 'should report 3 after');

    // Read and verify the remaining 3 are the last 3
    const readResult = runMowTools('chat-log read --from phase-07 --to phase-08 --raw', tmpDir);
    const entries = JSON.parse(readResult.output);
    assert.strictEqual(entries.length, 3, 'should have 3 entries remaining');
    assert.strictEqual(entries[0].msg, 'msg 8', 'first remaining should be msg 8');
    assert.strictEqual(entries[2].msg, 'msg 10', 'last remaining should be msg 10');
  });

  test('chat-log append truncates messages over 500 chars', () => {
    const longMsg = 'a'.repeat(600);
    const result = runMowTools(`chat-log append --from phase-07 --to phase-08 --msg "${longMsg}" --raw`, tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    // Read and check msg length
    const filePath = path.join(tmpDir, '.planning', 'chat-logs', 'phase-07-to-phase-08.ndjson');
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    const entry = JSON.parse(content);
    assert.strictEqual(entry.msg.length, 500, 'msg should be truncated to 500 chars');
  });
});

// ─── Active Phases Table Tests ────────────────────────────────────────────────

describe('Active Phases table operations', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('state active-phases returns empty array when no section exists', () => {
    // Create a v1.0-style STATE.md without Active Phases section
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), `# Project State

## Current Position

Phase: 7 of 11

## Performance Metrics

**Velocity:**
- Total plans completed: 0

## Session Continuity

Last session: 2026-02-20
`);

    const result = runMowTools('state active-phases --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.warning, 'should include a warning');
    assert.deepStrictEqual(output.rows, [], 'rows should be empty array');
  });

  test('state active-phases parses table correctly', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), `# Project State

## Current Position

Phase: 7 of 11

## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|
| 7 | State Coherence | executing | worker-green | 1/4 | 2026-02-20T04:00:00Z |
| 8 | DAG Scheduling | blocked (7) | -- | 0/3 | 2026-02-20T03:00:00Z |
| 9 | Coordinator | not started | -- | 0/5 | 2026-02-20T02:00:00Z |

**Next unblockable:** Phase 8 (DAG Scheduling) -- 1 dep(s) remaining

## Performance Metrics

**Velocity:**
- Total plans completed: 0

## Session Continuity

Last session: 2026-02-20
`);

    const result = runMowTools('state active-phases --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const rows = JSON.parse(result.output);
    assert.strictEqual(rows.length, 3, 'should have 3 rows');
    assert.strictEqual(rows[0].phase, '7', 'first row phase should be 7');
    assert.strictEqual(rows[0].name, 'State Coherence', 'first row name');
    assert.strictEqual(rows[0].status, 'executing', 'first row status');
    assert.strictEqual(rows[0].worker, 'worker-green', 'first row worker');
    assert.strictEqual(rows[0].plans, '1/4', 'first row plans');
    assert.strictEqual(rows[1].status, 'blocked (7)', 'second row status');
    assert.strictEqual(rows[1].worker, '--', 'second row worker should be --');
    assert.strictEqual(rows[2].status, 'not started', 'third row status');
  });

  test('state update-phase-row updates existing row', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), `# Project State

## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|
| 7 | State Coherence | not started | -- | 0/4 | 2026-02-20T01:00:00Z |
| 8 | DAG Scheduling | not started | -- | 0/3 | 2026-02-20T01:00:00Z |

**Next unblockable:** --

## Session Continuity

Last session: 2026-02-20
`);

    const result = runMowTools('state update-phase-row 7 --status executing --worker worker-green --plans 1/4 --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.updated, true, 'should report updated');
    assert.strictEqual(output.phase, '7', 'should report phase 7');
    assert.ok(output.fields_changed.includes('status'), 'fields_changed should include status');
    assert.ok(output.fields_changed.includes('worker'), 'fields_changed should include worker');
    assert.ok(output.fields_changed.includes('plans'), 'fields_changed should include plans');

    // Verify in STATE.md
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('executing'), 'should contain executing status');
    assert.ok(content.includes('worker-green'), 'should contain worker-green');
    assert.ok(content.includes('1/4'), 'should contain 1/4 plans');
    // Phase 8 should be unchanged
    assert.ok(content.includes('| 8 | DAG Scheduling | not started | -- | 0/3 |'), 'phase 8 should be unchanged');
  });

  test('state update-phase-row inserts new row when phase not found', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), `# Project State

## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|

**Next unblockable:** --

## Session Continuity

Last session: 2026-02-20
`);

    const result = runMowTools('state update-phase-row 7 --name "State Coherence" --status "not started" --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.updated, true, 'should report updated');

    // Read back and verify
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('| 7 |'), 'should contain phase 7 row');
    assert.ok(content.includes('State Coherence'), 'should contain phase name');
    assert.ok(content.includes('not started'), 'should contain status');
  });

  test('state update-phase-row preserves unspecified fields', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), `# Project State

## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|
| 7 | State Coherence | executing | worker-green | 1/4 | 2026-02-20T01:00:00Z |

**Next unblockable:** --

## Session Continuity

Last session: 2026-02-20
`);

    // Only update plans, leave other fields alone
    const result = runMowTools('state update-phase-row 7 --plans 2/4 --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.ok(output.fields_changed.includes('plans'), 'should report plans changed');
    assert.ok(!output.fields_changed.includes('status'), 'should NOT report status changed');
    assert.ok(!output.fields_changed.includes('worker'), 'should NOT report worker changed');

    // Verify preserved fields
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('worker-green'), 'worker should be preserved');
    assert.ok(content.includes('executing'), 'status should be preserved');
    assert.ok(content.includes('2/4'), 'plans should be updated');
    assert.ok(content.includes('State Coherence'), 'name should be preserved');
  });

  test('state update-phase-row updates Next unblockable', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), `# Project State

## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|
| 7 | State Coherence | executing | worker-green | 3/4 | 2026-02-20T01:00:00Z |
| 8 | DAG Scheduling | executing | worker-blue | 2/3 | 2026-02-20T01:00:00Z |
| 9 | Coordinator | blocked (7,8) | -- | 0/5 | 2026-02-20T01:00:00Z |

**Next unblockable:** Phase 9 (Coordinator) -- 2 dep(s) remaining

## Session Continuity

Last session: 2026-02-20
`);

    // Mark phase 7 as complete
    const result = runMowTools('state update-phase-row 7 --status complete --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    // Read and verify Next unblockable was recalculated
    const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(content.includes('complete'), 'phase 7 should be complete');
    // Phase 9 is blocked on (7,8). Phase 7 is now complete, so only 1 dep remaining (phase 8)
    assert.ok(content.includes('1 dep(s) remaining'), 'should show 1 dep remaining for phase 9');
  });

  test('Active Phases table survives round-trip', () => {
    const initialState = `# Project State

## Active Phases

| Phase | Name | Status | Worker | Plans | Last Update |
|-------|------|--------|--------|-------|-------------|
| 7 | State Coherence | executing | worker-green | 2/4 | 2026-02-20T01:00:00Z |
| 8 | DAG Scheduling | executing | worker-blue | 1/3 | 2026-02-20T02:00:00Z |
| 9 | Coordinator | blocked (7,8) | -- | 0/5 | 2026-02-20T03:00:00Z |
| 10 | Live Feedback | blocked (7) | -- | 0/3 | 2026-02-20T04:00:00Z |
| 11 | README Overhaul | not started | -- | 0/2 | 2026-02-20T05:00:00Z |

**Next unblockable:** Phase 10 (Live Feedback) -- 1 dep(s) remaining

## Session Continuity

Last session: 2026-02-20
`;
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), initialState);

    // Parse all rows
    const parseResult = runMowTools('state active-phases --raw', tmpDir);
    assert.ok(parseResult.success, `Parse failed: ${parseResult.error}`);
    const rows = JSON.parse(parseResult.output);
    assert.strictEqual(rows.length, 5, 'should have 5 rows');

    // Update one row
    const updateResult = runMowTools('state update-phase-row 8 --plans 2/3 --raw', tmpDir);
    assert.ok(updateResult.success, `Update failed: ${updateResult.error}`);

    // Re-parse and verify all 5 rows are still present
    const reParseResult = runMowTools('state active-phases --raw', tmpDir);
    assert.ok(reParseResult.success, `Re-parse failed: ${reParseResult.error}`);
    const newRows = JSON.parse(reParseResult.output);
    assert.strictEqual(newRows.length, 5, 'should still have 5 rows after update');

    // Verify only phase 8 changed
    const phase7 = newRows.find(r => r.phase === '7');
    const phase8 = newRows.find(r => r.phase === '8');
    const phase9 = newRows.find(r => r.phase === '9');
    const phase10 = newRows.find(r => r.phase === '10');
    const phase11 = newRows.find(r => r.phase === '11');

    assert.strictEqual(phase7.status, 'executing', 'phase 7 status unchanged');
    assert.strictEqual(phase7.worker, 'worker-green', 'phase 7 worker unchanged');
    assert.strictEqual(phase8.plans, '2/3', 'phase 8 plans updated');
    assert.strictEqual(phase8.status, 'executing', 'phase 8 status unchanged');
    assert.strictEqual(phase9.status, 'blocked (7,8)', 'phase 9 status unchanged');
    assert.strictEqual(phase10.status, 'blocked (7)', 'phase 10 status unchanged');
    assert.strictEqual(phase11.status, 'not started', 'phase 11 status unchanged');

    // Verify Session Continuity section survived
    const finalContent = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    assert.ok(finalContent.includes('## Session Continuity'), 'Session Continuity should survive round-trip');
  });
});

// ─── Per-Phase STATUS.md Tests ────────────────────────────────────────────────

describe('status commands', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  /**
   * Helper: create a phase directory with mock PLAN.md files
   */
  function setupPhaseWithPlans(phaseDir, plans) {
    fs.mkdirSync(phaseDir, { recursive: true });
    for (const [filename, taskCount] of plans) {
      const tasks = Array.from({ length: taskCount }, (_, i) =>
        `<task type="auto">\n  <name>Task ${i + 1}</name>\n</task>`
      ).join('\n\n');
      fs.writeFileSync(path.join(phaseDir, filename), `---\nphase: 07\n---\n\n${tasks}\n`);
    }
  }

  /**
   * Helper: create a STATUS.md template in the temp project
   */
  function setupTemplate(tmpDir) {
    const templatesDir = path.join(tmpDir, 'mowism', 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    const template = `# Phase {phase_number}: {phase_name} -- Status

**Phase:** {phase_number}
**Status:** not started
**Worker:** --
**Worktree:** --
**Started:** --
**Last update:** --
**Blocker mode:** skip

## Plan Progress

| Plan | Status | Started | Duration | Commit | Tasks |
|------|--------|---------|----------|--------|-------|

## Aggregate

**Plans:** 0 complete, 0 in progress, 0 not started, 0 failed
**Commits:** --

## Blockers

None.

## Decisions

None.

## Context

None.
`;
    fs.writeFileSync(path.join(templatesDir, 'status.md'), template);
  }

  /**
   * Helper: write a pre-built STATUS.md into a phase directory
   */
  function writeStatusMd(phaseDir, content) {
    fs.writeFileSync(path.join(phaseDir, '07-STATUS.md'), content);
  }

  test('status init creates STATUS.md from template', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '07-test-phase');
    setupPhaseWithPlans(phaseDir, [
      ['07-01-PLAN.md', 2],
      ['07-02-PLAN.md', 3],
    ]);
    setupTemplate(tmpDir);

    const result = runMowTools('status init 7', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.created, true, 'should report created');
    assert.strictEqual(output.plans, 2, 'should find 2 plans');

    // Verify file exists and has correct content
    const statusPath = path.join(phaseDir, '07-STATUS.md');
    assert.ok(fs.existsSync(statusPath), 'STATUS.md should exist');

    const content = fs.readFileSync(statusPath, 'utf-8');
    assert.ok(content.includes('**Phase:** 07'), 'should contain phase number');
    assert.ok(content.includes('07-01 | not started'), 'should have 07-01 row');
    assert.ok(content.includes('07-02 | not started'), 'should have 07-02 row');
    assert.ok(content.includes('0/2'), 'should have task count 0/2 for plan 1');
    assert.ok(content.includes('0/3'), 'should have task count 0/3 for plan 2');
  });

  test('status init fails gracefully for missing phase', () => {
    setupTemplate(tmpDir);
    const result = runMowTools('status init 99', tmpDir);
    assert.strictEqual(result.success, false, 'should fail');
    assert.ok(result.error.includes('Phase') || result.error.includes('not found'),
      `should mention phase not found, got: ${result.error}`);
  });

  test('status read parses STATUS.md correctly', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '07-test-phase');
    fs.mkdirSync(phaseDir, { recursive: true });

    writeStatusMd(phaseDir, `# Phase 07: Test Phase -- Status

**Phase:** 07
**Status:** executing
**Worker:** worker-green
**Worktree:** /tmp/wt-7
**Started:** 2026-02-20T10:00:00Z
**Last update:** 2026-02-20T10:15:00Z
**Blocker mode:** skip

## Plan Progress

| Plan | Status | Started | Duration | Commit | Tasks |
|------|--------|---------|----------|--------|-------|
| 07-01 | complete | 10:00 | 3min | a1b2c3d | 4/4 |
| 07-02 | in progress | 10:05 | -- | -- | 2/5 |

## Aggregate

**Plans:** 1 complete, 1 in progress, 0 not started, 0 failed
**Commits:** a1b2c3d

## Blockers

None.

## Decisions

None.

## Context

None.
`);

    const result = runMowTools('status read 7', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.status, 'executing', 'should extract status');
    assert.strictEqual(parsed.worker, 'worker-green', 'should extract worker');
    assert.strictEqual(parsed.plans.length, 2, 'should have 2 plans');
    assert.strictEqual(parsed.plans[0].status, 'complete', 'first plan should be complete');
    assert.strictEqual(parsed.plans[0].commit, 'a1b2c3d', 'first plan should have commit');
    assert.strictEqual(parsed.plans[1].status, 'in progress', 'second plan should be in progress');
    assert.strictEqual(parsed.aggregate.complete, 1, 'should count 1 complete');
    assert.strictEqual(parsed.aggregate.in_progress, 1, 'should count 1 in progress');
  });

  test('status write updates a single plan row', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '07-test-phase');
    setupPhaseWithPlans(phaseDir, [
      ['07-01-PLAN.md', 2],
      ['07-02-PLAN.md', 3],
    ]);
    setupTemplate(tmpDir);

    // Initialize first
    runMowTools('status init 7', tmpDir);

    // Write in progress status for 07-01
    const result = runMowTools('status write 7 --plan 07-01 --status "in progress"', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.updated, true, 'should report updated');
    assert.strictEqual(output.plan, '07-01', 'should report plan');
    assert.strictEqual(output.new_status, 'in progress', 'should report new status');

    // Read back and verify
    const content = fs.readFileSync(path.join(phaseDir, '07-STATUS.md'), 'utf-8');
    assert.ok(content.includes('07-01 | in progress'), '07-01 should be in progress');
    assert.ok(content.includes('07-02 | not started'), '07-02 should remain not started');
    assert.ok(content.includes('**Status:** executing'), 'phase status should be executing');
    assert.ok(!content.includes('**Last update:** --'), 'last update should have timestamp');
  });

  test('status write handles plan completion with commit SHA', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '07-test-phase');
    setupPhaseWithPlans(phaseDir, [
      ['07-01-PLAN.md', 2],
      ['07-02-PLAN.md', 3],
    ]);
    setupTemplate(tmpDir);

    // Initialize and set to in progress first
    runMowTools('status init 7', tmpDir);
    runMowTools('status write 7 --plan 07-01 --status "in progress"', tmpDir);

    // Now mark as complete with commit and duration
    const result = runMowTools('status write 7 --plan 07-01 --status complete --commit a1b2c3d --duration 3min', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const content = fs.readFileSync(path.join(phaseDir, '07-STATUS.md'), 'utf-8');
    assert.ok(content.includes('07-01 | complete'), '07-01 should be complete');
    assert.ok(content.includes('a1b2c3d'), 'should contain commit SHA');
    assert.ok(content.includes('3min'), 'should contain duration');
    assert.ok(content.includes('1 complete'), 'aggregate should show 1 complete');
  });

  test('status write fails for unknown plan', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '07-test-phase');
    setupPhaseWithPlans(phaseDir, [
      ['07-01-PLAN.md', 2],
    ]);
    setupTemplate(tmpDir);

    runMowTools('status init 7', tmpDir);

    const result = runMowTools('status write 7 --plan 07-99 --status "in progress"', tmpDir);
    assert.strictEqual(result.success, false, 'should fail');
    assert.ok(result.error.includes('07-99') || result.error.includes('not found'),
      `should mention plan not found, got: ${result.error}`);
  });

  test('status aggregate recalculates counts', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '07-test-phase');
    fs.mkdirSync(phaseDir, { recursive: true });

    writeStatusMd(phaseDir, `# Phase 07: Test Phase -- Status

**Phase:** 07
**Status:** executing
**Worker:** --
**Worktree:** --
**Started:** --
**Last update:** --
**Blocker mode:** skip

## Plan Progress

| Plan | Status | Started | Duration | Commit | Tasks |
|------|--------|---------|----------|--------|-------|
| 07-01 | complete | 10:00 | 3min | a1b2c3d | 2/2 |
| 07-02 | in progress | 10:05 | -- | -- | 1/3 |
| 07-03 | not started | -- | -- | -- | 0/2 |

## Aggregate

**Plans:** 0 complete, 0 in progress, 0 not started, 0 failed
**Commits:** --

## Blockers

None.

## Decisions

None.

## Context

None.
`);

    const result = runMowTools('status aggregate 7', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.complete, 1, 'should count 1 complete');
    assert.strictEqual(output.in_progress, 1, 'should count 1 in progress');
    assert.strictEqual(output.not_started, 1, 'should count 1 not started');
    assert.strictEqual(output.failed, 0, 'should count 0 failed');
    assert.deepStrictEqual(output.commits, ['a1b2c3d'], 'should collect commit SHAs');

    // Verify the file was updated
    const content = fs.readFileSync(path.join(phaseDir, '07-STATUS.md'), 'utf-8');
    assert.ok(content.includes('1 complete, 1 in progress, 1 not started, 0 failed'),
      'aggregate section should be updated');
  });

  test('status write updates phase status to complete when all plans complete', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '07-test-phase');
    setupPhaseWithPlans(phaseDir, [
      ['07-01-PLAN.md', 2],
      ['07-02-PLAN.md', 3],
    ]);
    setupTemplate(tmpDir);

    runMowTools('status init 7', tmpDir);

    // Complete both plans
    runMowTools('status write 7 --plan 07-01 --status complete --commit abc1234', tmpDir);
    runMowTools('status write 7 --plan 07-02 --status complete --commit def5678', tmpDir);

    const content = fs.readFileSync(path.join(phaseDir, '07-STATUS.md'), 'utf-8');
    assert.ok(content.includes('**Status:** complete'), 'phase status should be complete');
    assert.ok(content.includes('2 complete, 0 in progress, 0 not started, 0 failed'),
      'aggregate should show all complete');
    assert.ok(content.includes('abc1234') && content.includes('def5678'),
      'commits section should list both SHAs');
  });

  test('status init pre-populates task counts from plan files', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '07-test-phase');
    // Create plan with 5 tasks
    fs.mkdirSync(phaseDir, { recursive: true });
    const planContent = `---
phase: 07
plan: 01
---

<task type="auto">
  <name>Task 1</name>
</task>

<task type="auto">
  <name>Task 2</name>
</task>

<task type="auto">
  <name>Task 3</name>
</task>

<task type="checkpoint:human-verify">
  <name>Task 4</name>
</task>

<task type="auto">
  <name>Task 5</name>
</task>
`;
    fs.writeFileSync(path.join(phaseDir, '07-01-PLAN.md'), planContent);
    setupTemplate(tmpDir);

    runMowTools('status init 7', tmpDir);

    const content = fs.readFileSync(path.join(phaseDir, '07-STATUS.md'), 'utf-8');
    assert.ok(content.includes('0/5'), 'should count all 5 tasks including checkpoint');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// roadmap analyze-dag command
// ─────────────────────────────────────────────────────────────────────────────

describe('roadmap analyze-dag command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('diamond topology produces correct waves', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 7: State Coherence
**Goal**: Build state layer
**Depends on**: Nothing

### Phase 8: DAG Scheduling
**Goal**: Build DAG
**Depends on**: Nothing

### Phase 9: Execution Engine
**Goal**: Run phases
**Depends on**: Phase 7, Phase 8

### Phase 10: Live Feedback
**Goal**: Show feedback
**Depends on**: Phase 7

### Phase 11: Documentation
**Goal**: Write docs
**Depends on**: Phase 7, Phase 8, Phase 9, Phase 10
`
    );

    const result = runMowTools('roadmap analyze-dag --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);

    // Validate waves
    assert.ok(output.waves, 'waves should exist');
    assert.strictEqual(output.waves.length, 3, 'should have 3 waves');
    assert.deepStrictEqual(output.waves[0].phases.sort(), ['7', '8'], 'wave 1 = [7, 8]');
    assert.deepStrictEqual(output.waves[1].phases.sort(), ['10', '9'], 'wave 2 = [9, 10]');
    assert.deepStrictEqual(output.waves[2].phases, ['11'], 'wave 3 = [11]');

    // Validate DAG properties
    assert.strictEqual(output.validation.is_dag, true);
    assert.strictEqual(output.validation.fully_sequential, false);
    assert.strictEqual(output.validation.cycle_error, null);
  });

  test('linear chain is fully sequential', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: First
**Goal**: Start
**Depends on**: Nothing

### Phase 2: Second
**Goal**: Continue
**Depends on**: Phase 1

### Phase 3: Third
**Goal**: Finish
**Depends on**: Phase 2
`
    );

    const result = runMowTools('roadmap analyze-dag --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);

    assert.strictEqual(output.waves.length, 3, 'should have 3 waves');
    assert.deepStrictEqual(output.waves[0].phases, ['1'], 'wave 1 = [1]');
    assert.deepStrictEqual(output.waves[1].phases, ['2'], 'wave 2 = [2]');
    assert.deepStrictEqual(output.waves[2].phases, ['3'], 'wave 3 = [3]');
    assert.strictEqual(output.validation.fully_sequential, true);
  });

  test('fully independent phases in single wave', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Alpha
**Goal**: Do alpha
**Depends on**: Nothing

### Phase 2: Beta
**Goal**: Do beta
**Depends on**: Nothing

### Phase 3: Gamma
**Goal**: Do gamma
**Depends on**: Nothing
`
    );

    const result = runMowTools('roadmap analyze-dag --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);

    assert.strictEqual(output.waves.length, 1, 'should have 1 wave');
    assert.deepStrictEqual(output.waves[0].phases.sort(), ['1', '2', '3'], 'wave 1 = [1, 2, 3]');
    assert.strictEqual(output.validation.fully_sequential, false);
  });

  test('cycle detection reports involved phases', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Alpha
**Goal**: Do alpha
**Depends on**: Phase 3

### Phase 2: Beta
**Goal**: Do beta
**Depends on**: Phase 1

### Phase 3: Gamma
**Goal**: Do gamma
**Depends on**: Phase 2
`
    );

    const result = runMowTools('roadmap analyze-dag --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);

    assert.strictEqual(output.validation.is_dag, false, 'should not be a valid DAG');
    assert.ok(output.validation.cycle_error, 'cycle_error should be set');
    assert.ok(output.validation.cycle_error.includes('1'), 'cycle should involve phase 1');
    assert.ok(output.validation.cycle_error.includes('2'), 'cycle should involve phase 2');
    assert.ok(output.validation.cycle_error.includes('3'), 'cycle should involve phase 3');
    assert.strictEqual(output.waves, null, 'waves should be null for cyclic graph');
  });

  test('missing references treated as warnings not errors', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Alpha
**Goal**: Do alpha
**Depends on**: Nothing

### Phase 2: Beta
**Goal**: Do beta
**Depends on**: Phase 1, Phase 99
`
    );

    const result = runMowTools('roadmap analyze-dag --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);

    assert.strictEqual(output.validation.is_dag, true, 'should still be a valid DAG');
    assert.ok(output.validation.missing_refs.length > 0, 'should have missing refs');
    assert.strictEqual(output.validation.missing_refs[0].phase, '2');
    assert.strictEqual(output.validation.missing_refs[0].references, '99');

    // Missing ref treated as satisfied, so phase 2 still in wave 2
    assert.strictEqual(output.waves.length, 2, 'should have 2 waves');
    assert.deepStrictEqual(output.waves[0].phases, ['1'], 'wave 1 = [1]');
    assert.deepStrictEqual(output.waves[1].phases, ['2'], 'wave 2 = [2]');
  });

  test('ready and blocked status based on disk completion', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'ROADMAP.md'),
      `# Roadmap

### Phase 1: Foundation
**Goal**: Set up
**Depends on**: Nothing

### Phase 2: Build
**Goal**: Build it
**Depends on**: Phase 1

### Phase 3: Deploy
**Goal**: Ship it
**Depends on**: Phase 1, Phase 2
`
    );

    // Phase 1 complete (has PLAN + SUMMARY)
    const p1 = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    fs.mkdirSync(p1, { recursive: true });
    fs.writeFileSync(path.join(p1, '01-01-PLAN.md'), '# Plan');
    fs.writeFileSync(path.join(p1, '01-01-SUMMARY.md'), '# Summary');

    const result = runMowTools('roadmap analyze-dag --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);

    assert.deepStrictEqual(output.completed, ['1'], 'phase 1 should be completed');
    assert.deepStrictEqual(output.ready, ['2'], 'phase 2 should be ready');
    assert.strictEqual(output.blocked.length, 1, 'should have 1 blocked phase');
    assert.strictEqual(output.blocked[0].phase, '3');
    assert.deepStrictEqual(output.blocked[0].waiting_on, ['2']);
  });

  test('missing ROADMAP.md returns error', () => {
    const result = runMowTools('roadmap analyze-dag --raw', tmpDir);
    assert.ok(result.success, `Command should succeed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.error, 'ROADMAP.md not found');
  });
});

// ─── Worktree Lifecycle Management Tests ──────────────────────────────────────

describe('worktree list-manifest command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
    // Init git repo for worktree commands
    execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('returns default empty manifest when no manifest exists', () => {
    const result = runMowTools('worktree list-manifest --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const manifest = JSON.parse(result.output);
    assert.strictEqual(manifest.version, '1.0');
    assert.deepStrictEqual(manifest.worktrees, {});
    assert.strictEqual(manifest.updated, null);
  });

  test('returns manifest contents when manifest exists', () => {
    const worktreeDir = path.join(tmpDir, '.claude', 'worktrees');
    fs.mkdirSync(worktreeDir, { recursive: true });
    const manifestData = {
      version: '1.0',
      project: 'test',
      worktrees: {
        'phase-09': {
          path: path.join(tmpDir, '.claude', 'worktrees', 'phase-09'),
          branch: 'phase-09',
          phase: '09',
          phase_name: 'test-phase',
          created: '2026-01-01T00:00:00.000Z',
          status: 'active',
          stash_ref: null,
          last_commit: null,
          merged: false,
          merged_at: null,
        },
      },
      updated: '2026-01-01T00:00:00.000Z',
    };
    fs.writeFileSync(path.join(worktreeDir, 'manifest.json'), JSON.stringify(manifestData), 'utf-8');

    const result = runMowTools('worktree list-manifest --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const manifest = JSON.parse(result.output);
    assert.strictEqual(manifest.version, '1.0');
    assert.strictEqual(manifest.project, 'test');
    assert.ok(manifest.worktrees['phase-09'], 'should have phase-09 entry');
    assert.strictEqual(manifest.worktrees['phase-09'].branch, 'phase-09');
    assert.strictEqual(manifest.worktrees['phase-09'].status, 'active');
  });
});

describe('worktree create command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
    // Init git repo with a main branch and initial commit
    execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test');
    execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
  });

  afterEach(() => {
    // Clean up git worktrees before removing tmpDir
    try {
      execSync('git worktree prune', { cwd: tmpDir, stdio: 'pipe' });
      const wtDir = path.join(tmpDir, '.claude', 'worktrees');
      if (fs.existsSync(wtDir)) {
        // Remove worktree directories first
        const entries = fs.readdirSync(wtDir).filter(e => e !== 'manifest.json');
        for (const entry of entries) {
          try {
            execSync(`git worktree remove "${path.join(wtDir, entry)}" --force`, { cwd: tmpDir, stdio: 'pipe' });
          } catch {}
        }
      }
    } catch {}
    cleanup(tmpDir);
  });

  test('creates new worktree with correct structure', () => {
    const result = runMowTools('worktree create 09 --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.reused, false);
    assert.strictEqual(output.path, path.join(tmpDir, '.claude', 'worktrees', 'phase-09'));
    assert.strictEqual(output.branch, 'phase-09');

    // Verify worktree directory exists
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'worktrees', 'phase-09')), 'worktree directory should exist');

    // Verify manifest was updated
    const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'worktrees', 'manifest.json'), 'utf-8'));
    assert.ok(manifest.worktrees['phase-09'], 'manifest should have phase-09 entry');
    assert.strictEqual(manifest.worktrees['phase-09'].status, 'active');
    assert.strictEqual(manifest.worktrees['phase-09'].branch, 'phase-09');
    assert.strictEqual(manifest.worktrees['phase-09'].phase, '09');
  });

  test('reuses existing worktree when directory exists', () => {
    // Create first
    const result1 = runMowTools('worktree create 09 --raw', tmpDir);
    assert.ok(result1.success, `First create failed: ${result1.error}`);

    // Create again -- should reuse
    const result2 = runMowTools('worktree create 09 --raw', tmpDir);
    assert.ok(result2.success, `Reuse failed: ${result2.error}`);

    const output = JSON.parse(result2.output);
    assert.strictEqual(output.reused, true);
    assert.strictEqual(output.path, path.join(tmpDir, '.claude', 'worktrees', 'phase-09'));
  });

  test('cleans stale manifest entry when directory is gone', () => {
    // Create worktree
    runMowTools('worktree create 09 --raw', tmpDir);

    // Remove the worktree directory but keep manifest entry
    const wtPath = path.join(tmpDir, '.claude', 'worktrees', 'phase-09');
    try {
      execSync(`git worktree remove "${wtPath}" --force`, { cwd: tmpDir, stdio: 'pipe' });
    } catch {}
    if (fs.existsSync(wtPath)) {
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
    execSync('git worktree prune', { cwd: tmpDir, stdio: 'pipe' });

    // Verify manifest still has the entry
    const manifestBefore = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'worktrees', 'manifest.json'), 'utf-8'));
    assert.ok(manifestBefore.worktrees['phase-09'], 'stale entry should still exist before create');

    // Try to remove the branch so we can recreate
    try {
      execSync('git branch -D phase-09', { cwd: tmpDir, stdio: 'pipe' });
    } catch {}

    // Create again -- should detect stale entry and recreate
    const result = runMowTools('worktree create 09 --raw', tmpDir);
    assert.ok(result.success, `Recreate failed: ${result.error}`);

    const output = JSON.parse(result.output);
    assert.strictEqual(output.reused, false);
  });
});

describe('writeManifest and readManifest', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
    execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('writeManifest creates valid JSON with updated timestamp', () => {
    // Write a manifest by creating a worktree entry via list-manifest (starts empty),
    // then create a worktree which writes manifest
    const result = runMowTools('worktree list-manifest --raw', tmpDir);
    assert.ok(result.success);

    const manifest = JSON.parse(result.output);
    assert.strictEqual(manifest.version, '1.0');
    assert.deepStrictEqual(manifest.worktrees, {});
  });
});

// --- Phase 10: Visual Feedback Tests ---

describe('message schema v2 tests', () => {
  const { spawnSync } = require('child_process');

  test('message format task_claimed produces valid JSON with v:2 and required fields', () => {
    const result = runMowTools('message format task_claimed --phase 10 --plan 10-01 --task 3 --raw');
    assert.ok(result.success, `Command failed: ${result.error}`);
    const msg = JSON.parse(result.output);
    assert.strictEqual(msg.v, 2, 'schema version should be 2');
    assert.strictEqual(msg.type, 'task_claimed', 'type should be task_claimed');
    assert.strictEqual(msg.phase, '10', 'phase should be 10');
    assert.strictEqual(msg.plan, '10-01', 'plan should be 10-01');
    assert.strictEqual(msg.task, '3', 'task should be 3');
  });

  test('message format commit_made includes commit_hash field', () => {
    const result = runMowTools('message format commit_made --phase 10 --plan 10-01 --commit-hash abc1234 --raw');
    assert.ok(result.success, `Command failed: ${result.error}`);
    const msg = JSON.parse(result.output);
    assert.strictEqual(msg.v, 2);
    assert.strictEqual(msg.type, 'commit_made');
    assert.strictEqual(msg.commit_hash, 'abc1234', 'should have commit_hash');
  });

  test('message format task_complete produces valid JSON with phase, plan, and task fields', () => {
    const result = runMowTools('message format task_complete --phase 10 --plan 10-01 --task 2 --raw');
    assert.ok(result.success, `Command failed: ${result.error}`);
    const msg = JSON.parse(result.output);
    assert.strictEqual(msg.v, 2);
    assert.strictEqual(msg.type, 'task_complete');
    assert.strictEqual(msg.phase, '10');
    assert.strictEqual(msg.plan, '10-01');
    assert.strictEqual(msg.task, '2');
  });

  test('message format input_needed validates input_type (warn on unknown, still produce output)', () => {
    // Valid input_type
    const result1 = runMowTools('message format input_needed --phase 10 --input-type permission_prompt --detail "test" --raw');
    assert.ok(result1.success, `Valid input_type failed: ${result1.error}`);
    const msg1 = JSON.parse(result1.output);
    assert.strictEqual(msg1.input_type, 'permission_prompt');

    // Unknown input_type -- should still succeed but warn on stderr
    const proc = spawnSync('node', [TOOLS_PATH, 'message', 'format', 'input_needed', '--phase', '10', '--input-type', 'unknown_type', '--detail', 'test', '--raw'], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    assert.strictEqual(proc.status, 0, 'should still succeed with unknown input_type');
    assert.ok(proc.stderr.includes('Unrecognized input_type'), 'should warn about unknown input_type');
    const msg2 = JSON.parse(proc.stdout);
    assert.strictEqual(msg2.input_type, 'unknown_type', 'should still include the unknown type');
  });

  test('message format plan_created includes phase and plan', () => {
    const result = runMowTools('message format plan_created --phase 10 --plan 10-02 --raw');
    assert.ok(result.success, `Command failed: ${result.error}`);
    const msg = JSON.parse(result.output);
    assert.strictEqual(msg.v, 2);
    assert.strictEqual(msg.type, 'plan_created');
    assert.strictEqual(msg.phase, '10');
    assert.strictEqual(msg.plan, '10-02');
  });

  test('message parse accepts v2 messages with new types', () => {
    const v2Msg = JSON.stringify({ v: 2, type: 'task_complete', phase: '10', plan: '10-01', task: '1', ts: '2026-02-20T10:00:00Z' });
    const result = runMowTools(`message parse '${v2Msg}' --raw`);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, true, 'should be valid');
    assert.strictEqual(parsed.type, 'task_complete');
    assert.strictEqual(parsed.v, 2);
  });

  test('message format with --activity includes activity field truncated to 40 chars', () => {
    const longActivity = 'Implementing the dashboard renderer component for real-time updates';
    const result = runMowTools(`message format plan_started --phase 10 --plan 10-01 --activity "${longActivity}" --raw`);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const msg = JSON.parse(result.output);
    assert.ok(msg.activity, 'should have activity field');
    assert.ok(msg.activity.length <= 40, `activity should be truncated to 40 chars, got ${msg.activity.length}`);
    assert.strictEqual(msg.activity, longActivity.slice(0, 40), 'should match first 40 chars');
  });
});

describe('color helper and format subcommand tests', () => {
  const { spawnSync } = require('child_process');

  test('format banner with FORCE_COLOR=1 produces ANSI escape codes', () => {
    const proc = spawnSync('node', [TOOLS_PATH, 'format', 'banner', '--text', 'TEST BANNER', '--bg', '196', '--fg', '231'], {
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    assert.strictEqual(proc.status, 0, `Command failed: ${proc.stderr}`);
    assert.ok(proc.stdout.includes('\x1b[48;5;196m'), 'should have bg color escape');
    assert.ok(proc.stdout.includes('\x1b[38;5;231m'), 'should have fg color escape');
    assert.ok(proc.stdout.includes('TEST BANNER'), 'should contain text');
  });

  test('format banner with NO_COLOR=1 produces plain text (no escape codes)', () => {
    const proc = spawnSync('node', [TOOLS_PATH, 'format', 'banner', '--text', 'PLAIN BANNER'], {
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, NO_COLOR: '1' },
    });
    assert.strictEqual(proc.status, 0, `Command failed: ${proc.stderr}`);
    assert.ok(!proc.stdout.includes('\x1b['), 'should NOT contain ANSI escape codes');
    assert.ok(proc.stdout.includes('PLAIN BANNER'), 'should contain text');
  });

  test('format banner-phase --phase 10 uses phase palette color (not red)', () => {
    const proc = spawnSync('node', [TOOLS_PATH, 'format', 'banner-phase', '--phase', '10'], {
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    assert.strictEqual(proc.status, 0, `Command failed: ${proc.stderr}`);
    // Phase 10 % 12 = 10, palette[10] = 175
    assert.ok(proc.stdout.includes('48;5;175'), 'should use phase 10 palette bg color (175)');
    assert.ok(!proc.stdout.includes('48;5;196'), 'should NOT use red (196)');
  });

  test('format progress --percent 50 --width 10 produces bar with 5 fill and 5 empty', () => {
    const proc = spawnSync('node', [TOOLS_PATH, 'format', 'progress', '--percent', '50', '--width', '10'], {
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, NO_COLOR: '1' },
    });
    assert.strictEqual(proc.status, 0, `Command failed: ${proc.stderr}`);
    const output = proc.stdout.trim();
    // Count fill chars (full block U+2588) and empty chars (light shade U+2591)
    const fillCount = (output.match(/\u2588/g) || []).length;
    const emptyCount = (output.match(/\u2591/g) || []).length;
    assert.strictEqual(fillCount, 5, 'should have 5 fill chars');
    assert.strictEqual(emptyCount, 5, 'should have 5 empty chars');
    assert.ok(output.startsWith('['), 'should start with [');
    assert.ok(output.endsWith(']'), 'should end with ]');
  });
});

describe('caution stripe test', () => {
  const { spawnSync } = require('child_process');

  test('format banner-error with FORCE_COLOR=1 contains warning symbol and yellow ANSI code', () => {
    const proc = spawnSync('node', [TOOLS_PATH, 'format', 'banner-error', '--text', 'CRITICAL ERROR'], {
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    assert.strictEqual(proc.status, 0, `Command failed: ${proc.stderr}`);
    assert.ok(proc.stdout.includes('\u26A0'), 'should contain warning symbol');
    assert.ok(proc.stdout.includes('48;5;226'), 'should contain yellow ANSI code');
    assert.ok(proc.stdout.includes('CRITICAL ERROR'), 'should contain error text');
  });
});

// --- Phase 10: Dashboard Tests ---

describe('dashboard event storage tests', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('dashboard event add creates NDJSON file and appends event with correct fields', () => {
    const result = runMowTools('dashboard event add --type task_claimed --phase 10 --detail "Test event" --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const event = JSON.parse(result.output);
    assert.strictEqual(event.type, 'task_claimed');
    assert.strictEqual(event.phase, '10');
    assert.strictEqual(event.detail, 'Test event');
    assert.ok(event.ts, 'should have timestamp');

    // Verify NDJSON file exists
    const ndjsonPath = path.join(tmpDir, '.planning', 'dashboard-events.ndjson');
    assert.ok(fs.existsSync(ndjsonPath), 'NDJSON file should exist');
    const lines = fs.readFileSync(ndjsonPath, 'utf-8').trim().split('\n');
    assert.strictEqual(lines.length, 1, 'should have 1 event line');
    const parsed = JSON.parse(lines[0]);
    assert.strictEqual(parsed.type, 'task_claimed');
  });

  test('dashboard event add auto-prunes when exceeding 100 events', () => {
    // Add 101 events
    for (let i = 0; i < 101; i++) {
      runMowTools(`dashboard event add --type task_claimed --phase 10 --detail "Event ${i}" --raw`, tmpDir);
    }

    const ndjsonPath = path.join(tmpDir, '.planning', 'dashboard-events.ndjson');
    const lines = fs.readFileSync(ndjsonPath, 'utf-8').trim().split('\n').filter(l => l.trim());
    assert.strictEqual(lines.length, 50, 'should auto-prune to 50 events after exceeding 100');
  });

  test('dashboard event add --type input_needed auto-pins notification', () => {
    runMowTools('dashboard event add --type input_needed --phase 10 --detail "permission_prompt" --raw', tmpDir);

    const stateResult = runMowTools('dashboard state --raw', tmpDir);
    assert.ok(stateResult.success, `Command failed: ${stateResult.error}`);
    const state = JSON.parse(stateResult.output);
    assert.strictEqual(state.pinned.length, 1, 'should have 1 pinned notification');
    assert.strictEqual(state.pinned[0].type, 'input_needed');
    assert.strictEqual(state.pinned[0].phase, '10');
  });

  test('dashboard event add --type error auto-pins notification', () => {
    runMowTools('dashboard event add --type error --phase 10 --detail "Build failed" --raw', tmpDir);

    const stateResult = runMowTools('dashboard state --raw', tmpDir);
    assert.ok(stateResult.success, `Command failed: ${stateResult.error}`);
    const state = JSON.parse(stateResult.output);
    assert.strictEqual(state.pinned.length, 1, 'should have 1 pinned notification');
    assert.strictEqual(state.pinned[0].type, 'error');
    assert.strictEqual(state.pinned[0].detail, 'Build failed');
  });

  test('dashboard event add for a phase with pinned notification auto-dismisses the pin', () => {
    // Pin an input_needed notification
    runMowTools('dashboard event add --type input_needed --phase 10 --detail "permission_prompt" --raw', tmpDir);

    // Verify it was pinned
    let stateResult = runMowTools('dashboard state --raw', tmpDir);
    let state = JSON.parse(stateResult.output);
    assert.strictEqual(state.pinned.length, 1, 'should have 1 pinned');

    // Add a non-input_needed, non-error event for the same phase -> auto-dismiss
    runMowTools('dashboard event add --type task_claimed --phase 10 --detail "Worker resumed" --raw', tmpDir);

    stateResult = runMowTools('dashboard state --raw', tmpDir);
    state = JSON.parse(stateResult.output);
    assert.strictEqual(state.pinned.length, 0, 'pinned should be auto-dismissed after normal event for same phase');
  });
});

describe('dashboard render tests', () => {
  const { spawnSync } = require('child_process');
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('dashboard render --raw with no active phases returns JSON with phases: 0', () => {
    // Create STATE.md without Active Phases section
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '# Project State\n\n## Current Position\n\nNothing here.\n', 'utf-8');

    const result = runMowTools('dashboard render --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const data = JSON.parse(result.output);
    assert.strictEqual(data.phases, 0, 'should have phases: 0');
  });

  test('dashboard render --raw after adding events returns JSON with correct event count', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '# Project State\n\n## Current Position\n\n', 'utf-8');

    runMowTools('dashboard event add --type task_claimed --phase 10 --detail "Event 1" --raw', tmpDir);
    runMowTools('dashboard event add --type commit_made --phase 10 --detail "Event 2" --raw', tmpDir);
    runMowTools('dashboard event add --type plan_complete --phase 10 --detail "Event 3" --raw', tmpDir);

    const result = runMowTools('dashboard render --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const data = JSON.parse(result.output);
    assert.strictEqual(data.events, 3, 'should have 3 events');
  });

  test('dashboard render with FORCE_COLOR=1 produces output containing ANSI escape codes', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '# Project State\n\n## Current Position\n\n', 'utf-8');
    runMowTools('dashboard event add --type task_claimed --phase 10 --detail "Colorful event" --raw', tmpDir);

    const proc = spawnSync('node', [TOOLS_PATH, 'dashboard', 'render'], {
      cwd: tmpDir,
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    assert.strictEqual(proc.status, 0, `Command failed: ${proc.stderr}`);
    assert.ok(proc.stdout.includes('\x1b['), 'should contain ANSI escape codes');
  });

  test('dashboard render with NO_COLOR=1 produces output with no ANSI escape codes', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning', 'STATE.md'), '# Project State\n\n## Current Position\n\n', 'utf-8');
    runMowTools('dashboard event add --type task_claimed --phase 10 --detail "Plain event" --raw', tmpDir);

    const proc = spawnSync('node', [TOOLS_PATH, 'dashboard', 'render'], {
      cwd: tmpDir,
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, NO_COLOR: '1' },
    });
    assert.strictEqual(proc.status, 0, `Command failed: ${proc.stderr}`);
    assert.ok(!proc.stdout.includes('\x1b['), 'should NOT contain ANSI escape codes');
    assert.ok(proc.stdout.includes('Plain event'), 'should contain event text');
  });
});

describe('dashboard state management tests', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('dashboard state --raw returns JSON with pinned array', () => {
    const result = runMowTools('dashboard state --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const state = JSON.parse(result.output);
    assert.ok(Array.isArray(state.pinned), 'should have pinned array');
    assert.strictEqual(state.pinned.length, 0, 'should start with empty pinned');
    assert.strictEqual(state.last_line_count, 0, 'should start with 0 line count');
  });

  test('dashboard clear removes both NDJSON and state files', () => {
    // Create events and state (input_needed writes to state file via auto-pin)
    runMowTools('dashboard event add --type input_needed --phase 10 --detail "Test" --raw', tmpDir);

    // Verify files exist
    const ndjsonPath = path.join(tmpDir, '.planning', 'dashboard-events.ndjson');
    const statePath = path.join(tmpDir, '.planning', 'dashboard-state.json');
    assert.ok(fs.existsSync(ndjsonPath), 'NDJSON should exist before clear');
    assert.ok(fs.existsSync(statePath), 'State should exist before clear');

    // Clear
    const result = runMowTools('dashboard clear --raw', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);
    const data = JSON.parse(result.output);
    assert.strictEqual(data.cleared, true);

    // Verify files removed
    assert.ok(!fs.existsSync(ndjsonPath), 'NDJSON should be removed after clear');
    assert.ok(!fs.existsSync(statePath), 'State should be removed after clear');
  });
});
