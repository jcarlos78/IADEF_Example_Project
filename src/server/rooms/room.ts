import type { ErrorCode, ErrorPayload, PublicRoomState, RoundResult } from "@/lib/events";
import { getScale, isScaleId, type ScaleId } from "@/lib/scales";
import { summarize } from "@/lib/stats";

export interface ParticipantInternal {
  sessionId: string;
  nickname: string;
  joinedAt: number;
  connected: boolean;
  disconnectedAt: number | null;
}

export interface RoundInternal {
  title: string | null;
  startedAt: number;
  revealed: boolean;
  result: RoundResult | null;
  votes: Record<string, string>;
}

export interface RoomState {
  roomId: string;
  scaleId: ScaleId;
  hostSessionId: string;
  participants: Record<string, ParticipantInternal>;
  round: RoundInternal | null;
  createdAt: number;
  lastActivityAt: number;
}

export type Outcome = { ok: true; state: RoomState } | { ok: false; error: ErrorPayload };

const err = (code: ErrorCode, message: string): Outcome => ({
  ok: false,
  error: { code, message },
});

export interface CreateRoomOpts {
  roomId: string;
  scaleId: ScaleId;
  hostSessionId: string;
  hostNickname: string;
  now: number;
}

export function createRoom(opts: CreateRoomOpts): RoomState {
  const nickname = opts.hostNickname.trim();
  if (!nickname) {
    throw new Error("hostNickname is required");
  }
  if (!isScaleId(opts.scaleId)) {
    throw new Error(`invalid scaleId: ${opts.scaleId}`);
  }
  return {
    roomId: opts.roomId,
    scaleId: opts.scaleId,
    hostSessionId: opts.hostSessionId,
    participants: {
      [opts.hostSessionId]: {
        sessionId: opts.hostSessionId,
        nickname,
        joinedAt: opts.now,
        connected: true,
        disconnectedAt: null,
      },
    },
    round: null,
    createdAt: opts.now,
    lastActivityAt: opts.now,
  };
}

export function joinRoom(
  state: RoomState,
  opts: { sessionId: string; nickname: string; now: number },
): Outcome {
  const nickname = opts.nickname.trim();
  if (!nickname) {
    return err("nickname-empty", "Nickname is required.");
  }
  for (const p of Object.values(state.participants)) {
    if (p.nickname === nickname && p.sessionId !== opts.sessionId) {
      return err("nickname-duplicate", `Nickname "${nickname}" is already in use in this room.`);
    }
  }
  const existing = state.participants[opts.sessionId];
  const participant: ParticipantInternal = existing
    ? { ...existing, nickname, connected: true, disconnectedAt: null }
    : {
        sessionId: opts.sessionId,
        nickname,
        joinedAt: opts.now,
        connected: true,
        disconnectedAt: null,
      };
  return {
    ok: true,
    state: {
      ...state,
      participants: { ...state.participants, [opts.sessionId]: participant },
      lastActivityAt: opts.now,
    },
  };
}

export function leaveRoom(state: RoomState, opts: { sessionId: string; now: number }): Outcome {
  if (!state.participants[opts.sessionId]) {
    return err("session-unknown", "Session does not belong to this room.");
  }
  const remainingParticipants = Object.fromEntries(
    Object.entries(state.participants).filter(([k]) => k !== opts.sessionId),
  );
  let next: RoomState = {
    ...state,
    participants: remainingParticipants,
    lastActivityAt: opts.now,
  };
  if (next.round && !next.round.revealed && next.round.votes[opts.sessionId]) {
    const remainingVotes = Object.fromEntries(
      Object.entries(next.round.votes).filter(([k]) => k !== opts.sessionId),
    );
    next = { ...next, round: { ...next.round, votes: remainingVotes } };
  }
  if (state.hostSessionId === opts.sessionId) {
    next = promoteOldest(next);
  }
  return { ok: true, state: next };
}

export function markDisconnected(
  state: RoomState,
  opts: { sessionId: string; now: number },
): Outcome {
  const p = state.participants[opts.sessionId];
  if (!p) {
    return err("session-unknown", "Session does not belong to this room.");
  }
  return {
    ok: true,
    state: {
      ...state,
      participants: {
        ...state.participants,
        [opts.sessionId]: { ...p, connected: false, disconnectedAt: opts.now },
      },
    },
  };
}

