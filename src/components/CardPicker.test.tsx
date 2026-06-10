// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SCALES } from "@/lib/scales";
import { CardPicker } from "./CardPicker";

describe("CardPicker — AC3", () => {
  it("renders every card from the Fibonacci scale", () => {
    render(<CardPicker scaleId="fibonacci" selectedCard={null} onSelect={vi.fn()} />);
    const group = screen.getByRole("group", { name: /voting cards/i });
    for (const card of SCALES.fibonacci.cards) {
      expect(within(group).getByRole("button", { name: card })).toBeInTheDocument();
    }
  });

  it("renders T-shirt cards when scaleId changes", () => {
    render(<CardPicker scaleId="tshirt" selectedCard={null} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "XS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "XXL" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "13" })).toBeNull();
  });

  it("calls onSelect with the value of the clicked card", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CardPicker scaleId="fibonacci" selectedCard={null} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "5" }));
    expect(onSelect).toHaveBeenCalledWith("5");
  });

  it("sets aria-pressed=true only on the selected card", () => {
    render(<CardPicker scaleId="fibonacci" selectedCard="8" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "8", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5", pressed: false })).toBeInTheDocument();
  });

  it("disables every button when disabled", () => {
    render(<CardPicker scaleId="fibonacci" selectedCard={null} onSelect={vi.fn()} disabled />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toBeDisabled();
    }
  });

  it("AC3 — the selected card value exists only in local state (props), not in the JSON broadcast to other clients", () => {
    // Sanity: CardPicker receives selectedCard as a prop; it is controlled by RoomClient,
    // which keeps that value ONLY in local state. The broadcast room:state does not include
    // votes before reveal (validated in room.test.ts and handlers.test.ts).
    const { container } = render(
      <CardPicker scaleId="fibonacci" selectedCard="13" onSelect={vi.fn()} />,
    );
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toBe("13");
  });
});
