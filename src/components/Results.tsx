import type { Participant, RoundResult } from "@/lib/events";
import styles from "./Results.module.css";

export interface ResultsProps {
  result: RoundResult;
  participants: readonly Participant[];
}

function fmt(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function Results({ result, participants }: ResultsProps) {
  const distribution = Object.entries(result.counts).sort(([, a], [, b]) => b - a);
  const maxCount = distribution.length > 0 ? Math.max(...distribution.map(([, c]) => c)) : 0;

  return (
    <section aria-labelledby="results-heading" className={styles.panel}>
      <h2 id="results-heading" className={styles.heading}>
        Result
      </h2>

      <dl aria-label="Statistics" className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Mean</dt>
          <dd className={styles.statValue} data-stat="average">
            {fmt(result.average)}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Minimum</dt>
          <dd className={styles.statValue} data-stat="min">
            {fmt(result.min)}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>Maximum</dt>
          <dd className={styles.statValue} data-stat="max">
            {fmt(result.max)}
          </dd>
        </div>
      </dl>

      <div className={styles.section}>
        <h3 className={styles.subheading}>Votes</h3>
        <ul aria-label="Votes per participant" className={styles.votes}>
          {participants.map((p) => {
            const vote = result.votesBySession[p.sessionId];
            return (
              <li key={p.sessionId} data-session-id={p.sessionId} className={styles.voteRow}>
                <span className={styles.voteName}>{p.nickname}</span>
                <span aria-hidden="true" className={styles.srOnly}>
                  {": "}
                </span>
                <span className={styles.voteValue}>{vote ?? "—"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {distribution.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.subheading}>Distribution</h3>
          <ul aria-label="Vote distribution" className={styles.distribution}>
            {distribution.map(([card, count]) => {
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <li key={card} className={styles.distRow}>
                  <span className={styles.distCard}>{card}</span>
                  <span aria-hidden="true" className={styles.srOnly}>
                    {": "}
                  </span>
                  <span className={styles.distBar}>
                    <span className={styles.distFill} style={{ width: `${pct}%` }} />
                  </span>
                  <span className={styles.distCount}>{count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
