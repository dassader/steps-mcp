import { serverGetStartedHandler } from "../server-get-started.js";
import { emptyObjectSchema } from "./schema.js";
import type { ToolRegistration } from "./types.js";

export const serverGetStartedTool: ToolRegistration = {
  name: "server.get_started",
  title: "Get Started",
  description: "Return overview guidance, key prompt names, and the first planning workflow.",
  inputSchema: emptyObjectSchema,
  handler: serverGetStartedHandler
};

