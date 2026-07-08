import { describe, expect, it } from "vitest";

import {
  approvePlan,
  createAttachment,
  createMcpContractContext,
  createNote,
  createPlanWithSteps,
  expectJsonRpcProtocolError,
  expectJsonRpcSuccess,
  startNextStep
} from "../helpers/mcp-contract-client.js";

describe("completion/complete branch coverage", () => {
  it("completes step, note, attachment, and status arguments using context", async () => {
    const context = await createMcpContractContext();
    try {
      const fixture = await createPlanWithSteps(context.client, "Completion branches");
      await approvePlan(context.client, fixture.planId);
      const started = await startNextStep(context.client, fixture.planId);
      const note = await createNote(context.client, String(started.state.stepId), "Completion note evidence.");
      const attachment = await createAttachment(context.client, String(note.state.noteId), "completion-proof.txt");

      const stepCompletion = expectJsonRpcSuccess(
        await context.client.rpc("completion/complete", {
          ref: { type: "ref/resource", uri: "steps://steps/{stepId}" },
          argument: { name: "stepId", value: "" },
          context: { arguments: { planId: fixture.planId } }
        })
      );
      expect(stepCompletion.completion.values).toEqual(expect.arrayContaining([String(started.state.stepId)]));

      const noteCompletion = expectJsonRpcSuccess(
        await context.client.rpc("completion/complete", {
          ref: { type: "ref/resource", uri: "steps://notes/{noteId}" },
          argument: { name: "noteId", value: "Completion" },
          context: { arguments: { stepId: String(started.state.stepId) } }
        })
      );
      expect(noteCompletion.completion.values).toEqual(expect.arrayContaining([String(note.state.noteId)]));

      const attachmentCompletion = expectJsonRpcSuccess(
        await context.client.rpc("completion/complete", {
          ref: { type: "ref/resource", uri: "steps://attachments/{attachmentId}" },
          argument: { name: "attachmentId", value: "proof" },
          context: { arguments: { noteId: String(note.state.noteId) } }
        })
      );
      expect(attachmentCompletion.completion.values).toEqual(expect.arrayContaining([String(attachment.state.attachmentId)]));

      const statusCompletion = expectJsonRpcSuccess(
        await context.client.rpc("completion/complete", {
          ref: { type: "ref/prompt", name: "transition.prepare_note" },
          argument: { name: "toStatus", value: "ver" },
          context: { arguments: { stepId: String(started.state.stepId) } }
        })
      );
      expect(statusCompletion.completion.values).toEqual(["verification"]);
    } finally {
      context.close();
    }
  });

  it("returns diagnostic completion errors for malformed context and unsupported arguments", async () => {
    const context = await createMcpContractContext();
    try {
      const badContext = expectJsonRpcProtocolError(
        await context.client.rpc("completion/complete", {
          ref: { type: "ref/resource", uri: "steps://steps/{stepId}" },
          argument: { name: "stepId", value: "" },
          context: { arguments: { planId: "not-a-uuid" } }
        }),
        -32602
      );
      expect(badContext.data.code).toBe("COMPLETION_CONTEXT_INVALID");

      const missingContextStep = expectJsonRpcProtocolError(
        await context.client.rpc("completion/complete", {
          ref: { type: "ref/prompt", name: "transition.prepare_note" },
          argument: { name: "toStatus", value: "" },
          context: { arguments: { stepId: "00000000-0000-4000-8000-000000000001" } }
        }),
        -32602
      );
      expect(missingContextStep.data.code).toBe("COMPLETION_CONTEXT_NOT_FOUND");

      const unsupportedArgument = expectJsonRpcProtocolError(
        await context.client.rpc("completion/complete", {
          ref: { type: "ref/resource", uri: "steps://plans/{planId}" },
          argument: { name: "stepId", value: "" }
        }),
        -32602
      );
      expect(unsupportedArgument.data.code).toBe("COMPLETION_ARGUMENT_UNSUPPORTED");

      const badArgument = expectJsonRpcProtocolError(
        await context.client.rpc("completion/complete", {
          ref: { type: "ref/prompt", name: "session.recover" },
          argument: "not-an-object"
        }),
        -32602
      );
      expect(badArgument.data.code).toBe("COMPLETION_ARGUMENT_REQUIRED");
    } finally {
      context.close();
    }
  });
});
