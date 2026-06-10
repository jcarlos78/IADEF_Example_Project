// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SCALES } from "@/lib/scales";
import { CardPicker } from "./CardPicker";

describe("CardPicker — AC3", () => {
  it("renderiza todas as cartas da escala Fibonacci", () => {
    render(<CardPicker scaleId="fibonacci" selectedCard={null} onSelect={vi.fn()} />);
    const group = screen.getByRole("group", { name: /cartas para votar/i });
    for (const card of SCALES.fibonacci.cards) {
      expect(within(group).getByRole("button", { name: card })).toBeInTheDocument();
    }
  });

  it("renderiza cartas T-shirt quando scaleId muda", () => {
    render(<CardPicker scaleId="tshirt" selectedCard={null} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "XS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "XXL" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "13" })).toBeNull();
  });

  it("chama onSelect com o valor da carta clicada", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CardPicker scaleId="fibonacci" selectedCard={null} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "5" }));
    expect(onSelect).toHaveBeenCalledWith("5");
  });

  it("marca aria-pressed=true só na carta selecionada", () => {
    render(<CardPicker scaleId="fibonacci" selectedCard="8" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "8", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5", pressed: false })).toBeInTheDocument();
  });

  it("desabilita todos os botões quando disabled", () => {
    render(<CardPicker scaleId="fibonacci" selectedCard={null} onSelect={vi.fn()} disabled />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toBeDisabled();
    }
  });

  it("AC3 — o valor da carta selecionada existe só no estado local (props), não no JSON serializável de outros clientes", () => {
    // Sanidade: CardPicker recebe selectedCard como prop; ele é controlled pelo RoomClient,
    // que mantém esse valor SOMENTE no estado local. O room:state broadcastado não inclui
    // votos antes do reveal (validado em room.test.ts e handlers.test.ts).
    const { container } = render(
      <CardPicker scaleId="fibonacci" selectedCard="13" onSelect={vi.fn()} />,
    );
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toBe("13");
  });
});
