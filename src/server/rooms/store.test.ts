import { describe, expect, it } from "vitest";
import { castVote, createRoom, startRound, type RoomState } from "./room";
import { ROOM_TTL_MS, RoomStore } from "./store";

function makeRoom(roomId: string, now: number): RoomState {
  return createRoom({
    roomId,
    scaleId: "fibonacci",
    hostSessionId: `${roomId}-host`,
    hostNickname: "Anfitriã",
    now,
  });
}

describe("RoomStore — CRUD básico", () => {
  it("create + get round-trip", () => {
    const store = new RoomStore();
    const room = makeRoom("r1", 1_000);
    store.create(room);
    expect(store.get("r1")).toBe(room);
    expect(store.has("r1")).toBe(true);
    expect(store.size()).toBe(1);
  });

  it("create lança ao tentar duplicar roomId", () => {
    const store = new RoomStore();
    store.create(makeRoom("r1", 1_000));
    expect(() => store.create(makeRoom("r1", 2_000))).toThrow(/já existe/);
  });

  it("get retorna undefined para sala inexistente (AC11 — caminho de erro)", () => {
    const store = new RoomStore();
    expect(store.get("inexistente")).toBeUndefined();
    expect(store.has("inexistente")).toBe(false);
  });

  it("update substitui o estado salvo", () => {
    const store = new RoomStore();
    const room = makeRoom("r1", 1_000);
    store.create(room);
    const startResult = startRound(room, { sessionId: "r1-host", now: 2_000 });
    if (!startResult.ok) throw new Error("startRound failed");
    store.update(startResult.state);
    expect(store.get("r1")?.round).not.toBeNull();
    expect(store.get("r1")?.lastActivityAt).toBe(2_000);
  });

  it("update lança para sala inexistente", () => {
    const store = new RoomStore();
    expect(() => store.update(makeRoom("ghost", 1_000))).toThrow(/não existe/);
  });

  it("delete retorna true se removeu, false se não tinha", () => {
    const store = new RoomStore();
    store.create(makeRoom("r1", 1_000));
    expect(store.delete("r1")).toBe(true);
    expect(store.delete("r1")).toBe(false);
    expect(store.size()).toBe(0);
  });

  it("ids() lista todas as salas presentes", () => {
    const store = new RoomStore();
    store.create(makeRoom("r1", 1_000));
    store.create(makeRoom("r2", 1_000));
    expect(store.ids().sort()).toEqual(["r1", "r2"]);
  });
});

describe("RoomStore.cleanupStale — AC9 (sala efêmera após TTL)", () => {
  it("remove sala cujo lastActivityAt é mais antigo que o TTL", () => {
    const store = new RoomStore();
    store.create(makeRoom("stale", 1_000));
    const now = 1_000 + ROOM_TTL_MS + 1;
    const removed = store.cleanupStale({ ttlMs: ROOM_TTL_MS, now });
    expect(removed).toEqual(["stale"]);
    expect(store.has("stale")).toBe(false);
  });

  it("preserva sala dentro do TTL", () => {
    const store = new RoomStore();
    store.create(makeRoom("fresh", 1_000));
    const now = 1_000 + ROOM_TTL_MS - 1;
    expect(store.cleanupStale({ ttlMs: ROOM_TTL_MS, now })).toEqual([]);
    expect(store.has("fresh")).toBe(true);
  });

  it("limite exato (now - lastActivityAt === ttl) NÃO remove (regra: 'mais que ttl')", () => {
    const store = new RoomStore();
    store.create(makeRoom("borderline", 1_000));
    const now = 1_000 + ROOM_TTL_MS;
    expect(store.cleanupStale({ ttlMs: ROOM_TTL_MS, now })).toEqual([]);
    expect(store.has("borderline")).toBe(true);
  });

  it("varre múltiplas salas: remove apenas as stale", () => {
    const store = new RoomStore();
    store.create(makeRoom("old1", 1_000));
    store.create(makeRoom("old2", 2_000));
    store.create(makeRoom("recent", 500_000));
    const removed = store.cleanupStale({ ttlMs: ROOM_TTL_MS, now: 700_000 });
    expect(removed.sort()).toEqual(["old1", "old2"]);
    expect(store.has("recent")).toBe(true);
    expect(store.size()).toBe(1);
  });

  it("atividade renovada (via update) impede limpeza", () => {
    const store = new RoomStore();
    const room = makeRoom("active", 1_000);
    store.create(room);

    const r = startRound(room, { sessionId: "active-host", now: 500_000 });
    if (!r.ok) throw new Error("startRound failed");
    store.update(r.state);
    const v = castVote(r.state, {
      sessionId: "active-host",
      card: "3",
      now: 600_000,
    });
    if (!v.ok) throw new Error("castVote failed");
    store.update(v.state);

    const removed = store.cleanupStale({ ttlMs: ROOM_TTL_MS, now: 1_100_000 });
    expect(removed).toEqual([]);
    expect(store.has("active")).toBe(true);
  });

  it("cleanup sem salas é no-op", () => {
    const store = new RoomStore();
    expect(store.cleanupStale({ ttlMs: ROOM_TTL_MS, now: 999_999 })).toEqual([]);
  });
});

describe("ROOM_TTL_MS", () => {
  it("é 10 minutos conforme AC9", () => {
    expect(ROOM_TTL_MS).toBe(600_000);
  });
});
