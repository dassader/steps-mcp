export interface PromptArgumentDefinition {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptDefinition {
  name: string;
  title: string;
  description: string;
  arguments: PromptArgumentDefinition[];
}

export const promptDefinitions: PromptDefinition[] = [
  {
    name: "plan.break_down",
    title: "Break Down Work",
    description: "Self-contained guide for turning a user goal into a reviewable plan with detailed steps.",
    arguments: [
      {
        name: "goal",
        description: "The user goal or work item to break down.",
        required: true
      },
      {
        name: "constraints",
        description: "Optional constraints, context, or preferences.",
        required: false
      }
    ]
  },
  {
    name: "plan.continue",
    title: "Continue Plan",
    description: "Self-contained guide for resuming a plan from the server-selected next step.",
    arguments: [
      {
        name: "planId",
        description: "Plan UUID.",
        required: true
      }
    ]
  },
  {
    name: "plan.execute",
    title: "Execute Plan",
    description: "Self-contained guide for executing an approved plan until a server stop state.",
    arguments: [
      {
        name: "planId",
        description: "Plan UUID.",
        required: true
      }
    ]
  },
  {
    name: "session.recover",
    title: "Recover Session",
    description: "Self-contained guide for recovering work when context is lost and planId is unknown.",
    arguments: [
      {
        name: "preferredStatus",
        description: "Optional plan status to prefer during recovery.",
        required: false
      }
    ]
  },
  {
    name: "step.verify",
    title: "Verify Step",
    description: "Self-contained guide for verifying a step with evidence and choosing the next status transition.",
    arguments: [
      {
        name: "stepId",
        description: "Step UUID.",
        required: true
      }
    ]
  },
  {
    name: "step.explain_blocker",
    title: "Explain Blocker",
    description: "Self-contained guide for writing an actionable blocker explanation for a step.",
    arguments: [
      {
        name: "stepId",
        description: "Step UUID.",
        required: true
      },
      {
        name: "blocker",
        description: "Short description of the obstacle.",
        required: true
      }
    ]
  },
  {
    name: "step.summarize_history",
    title: "Summarize Step History",
    description: "Self-contained guide for summarizing step history for context recovery.",
    arguments: [
      {
        name: "stepId",
        description: "Step UUID.",
        required: true
      }
    ]
  },
  {
    name: "transition.prepare_note",
    title: "Prepare Transition Note",
    description: "Self-contained guide for preparing note text for a step status transition.",
    arguments: [
      {
        name: "stepId",
        description: "Step UUID.",
        required: true
      },
      {
        name: "toStatus",
        description: "Target step status.",
        required: true
      },
      {
        name: "reason",
        description: "Why the transition is needed.",
        required: true
      }
    ]
  }
];

export function listPrompts(): PromptDefinition[] {
  return promptDefinitions;
}

export function getPromptDefinition(name: string): PromptDefinition | undefined {
  return promptDefinitions.find((prompt) => prompt.name === name);
}
