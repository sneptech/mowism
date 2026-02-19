# /mow:migrate

Migrate an existing GSD .planning/ directory to Mowism format.

## Usage

    /mow:migrate

## What Happens

1. Verifies `.planning/` directory exists with files
2. Creates timestamped backup at `.planning.backup.{timestamp}/`
3. Applies string replacements: GSD paths, agent names, command prefixes, brand strings
4. Verifies no functional GSD references remain (prose/historical references are OK)
5. Auto-commits the migration
6. Provides restore command if anything goes wrong

## Examples

    /mow:migrate    Migrate .planning/ from GSD to Mowism format

## Related

    /mow:health     Check installation health after migration
    /mow:resume-work    Resume work on the migrated project
