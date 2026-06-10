"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { CardPicker } from "@/components/CardPicker";
import { NicknameDialog } from "@/components/NicknameDialog";
import { ParticipantList } from "@/components/ParticipantList";
import { Results } from "@/components/Results";
import { RoomErrorView } from "@/components/RoomErrorView";
import { RoundControls } from "@/components/RoundControls";
import type {
  ClientToServerEvents,
  ErrorPayload,
  PublicRoomState,
  Result,
  ServerToClientEvents,
} from "@/lib/events";
import type { ScaleId } from "@/lib/scales";
import styles from "./RoomClient.module.css";

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
  const [actionError, setActionError] = useState<ErrorPayload | null>(null);
  const [terminalError, setTerminalError] = useState<ErrorPayload | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const socketRef = useRef<RoomSocket | null>(null);
  const sessionIdRef = useRef<string | null>(initialSessionId);
  const nicknameRef = useRef<string | null>(initialNickname);
  const lastRoundStartedAtRef = useRef<number | null>(null);

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

  const dispatch = useCallback(
    <P extends Record<string, unknown>>(event: keyof ClientToServerEvents, payload: P): void => {
      const socket = socketRef.current;
      if (!socket) return;
      setIsDispatching(true);
      setActionError(null);
      (
        socket.emit as unknown as (e: string, p: unknown, ack: (r: Result<unknown>) => void) => void
      )(event as string, payload, (res: Result<unknown>) => {
        setIsDispatching(false);
        if (!res.ok) setActionError(res.error);
      });
    },
    [],
  );

  useEffect(() => {
    const socket: RoomSocket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("room:state", (next) => {
      setState((prev) => {
        const prevStarted = prev?.round?.startedAt ?? null;
        const nextStarted = next.round?.startedAt ?? null;
        if (prevStarted !== nextStarted) {
          setSelectedCard(null);
          lastRoundStartedAtRef.current = nextStarted;
        }
        if (next.round === null) setSelectedCard(null);
        return next;
      });
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
      <main className={styles.joinPage}>
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

  const sessionId = sessionIdRef.current as string;
  const me = state.participants.find((p) => p.sessionId === sessionId);
  const isHost = me?.isHost === true;
  const hasActiveRound = state.round !== null && !state.round.revealed;
  const canVote = hasActiveRound;
  const participantCount = state.participants.length;

  function vote(card: string): void {
    setSelectedCard(card);
    dispatch("round:vote", { roomId, sessionId, card });
  }

  function startRound(title?: string): void {
    dispatch("round:start", { roomId, sessionId, title });
  }

  function reveal(): void {
    dispatch("round:reveal", { roomId, sessionId });
  }

  function resetRound(): void {
    setSelectedCard(null);
    dispatch("round:reset", { roomId, sessionId });
  }

  function changeScale(scaleId: ScaleId): void {
    dispatch("room:changeScale", { roomId, sessionId, scaleId });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.roomTitle}>
            <span aria-hidden="true" className={styles.dot} />
            Sala {state.roomId}
          </h1>
          <p className={styles.roomMeta}>
            <span className={styles.metaChip}>
              Escala: <strong>{state.scaleId}</strong>
            </span>
            <span className={styles.metaChip}>
              {participantCount} participante{participantCount === 1 ? "" : "s"}
            </span>
            {isHost ? <span className={styles.hostBadge}>você é o facilitador</span> : null}
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.mainCol}>
          {state.round?.revealed && state.round.result ? (
            <Results result={state.round.result} participants={state.participants} />
          ) : (
            <section aria-labelledby="vote-heading" className={styles.panel}>
              <h2
                id="vote-heading"
                className={hasActiveRound ? styles.voteTitle : styles.voteIdle}
              >
                {hasActiveRound
                  ? `Votando${state.round?.title ? ` em ${state.round.title}` : ""}`
                  : "Aguardando início da rodada"}
              </h2>
              <div className={styles.cardArea}>
                <CardPicker
                  scaleId={state.scaleId}
                  selectedCard={selectedCard}
                  onSelect={vote}
                  disabled={!canVote || isDispatching}
                />
              </div>
            </section>
          )}

          {isHost ? (
            <RoundControls
              scaleId={state.scaleId}
              round={state.round}
              onStartRound={startRound}
              onReveal={reveal}
              onResetRound={resetRound}
              onChangeScale={changeScale}
              isSubmitting={isDispatching}
            />
          ) : null}
        </div>

        <aside className={styles.sidebar}>
          <section aria-labelledby="participants-heading" className={styles.panel}>
            <h2 id="participants-heading" className={styles.panelHeading}>
              Participantes
            </h2>
            <ParticipantList participants={state.participants} hasActiveRound={hasActiveRound} />
          </section>
        </aside>
      </div>

      {actionError ? (
        <p role="alert" data-action-error className={styles.actionError}>
          {actionError.message}
        </p>
      ) : null}
    </main>
  );
}
