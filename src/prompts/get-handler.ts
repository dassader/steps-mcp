import { PromptRequestError } from "./errors.js";
import { getPromptDefinition } from "./list-handler.js";
import { planBreakDownMessage } from "./messages/plan-break-down.js";
import { planContinueMessage } from "./messages/plan-continue.js";
import { planExecuteMessage } from "./messages/plan-execute.js";
import { sessionRecoverMessage } from "./messages/session-recover.js";
import { stepExplainBlockerMessage } from "./messages/step-explain-blocker.js";
import { stepSummarizeHistoryMessage } from "./messages/step-summarize-history.js";
import { stepVerifyMessage } from "./messages/step-verify.js";
import { transitionPrepareNoteMessage } from "./messages/transition-prepare-note.js";

export interface PromptMessage {
  role: "user";
  content: {
    type: "text";
    text: string;
  };
}

export interface PromptGetResult {
  description: string;
  messages: PromptMessage[];
}

type MessageBuilder = (args: Record<string, string>) => string;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const planStatuses = ["draft", "approved", "executing", "paused", "completed", "blocked"];
const stepStatuses = ["todo", "implementing", "verification", "blocked", "done"];

const promptBuilders = new Map<string, MessageBuilder>([
  ["plan.break_down", planBreakDownMessage],
  ["plan.continue", planContinueMessage],
  ["plan.execute", planExecuteMessage],
  ["session.recover", sessionRecoverMessage],
  ["step.verify", stepVerifyMessage],
  ["step.explain_blocker", stepExplainBlockerMessage],
  ["step.summarize_history", stepSummarizeHistoryMessage],
  ["transition.prepare_note", transitionPrepareNoteMessage]
]);

export function getPrompt(name: string, rawArguments: unknown): PromptGetResult {
  const definition = getPromptDefinition(name);
  const builder = promptBuilders.get(name);
  if (!definition || !builder) {
    throw new PromptRequestError("PROMPT_NOT_FOUND", "Prompt was not found.", { name });
  }

  const args = normalizeArguments(rawArguments);
  validateKnownArguments(definition.arguments.map((argument) => argument.name), args);
  for (const argument of definition.arguments) {
    if (argument.required) {
      requireTextArgument(args, argument.name);
    }
  }
  validatePromptSpecificArguments(name, args);

  return {
    description: definition.description,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: builder(stringArguments(args))
        }
      }
    ]
  };
}

function normalizeArguments(rawArguments: unknown): Record<string, unknown> {
  if (rawArguments === undefined) return {};
  if (rawArguments && typeof rawArguments === "object" && !Array.isArray(rawArguments)) {
    return rawArguments as Record<string, unknown>;
  }
  throw new PromptRequestError("PROMPT_ARGUMENTS_OBJECT_REQUIRED", "Prompt arguments must be an object.", {
    providedValue: rawArguments
  });
}

function validateKnownArguments(allowedNames: string[], args: Record<string, unknown>): void {
  const extraNames = Object.keys(args).filter((name) => !allowedNames.includes(name));
  if (extraNames.length > 0) {
    throw new PromptRequestError("PROMPT_ARGUMENT_UNKNOWN", "Prompt arguments contain unknown fields.", {
      extraNames
    });
  }
}

function requireTextArgument(args: Record<string, unknown>, name: string): string {
  const value = args[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new PromptRequestError("PROMPT_ARGUMENT_REQUIRED", "Required prompt argument is missing.", {
      field: name,
      providedValue: value
    });
  }
  return value.trim();
}

function validatePromptSpecificArguments(name: string, args: Record<string, unknown>): void {
  for (const field of ["planId", "stepId"]) {
    if (args[field] !== undefined) {
      validateUuid(field, args[field]);
    }
  }
  if (name === "session.recover" && args.preferredStatus !== undefined) {
    validateEnum("preferredStatus", args.preferredStatus, planStatuses);
  }
  if (name === "transition.prepare_note") {
    validateEnum("toStatus", args.toStatus, stepStatuses);
  }
  for (const field of ["goal", "constraints", "blocker", "reason"]) {
    if (args[field] !== undefined && typeof args[field] !== "string") {
      throw new PromptRequestError("PROMPT_ARGUMENT_INVALID", "Prompt argument must be a string.", {
        field,
        providedValue: args[field]
      });
    }
  }
}

function validateUuid(field: string, value: unknown): void {
  if (typeof value === "string" && uuidPattern.test(value)) return;
  throw new PromptRequestError("PROMPT_ARGUMENT_INVALID", "Prompt argument must be a UUID.", {
    field,
    providedValue: value
  });
}

function validateEnum(field: string, value: unknown, allowedValues: string[]): void {
  if (typeof value === "string" && allowedValues.includes(value)) return;
  throw new PromptRequestError("PROMPT_ARGUMENT_INVALID", "Prompt argument has an invalid value.", {
    field,
    providedValue: value,
    allowedValues
  });
}

function stringArguments(args: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
  );
}
