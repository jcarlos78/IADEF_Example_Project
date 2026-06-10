import type { Participant, RoundResult } from "@/lib/events";

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

  return (
    <section aria-labelledby="results-heading">
      <h2 id="results-heading">Resultado</h2>

      <dl aria-label="Estatísticas">
        <div>
          <dt>Média</dt>
          <dd data-stat="average">{fmt(result.average)}</dd>
        </div>
        <div>
          <dt>Mínimo</dt>
          <dd data-stat="min">{fmt(result.min)}</dd>
        </div>
        <div>
          <dt>Máximo</dt>
          <dd data-stat="max">{fmt(result.max)}</dd>
        </div>
      </dl>

      <h3>Votos</h3>
      <ul aria-label="Votos por participante">
        {participants.map((p) => {
          const vote = result.votesBySession[p.sessionId];
          return (
            <li key={p.sessionId} data-session-id={p.sessionId}>
              <span>{p.nickname}</span>
              {": "}
              <strong>{vote ?? "—"}</strong>
            </li>
          );
        })}
      </ul>

      {distribution.length > 0 ? (
        <>
          <h3>Distribuição</h3>
          <ul aria-label="Distribuição de votos">
            {distribution.map(([card, count]) => (
              <li key={card}>
                {card}: {count}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
