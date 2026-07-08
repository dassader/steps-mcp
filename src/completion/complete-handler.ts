import type { SqliteDatabase } from "../db/connection.js";
import { findStepById } from "../repositories/step.repository.js";
import { resourceTemplates } from "../resources/catalog.js";
import { getAllowedTransitions } from "../utils/step-status.js";
import { CompletionRequestError } from "./errors.js";
import { getPromptDefinition } from "../prompts/list-handler.js";

interface CompletionInput {
  ref: unknown;
  argument: unknown;
  context?: unknown;
}

interface CompletionResult {
  completion: {
    values: string[];
    total: number;
    hasMore: boolean;
  };
}

interface CompletionArgument {
  name: string;
  value: string;
}

const limit = 20;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const planStatuses = ["draft", "approved", "executing", "paused", "completed", "blocked"];
const stepStatuses = ["todo", "implementing", "verification", "blocked", "done"];

export function complete(input: CompletionInput, db: SqliteDatabase): CompletionResult {
  const argument = readArgument(input.argument);
  const contextArguments = readContextArguments(input.context);
  const ref = readRef(input.ref);

  if (ref.type === "ref/prompt") {
    validatePromptRef(ref.name, argument.name);
    return completeArgument(argument, contextArguments, db);
  }

  validateResourceRef(ref.uri, argument.name);
  return completeArgument(argument, contextArguments, db);
}

function completeArgument(
  argument: CompletionArgument,
  contextArguments: Record<string, unknown>,
  db: SqliteDatabase
): CompletionResult {
  switch (argument.name) {
    case "planId":
      return valuesResult(completePlanIds(db, argument.value));
    case "stepId":
      return valuesResult(completeStepIds(db, argument.value, contextArguments));
    case "noteId":
      return valuesResult(completeNoteIds(db, argument.value, contextArguments));
    case "attachmentId":
      return valuesResult(completeAttachmentIds(db, argument.value, contextArguments));
    case "preferredStatus":
      return valuesResult(matchStatuses(planStatuses, argument.value));
    case "toStatus":
      return valuesResult(completeTargetStatuses(db, argument.value, contextArguments));
    case "goal":
    case "constraints":
    case "blocker":
    case "reason":
      return valuesResult([]);
    default:
      throw new CompletionRequestError("COMPLETION_ARGUMENT_UNSUPPORTED", "Completion argument is not supported.", {
        argument: argument.name
      });
  }
}

function completePlanIds(db: SqliteDatabase, value: string): string[] {
  const like = `%${value.toLowerCase()}%`;
  const prefix = `${value.toLowerCase()}%`;
  const rows = db
    .prepare<[string, string, string, string, string], { id: string }>(
      `
        SELECT id
        FROM plans
        WHERE ? = ''
          OR lower(id) LIKE ?
          OR lower(title) LIKE ?
          OR lower(status) LIKE ?
        ORDER BY
          CASE WHEN lower(id) LIKE ? THEN 0 ELSE 1 END,
          CASE status
            WHEN 'executing' THEN 0
            WHEN 'approved' THEN 1
            WHEN 'paused' THEN 2
            WHEN 'blocked' THEN 3
            WHEN 'draft' THEN 4
            ELSE 5
          END,
          updated_at DESC,
          id ASC
        LIMIT ${limit + 1}
      `
    )
    .all(value.toLowerCase(), prefix, like, prefix, prefix);
  return rows.map((row) => row.id);
}

function completeStepIds(db: SqliteDatabase, value: string, contextArguments: Record<string, unknown>): string[] {
  const planId = optionalUuidContext(contextArguments, "planId");
  const values: unknown[] = [];
  const where: string[] = [];
  if (planId) {
    where.push("plan_id = ?");
    values.push(planId);
  }
  appendStepLikeFilter(where, values, value);
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare<unknown[], { id: string }>(
      `
        SELECT id
        FROM steps
        ${whereSql}
        ORDER BY
          CASE status
            WHEN 'implementing' THEN 0
            WHEN 'verification' THEN 1
            WHEN 'blocked' THEN 2
            WHEN 'todo' THEN 3
            ELSE 4
          END,
          updated_at DESC,
          id ASC
        LIMIT ${limit + 1}
      `
    )
    .all(...values);
  return rows.map((row) => row.id);
}

function completeNoteIds(db: SqliteDatabase, value: string, contextArguments: Record<string, unknown>): string[] {
  const stepId = optionalUuidContext(contextArguments, "stepId");
  const planId = optionalUuidContext(contextArguments, "planId");
  const values: unknown[] = [];
  const where: string[] = [];
  if (stepId) {
    where.push("n.step_id = ?");
    values.push(stepId);
  }
  if (planId) {
    where.push("s.plan_id = ?");
    values.push(planId);
  }
  appendNoteLikeFilter(where, values, value);
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare<unknown[], { id: string }>(
      `
        SELECT n.id
        FROM notes n
        JOIN steps s ON s.id = n.step_id
        ${whereSql}
        ORDER BY n.created_at DESC, n.id ASC
        LIMIT ${limit + 1}
      `
    )
    .all(...values);
  return rows.map((row) => row.id);
}

