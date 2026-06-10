// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RoundState } from "@/lib/events";
import { RoundControls } from "./RoundControls";

function inProgressRound(over: Partial<RoundState> = {}): RoundState {
  return {
    title: null,
    startedAt: 1_000,
    revealed: false,
    result: null,
    ...over,
  };
}

function revealedRound(over: Partial<RoundState> = {}): RoundState {
  return {
    title: "US-42",
    startedAt: 1_000,
    revealed: true,
    result: {
      votesBySession: { "s-1": "5" },
      average: 5,
      min: 5,
      max: 5,
      counts: { "5": 1 },
    },
    ...over,
  };
}

describe("RoundControls — AC4, AC6, AC7", () => {
  it("sem rodada: oferece iniciar rodada e seletor de escala habilitado", () => {
    const props = {
      scaleId: "fibonacci" as const,
      round: null,
      onStartRound: vi.fn(),
      onReveal: vi.fn(),
      onResetRound: vi.fn(),
      onChangeScale: vi.fn(),
    };
    render(<RoundControls {...props} />);
    expect(screen.getByRole("button", { name: /iniciar rodada/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/escala/i)).not.toBeDisabled();
  });

  it("iniciar rodada chama onStartRound com título quando preenchido", async () => {
    const onStartRound = vi.fn();
    const user = userEvent.setup();
    render(
      <RoundControls
        scaleId="fibonacci"
        round={null}
        onStartRound={onStartRound}
        onReveal={vi.fn()}
        onResetRound={vi.fn()}
        onChangeScale={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/título da rodada/i), "  US-42  ");
    await user.click(screen.getByRole("button", { name: /iniciar rodada/i }));
    expect(onStartRound).toHaveBeenCalledWith("US-42");
  });

  it("iniciar rodada chama onStartRound(undefined) quando título está vazio", async () => {
    const onStartRound = vi.fn();
    const user = userEvent.setup();
    render(
      <RoundControls
        scaleId="fibonacci"
        round={null}
        onStartRound={onStartRound}
        onReveal={vi.fn()}
        onResetRound={vi.fn()}
        onChangeScale={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /iniciar rodada/i }));
    expect(onStartRound).toHaveBeenCalledWith(undefined);
  });

  it("AC4 — durante rodada: mostra Revelar e desabilita seletor de escala", async () => {
    const onReveal = vi.fn();
    const user = userEvent.setup();
    render(
      <RoundControls
        scaleId="fibonacci"
        round={inProgressRound({ title: "Login" })}
        onStartRound={vi.fn()}
        onReveal={onReveal}
        onResetRound={vi.fn()}
        onChangeScale={vi.fn()}
      />,
    );
    expect(screen.getByText(/em andamento.*login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/escala/i)).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /revelar/i }));
    expect(onReveal).toHaveBeenCalled();
  });

  it("AC6 — após reveal: mostra Nova rodada e seletor reabilita", async () => {
    const onResetRound = vi.fn();
    const user = userEvent.setup();
    render(
      <RoundControls
        scaleId="fibonacci"
        round={revealedRound()}
        onStartRound={vi.fn()}
        onReveal={vi.fn()}
        onResetRound={onResetRound}
        onChangeScale={vi.fn()}
      />,
    );
    expect(screen.getByText(/rodada revelada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/escala/i)).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: /nova rodada/i }));
    expect(onResetRound).toHaveBeenCalled();
  });

  it("AC7 — trocar escala chama onChangeScale com novo id", async () => {
    const onChangeScale = vi.fn();
    const user = userEvent.setup();
    render(
      <RoundControls
        scaleId="fibonacci"
        round={null}
        onStartRound={vi.fn()}
        onReveal={vi.fn()}
        onResetRound={vi.fn()}
        onChangeScale={onChangeScale}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/escala/i), "tshirt");
    expect(onChangeScale).toHaveBeenCalledWith("tshirt");
  });

  it("isSubmitting desabilita todos os botões interativos", () => {
    render(
      <RoundControls
        scaleId="fibonacci"
        round={null}
        onStartRound={vi.fn()}
        onReveal={vi.fn()}
        onResetRound={vi.fn()}
        onChangeScale={vi.fn()}
        isSubmitting
      />,
    );
    expect(screen.getByRole("button", { name: /iniciar rodada/i })).toBeDisabled();
    expect(screen.getByLabelText(/escala/i)).toBeDisabled();
  });
});
