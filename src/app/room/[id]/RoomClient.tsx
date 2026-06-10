"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { NicknameDialog } from "@/components/NicknameDialog";
import { ParticipantList } from "@/components/ParticipantList";
import { RoomErrorView } from "@/components/RoomErrorView";
import type {
  ClientToServerEvents,
  ErrorPayload,
  PublicRoomState,
  Result,
  ServerToClientEvents,
} from "@/lib/events";

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface RoomClientProps {
  roomId: string;
  initialSessionId: string | null;
  initialNickname: string | null;
}

const LS_SESSION_KEY = (roomId: string): string => `pp_guest_session_${roomId}`;
const LS_NICKNAME_KEY = (roomId: string): string => `pp_guest_nickname_${roomId}`;

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / private-mode errors
  }
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function RoomClient({ roomId, initialSessionId, initialNickname }: RoomClientProps) {
  const [state, setState] = useState<PublicRoomState | null>(null);
  const [joinError, setJoinError] = useState<ErrorPayload | null>(null);
  const [terminalError, setTerminalError] = useState<ErrorPayload | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const socketRef = useRef<RoomSocket | null>(null);
  const sessionIdRef = useRef<string | null>(initialSessionId);
  const nicknameRef = useRef<string | null>(initialNickname);

  const join = useCallback(
    (sessionId: string, nickname: string): void => {
      const socket = socketRef.current;
      if (!socket) return;
      setIsJoining(true);
      setJoinError(null);
      socket.emit("room:join", { roomId, sessionId, nickname }, (res: Result<PublicRoomState>) => {
        setIsJoining(false);
        if (!res.ok) {
          if (res.error.code === "room-not-found") {
            setTerminalError(res.error);
          } else {
            setJoinError(res.error);
          }
          return;
        }
        sessionIdRef.current = sessionId;
        nicknameRef.current = nickname;
        if (!initialSessionId) {
          writeLocal(LS_SESSION_KEY(roomId), sessionId);
          writeLocal(LS_NICKNAME_KEY(roomId), nickname);
        }
        setState(res.data);
      });
    },
    [roomId, initialSessionId],
  );

  useEffect(() => {
    const socket: RoomSocket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("room:state", (next) => {
      setState(next);
    });
    socket.on("room:closed", (payload) => {
      setTerminalError({
        code: payload.reason === "ttl" ? "room-not-found" : "internal",
        message:
          payload.reason === "ttl"
            ? "Sala expirou por inatividade."
            : "Sala foi fechada pelo servidor.",
      });
    });
    socket.on("connect", () => {
      const sid = sessionIdRef.current ?? readLocal(LS_SESSION_KEY(roomId));
      const nick = nicknameRef.current ?? readLocal(LS_NICKNAME_KEY(roomId));
      if (sid && nick) {
        sessionIdRef.current = sid;
        nicknameRef.current = nick;
        join(sid, nick);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, join]);

  if (terminalError) {
    return (
      <RoomErrorView
        title={
          terminalError.code === "room-not-found"
            ? "Sala não encontrada ou expirada"
            : "Erro na sala"
        }
        description={terminalError.message}
      />
    );
  }

  if (!state) {
    return (
      <main>
        <NicknameDialog
          onSubmit={(nickname) => {
            const sid = sessionIdRef.current ?? newSessionId();
            join(sid, nickname);
          }}
          isSubmitting={isJoining}
          errorMessage={joinError?.message ?? null}
          title="Entrar na sala"
          description={`Sala ${roomId} — escolha um apelido para participar.`}
        />
      </main>
    );
  }

  const hasActiveRound = state.round !== null && !state.round.revealed;

  return (
    <main>
      <header>
        <h1>Sala {state.roomId}</h1>
        <p>
          Escala: <strong>{state.scaleId}</strong>
          {" · "}
          {state.participants.length} participante
          {state.participants.length === 1 ? "" : "s"}
        </p>
      </header>

      <section aria-labelledby="participants-heading">
        <h2 id="participants-heading">Participantes</h2>
        <ParticipantList participants={state.participants} hasActiveRound={hasActiveRound} />
      </section>

      <section aria-labelledby="round-placeholder-heading">
        <h2 id="round-placeholder-heading">Rodada</h2>
        {state.round === null ? (
          <p>Nenhuma rodada em andamento.</p>
        ) : state.round.revealed ? (
          <p>Rodada revelada — resultado em breve nesta tela.</p>
        ) : (
          <p>Rodada em andamento. Aguardando votos.</p>
        )}
        <p>
          <em>Card picker e controles do facilitador chegam no próximo task.</em>
        </p>
      </section>
    </main>
  );
}
