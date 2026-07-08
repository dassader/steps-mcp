import { planCreateHandler } from "../plan-create.js";
import { objectSchema, stringFieldSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const planCreateTool: ToolRegistration = {
  name: "plan.create",
  title: "Create Plan",
  description: "Create an empty work plan and return its plan resource URI and review URL.",
  inputSchema: objectSchema(["title"], {
    title: stringFieldSchema("Short title for the work plan.")
  }),
  handler: planCreateHandler
};