export function startRound(
  state: RoomState,
  opts: { sessionId: string; title?: string; now: number },
): Outcome {
  if (state.hostSessionId !== opts.sessionId) {
    return err("not-host", "Only the facilitator can start a round.");
  }
  if (state.round && !state.round.revealed) {
    return err("round-in-progress", "A round is already in progress.");
  }
  const title = opts.title?.trim() || null;
  return {
    ok: true,
    state: {
      ...state,
      round: {
        title,
        startedAt: opts.now,
        revealed: false,
        result: null,
        votes: {},
      },
      lastActivityAt: opts.now,
    },
  };
}

export function castVote(
  state: RoomState,
  opts: { sessionId: string; card: string; now: number },
): Outcome {
  if (!state.round) {
    return err("no-round", "No round is in progress.");
  }
  if (state.round.revealed) {
    return err("round-already-revealed", "The round has already been revealed.");
  }
  if (!state.participants[opts.sessionId]) {
    return err("session-unknown", "Session does not belong to this room.");
  }
  const scale = getScale(state.scaleId);
  if (!scale.cards.includes(opts.card)) {
    return err("card-invalid", `Card "${opts.card}" does not belong to scale ${scale.label}.`);
  }
  return {
    ok: true,
    state: {
      ...state,
      round: {
        ...state.round,
        votes: { ...state.round.votes, [opts.sessionId]: opts.card },
      },
      lastActivityAt: opts.now,
    },
  };
}

export function revealRound(state: RoomState, opts: { sessionId: string; now: number }): Outcome {
  if (state.hostSessionId !== opts.sessionId) {
    return err("not-host", "Only the facilitator can reveal.");
  }
  if (!state.round) {
    return err("no-round", "There is no round to reveal.");
  }
  if (state.round.revealed) {
    return err("round-already-revealed", "The round has already been revealed.");
  }
  const stats = summarize(Object.values(state.round.votes));
  const result: RoundResult = {
    votesBySession: { ...state.round.votes },
    average: stats.average,
    min: stats.min,
    max: stats.max,
    counts: stats.counts,
  };
  return {
    ok: true,
    state: {
      ...state,
      round: { ...state.round, revealed: true, result },
      lastActivityAt: opts.now,
    },
  };
}

export function resetRound(state: RoomState, opts: { sessionId: string; now: number }): Outcome {
  if (state.hostSessionId !== opts.sessionId) {
    return err("not-host", "Only the facilitator can start a new round.");
  }
  return {
    ok: true,
    state: { ...state, round: null, lastActivityAt: opts.now },
  };
}

export function changeScale(
  state: RoomState,
  opts: { sessionId: string; scaleId: string; now: number },
): Outcome {
  if (state.hostSessionId !== opts.sessionId) {
    return err("not-host", "Only the facilitator can change the scale.");
  }
  if (state.round && !state.round.revealed) {
    return err("round-in-progress", "Cannot change the scale while a round is in progress.");
  }
  if (!isScaleId(opts.scaleId)) {
    return err("scale-invalid", `Scale "${opts.scaleId}" does not exist.`);
  }
  return {
    ok: true,
    state: { ...state, scaleId: opts.scaleId, lastActivityAt: opts.now },
  };
}

export function transferHostIfNeeded(
  state: RoomState,
  opts: { gracePeriodMs: number; now: number },
): RoomState {
  const host = state.participants[state.hostSessionId];
  if (!host) {
    return promoteOldest(state);
  }
  if (host.connected) return state;
  if (host.disconnectedAt === null) return state;
  if (opts.now - host.disconnectedAt < opts.gracePeriodMs) return state;
  return promoteOldest(state);
}

function promoteOldest(state: RoomState): RoomState {
  const others = Object.values(state.participants).filter(
    (p) => p.sessionId !== state.hostSessionId,
  );
  if (others.length === 0) {
    return state;
  }
  const connectedFirst = [...others].sort((a, b) => {
    if (a.connected !== b.connected) return a.connected ? -1 : 1;
    return a.joinedAt - b.joinedAt;
  });
  return { ...state, hostSessionId: connectedFirst[0].sessionId };
}

export function toPublic(state: RoomState): PublicRoomState {
  const participants = Object.values(state.participants)
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({
      sessionId: p.sessionId,
      nickname: p.nickname,
      isHost: p.sessionId === state.hostSessionId,
      hasVoted: state.round
        ? Object.prototype.hasOwnProperty.call(state.round.votes, p.sessionId)
        : false,
      connected: p.connected,
    }));
  return {
    roomId: state.roomId,
    scaleId: state.scaleId,
    participants,
    round: state.round
      ? {
          title: state.round.title,
          startedAt: state.round.startedAt,
          revealed: state.round.revealed,
          result: state.round.revealed ? state.round.result : null,
        }
      : null,
  };
}
