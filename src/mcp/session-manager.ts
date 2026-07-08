import { randomUUID } from "node:crypto";

import type { JsonRpcId } from "./jsonrpc.js";

export interface McpSession {
  id: string;
  initialized: boolean;
  activeRequests: Map<string, AbortController>;
}

export class SessionManager {
  private readonly sessions = new Map<string, McpSession>();

  createSession(options: { initialized?: boolean } = {}): McpSession {
    const session = {
      id: randomUUID(),
      initialized: options.initialized ?? false,
      activeRequests: new Map<string, AbortController>()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  createInitializedSession(): McpSession {
    return this.createSession({ initialized: true });
  }

  find(sessionId: string | undefined): McpSession | null {
    if (!sessionId) return null;
    return this.sessions.get(sessionId) ?? null;
  }

  markInitialized(sessionId: string): boolean {
    let session = this.sessions.get(sessionId);
    if (!session && isSessionId(sessionId)) {
      session = {
        id: sessionId,
        initialized: false,
        activeRequests: new Map<string, AbortController>()
      };
      this.sessions.set(sessionId, session);
    }
    if (!session) return false;
    session.initialized = true;
    return true;
  }

  isInitialized(sessionId: string | undefined): boolean {
    return this.find(sessionId)?.initialized === true;
  }

  ensureInitialized(sessionId: string | undefined): boolean {
    const session = this.find(sessionId);
    if (session) return session.initialized;
    if (!isSessionId(sessionId)) return false;

    // MCP hosts may keep a session id across server redeploys; recover those stale UUID sessions.
    this.sessions.set(sessionId, {
      id: sessionId,
      initialized: true,
      activeRequests: new Map<string, AbortController>()
    });
    return true;
  }

  registerRequest(sessionId: string | undefined, requestId: JsonRpcId | undefined, controller: AbortController): boolean {
    const session = this.find(sessionId);
    const key = requestKey(requestId);
    if (!session || !key) return false;
    session.activeRequests.set(key, controller);
    return true;
  }

  finishRequest(sessionId: string | undefined, requestId: JsonRpcId | undefined): void {
    const session = this.find(sessionId);
    const key = requestKey(requestId);
    if (!session || !key) return;
    session.activeRequests.delete(key);
  }

  cancelRequest(sessionId: string | undefined, requestId: unknown): boolean {
    const session = this.find(sessionId);
    const key = requestKey(requestId);
    if (!session || !key) return false;
    const controller = session.activeRequests.get(key);
    if (!controller) return false;
    controller.abort();
    session.activeRequests.delete(key);
    return true;
  }

}

function requestKey(requestId: unknown): string | null {
  if (typeof requestId === "string" || typeof requestId === "number") {
    return String(requestId);
  }
  return null;
}

function isSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
