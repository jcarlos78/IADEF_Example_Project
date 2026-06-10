import type { Participant } from "@/lib/events";
import styles from "./ParticipantList.module.css";

export interface ParticipantListProps {
  participants: readonly Participant[];
  hasActiveRound?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ParticipantList({ participants, hasActiveRound }: ParticipantListProps) {
  if (participants.length === 0) {
    return <p className={styles.empty}>Ninguém na sala ainda.</p>;
  }

  return (
    <ul aria-label="Participantes da sala" className={styles.list}>
      {participants.map((p) => {
        const itemClass = `${styles.item}${!p.connected ? ` ${styles.itemOffline}` : ""}`;
        return (
          <li key={p.sessionId} data-session-id={p.sessionId} className={itemClass}>
            <span aria-hidden="true" className={styles.avatar}>
              {initials(p.nickname)}
            </span>
            <span className={styles.name}>{p.nickname}</span>
            <span className={styles.badges}>
              {p.isHost ? (
                <span aria-label="facilitador" className={`${styles.badge} ${styles.badgeHost}`}>
                  facilitador
                </span>
              ) : null}
              {!p.connected ? (
                <span aria-label="offline" className={`${styles.badge} ${styles.badgeOffline}`}>
                  offline
                </span>
              ) : null}
              {hasActiveRound && p.hasVoted ? (
                <span aria-label="votou" className={`${styles.badge} ${styles.badgeVoted}`}>
                  ✓ votou
                </span>
              ) : null}
              {hasActiveRound && !p.hasVoted ? (
                <span
                  aria-label="aguardando voto"
                  className={`${styles.badge} ${styles.badgeWaiting}`}
                >
                  aguardando…
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
