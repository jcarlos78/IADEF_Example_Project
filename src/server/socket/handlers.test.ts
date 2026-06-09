import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server as IoServer } from "socket.io";
import { io as Client, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  ClientToServerEvents,
  PublicRoomState,
  Result,
  ServerToClientEvents,
} from "@/lib/events";
import { RoomStore } from "@/server/rooms/store";
import { registerHandlers, tick } from "./handlers";

type TypedClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let http: HttpServer;
let io: IoServer<ClientToServerEvents, ServerToClientEvents>;
let store: RoomStore;
let nowMs = 1_000;
let idSeq = 0;
let port = 0;
const clients: TypedClient[] = [];

const HOST_GRACE_MS = 30_000;
const TTL_MS = 600_000;

function nextRoomId(): string {
  return `room-${++idSeq}`;
}

function nextSessionId(): string {
  return `session-${++idSeq}`;
}

beforeEach(async () => {
  nowMs = 1_000;
  idSeq = 0;
  http = createServer();
  io = new IoServer(http);
  store = new RoomStore();
  registerHandlers({
    io,
    store,
    now: () => nowMs,
    generateRoomId: nextRoomId,
    generateSessionId: nextSessionId,
    hostGracePeriodMs: HOST_GRACE_MS,
  });
  await new Promise<void>((resolve) => http.listen(0, resolve));
  const addr = http.address() as AddressInfo;
  port = addr.port;
});

afterEach(async () => {
  for (const c of clients) c.disconnect();
  clients.length = 0;
  io.close();
  await new Promise<void>((resolve) => http.close(() => resolve()));
});

function connect(): Promise<TypedClient> {
  return new Promise((resolve, reject) => {
    const c: TypedClient = Client(`http://localhost:${port}`, {
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    clients.push(c);
    c.on("connect", () => resolve(c));
    c.on("connect_error", reject);
  });
}

function emit<E extends keyof ClientToServerEvents>(
  c: TypedClient,
  event: E,
  payload: Parameters<ClientToServerEvents[E]>[0],
): Promise<Parameters<Parameters<ClientToServerEvents[E]>[1]>[0]> {
  return new Promise((resolve) => {
    // socket.io-client typings for ack-style emit are loose; cast at the boundary.
    (c.emit as unknown as (e: E, p: unknown, ack: (r: unknown) => void) => void)(
      event,
      payload,
      (r) => resolve(r as Parameters<Parameters<ClientToServerEvents[E]>[1]>[0]),
    );
  });
}

function nextStateOnce(c: TypedClient): Promise<PublicRoomState> {
  return new Promise((resolve) => c.once("room:state", resolve));
}

function expectOk<T>(r: Result<T>): asserts r is { ok: true; data: T } {
  if (!r.ok) throw new Error(`expected ok but got: ${r.error.code} — ${r.error.message}`);
}

describe("room:create / room:join — AC1, AC2, AC8, AC11", () => {
  it("AC1: cria sala e devolve roomId + hostSessionId + estado", async () => {
    const host = await connect();
    const ack = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "Anfitriã",
    });
    expectOk(ack);
    expect(ack.data.roomId).toBe("room-1");
    expect(ack.data.hostSessionId).toBe("session-2");
    expect(ack.data.state.participants).toHaveLength(1);
    expect(ack.data.state.participants[0].isHost).toBe(true);
  });

  it("AC8: room:create rejeita apelido vazio", async () => {
    const host = await connect();
    const ack = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "   ",
    });
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.error.code).toBe("nickname-empty");
  });

  it("room:create rejeita escala inválida", async () => {
    const host = await connect();
    const ack = await emit(host, "room:create", {
      scaleId: "bogus" as never,
      hostNickname: "Host",
    });
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.error.code).toBe("scale-invalid");
  });

  it("AC11: room:join em sala inexistente retorna room-not-found", async () => {
    const c = await connect();
    const ack = await emit(c, "room:join", {
      roomId: "ghost",
      sessionId: "s-x",
      nickname: "X",
    });
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.error.code).toBe("room-not-found");
  });

  it("AC8: room:join rejeita apelido duplicado", async () => {
    const host = await connect();
    const created = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "Anfitriã",
    });
    expectOk(created);
    const other = await connect();
    const ack = await emit(other, "room:join", {
      roomId: created.data.roomId,
      sessionId: "s-other",
      nickname: "Anfitriã",
    });
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.error.code).toBe("nickname-duplicate");
  });

  it("AC2 + AC12: novo participante entra e demais recebem room:state", async () => {
    const host = await connect();
    const created = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "Anfitriã",
    });
    expectOk(created);

    const hostBroadcast = nextStateOnce(host);
    const alice = await connect();
    const join = await emit(alice, "room:join", {
      roomId: created.data.roomId,
      sessionId: "s-alice",
      nickname: "Alice",
    });
    expectOk(join);
    expect(join.data.participants).toHaveLength(2);

    const fromHost = await hostBroadcast;
    expect(fromHost.participants).toHaveLength(2);
    expect(fromHost.participants.some((p) => p.nickname === "Alice")).toBe(true);
  });
});

