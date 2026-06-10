import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import next from "next";
import { Server as IoServer } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@/lib/events";
import { logger } from "./logger";
import { store } from "./rooms/instance";
import { ROOM_TTL_MS } from "./rooms/store";
import { registerHandlers, tick } from "./socket/handlers";

const port = Number(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";

const HOST_GRACE_MS = 30_000;
const TICK_INTERVAL_MS = 5_000;

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function main(): Promise<void> {
  const app = next({ dev });
  await app.prepare();
  const handle = app.getRequestHandler();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new IoServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer);

  registerHandlers({
    io,
    store,
    now: () => Date.now(),
    generateRoomId,
    generateSessionId: () => randomUUID(),
    hostGracePeriodMs: HOST_GRACE_MS,
  });

  const interval = setInterval(() => {
    tick({
      io,
      store,
      now: () => Date.now(),
      generateRoomId,
      generateSessionId: () => randomUUID(),
      hostGracePeriodMs: HOST_GRACE_MS,
      ttlMs: ROOM_TTL_MS,
    });
  }, TICK_INTERVAL_MS);

  httpServer.listen(port, () => {
    logger.info({ event: "server.started", port, dev }, `Ready on http://localhost:${port}`);
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ event: "server.shutdown", signal }, "shutting down");
    clearInterval(interval);
    io.close();
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error(
    { event: "server.fatal", err: err instanceof Error ? err.message : String(err) },
    "fatal startup error",
  );
  process.exit(1);
});
