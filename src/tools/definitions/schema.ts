export type JsonSchema = Record<string, unknown>;

export const emptyObjectSchema: JsonSchema = {
  type: "object",
  additionalProperties: false
};

export const authorSchema: JsonSchema = {
  type: "string",
  enum: ["human", "agent"],
  description: "Who created the note or transition explanation."
};

export const planStatusSchema: JsonSchema = {
  type: "string",
  enum: ["draft", "approved", "executing", "paused", "completed", "blocked"],
  description: "Optional plan status filter."
};

export const stepStatusSchema: JsonSchema = {
  type: "string",
  enum: ["todo", "implementing", "verification", "blocked", "done"],
  description: "Step workflow status."
};

export const orderFieldSchema: JsonSchema = {
  type: "integer",
  minimum: 0,
  description: "Use 0 for independent steps, or a positive integer for ordered steps."
};

export function uuidSchema(description: string): JsonSchema {
  return {
    type: "string",
    format: "uuid",
    description
  };
}

export function stringFieldSchema(description: string): JsonSchema {
  return {
    type: "string",
    minLength: 1,
    description
  };
}

export function objectSchema(required: string[], properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    ...(required.length > 0 ? { required } : {}),
    properties,
    additionalProperties: false
  };
}