describe("round flow — AC3, AC4, AC5, AC6", () => {
  it("AC3: voto não vaza no broadcast antes de reveal; AC4: reveal entrega a todos", async () => {
    const host = await connect();
    const created = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "Anfitriã",
    });
    expectOk(created);
    const roomId = created.data.roomId;
    const hostSession = created.data.hostSessionId;

    const alice = await connect();
    const aliceJoinBroadcast = nextStateOnce(host);
    expectOk(
      await emit(alice, "room:join", {
        roomId,
        sessionId: "s-alice",
        nickname: "Alice",
      }),
    );
    await aliceJoinBroadcast;

    const broadcastsAlice: PublicRoomState[] = [];
    alice.on("room:state", (s) => broadcastsAlice.push(s));

    expectOk(
      await emit(host, "round:start", {
        roomId,
        sessionId: hostSession,
        title: "US-42",
      }),
    );
    expectOk(await emit(host, "round:vote", { roomId, sessionId: hostSession, card: "5" }));
    expectOk(await emit(alice, "round:vote", { roomId, sessionId: "s-alice", card: "13" }));

    await new Promise((r) => setTimeout(r, 30));
    const preReveal = broadcastsAlice[broadcastsAlice.length - 1];
    expect(preReveal.round?.revealed).toBe(false);
    expect(preReveal.round?.result).toBeNull();
    const preJson = JSON.stringify(preReveal);
    expect(preJson).not.toContain('"5"');
    expect(preJson).not.toContain('"13"');
    expect(preReveal.participants.find((p) => p.sessionId === hostSession)?.hasVoted).toBe(true);
    expect(preReveal.participants.find((p) => p.sessionId === "s-alice")?.hasVoted).toBe(true);

    const hostReveals = nextStateOnce(host);
    const aliceReveals = nextStateOnce(alice);
    expectOk(await emit(host, "round:reveal", { roomId, sessionId: hostSession }));

    const [hostAfter, aliceAfter] = await Promise.all([hostReveals, aliceReveals]);
    expect(hostAfter.round?.revealed).toBe(true);
    expect(aliceAfter.round?.revealed).toBe(true);
    expect(aliceAfter.round?.result?.average).toBe(9);
    expect(aliceAfter.round?.result?.min).toBe(5);
    expect(aliceAfter.round?.result?.max).toBe(13);
    expect(aliceAfter.round?.result?.votesBySession["s-alice"]).toBe("13");
  });

  it("AC6: round:reset descarta rodada e broadcast reflete", async () => {
    const host = await connect();
    const created = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "H",
    });
    expectOk(created);
    const { roomId, hostSessionId } = created.data;

    expectOk(await emit(host, "round:start", { roomId, sessionId: hostSessionId }));
    expectOk(
      await emit(host, "round:vote", {
        roomId,
        sessionId: hostSessionId,
        card: "3",
      }),
    );

    const next = nextStateOnce(host);
    expectOk(await emit(host, "round:reset", { roomId, sessionId: hostSessionId }));
    const state = await next;
    expect(state.round).toBeNull();
  });

  it("não-host não consegue revelar (not-host)", async () => {
    const host = await connect();
    const created = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "H",
    });
    expectOk(created);
    const { roomId, hostSessionId } = created.data;

    const alice = await connect();
    expectOk(
      await emit(alice, "room:join", {
        roomId,
        sessionId: "s-alice",
        nickname: "Alice",
      }),
    );

    expectOk(await emit(host, "round:start", { roomId, sessionId: hostSessionId }));
    const ack = await emit(alice, "round:reveal", { roomId, sessionId: "s-alice" });
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.error.code).toBe("not-host");
  });
});

