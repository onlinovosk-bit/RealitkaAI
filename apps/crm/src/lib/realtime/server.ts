import type { Server as IOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __SOCKET_IO_SERVER: IOServer | undefined;
}

export function getIOOptional(): IOServer | undefined {
  return typeof globalThis !== "undefined" ? globalThis.__SOCKET_IO_SERVER : undefined;
}

export function getIO(): IOServer {
  const io = getIOOptional();
  if (!io) {
    throw new Error(
      "Socket.IO nie je inicializovaný. Spusti `npm run dev:ws` alebo `npm run start:ws`."
    );
  }
  return io;
}

export type LeadUpdatePayload = {
  leadId: string;
  score: number;
  source?: string;
  at: string;
};

export function emitLeadUpdate(payload: LeadUpdatePayload): void {
  getIOOptional()?.emit("lead:update", payload);
}
