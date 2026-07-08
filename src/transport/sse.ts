import type { Response } from "express";

const streams = new Map<string, Response>();

export function openSseStream(sessionId: string, response: Response): void {
  closeSseStream(sessionId);
  streams.set(sessionId, response);
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders?.();
  response.write(": connected\n\n");
}

export function closeSseStream(sessionId: string, response?: Response): void {
  const current = streams.get(sessionId);
  if (!current) return;
  if (response && current !== response) return;
  streams.delete(sessionId);
  if (!current.destroyed && !current.writableEnded) {
    current.end();
  }
}

export function sendSSE(sessionId: string, event: string, data: unknown): boolean {
  const response = streams.get(sessionId);
  if (!response || response.destroyed || response.writableEnded) {
    streams.delete(sessionId);
    return false;
  }

  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
  return true;
}
