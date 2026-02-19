# /mow:map-codebase

Analyze a codebase with parallel mapper agents to produce structured documents.

## Usage

    /mow:map-codebase [area]

## Arguments

    area    Optional focus area (e.g., "api", "auth") to narrow the analysis

## What Happens

1. Checks for existing `.planning/codebase/` documents (offers refresh or skip)
2. Creates `.planning/codebase/` directory
3. Spawns 4 parallel mapper agents:
   - Tech agent: STACK.md, INTEGRATIONS.md
   - Architecture agent: ARCHITECTURE.md, STRUCTURE.md
   - Quality agent: CONVENTIONS.md, TESTING.md
   - Concerns agent: CONCERNS.md
4. Verifies all 7 documents exist
5. Commits the codebase map

## Examples

    /mow:map-codebase          Map the entire codebase
    /mow:map-codebase auth     Focus mapping on the auth subsystem

## Related

    /mow:new-project      Initialize project after mapping a brownfield codebase
    /mow:plan-phase       Plan phases with codebase context
    /mow:progress         Check project status
