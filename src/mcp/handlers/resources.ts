import { readDocumentationResource, listDocumentationResources } from "../../resources/documentation.js";
import { ResourceReadError } from "../../resources/errors.js";
import { readAttachmentResource, readNoteResource } from "../../resources/note-attachment-reads.js";
import { readPlanResource } from "../../resources/plan-reads.js";
import { readStepResource } from "../../resources/step-reads.js";
import { listResourceTemplates } from "../../resources/templates.js";
import { createErrorResponse, jsonRpcErrors, type JsonRpcRequest } from "../jsonrpc.js";
import { objectParams, ok, type RouteContext, type RouteResult } from "./shared.js";

export function listResourcesRoute(request: JsonRpcRequest): RouteResult {
  return ok(request, { resources: listDocumentationResources() });
}

export function listResourceTemplatesRoute(request: JsonRpcRequest): RouteResult {
  return ok(request, { resourceTemplates: listResourceTemplates() });
}

export async function readResourceRoute(request: JsonRpcRequest, context: RouteContext): Promise<RouteResult> {
  const params = objectParams(request.params);
  if (typeof params.uri !== "string" || params.uri.trim() === "") {
    return {
      status: 200,
      body: createErrorResponse(request.id, jsonRpcErrors.invalidParams, "Invalid params", {
        code: "RESOURCE_URI_REQUIRED",
        reason: "resources/read requires params.uri."
      })
    };
  }
  const documentation = await readDocumentationResource(params.uri);
  if (documentation) {
    return ok(request, { contents: [documentation] });
  }
  try {
    const planResource = readPlanResource(context.db, params.uri, { publicUrl: context.publicUrl });
    if (planResource) {
      return ok(request, { contents: [planResource] });
    }
    const stepResource = readStepResource(context.db, params.uri);
    if (stepResource) {
      return ok(request, { contents: [stepResource] });
    }
    const noteResource = readNoteResource(context.db, params.uri);
    if (noteResource) {
      return ok(request, { contents: [noteResource] });
    }
    const attachmentResource = readAttachmentResource(context.db, params.uri);
    if (attachmentResource) {
      return ok(request, { contents: [attachmentResource] });
    }
  } catch (error) {
    if (error instanceof ResourceReadError) {
      return {
        status: 200,
        body: createErrorResponse(request.id, error.jsonRpcCode, error.message, {
          ok: false,
          errorType: error.errorType,
          code: error.code,
          message: error.message,
          reason: error.reason,
          retryable: error.retryable,
          details: error.details,
          resources: error.resources,
          next: error.next
        })
      };
    }
    throw error;
  }
  return {
    status: 200,
    body: createErrorResponse(request.id, jsonRpcErrors.resourceNotFound, "Resource not found", {
      ok: false,
      errorType: "not_found",
      code: "RESOURCE_NOT_FOUND",
      message: "Resource was not found.",
      reason: "Resource handlers will be implemented by a later task.",
      retryable: true,
      details: { uri: params.uri },
      resources: {},
      next: {}
    })
  };
}
