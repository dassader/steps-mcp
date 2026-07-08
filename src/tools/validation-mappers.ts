import { ToolError, invalidRequest } from "./tool-error.js";

export function mapValidationError(name: string, error: ToolError): ToolError {
  if (name === "plan.create" && isFieldError(error, "title")) {
    return invalidRequest("PLAN_TITLE_REQUIRED", "Plan title is required.", error.details);
  }
  if (name === "plan.create_with_steps") {
    return mapCreateWithStepsValidationError(error);
  }
  if (name === "plan.list") {
    return mapPlanListValidationError(error);
  }
  if (name === "plan.approve" && isFieldError(error, "approvalEvidence")) {
    return invalidRequest("PLAN_APPROVAL_EVIDENCE_REQUIRED", "Plan approval evidence is required.", error.details);
  }
  if (name === "plan.pause" && isFieldError(error, "reason")) {
    return invalidRequest("PLAN_PAUSE_REASON_REQUIRED", "Pause reason is required.", error.details);
  }
  if (name === "plan.block" && isFieldError(error, "reason")) {
    return invalidRequest("PLAN_BLOCK_REASON_REQUIRED", "Block reason is required.", error.details);
  }
  if (name === "plan.update" && isFieldError(error, "title")) {
    const code = error.details.keyword === "required" ? "PLAN_UPDATE_EMPTY_PATCH" : "PLAN_TITLE_REQUIRED";
    const message = code === "PLAN_UPDATE_EMPTY_PATCH" ? "Plan update requires at least one editable field." : "Plan title is required.";
    return invalidRequest(code, message, error.details);
  }
  if (name === "plan.reorder_steps") {
    return mapPlanReorderValidationError(error);
  }
  if (name === "plan.delete" && isFieldError(error, "confirmDeleteContainedData")) {
    return invalidRequest("PLAN_DELETE_CONFIRMATION_REQUIRED", "Plan deletion requires explicit confirmation.", error.details);
  }
  if (name === "step.create") {
    return mapStepCreateValidationError(error);
  }
  if (name === "step.update") {
    return mapStepUpdateValidationError(error);
  }
  if (name === "step.start_next") {
    return mapStepStartNextValidationError(error);
  }
  if (name === "step.transition") {
    return mapStepTransitionValidationError(error);
  }
  if (name === "step.delete" && isFieldError(error, "confirmDeleteRelatedData")) {
    return invalidRequest("STEP_DELETE_CONFIRMATION_REQUIRED", "Step deletion requires explicit confirmation.", error.details);
  }
  if (name === "note.create") {
    return mapNoteCreateValidationError(error);
  }
  if (name === "note.delete" && isFieldError(error, "confirmDeleteAttachments")) {
    return invalidRequest(
      "NOTE_DELETE_ATTACHMENTS_CONFIRMATION_REQUIRED",
      "Deleting note attachments requires explicit confirmation.",
      error.details
    );
  }
  if (name === "attachment.create") {
    return mapAttachmentCreateValidationError(error);
  }
  if (name === "attachment.update") {
    return mapAttachmentUpdateValidationError(error);
  }
  if (name === "attachment.delete" && isFieldError(error, "confirmDeleteContent")) {
    return invalidRequest("ATTACHMENT_DELETE_CONFIRMATION_REQUIRED", "Attachment deletion requires explicit confirmation.", error.details);
  }
  return error;
}

function mapAttachmentUpdateValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "name")) {
    return invalidRequest("ATTACHMENT_NAME_REQUIRED", "Attachment name is required.", error.details);
  }
  if (isFieldError(error, "mimeType")) {
    return invalidRequest("ATTACHMENT_CONTENT_INVALID", "Attachment mimeType is invalid.", error.details);
  }
  return error;
}

function mapAttachmentCreateValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "name")) {
    return invalidRequest("ATTACHMENT_NAME_REQUIRED", "Attachment name is required.", error.details);
  }
  if (isFieldError(error, "content") || isNestedFieldError(error, "text") || isNestedFieldError(error, "blob") || isNestedFieldError(error, "linkUri")) {
    return invalidRequest("ATTACHMENT_CONTENT_INVALID", "Attachment content is invalid.", error.details);
  }
  if (isFieldError(error, "mimeType")) {
    return invalidRequest("ATTACHMENT_CONTENT_INVALID", "Attachment mimeType is invalid.", error.details);
  }
  return error;
}

function mapNoteCreateValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "text")) {
    return invalidRequest("NOTE_TEXT_REQUIRED", "Note text is required.", error.details);
  }
  if (isFieldError(error, "author")) {
    return invalidRequest("NOTE_AUTHOR_INVALID", "Author must be human or agent.", {
      ...error.details,
      allowedValues: ["human", "agent"]
    });
  }
  return error;
}

function mapStepTransitionValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "noteText")) {
    return invalidRequest("STEP_TRANSITION_NOTE_REQUIRED", "Transition note text is required.", error.details, {
      recommendedUserAction: "Prepare a short markdown note explaining why the status is changing.",
      reason: "Retry step.transition with non-empty noteText."
    });
  }
  if (isFieldError(error, "author")) {
    return invalidRequest("NOTE_AUTHOR_INVALID", "Author must be human or agent.", {
      ...error.details,
      allowedValues: ["human", "agent"]
    });
  }
  if (isFieldError(error, "fromStatus") || isFieldError(error, "toStatus")) {
    return invalidRequest("STEP_TRANSITION_NOT_ALLOWED", "Step transition status is invalid.", error.details);
  }
  return error;
}

function mapStepStartNextValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "noteText")) {
    return invalidRequest("NOTE_TEXT_REQUIRED", "Start note text is required.", error.details);
  }
  if (isFieldError(error, "author")) {
    return invalidRequest("NOTE_AUTHOR_INVALID", "Author must be human or agent.", {
      ...error.details,
      allowedValues: ["human", "agent"]
    });
  }
  return error;
}

function mapStepUpdateValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "status")) {
    return invalidRequest("STEP_STATUS_UPDATE_NOT_ALLOWED", "Step status changes must use step.transition.", error.details);
  }
  if (isFieldError(error, "title")) {
    return invalidRequest("STEP_TITLE_REQUIRED", "Step title is required.", error.details);
  }
  if (isFieldError(error, "description")) {
    return invalidRequest("STEP_DESCRIPTION_REQUIRED", "Step description is required.", error.details);
  }
  if (isFieldError(error, "order")) {
    return invalidRequest("STEP_ORDER_INVALID", "Step order must be an integer greater than or equal to 0.", error.details);
  }
  return error;
}

function mapStepCreateValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "title")) {
    return invalidRequest("STEP_TITLE_REQUIRED", "Step title is required.", error.details);
  }
  if (isFieldError(error, "description")) {
    return invalidRequest("STEP_DESCRIPTION_REQUIRED", "Step description is required.", error.details);
  }
  if (isFieldError(error, "order")) {
    return invalidRequest("STEP_ORDER_INVALID", "Step order must be an integer greater than or equal to 0.", error.details);
  }
  return error;
}

function mapPlanReorderValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "stepOrders")) {
    return invalidRequest("PLAN_REORDER_STEPS_REQUIRED", "Step order entries are required.", error.details);
  }
  if (isNestedFieldError(error, "order")) {
    return invalidRequest("PLAN_REORDER_ORDER_INVALID", "Step order must be an integer greater than or equal to 0.", error.details);
  }
  return error;
}

function mapPlanListValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "status")) {
    return invalidRequest("PLAN_STATUS_INVALID", "Plan status filter is invalid.", error.details);
  }
  if (isFieldError(error, "limit")) {
    return invalidRequest("PLAN_LIST_LIMIT_INVALID", "Plan list limit must be between 1 and 100.", error.details);
  }
  return error;
}

function mapCreateWithStepsValidationError(error: ToolError): ToolError {
  if (isFieldError(error, "title")) {
    return invalidRequest("PLAN_TITLE_REQUIRED", "Plan title is required.", error.details);
  }
  if (isFieldError(error, "steps")) {
    return invalidRequest("PLAN_STEPS_REQUIRED", "At least one initial step is required.", error.details);
  }
  if (isNestedFieldError(error, "title")) {
    return invalidRequest("STEP_TITLE_REQUIRED", "Step title is required.", error.details);
  }
  if (isNestedFieldError(error, "description")) {
    return invalidRequest("STEP_DESCRIPTION_REQUIRED", "Step description is required.", error.details);
  }
  if (isNestedFieldError(error, "order")) {
    return invalidRequest("STEP_ORDER_INVALID", "Step order must be an integer greater than or equal to 0.", error.details);
  }
  return error;
}

function isFieldError(error: ToolError, field: string): boolean {
  return (
    error.details.field === field ||
    (Array.isArray(error.details.missingFields) && error.details.missingFields.includes(field))
  );
}

function isNestedFieldError(error: ToolError, field: string): boolean {
  const suffix = `.${field}`;
  return (
    (typeof error.details.field === "string" && error.details.field.endsWith(suffix)) ||
    (Array.isArray(error.details.missingFields) &&
      error.details.missingFields.some((missingField) => typeof missingField === "string" && missingField.endsWith(suffix)))
  );
}
