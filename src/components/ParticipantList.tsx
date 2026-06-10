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
    return <p className={styles.empty}>Nobody in the room yet.</p>;
  }

  return (
    <ul aria-label="Room participants" className={styles.list}>
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
                <span aria-label="facilitator" className={`${styles.badge} ${styles.badgeHost}`}>
                  facilitator
                </span>
              ) : null}
              {!p.connected ? (
                <span aria-label="offline" className={`${styles.badge} ${styles.badgeOffline}`}>
                  offline
                </span>
              ) : null}
              {hasActiveRound && p.hasVoted ? (
                <span aria-label="voted" className={`${styles.badge} ${styles.badgeVoted}`}>
                  ✓ voted
                </span>
              ) : null}
              {hasActiveRound && !p.hasVoted ? (
                <span
                  aria-label="waiting for vote"
                  className={`${styles.badge} ${styles.badgeWaiting}`}
                >
                  waiting…
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
