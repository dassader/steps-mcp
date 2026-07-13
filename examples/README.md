# Examples

## Seed the demo workflow

Start a built Steps MCP server, then populate it with a realistic plan:

```bash
npm run build
DB_PATH=./data/demo.db npm start
```

In another terminal:

```bash
npm run demo:seed
```

The script prints the plan ID and browser review URL. Set `STEPS_MCP_URL` when the MCP endpoint is not `http://127.0.0.1:3001/mcp`:

```bash
STEPS_MCP_URL=http://127.0.0.1:8799/mcp npm run demo:seed
```

The generated data demonstrates the full workflow at once:

- a draft plan waiting for review;
- an executing plan with todo, implementing, verification, and done steps;
- note-backed status transitions;
- a durable agent note with an attachment.

## Core tool calls

Create a reviewable plan:

```json
{
  "name": "plan.create_with_steps",
  "arguments": {
    "title": "Launch Steps MCP 1.0",
    "steps": [
      {
        "title": "Define the agent workflow",
        "description": "## Summary\nDefine the planning and execution lifecycle.\n\n## Outcome\nA documented workflow exists.\n\n## Context / User story\nAgents need a reliable execution contract.\n\nAs an AI agent\nI want explicit workflow states\nSo that I can continue work safely\n\n## Scope\n\n### Included\n- Plan lifecycle\n- Step transitions\n\n### Not included\n- Team permissions\n- Billing\n\n## Requirements\n- Keep transitions explicit\n- Store durable notes\n\n## Constraints\n- Use the MCP protocol\n- Preserve state in SQLite\n\n## Acceptance criteria\n- [ ] The lifecycle is documented\n- [ ] Invalid transitions are rejected\n\n## Verification\nRun the workflow contract tests.\n\n### Preparation\n- [ ] Create a temporary database\n\n### Execution\n- [ ] Run the integration suite\n\n### Cleanup / Finalization\n- [ ] Remove temporary data\n\n## Notes\nNone.",
        "order": 1
      }
    ]
  }
}
```

Approve it after the user reviews the browser URL:

```json
{
  "name": "plan.approve",
  "arguments": {
    "planId": "<plan-id>",
    "approvalEvidence": "User approved the plan in the review UI."
  }
}
```

Record an implementation milestone as a durable, note-backed transition:

```json
{
  "name": "step.transition",
  "arguments": {
    "stepId": "<step-id>",
    "fromStatus": "implementing",
    "toStatus": "verification",
    "noteText": "Implementation is complete and the acceptance checks are ready to run.",
    "author": "agent"
  }
}
```
