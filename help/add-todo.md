# /mow:add-todo

Capture an idea or task as a structured todo for later work.

## Usage

    /mow:add-todo [description]

## Arguments

    description    Optional description (extracted from conversation if omitted)

## What Happens

1. Creates `.planning/todos/` directory if needed
2. Extracts content from arguments or current conversation context
3. Infers the relevant area from file paths and context
4. Checks for duplicate todos
5. Creates a todo file with YAML frontmatter and slug-based filename
6. Updates STATE.md pending todos section
7. Commits the new todo

## Examples

    /mow:add-todo "Add rate limiting to API"    Capture a specific task
    /mow:add-todo                               Capture from conversation context

## Related

    /mow:check-todos     List and work on pending todos
    /mow:add-phase       Create a full phase for larger work
    /mow:quick            Execute a small task immediately
