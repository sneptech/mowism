# /mow:set-profile

Switch model profile for MOW agents.

## Usage

    /mow:set-profile <profile>

## Arguments

    profile    One of: quality, balanced, budget

## What Happens

1. Validates the profile argument
2. Creates config.json if it does not exist
3. Updates the model_profile setting in `.planning/config.json`
4. Shows a model table displaying which Claude model each agent will use
5. Confirms the change

## Examples

    /mow:set-profile quality     Use best models for all agents
    /mow:set-profile balanced    Balance quality and cost
    /mow:set-profile budget      Minimize token spend

## Related

    /mow:settings    Full interactive configuration
    /mow:help        See all available commands
