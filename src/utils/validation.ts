import { Ajv, type ErrorObject } from "ajv";
import addFormatsPlugin from "ajv-formats";

import { invalidRequest } from "../tools/tool-error.js";

const addFormats = addFormatsPlugin as unknown as (instance: Ajv) => Ajv;

const ajv = addFormats(
  new Ajv({
    allErrors: true,
    strict: false
  })
);

export function validateToolInput(schema: Record<string, unknown>, args: unknown): void {
  const validate = ajv.compile(schema);
  if (validate(args)) return;

  const firstError = validate.errors?.[0];
  throw invalidRequest("TOOL_ARGUMENTS_INVALID", "Tool arguments did not match the input schema.", {
    keyword: firstError?.keyword,
    field: fieldFromError(firstError),
    providedValue: valueFromError(firstError, args),
    allowedValues: allowedValuesFromError(firstError),
    missingFields: missingFields(validate.errors ?? [])
  });
}

function fieldFromError(error: ErrorObject | undefined): string | undefined {
  if (!error) return undefined;
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
    return pathJoin(error.instancePath, error.params.missingProperty);
  }
  if (error.keyword === "additionalProperties" && typeof error.params.additionalProperty === "string") {
    return pathJoin(error.instancePath, error.params.additionalProperty);
  }
  return error.instancePath ? error.instancePath.replace(/^\//, "").replace(/\//g, ".") : undefined;
}

function valueFromError(error: ErrorObject | undefined, args: unknown): unknown {
  const field = fieldFromError(error);
  if (!field || args === null || typeof args !== "object") return undefined;
  return field.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, args);
}

function allowedValuesFromError(error: ErrorObject | undefined): unknown[] | undefined {
  if (!error) return undefined;
  if (error.keyword === "enum" && Array.isArray(error.params.allowedValues)) {
    return error.params.allowedValues;
  }
  if (error.keyword === "const") {
    return [error.params.allowedValue];
  }
  return undefined;
}

function missingFields(errors: ErrorObject[]): string[] | undefined {
  const fields = errors
    .filter((error) => error.keyword === "required" && typeof error.params.missingProperty === "string")
    .map((error) => pathJoin(error.instancePath, error.params.missingProperty));
  return fields.length > 0 ? fields : undefined;
}

function pathJoin(instancePath: string, property: string): string {
  const prefix = instancePath ? instancePath.replace(/^\//, "").replace(/\//g, ".") : "";
  return prefix ? `${prefix}.${property}` : property;
}
