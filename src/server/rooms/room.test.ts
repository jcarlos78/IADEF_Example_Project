import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  startRound,
  toPublic,
  transferHostIfNeeded,
  type RoomState,
} from "./room";

function unwrap(r: Outcome): RoomState {
  if (!r.ok) {
    throw new Error(`unexpected error outcome: ${r.error.code} — ${r.error.message}`);
  }
  return r.state;
}

const HOST = "session-host";
const ALICE = "session-alice";
const BOB = "session-bob";

function freshRoom(now = 1_000): RoomState {
  return createRoom({
    roomId: "room-1",
    scaleId: "fibonacci",
    hostSessionId: HOST,
    hostNickname: "Anfitriã",
    now,
  });
}

function withAliceAndBob(now = 2_000): RoomState {
  let s = freshRoom(1_000);
  const r1 = joinRoom(s, { sessionId: ALICE, nickname: "Alice", now });
  if (!r1.ok) throw new Error("join alice failed");
  s = r1.state;
  const r2 = joinRoom(s, { sessionId: BOB, nickname: "Bob", now: now + 1 });
  if (!r2.ok) throw new Error("join bob failed");
  return r2.state;
}

function assertOk<T extends { ok: true; state: RoomState } | { ok: false }>(
  r: T,
): asserts r is Extract<T, { ok: true }> {
  if (!r.ok) throw new Error("expected ok outcome");
}

describe("createRoom", () => {
  it("cria sala com host como único participante", () => {
    const s = freshRoom(1000);
    expect(s.roomId).toBe("room-1");
    expect(s.hostSessionId).toBe(HOST);
    expect(Object.keys(s.participants)).toEqual([HOST]);
    expect(s.participants[HOST].nickname).toBe("Anfitriã");
    expect(s.round).toBeNull();
    expect(s.createdAt).toBe(1000);
  });

  it("rejeita hostNickname vazio", () => {
    expect(() =>
      createRoom({
        roomId: "r",
        scaleId: "fibonacci",
        hostSessionId: HOST,
        hostNickname: "   ",
        now: 0,
      }),
    ).toThrow(/hostNickname/);
  });

  it("rejeita scaleId inválido", () => {
    expect(() =>
      createRoom({
        roomId: "r",
        scaleId: "bogus" as never,
        hostSessionId: HOST,
        hostNickname: "Host",
        now: 0,
      }),
    ).toThrow(/scaleId/);
  });
});