describe("AC10 — host handoff via tick()", () => {
  it("desconexão do host > grace period promove mais antigo conectado", async () => {
    const host = await connect();
    const created = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "Host",
    });
    expectOk(created);
    const { roomId, hostSessionId } = created.data;

    const alice = await connect();
    expectOk(
      await emit(alice, "room:join", {
        roomId,
        sessionId: "s-alice",
        nickname: "Alice",
      }),
    );

    host.disconnect();
    await new Promise((r) => setTimeout(r, 40));

    nowMs += HOST_GRACE_MS + 1_000;
    const aliceSeesTransfer = nextStateOnce(alice);
    tick({
      io,
      store,
      now: () => nowMs,
      generateRoomId: nextRoomId,
      generateSessionId: nextSessionId,
      hostGracePeriodMs: HOST_GRACE_MS,
      ttlMs: TTL_MS,
    });
    const state = await aliceSeesTransfer;

    const newHost = state.participants.find((p) => p.isHost);
    expect(newHost?.sessionId).toBe("s-alice");
    expect(newHost?.sessionId).not.toBe(hostSessionId);
  });
});

describe("AC9 — tick() expira salas inativas e emite room:closed", () => {
  it("sala sem atividade por mais de TTL é fechada", async () => {
    const host = await connect();
    const created = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "H",
    });
    expectOk(created);
    const { roomId } = created.data;

    const closed = new Promise<{ reason: string }>((resolve) => host.once("room:closed", resolve));

    nowMs += TTL_MS + 1;
    tick({
      io,
      store,
      now: () => nowMs,
      generateRoomId: nextRoomId,
      generateSessionId: nextSessionId,
      hostGracePeriodMs: HOST_GRACE_MS,
      ttlMs: TTL_MS,
    });
    const ev = await closed;
    expect(ev.reason).toBe("ttl");
    expect(store.has(roomId)).toBe(false);
  });
});

describe("AC12 — participantes saem e lista atualiza", () => {
  it("room:leave propaga novo estado para os demais", async () => {
    const host = await connect();
    const created = await emit(host, "room:create", {
      scaleId: "fibonacci",
      hostNickname: "H",
    });
    expectOk(created);
    const { roomId } = created.data;

    const alice = await connect();
    expectOk(await emit(alice, "room:join", { roomId, sessionId: "s-alice", nickname: "Alice" }));

    const hostUpdate = nextStateOnce(host);
    expectOk(await emit(alice, "room:leave", { roomId, sessionId: "s-alice" }));
    const state = await hostUpdate;
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0].nickname).toBe("H");
  });
});

describe("Princípio 8 — formato dos erros", () => {
  it("toda resposta de erro tem shape { ok:false, error:{code,message} }", async () => {
    const c = await connect();
    const ack = await emit(c, "room:join", {
      roomId: "missing",
      sessionId: "x",
      nickname: "X",
    });
    expect(ack.ok).toBe(false);
    if (!ack.ok) {
      expect(typeof ack.error.code).toBe("string");
      expect(typeof ack.error.message).toBe("string");
      expect(ack.error.code.length).toBeGreaterThan(0);
      expect(ack.error.message.length).toBeGreaterThan(0);
    }
  });
});
