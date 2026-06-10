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
  it("no round: offers Start round and the scale select is enabled", () => {
    const props = {
      scaleId: "fibonacci" as const,
      round: null,
      onStartRound: vi.fn(),
      onReveal: vi.fn(),
      onResetRound: vi.fn(),
      onChangeScale: vi.fn(),
    };
    render(<RoundControls {...props} />);
    expect(screen.getByRole("button", { name: /start round/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/scale/i)).not.toBeDisabled();
  });

  it("Start round calls onStartRound with the title when provided", async () => {
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
    await user.type(screen.getByLabelText(/round title/i), "  US-42  ");
    await user.click(screen.getByRole("button", { name: /start round/i }));
    expect(onStartRound).toHaveBeenCalledWith("US-42");
  });

  it("Start round calls onStartRound(undefined) when the title is empty", async () => {
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
    await user.click(screen.getByRole("button", { name: /start round/i }));
    expect(onStartRound).toHaveBeenCalledWith(undefined);
  });

  it("AC4 — during a round: shows Reveal and disables the scale select", async () => {
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
    expect(screen.getByText(/in progress.*login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/scale/i)).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /reveal/i }));
    expect(onReveal).toHaveBeenCalled();
  });

  it("AC6 — after reveal: shows New round and the select re-enables", async () => {
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
    expect(screen.getByText(/round revealed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/scale/i)).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: /new round/i }));
    expect(onResetRound).toHaveBeenCalled();
  });

  it("AC7 — switching the scale calls onChangeScale with the new id", async () => {
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
    await user.selectOptions(screen.getByLabelText(/scale/i), "tshirt");
    expect(onChangeScale).toHaveBeenCalledWith("tshirt");
  });

  it("isSubmitting disables every interactive control", () => {
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
    expect(screen.getByRole("button", { name: /start round/i })).toBeDisabled();
    expect(screen.getByLabelText(/scale/i)).toBeDisabled();
  });
});