describe("joinRoom (AC2, AC8, AC12)", () => {
  it("adiciona um novo participante", () => {
    const r = joinRoom(freshRoom(), { sessionId: ALICE, nickname: "Alice", now: 2_000 });
    assertOk(r);
    expect(Object.keys(r.state.participants)).toHaveLength(2);
    expect(r.state.participants[ALICE].nickname).toBe("Alice");
    expect(r.state.participants[ALICE].joinedAt).toBe(2_000);
  });

  it("rejeita apelido vazio", () => {
    const r = joinRoom(freshRoom(), { sessionId: ALICE, nickname: "  ", now: 2_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("nickname-empty");
  });

  it("rejeita apelido duplicado na mesma sala", () => {
    const r = joinRoom(freshRoom(), { sessionId: ALICE, nickname: "Anfitriã", now: 2_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("nickname-duplicate");
  });

  it("permite mesmo sessionId reconectar (mantém joinedAt original)", () => {
    let s = freshRoom();
    const r1 = joinRoom(s, { sessionId: ALICE, nickname: "Alice", now: 2_000 });
    assertOk(r1);
    s = r1.state;
    const r2 = joinRoom(s, { sessionId: ALICE, nickname: "Alice", now: 5_000 });
    assertOk(r2);
    expect(r2.state.participants[ALICE].joinedAt).toBe(2_000);
    expect(r2.state.participants[ALICE].connected).toBe(true);
  });

  it("trimma o apelido", () => {
    const r = joinRoom(freshRoom(), { sessionId: ALICE, nickname: "  Alice  ", now: 2_000 });
    assertOk(r);
    expect(r.state.participants[ALICE].nickname).toBe("Alice");
  });
});

describe("leaveRoom", () => {
  it("remove participante", () => {
    const r = leaveRoom(withAliceAndBob(), { sessionId: ALICE, now: 3_000 });
    assertOk(r);
    expect(r.state.participants).not.toHaveProperty(ALICE);
    expect(r.state.participants).toHaveProperty(BOB);
  });

  it("rejeita session-unknown", () => {
    const r = leaveRoom(freshRoom(), { sessionId: "nope", now: 3_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("session-unknown");
  });

  it("ao sair, host é transferido para o mais antigo (AC10)", () => {
    const r = leaveRoom(withAliceAndBob(), { sessionId: HOST, now: 3_000 });
    assertOk(r);
    expect(r.state.hostSessionId).toBe(ALICE);
  });

  it("remove voto da rodada se sair antes da revelação", () => {
    let s = withAliceAndBob();
    const start = startRound(s, { sessionId: HOST, now: 3_000 });
    assertOk(start);
    s = start.state;
    const vote = castVote(s, { sessionId: ALICE, card: "5", now: 3_100 });
    assertOk(vote);
    s = vote.state;
    const left = leaveRoom(s, { sessionId: ALICE, now: 3_200 });
    assertOk(left);
    expect(left.state.round?.votes).not.toHaveProperty(ALICE);
  });
});

describe("startRound", () => {
  it("rejeita não-host", () => {
    const s = withAliceAndBob();
    const r = startRound(s, { sessionId: ALICE, now: 3_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not-host");
  });

  it("rejeita se rodada em andamento", () => {
    let s = withAliceAndBob();
    const r1 = startRound(s, { sessionId: HOST, now: 3_000 });
    assertOk(r1);
    s = r1.state;
    const r2 = startRound(s, { sessionId: HOST, now: 3_500 });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe("round-in-progress");
  });

  it("inicia rodada com título opcional", () => {
    const r = startRound(freshRoom(), { sessionId: HOST, title: "US-42", now: 3_000 });
    assertOk(r);
    expect(r.state.round?.title).toBe("US-42");
    expect(r.state.round?.revealed).toBe(false);
    expect(r.state.round?.votes).toEqual({});
  });

  it("após revelar, é possível iniciar nova rodada (AC6)", () => {
    let s = withAliceAndBob();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(castVote(s, { sessionId: HOST, card: "3", now: 3_100 }));
    s = unwrap(revealRound(s, { sessionId: HOST, now: 3_200 }));
    const r = startRound(s, { sessionId: HOST, now: 3_300 });
    assertOk(r);
    expect(r.state.round?.revealed).toBe(false);
  });
});

describe("castVote (AC3)", () => {
  it("rejeita se não há rodada", () => {
    const r = castVote(freshRoom(), { sessionId: HOST, card: "3", now: 3_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("no-round");
  });

  it("rejeita carta fora da escala", () => {
    let s = freshRoom();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    const r = castVote(s, { sessionId: HOST, card: "M", now: 3_100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("card-invalid");
  });

  it("rejeita sessão desconhecida", () => {
    let s = freshRoom();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    const r = castVote(s, { sessionId: "unknown", card: "3", now: 3_100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("session-unknown");
  });

  it("aceita voto válido sem expor para outros antes da revelação (AC3)", () => {
    let s = withAliceAndBob();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(castVote(s, { sessionId: ALICE, card: "5", now: 3_100 }));
    const pub = toPublic(s);
    expect(pub.round?.result).toBeNull();
    expect(pub.participants.find((p) => p.sessionId === ALICE)?.hasVoted).toBe(true);
    expect(pub.participants.find((p) => p.sessionId === BOB)?.hasVoted).toBe(false);
    expect(JSON.stringify(pub)).not.toContain('"5"');
  });

  it("permite trocar o voto antes da revelação", () => {
    let s = withAliceAndBob();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(castVote(s, { sessionId: ALICE, card: "5", now: 3_100 }));
    s = unwrap(castVote(s, { sessionId: ALICE, card: "8", now: 3_200 }));
    expect(s.round?.votes[ALICE]).toBe("8");
  });

  it("rejeita voto após revelação", () => {
    let s = withAliceAndBob();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(revealRound(s, { sessionId: HOST, now: 3_100 }));
    const r = castVote(s, { sessionId: ALICE, card: "5", now: 3_200 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("round-already-revealed");
  });
});

describe("revealRound (AC4, AC5)", () => {
  it("rejeita não-host", () => {
    let s = withAliceAndBob();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    const r = revealRound(s, { sessionId: ALICE, now: 3_100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not-host");
  });

  it("calcula estatísticas a partir dos votos", () => {
    let s = withAliceAndBob();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(castVote(s, { sessionId: HOST, card: "3", now: 3_100 }));
    s = unwrap(castVote(s, { sessionId: ALICE, card: "5", now: 3_150 }));
    s = unwrap(castVote(s, { sessionId: BOB, card: "?", now: 3_200 }));
    const r = revealRound(s, { sessionId: HOST, now: 3_300 });
    assertOk(r);
    const result = r.state.round?.result;
    expect(result?.average).toBe(4);
    expect(result?.min).toBe(3);
    expect(result?.max).toBe(5);
    expect(result?.counts["?"]).toBe(1);
    expect(result?.votesBySession[ALICE]).toBe("5");
  });
});

describe("resetRound (AC6)", () => {
  it("rejeita não-host", () => {
    const r = resetRound(freshRoom(), { sessionId: ALICE, now: 3_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not-host");
  });

  it("descarta a rodada atual", () => {
    let s = freshRoom();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(castVote(s, { sessionId: HOST, card: "3", now: 3_100 }));
    const r = resetRound(s, { sessionId: HOST, now: 3_200 });
    assertOk(r);
    expect(r.state.round).toBeNull();
  });
});

describe("changeScale (AC7)", () => {
  it("rejeita não-host", () => {
    const r = changeScale(freshRoom(), { sessionId: ALICE, scaleId: "tshirt", now: 3_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not-host");
  });

  it("rejeita escala inexistente", () => {
    const r = changeScale(freshRoom(), { sessionId: HOST, scaleId: "bogus", now: 3_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("scale-invalid");
  });

  it("rejeita troca durante rodada não-revelada", () => {
    let s = freshRoom();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    const r = changeScale(s, { sessionId: HOST, scaleId: "tshirt", now: 3_100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("round-in-progress");
  });

  it("aceita troca sem rodada", () => {
    const r = changeScale(freshRoom(), {
      sessionId: HOST,
      scaleId: "tshirt",
      now: 3_000,
    });
    assertOk(r);
    expect(r.state.scaleId).toBe("tshirt");
  });

  it("aceita troca após revelar", () => {
    let s = freshRoom();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(revealRound(s, { sessionId: HOST, now: 3_100 }));
    const r = changeScale(s, { sessionId: HOST, scaleId: "tshirt", now: 3_200 });
    assertOk(r);
    expect(r.state.scaleId).toBe("tshirt");
  });
});

describe("transferHostIfNeeded (AC10)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("no-op se host está conectado", () => {
    const s = withAliceAndBob();
    const after = transferHostIfNeeded(s, { gracePeriodMs: 30_000, now: 100_000 });
    expect(after.hostSessionId).toBe(HOST);
  });

  it("no-op dentro do grace period", () => {
    let s = withAliceAndBob();
    s = unwrap(markDisconnected(s, { sessionId: HOST, now: 100_000 }));
    const after = transferHostIfNeeded(s, {
      gracePeriodMs: 30_000,
      now: 120_000,
    });
    expect(after.hostSessionId).toBe(HOST);
  });

  it("promove mais antigo conectado após grace period", () => {
    let s = withAliceAndBob();
    s = unwrap(markDisconnected(s, { sessionId: HOST, now: 100_000 }));
    const after = transferHostIfNeeded(s, {
      gracePeriodMs: 30_000,
      now: 130_001,
    });
    expect(after.hostSessionId).toBe(ALICE);
  });

  it("se Alice também desconectou, promove Bob (conectado)", () => {
    let s = withAliceAndBob();
    s = unwrap(markDisconnected(s, { sessionId: HOST, now: 100_000 }));
    s = unwrap(markDisconnected(s, { sessionId: ALICE, now: 100_100 }));
    const after = transferHostIfNeeded(s, {
      gracePeriodMs: 30_000,
      now: 140_000,
    });
    expect(after.hostSessionId).toBe(BOB);
  });
});

describe("toPublic — AC3 (não vaza votos antes de revelar)", () => {
  it("antes da revelação: round.result é null e nenhum voto aparece", () => {
    let s = withAliceAndBob();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(castVote(s, { sessionId: ALICE, card: "13", now: 3_100 }));
    s = unwrap(castVote(s, { sessionId: HOST, card: "21", now: 3_150 }));
    const pub = toPublic(s);
    expect(pub.round?.revealed).toBe(false);
    expect(pub.round?.result).toBeNull();
    const json = JSON.stringify(pub);
    expect(json).not.toContain('"13"');
    expect(json).not.toContain('"21"');
  });

  it("após revelar: result contém todos os votos", () => {
    let s = withAliceAndBob();
    s = unwrap(startRound(s, { sessionId: HOST, now: 3_000 }));
    s = unwrap(castVote(s, { sessionId: ALICE, card: "13", now: 3_100 }));
    s = unwrap(revealRound(s, { sessionId: HOST, now: 3_200 }));
    const pub = toPublic(s);
    expect(pub.round?.revealed).toBe(true);
    expect(pub.round?.result?.votesBySession[ALICE]).toBe("13");
  });

  it("ordena participantes por joinedAt (host primeiro, depois Alice, Bob)", () => {
    const pub = toPublic(withAliceAndBob());
    expect(pub.participants.map((p) => p.sessionId)).toEqual([HOST, ALICE, BOB]);
    expect(pub.participants[0].isHost).toBe(true);
  });
});