function completeAttachmentIds(db: SqliteDatabase, value: string, contextArguments: Record<string, unknown>): string[] {
  const noteId = optionalUuidContext(contextArguments, "noteId");
  const stepId = optionalUuidContext(contextArguments, "stepId");
  const planId = optionalUuidContext(contextArguments, "planId");
  const values: unknown[] = [];
  const where: string[] = [];
  if (noteId) {
    where.push("a.note_id = ?");
    values.push(noteId);
  }
  if (stepId) {
    where.push("n.step_id = ?");
    values.push(stepId);
  }
  if (planId) {
    where.push("s.plan_id = ?");
    values.push(planId);
  }
  appendAttachmentLikeFilter(where, values, value);
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare<unknown[], { id: string }>(
      `
        SELECT a.id
        FROM attachments a
        JOIN notes n ON n.id = a.note_id
        JOIN steps s ON s.id = n.step_id
        ${whereSql}
        ORDER BY a.created_at DESC, a.id ASC
        LIMIT ${limit + 1}
      `
    )
    .all(...values);
  return rows.map((row) => row.id);
}

function completeTargetStatuses(db: SqliteDatabase, value: string, contextArguments: Record<string, unknown>): string[] {
  const stepId = optionalUuidContext(contextArguments, "stepId");
  if (!stepId) {
    return matchStatuses(stepStatuses, value);
  }
  const step = findStepById(db, stepId);
  if (!step) {
    throw new CompletionRequestError("COMPLETION_CONTEXT_NOT_FOUND", "Context stepId was not found.", { stepId });
  }
  return matchStatuses(getAllowedTransitions(step.status), value);
}

function appendStepLikeFilter(where: string[], values: unknown[], value: string): void {
  if (!value) return;
  where.push("(lower(id) LIKE ? OR lower(title) LIKE ? OR lower(description) LIKE ?)");
  values.push(`${value.toLowerCase()}%`, `%${value.toLowerCase()}%`, `%${value.toLowerCase()}%`);
}

function appendNoteLikeFilter(where: string[], values: unknown[], value: string): void {
  if (!value) return;
  where.push("(lower(n.id) LIKE ? OR lower(n.text) LIKE ?)");
  values.push(`${value.toLowerCase()}%`, `%${value.toLowerCase()}%`);
}

function appendAttachmentLikeFilter(where: string[], values: unknown[], value: string): void {
  if (!value) return;
  where.push("(lower(a.id) LIKE ? OR lower(a.name) LIKE ?)");
  values.push(`${value.toLowerCase()}%`, `%${value.toLowerCase()}%`);
}

function matchStatuses(values: string[], partial: string): string[] {
  const normalized = partial.toLowerCase();
  return values.filter((value) => value.startsWith(normalized));
}

function valuesResult(values: string[]): CompletionResult {
  const hasMore = values.length > limit;
  const pageValues = values.slice(0, limit);
  return {
    completion: {
      values: pageValues,
      total: hasMore ? values.length : pageValues.length,
      hasMore
    }
  };
}

function readArgument(argument: unknown): CompletionArgument {
  if (!argument || typeof argument !== "object" || Array.isArray(argument)) {
    throw new CompletionRequestError("COMPLETION_ARGUMENT_REQUIRED", "completion/complete requires params.argument.");
  }
  const input = argument as Record<string, unknown>;
  if (typeof input.name !== "string" || input.name.trim() === "") {
    throw new CompletionRequestError("COMPLETION_ARGUMENT_NAME_REQUIRED", "Completion argument name is required.");
  }
  return {
    name: input.name.trim(),
    value: typeof input.value === "string" ? input.value.trim() : ""
  };
}

function readContextArguments(context: unknown): Record<string, unknown> {
  if (!context || typeof context !== "object" || Array.isArray(context)) return {};
  const args = (context as Record<string, unknown>).arguments;
  if (!args || typeof args !== "object" || Array.isArray(args)) return {};
  return args as Record<string, unknown>;
}

function readRef(ref: unknown): { type: "ref/prompt"; name: string } | { type: "ref/resource"; uri: string } {
  if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
    throw new CompletionRequestError("COMPLETION_REF_REQUIRED", "completion/complete requires params.ref.");
  }
  const input = ref as Record<string, unknown>;
  if (input.type === "ref/prompt" && typeof input.name === "string" && input.name.trim() !== "") {
    return { type: "ref/prompt", name: input.name.trim() };
  }
  if (input.type === "ref/resource" && typeof input.uri === "string" && input.uri.trim() !== "") {
    return { type: "ref/resource", uri: input.uri.trim() };
  }
  throw new CompletionRequestError("COMPLETION_REF_INVALID", "Completion ref is invalid.", { ref });
}

function validatePromptRef(name: string, argumentName: string): void {
  const prompt = getPromptDefinition(name);
  if (!prompt) {
    throw new CompletionRequestError("COMPLETION_PROMPT_NOT_FOUND", "Prompt was not found.", { name });
  }
  if (!prompt.arguments.some((argument) => argument.name === argumentName)) {
    throw new CompletionRequestError("COMPLETION_ARGUMENT_UNSUPPORTED", "Prompt argument is not supported.", {
      prompt: name,
      argument: argumentName
    });
  }
}

function validateResourceRef(uri: string, argumentName: string): void {
  const template = resourceTemplates.find((resourceTemplate) => resourceTemplate.uriTemplate === uri);
  if (!template) {
    throw new CompletionRequestError("COMPLETION_RESOURCE_NOT_FOUND", "Resource template was not found.", { uri });
  }
  if (!uri.includes(`{${argumentName}}`)) {
    throw new CompletionRequestError("COMPLETION_ARGUMENT_UNSUPPORTED", "Resource argument is not supported.", {
      uri,
      argument: argumentName
    });
  }
}

function optionalUuidContext(contextArguments: Record<string, unknown>, field: string): string | null {
  const value = contextArguments[field];
  if (value === undefined) return null;
  if (typeof value === "string" && uuidPattern.test(value)) return value;
  throw new CompletionRequestError("COMPLETION_CONTEXT_INVALID", "Completion context contains a malformed UUID.", {
    field,
    providedValue: value
  });
}
