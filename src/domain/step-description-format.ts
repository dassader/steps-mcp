export const stepDescriptionFormatTemplate = `## Summary
[One or two sentences describing what needs to be done.]

## Outcome
[The final result that should exist after the step is done.]

## Context / User story
[Why this is needed.]

As a [user]
I want [goal]
So that [benefit]

## Scope

### Included
- [Included item]
- [Included item]

### Not included
- [Excluded item]
- [Excluded item]

## Requirements
- [Requirement]
- [Requirement]

## Constraints
- [Constraint]
- [Constraint]

## Acceptance criteria
- [ ] [Criterion]
- [ ] [Criterion]

## Verification
[How the result will be checked.]

### Preparation
- [ ] [Preparation check]

### Execution
- [ ] [Execution check]

### Cleanup / Finalization
- [ ] [Cleanup or finalization check]

## Notes
[Additional notes, or None.]`;

export const stepDescriptionFormatInstruction = `Step descriptions must use this markdown outline. Keep headings, subheadings, checklist markers, and user-story labels in English. Write the filled-in content in the language used with the user. Replace bracketed placeholders with concrete task content.

${stepDescriptionFormatTemplate}`;
