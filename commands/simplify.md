---
name: simplify
description: Audit code for unnecessary complexity and over-engineering
argument-hint: "[file or directory to audit]"
allowed-tools: Read, Bash, Grep, Glob, Edit
---

# Simplify

**Source:** Karpathy -- "Your natural tendency is to overcomplicate. Actively resist it. If you build 1000 lines and 100 would suffice, you have failed."

**The Rule:** Three similar lines of code is better than a premature abstraction.

## Objective

Audit the target code for unnecessary complexity, over-engineering, and premature abstraction. Present simplification opportunities with severity and estimated savings. Make no changes without explicit user approval.

## Process

### 1. Identify Target

- If `$ARGUMENTS` specifies a file or directory, audit that
- If no arguments, audit recently modified files (`git diff --name-only HEAD~3`)
- Read all target files thoroughly before making any judgments

### 2. Evaluate Every Function and Class

For each function, class, module, or abstraction layer, assess:

| Check | Question |
|---|---|
| **Line count** | Is this longer than it needs to be? |
| **Abstraction value** | Does this abstraction earn its existence through reuse or clarity? |
| **Premature generalization** | Is this generic for a future that may never come? |
| **Indirection cost** | How many files must you read to understand what happens? |
| **Configuration surface** | Are there options/parameters nobody uses? |

### 3. Check for Specific Anti-Patterns

- **Bloated abstractions:** Classes/functions that wrap simple operations in layers of indirection
- **Premature generalization:** Generic solutions for problems that have exactly one instance
- **Clever tricks:** Code that is impressive but hard to read (regex golf, ternary chains, reduce abuse)
- **Helper functions used once:** A function called from exactly one place that does not improve readability
- **Backwards-compatibility shims:** Code preserved for transitions that already happened
- **Factory patterns for one product:** AbstractFactoryFactory that creates exactly one thing
- **Over-parameterized functions:** Functions with 5+ parameters or options objects with mostly-unused fields
- **Unnecessary async:** Async functions that never await anything
- **Dead configuration:** Config options that are always set to the same value

### 4. Present Findings

For each finding, provide:

```
### [Severity] [File:Line] Brief description

**What:** [What the code does now]
**Why it's too complex:** [Specific reason]
**Simplification:** [What it should be instead]
**Estimated savings:** [Lines removed / complexity reduction]
**Risk:** [What could break]
```

Severity levels:
- **HIGH** -- Significant unnecessary complexity, strong recommendation to simplify
- **MEDIUM** -- Moderate over-engineering, worth simplifying if touching the file
- **LOW** -- Minor, address if convenient

### 5. Ask Before Changing

Present all findings, then ask:

> Which of these simplifications would you like me to apply? (all / list numbers / none)

Only modify code after explicit approval. When applying changes, verify behavior is preserved.

## Output Format

```
## Simplify Audit: [target]

### Summary
- Files audited: N
- Findings: N (H high, M medium, L low)
- Estimated total line reduction: ~N lines

### Findings

[Findings listed by severity, HIGH first]

### Recommendation
[Overall assessment: is this code appropriately simple, moderately over-engineered, or significantly bloated?]
```

## Rules

- Three similar lines is better than a premature abstraction. Say this explicitly when relevant.
- Do not penalize genuinely useful abstractions that are used in 3+ places.
- Do not confuse "unfamiliar" with "complex" -- code can be simple even if the domain is hard.
- Configuration is not free. Every option is a decision someone must make.
- "It might be useful someday" is not a justification. YAGNI.
- Never modify code without asking first. This skill identifies; the user decides.
