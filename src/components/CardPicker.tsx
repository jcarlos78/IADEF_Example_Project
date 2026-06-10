"use client";

import { getScale, type ScaleId } from "@/lib/scales";
import styles from "./CardPicker.module.css";

export interface CardPickerProps {
  scaleId: ScaleId;
  selectedCard: string | null;
  onSelect: (card: string) => void;
  disabled?: boolean;
}

export function CardPicker({ scaleId, selectedCard, onSelect, disabled }: CardPickerProps) {
  const scale = getScale(scaleId);
  return (
    <div role="group" aria-label="Voting cards" className={styles.group}>
      {scale.cards.map((card) => {
        const isSelected = selectedCard === card;
        return (
          <button
            key={card}
            type="button"
            aria-pressed={isSelected}
            data-selected={isSelected ? "true" : undefined}
            onClick={() => onSelect(card)}
            disabled={disabled}
            className={styles.card}
          >
            {card}
          </button>
        );
      })}
    </div>
  );
}
