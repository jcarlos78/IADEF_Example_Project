import type { Participant } from "@/lib/events";

export interface ParticipantListProps {
  participants: readonly Participant[];
  hasActiveRound?: boolean;
}

export function ParticipantList({ participants, hasActiveRound }: ParticipantListProps) {
  if (participants.length === 0) {
    return <p>Ninguém na sala ainda.</p>;
  }

  return (
    <ul aria-label="Participantes da sala">
      {participants.map((p) => (
        <li key={p.sessionId} data-session-id={p.sessionId}>
          <span>{p.nickname}</span>
          {p.isHost ? <span aria-label="facilitador"> (facilitador)</span> : null}
          {!p.connected ? <span aria-label="offline"> (offline)</span> : null}
          {hasActiveRound && p.hasVoted ? <span aria-label="votou"> ✓ votou</span> : null}
          {hasActiveRound && !p.hasVoted ? <span aria-label="aguardando voto"> …</span> : null}
        </li>
      ))}
    </ul>
  );
}
