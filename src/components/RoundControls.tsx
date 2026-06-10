"use client";

import { type FormEvent, useState } from "react";
import type { RoundState } from "@/lib/events";
import { SCALES, SCALE_IDS, type ScaleId } from "@/lib/scales";
import styles from "./RoundControls.module.css";

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
    <section aria-labelledby="round-controls-heading" className={styles.panel}>
      <h2 id="round-controls-heading" className={styles.heading}>
        Facilitator controls
      </h2>

      <div className={styles.field}>
        <label htmlFor="scale-select" className={styles.label}>
          Scale
        </label>
        <select
          id="scale-select"
          value={scaleId}
          onChange={(e) => onChangeScale(e.target.value as ScaleId)}
          disabled={scaleSelectDisabled}
          className={styles.select}
        >
          {SCALE_IDS.map((id) => (
            <option key={id} value={id}>
              {SCALES[id].label}
            </option>
          ))}
        </select>
      </div>

      {round === null ? (
        <form onSubmit={handleStart} aria-label="Start round" className={styles.startForm}>
          <div className={styles.field}>
            <label htmlFor="round-title" className={styles.label}>
              Round title (optional)
            </label>
            <input
              id="round-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. US-42"
              maxLength={80}
              disabled={isSubmitting}
              className={styles.input}
            />
          </div>
          <button type="submit" disabled={isSubmitting} className={styles.btnPrimary}>
            Start round
          </button>
        </form>
      ) : round.revealed ? (
        <div className={styles.status}>
          <p className={styles.statusText}>Round revealed.</p>
          <button
            type="button"
            onClick={onResetRound}
            disabled={isSubmitting}
            className={styles.btnGhost}
          >
            New round
          </button>
        </div>
      ) : (
        <div className={styles.status}>
          <p className={styles.statusText}>
            Round in progress{round.title ? `: ${round.title}` : ""}.
          </p>
          <button
            type="button"
            onClick={onReveal}
            disabled={isSubmitting}
            className={styles.btnSuccess}
          >
            Reveal
          </button>
        </div>
      )}
    </section>
  );
}
