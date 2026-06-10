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
  title = "Entre na sala",
  description = "Escolha um apelido para participar da votação.",
}: NicknameDialogProps) {
  const [nickname, setNickname] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handle(e: FormEvent): void {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setLocalError("Apelido é obrigatório.");
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
          Apelido
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
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>

      {visibleError ? (
        <p role="alert" className={styles.alert}>
          {visibleError}
        </p>
      ) : null}
    </form>
  );
}
