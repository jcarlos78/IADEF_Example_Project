"use client";

import { type FormEvent, useState } from "react";
import { SCALE_IDS, SCALES, type ScaleId } from "@/lib/scales";

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
      setLocalError("Informe um apelido para criar a sala.");
      return;
    }
    setLocalError(null);
    void onSubmit({ scaleId, hostNickname: trimmed });
  }

  const visibleError = localError ?? errorMessage ?? null;

  return (
    <form onSubmit={handle} aria-labelledby="create-room-title">
      <h1 id="create-room-title">Planning Poker</h1>
      <p>Crie uma sala e compartilhe o link com seu time para começar a estimar.</p>

      <label htmlFor="nickname">Seu apelido</label>
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
      />

      <fieldset disabled={isSubmitting}>
        <legend>Escala de cartas</legend>
        {SCALE_IDS.map((id) => (
          <label key={id}>
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
      </fieldset>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Criando..." : "Criar sala"}
      </button>

      {visibleError ? <p role="alert">{visibleError}</p> : null}
    </form>
  );
}
