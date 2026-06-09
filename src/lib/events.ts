import type { ScaleId } from "./scales";

export type ErrorCode =
  | "room-not-found"
  | "nickname-empty"
  | "nickname-duplicate"
  | "nickname-invalid"
  | "not-host"
  | "round-in-progress"
  | "no-round"
  | "round-already-revealed"
  | "card-invalid"
  | "session-unknown"
  | "scale-invalid"
  | "internal";

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };

export interface Participant {
  sessionId: string;
  nickname: string;
  isHost: boolean;
  hasVoted: boolean;
  connected: boolean;
}

export interface RoundResult {
  votesBySession: Record<string, string>;
  average: number | null;
  min: number | null;
  max: number | null;
  counts: Record<string, number>;
}

export interface RoundState {
  title: string | null;
  startedAt: number;
  revealed: boolean;
  result: RoundResult | null;
}

export interface PublicRoomState {
  roomId: string;
  scaleId: ScaleId;
  participants: Participant[];
  round: RoundState | null;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: { scaleId: ScaleId; hostNickname: string },
    ack: (
      result: Result<{ roomId: string; hostSessionId: string; state: PublicRoomState }>,
    ) => void,
  ) => void;

  "room:join": (
    payload: { roomId: string; sessionId: string; nickname: string },
    ack: (result: Result<PublicRoomState>) => void,
  ) => void;

  "room:leave": (
    payload: { roomId: string; sessionId: string },
    ack: (result: Result<null>) => void,
  ) => void;

  "room:changeScale": (
    payload: { roomId: string; sessionId: string; scaleId: ScaleId },
    ack: (result: Result<null>) => void,
  ) => void;

  "round:start": (
    payload: { roomId: string; sessionId: string; title?: string },
    ack: (result: Result<null>) => void,
  ) => void;

  "round:vote": (
    payload: { roomId: string; sessionId: string; card: string },
    ack: (result: Result<null>) => void,
  ) => void;

  "round:reveal": (
    payload: { roomId: string; sessionId: string },
    ack: (result: Result<null>) => void,
  ) => void;

  "round:reset": (
    payload: { roomId: string; sessionId: string },
    ack: (result: Result<null>) => void,
  ) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: PublicRoomState) => void;
  "room:closed": (payload: { reason: "ttl" | "shutdown" }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  sessionId?: string;
  roomId?: string;
}
