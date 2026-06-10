"use client";

import { type FormEvent, useState } from "react";
import type { RoundState } from "@/lib/events";
import { SCALES, SCALE_IDS, type ScaleId } from "@/lib/scales";

export interface RoundControlsProps {
  scaleId: ScaleId;
  round: RoundState | null;
  onStartRound: (title?: string) => void;
  onReveal: () => void;
  onResetRound: () => void;
  onChangeScale: (scaleId: ScaleId) => void;
  isSubmitting?: boolean;
}

export function RoundControls({
  scaleId,
  round,
  onStartRound,
  onReveal,
  onResetRound,
  onChangeScale,
  isSubmitting,
}: RoundControlsProps) {
  const [title, setTitle] = useState("");
  const roundInProgress = round !== null && !round.revealed;
  const scaleSelectDisabled = roundInProgress || isSubmitting;

  function handleStart(e: FormEvent): void {
    e.preventDefault();
    const trimmed = title.trim();
    onStartRound(trimmed === "" ? undefined : trimmed);
    setTitle("");
  }

  return (
    <section aria-labelledby="round-controls-heading">
      <h2 id="round-controls-heading">Controles do facilitador</h2>

      <label htmlFor="scale-select">Escala</label>
      <select
        id="scale-select"
        value={scaleId}
        onChange={(e) => onChangeScale(e.target.value as ScaleId)}
        disabled={scaleSelectDisabled}
      >
        {SCALE_IDS.map((id) => (
          <option key={id} value={id}>
            {SCALES[id].label}
          </option>
        ))}
      </select>

      {round === null ? (
        <form onSubmit={handleStart} aria-label="Iniciar rodada">
          <label htmlFor="round-title">Título da rodada (opcional)</label>
          <input
            id="round-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: US-42"
            maxLength={80}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting}>
            Iniciar rodada
          </button>
        </form>
      ) : round.revealed ? (
        <div>
          <p>Rodada revelada.</p>
          <button type="button" onClick={onResetRound} disabled={isSubmitting}>
            Nova rodada
          </button>
        </div>
      ) : (
        <div>
          <p>Rodada em andamento{round.title ? `: ${round.title}` : ""}.</p>
          <button type="button" onClick={onReveal} disabled={isSubmitting}>
            Revelar
          </button>
        </div>
      )}
    </section>
  );
}
