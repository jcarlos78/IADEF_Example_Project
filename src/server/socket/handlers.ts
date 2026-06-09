import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ErrorPayload,
  InterServerEvents,
  Result,
  ServerToClientEvents,
  SocketData,
} from "@/lib/events";
import { logger } from "@/server/logger";
import {
  castVote,
  changeScale,
  createRoom,
  joinRoom,
  leaveRoom,
  markDisconnected,
  type Outcome,
  resetRound,
  revealRound,
  type RoomState,
  startRound,
  toPublic,
  transferHostIfNeeded,
} from "@/server/rooms/room";
import { RoomStore } from "@/server/rooms/store";

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export interface HandlersDeps {
  io: IoServer;
  store: RoomStore;
  now: () => number;
  generateRoomId: () => string;
  generateSessionId: () => string;
  hostGracePeriodMs: number;
}

const errPayload = (code: ErrorPayload["code"], message: string): ErrorPayload => ({
  code,
  message,
});

export function registerHandlers(deps: HandlersDeps): void {
  const { io, store, now, generateRoomId, generateSessionId } = deps;

  function broadcast(roomId: string, state: RoomState): void {
    io.to(roomId).emit("room:state", toPublic(state));
  }

  function applyToRoom(
    roomId: string,
    fn: (room: RoomState) => Outcome,
    ack: (r: Result<null>) => void,
  ): void {
    const room = store.get(roomId);
    if (!room) {
      ack({
        ok: false,
        error: errPayload("room-not-found", "Sala não encontrada ou expirada."),
      });
      return;
    }
    const outcome = fn(room);
    if (!outcome.ok) {
      ack({ ok: false, error: outcome.error });
      return;
    }
    store.update(outcome.state);
    broadcast(roomId, outcome.state);
    ack({ ok: true, data: null });
  }

  io.on("connection", (socket: IoSocket) => {
    logger.debug({ event: "socket.connect", socketId: socket.id }, "client connected");

    socket.on("room:create", (payload, ack) => {
      let roomId = generateRoomId();
      while (store.has(roomId)) roomId = generateRoomId();
      const hostSessionId = generateSessionId();

      let room: RoomState;
      try {
        room = createRoom({
          roomId,
          scaleId: payload.scaleId,
          hostSessionId,
          hostNickname: payload.hostNickname,
          now: now(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao criar sala.";
        const code: ErrorPayload["code"] = /scaleId/.test(msg) ? "scale-invalid" : "nickname-empty";
        logger.warn({ event: "room.create.rejected", reason: code }, msg);
        ack({ ok: false, error: errPayload(code, msg) });
        return;
      }

      store.create(room);
      socket.join(roomId);
      socket.data.sessionId = hostSessionId;
      socket.data.roomId = roomId;
      logger.info({ event: "room.created", roomId, scaleId: payload.scaleId }, "room created");
      ack({
        ok: true,
        data: { roomId, hostSessionId, state: toPublic(room) },
      });
    });

    socket.on("room:join", (payload, ack) => {
      const room = store.get(payload.roomId);
      if (!room) {
        logger.warn({ event: "join.rejected", roomId: payload.roomId, reason: "room-not-found" });
        ack({
          ok: false,
          error: errPayload("room-not-found", "Sala não encontrada ou expirada."),
        });
        return;
      }
      const outcome = joinRoom(room, {
        sessionId: payload.sessionId,
        nickname: payload.nickname,
        now: now(),
      });
      if (!outcome.ok) {
        logger.warn(
          { event: "join.rejected", roomId: payload.roomId, reason: outcome.error.code },
          "join rejected",
        );
        ack({ ok: false, error: outcome.error });
        return;
      }
      store.update(outcome.state);
      socket.join(payload.roomId);
      socket.data.sessionId = payload.sessionId;
      socket.data.roomId = payload.roomId;
      broadcast(payload.roomId, outcome.state);
      logger.info(
        { event: "room.joined", roomId: payload.roomId, sessionId: payload.sessionId },
        "session joined",
      );
      ack({ ok: true, data: toPublic(outcome.state) });
    });

    socket.on("room:leave", (payload, ack) => {
      const room = store.get(payload.roomId);
      if (!room) {
        ack({
          ok: false,
          error: errPayload("room-not-found", "Sala não encontrada ou expirada."),
        });
        return;
      }
      const outcome = leaveRoom(room, { sessionId: payload.sessionId, now: now() });
      if (!outcome.ok) {
        ack({ ok: false, error: outcome.error });
        return;
      }
      if (Object.keys(outcome.state.participants).length === 0) {
        store.delete(payload.roomId);
        logger.info(
          { event: "room.closed", roomId: payload.roomId, reason: "empty" },
          "room closed (empty)",
        );
      } else {
        store.update(outcome.state);
        broadcast(payload.roomId, outcome.state);
      }
      socket.leave(payload.roomId);
      ack({ ok: true, data: null });
    });

    socket.on("room:changeScale", (payload, ack) => {
      applyToRoom(
        payload.roomId,
        (room) =>
          changeScale(room, {
            sessionId: payload.sessionId,
            scaleId: payload.scaleId,
            now: now(),
          }),
        ack,
      );
    });

    socket.on("round:start", (payload, ack) => {
      applyToRoom(
        payload.roomId,
        (room) =>
          startRound(room, {
            sessionId: payload.sessionId,
            title: payload.title,
            now: now(),
          }),
        ack,
      );
    });

    socket.on("round:vote", (payload, ack) => {
      applyToRoom(
        payload.roomId,
        (room) =>
          castVote(room, {
            sessionId: payload.sessionId,
            card: payload.card,
            now: now(),
          }),
        ack,
      );
    });

    socket.on("round:reveal", (payload, ack) => {
      applyToRoom(
        payload.roomId,
        (room) => revealRound(room, { sessionId: payload.sessionId, now: now() }),
        ack,
      );
    });

    socket.on("round:reset", (payload, ack) => {
      applyToRoom(
        payload.roomId,
        (room) => resetRound(room, { sessionId: payload.sessionId, now: now() }),
        ack,
      );
    });

    socket.on("disconnect", (reason) => {
      logger.debug(
        { event: "socket.disconnect", socketId: socket.id, reason },
        "client disconnected",
      );
      const { roomId, sessionId } = socket.data;
      if (!roomId || !sessionId) return;
      const room = store.get(roomId);
      if (!room) return;
      const outcome = markDisconnected(room, { sessionId, now: now() });
      if (!outcome.ok) return;
      store.update(outcome.state);
      broadcast(roomId, outcome.state);
    });
  });
}

export function tick(deps: HandlersDeps & { ttlMs: number }): void {
  const { io, store, now, hostGracePeriodMs, ttlMs } = deps;

  const removed = store.cleanupStale({ ttlMs, now: now() });
  for (const roomId of removed) {
    io.to(roomId).emit("room:closed", { reason: "ttl" });
    logger.info({ event: "room.closed", roomId, reason: "ttl" }, "room closed by TTL");
  }

  for (const roomId of store.ids()) {
    const room = store.get(roomId);
    if (!room) continue;
    const after = transferHostIfNeeded(room, {
      gracePeriodMs: hostGracePeriodMs,
      now: now(),
    });
    if (after.hostSessionId !== room.hostSessionId) {
      store.update(after);
      io.to(roomId).emit("room:state", toPublic(after));
      logger.info(
        {
          event: "host.transferred",
          roomId,
          from: room.hostSessionId,
          to: after.hostSessionId,
        },
        "host transferred",
      );
    }
  }
}
