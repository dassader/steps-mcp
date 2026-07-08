import { attachmentCreateTool } from "./attachment-create.tool.js";
import { attachmentDeleteTool } from "./attachment-delete.tool.js";
import { attachmentUpdateTool } from "./attachment-update.tool.js";
import { noteCreateTool } from "./note-create.tool.js";
import { noteDeleteTool } from "./note-delete.tool.js";
import { planApproveTool } from "./plan-approve.tool.js";
import { planBlockTool } from "./plan-block.tool.js";
import { planCreateWithStepsTool } from "./plan-create-with-steps.tool.js";
import { planCreateTool } from "./plan-create.tool.js";
import { planDeleteTool } from "./plan-delete.tool.js";
import { planListTool } from "./plan-list.tool.js";
import { planPauseTool } from "./plan-pause.tool.js";
import { planReorderStepsTool } from "./plan-reorder-steps.tool.js";
import { planResumeTool } from "./plan-resume.tool.js";
import { planUnblockTool } from "./plan-unblock.tool.js";
import { planUpdateTool } from "./plan-update.tool.js";
import { serverGetStartedTool } from "./server-get-started.tool.js";
import { stepCreateTool } from "./step-create.tool.js";
import { stepDeleteTool } from "./step-delete.tool.js";
import { stepStartNextTool } from "./step-start-next.tool.js";
import { stepTransitionTool } from "./step-transition.tool.js";
import { stepUpdateTool } from "./step-update.tool.js";
import type { ToolDefinition, ToolRegistration } from "./types.js";

export const toolRegistrations: ToolRegistration[] = [
  serverGetStartedTool,
  planCreateTool,
  planCreateWithStepsTool,
  planListTool,
  planApproveTool,
  planPauseTool,
  planResumeTool,
  planUpdateTool,
  planReorderStepsTool,
  planBlockTool,
  planUnblockTool,
  stepCreateTool,
  stepUpdateTool,
  stepStartNextTool,
  stepTransitionTool,
  noteCreateTool,
  attachmentCreateTool,
  attachmentUpdateTool,
  planDeleteTool,
  stepDeleteTool,
  noteDeleteTool,
  attachmentDeleteTool
];

export const toolDefinitions: ToolDefinition[] = toolRegistrations.map(({ handler: _handler, ...definition }) => definition);

export type { ToolDefinition, ToolRegistration };
