"use client";

import { type FormEvent, useState } from "react";
import { SCALE_IDS, SCALES, type ScaleId } from "@/lib/scales";
import styles from "./CreateRoomForm.module.css";

export interface CreateRoomFormProps {
  onSubmit: (payload: { scaleId: ScaleId; hostNickname: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export function CreateRoomForm({ onSubmit, isSubmitting, errorMessage }: CreateRoomFormProps) {
  const [scaleId, setScaleId] = useState<ScaleId>("fibonacci");
  const [hostNickname, setHostNickname] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handle(e: FormEvent): void {
    e.preventDefault();
    const trimmed = hostNickname.trim();
    if (!trimmed) {
      setLocalError("Please enter a nickname to create the room.");
      return;
    }
    setLocalError(null);
    void onSubmit({ scaleId, hostNickname: trimmed });
  }

  const visibleError = localError ?? errorMessage ?? null;

  return (
    <form onSubmit={handle} aria-labelledby="create-room-title" className={styles.form}>
      <div className={styles.header}>
        <h1 id="create-room-title" className={styles.title}>
          Planning Poker
        </h1>
        <p className={styles.subtitle}>
          Create a room and share the link with your team to start estimating.
        </p>
      </div>

      <div className={styles.field}>
        <label htmlFor="nickname" className={styles.label}>
          Your nickname
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          value={hostNickname}
          onChange={(e) => setHostNickname(e.target.value)}
          autoComplete="off"
          maxLength={40}
          disabled={isSubmitting}
          autoFocus
          className={styles.input}
        />
      </div>

      <fieldset disabled={isSubmitting} className={styles.fieldset}>
        <legend className={styles.legend}>Card scale</legend>
        <div className={styles.scales}>
          {SCALE_IDS.map((id) => (
            <label key={id} className={styles.scale}>
              <input
                type="radio"
                name="scaleId"
                value={id}
                checked={scaleId === id}
                onChange={() => setScaleId(id)}
              />
              {SCALES[id].label}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={isSubmitting} className={styles.submit}>
        {isSubmitting ? "Creating..." : "Create room"}
      </button>

      {visibleError ? (
        <p role="alert" className={styles.alert}>
          {visibleError}
        </p>
      ) : null}
    </form>
  );
}
