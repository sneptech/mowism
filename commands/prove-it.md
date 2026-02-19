---
name: prove-it
description: Demand evidence that changes work correctly by diffing behavior between states
argument-hint: "[claim to prove, e.g. 'the new caching layer doesn't change API responses']"
allowed-tools: Read, Bash, Grep, Glob, Write
---

# Prove It

**Source:** Boris Cherny -- "Say 'Prove to me this works' and have Claude diff behavior between main and your feature branch."

## Objective

Do not claim changes work -- prove it with evidence. Run tests, diff branch outputs, write verification scripts if needed. Present a structured proof with claims, evidence, and gaps. Explicitly flag anything that could NOT be verified.

## Process

### 1. Identify Claims to Verify

- If `$ARGUMENTS` specifies a claim, break it into testable sub-claims
- If no arguments, infer claims from recent changes:
  - What behavior should be preserved? (regression check)
  - What new behavior should exist? (feature check)
  - What behavior should be removed? (removal check)
- List every claim explicitly before gathering evidence

### 2. Gather Evidence

For each claim, use the strongest available evidence type:

| Evidence Type | Strength | How |
|---|---|---|
| **Automated tests pass** | Strong | Run existing test suite, show output |
| **New test written and passes** | Strong | Write a focused test, run it, show output |
| **Branch diff shows identical output** | Strong | Run same operation on both branches, diff results |
| **Verification script** | Strong | Write and run a script that checks specific behavior |
| **Manual inspection** | Weak | Read the code and reason about correctness |
| **Type system guarantees** | Medium | Show that types enforce the claimed behavior |

Prefer automated evidence over manual inspection. If a claim can only be verified by reading code, say so explicitly -- that is weaker evidence.

### 3. Write Verification Scripts If Needed

When existing tests do not cover a claim:
- Write a minimal script that exercises the specific behavior
- Run it and capture output
- Save scripts to a temp location or present inline
- Scripts should be deterministic and reproducible

### 4. Present Structured Proof

For each claim:

```
### Claim: [statement]

**Evidence:**
- [evidence type]: [what was done]
- [output/result]

**Verdict:** PROVEN / NOT PROVEN / PARTIALLY PROVEN

[If NOT PROVEN: why it could not be verified and what would be needed]
```

### 5. Flag Gaps Explicitly

At the end, list everything that could NOT be verified:

```
## Verification Gaps

| Claim | Why Not Verifiable | Risk Level | What Would Be Needed |
|---|---|---|---|
| [claim] | [reason] | HIGH/MEDIUM/LOW | [what's missing] |
```

Do not hide gaps. The whole point is to know what is proven and what is not.

## Output Format

```
## Proof: [what is being proved]

### Summary
- Claims verified: N/M
- Proven: N
- Partially proven: N
- Not proven: N

### Proof Table

| # | Claim | Evidence | Verdict |
|---|-------|----------|---------|
| 1 | [claim] | [evidence summary] | PROVEN |
| 2 | [claim] | [evidence summary] | NOT PROVEN |

### Detailed Evidence

[Per-claim details as described above]

### Verification Gaps

[Table of unverifiable claims]

### Overall Verdict
[PROVEN / PARTIALLY PROVEN / NOT PROVEN -- with honest assessment]
```

## Rules

- "It compiles" is not proof. "Tests pass" is better. "Tests specifically covering this behavior pass" is best.
- If you cannot prove a claim, say so. Do not hand-wave with "should work" or "looks correct."
- Manual code inspection is the weakest form of evidence. Always try to find something stronger.
- Branch comparison is powerful -- diff output between main and feature branch for the same inputs.
- A proof with explicit gaps is more valuable than a confident-sounding claim with no evidence.
- Write verification scripts when needed. The effort of writing a script is worth the confidence it provides.
- Do not modify the code being proved. Observation only, unless writing new tests or verification scripts.
