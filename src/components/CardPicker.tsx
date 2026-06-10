"use client";

import { getScale, type ScaleId } from "@/lib/scales";

export interface CardPickerProps {
  scaleId: ScaleId;
  selectedCard: string | null;
  onSelect: (card: string) => void;
  disabled?: boolean;
}

export function CardPicker({ scaleId, selectedCard, onSelect, disabled }: CardPickerProps) {
  const scale = getScale(scaleId);
  return (
    <div role="group" aria-label="Cartas para votar">
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
          >
            {card}
          </button>
        );
      })}
    </div>
  );
}
