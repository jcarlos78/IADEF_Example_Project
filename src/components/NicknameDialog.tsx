"use client";

import { type FormEvent, useState } from "react";
import styles from "./NicknameDialog.module.css";

export interface NicknameDialogProps {
  onSubmit: (nickname: string) => void;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
}

export function NicknameDialog({
  onSubmit,
  errorMessage,
  isSubmitting,
  title = "Join the room",
  description = "Pick a nickname to join the vote.",
}: NicknameDialogProps) {
  const [nickname, setNickname] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handle(e: FormEvent): void {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setLocalError("Nickname is required.");
      return;
    }
    setLocalError(null);
    onSubmit(trimmed);
  }

  const visibleError = localError ?? errorMessage ?? null;

  return (
    <form onSubmit={handle} aria-labelledby="nickname-dialog-title" className={styles.form}>
      <div className={styles.header}>
        <h2 id="nickname-dialog-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="nickname-dialog-input" className={styles.label}>
          Nickname
        </label>
        <input
          id="nickname-dialog-input"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          autoComplete="off"
          maxLength={40}
          disabled={isSubmitting}
          autoFocus
          className={styles.input}
        />
      </div>

      <button type="submit" disabled={isSubmitting} className={styles.submit}>
        {isSubmitting ? "Joining..." : "Join"}
      </button>

      {visibleError ? (
        <p role="alert" className={styles.alert}>
          {visibleError}
        </p>
      ) : null}
    </form>
  );
}
