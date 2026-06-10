// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Participant, RoundResult } from "@/lib/events";
import { Results } from "./Results";

function pt(over: Partial<Participant>): Participant {
  return {
    sessionId: "s-1",
    nickname: "Someone",
    isHost: false,
    hasVoted: true,
    connected: true,
    ...over,
  };
}

describe("Results — AC5", () => {
  it("renders formatted mean, min and max", () => {
    const result: RoundResult = {
      votesBySession: { "s-1": "3", "s-2": "5" },
      average: 4,
      min: 3,
      max: 5,
      counts: { "3": 1, "5": 1 },
    };
    render(
      <Results
        result={result}
        participants={[
          pt({ sessionId: "s-1", nickname: "Alice" }),
          pt({ sessionId: "s-2", nickname: "Bob" }),
        ]}
      />,
    );
    const stats = screen.getByLabelText(/statistics/i);
    expect(within(stats).getByText("4")).toBeInTheDocument();
    expect(within(stats).getByText("3")).toBeInTheDocument();
    expect(within(stats).getByText("5")).toBeInTheDocument();
  });

  it("formats a non-integer mean with 2 decimals", () => {
    const result: RoundResult = {
      votesBySession: { "s-1": "3", "s-2": "5", "s-3": "8" },
      average: (3 + 5 + 8) / 3,
      min: 3,
      max: 8,
      counts: { "3": 1, "5": 1, "8": 1 },
    };
    render(<Results result={result} participants={[]} />);
    expect(screen.getByText("5.33")).toBeInTheDocument();
  });

  it("shows '—' when there are no numeric votes (all ? or ☕)", () => {
    const result: RoundResult = {
      votesBySession: { "s-1": "?", "s-2": "☕" },
      average: null,
      min: null,
      max: null,
      counts: { "?": 1, "☕": 1 },
    };
    render(<Results result={result} participants={[]} />);
    const stats = screen.getByLabelText(/statistics/i);
    expect(within(stats).getAllByText("—")).toHaveLength(3);
  });

  it("lists each participant with their vote", () => {
    const result: RoundResult = {
      votesBySession: { "s-host": "13", "s-alice": "8" },
      average: 10.5,
      min: 8,
      max: 13,
      counts: { "13": 1, "8": 1 },
    };
    render(
      <Results
        result={result}
        participants={[
          pt({ sessionId: "s-host", nickname: "Host", isHost: true }),
          pt({ sessionId: "s-alice", nickname: "Alice" }),
        ]}
      />,
    );
    const votes = screen.getByLabelText(/votes per participant/i);
    expect(within(votes).getByText("Host")).toBeInTheDocument();
    expect(within(votes).getByText("13")).toBeInTheDocument();
    expect(within(votes).getByText("Alice")).toBeInTheDocument();
    expect(within(votes).getByText("8")).toBeInTheDocument();
  });

  it("shows '—' for participants who did not vote", () => {
    const result: RoundResult = {
      votesBySession: { "s-1": "5" },
      average: 5,
      min: 5,
      max: 5,
      counts: { "5": 1 },
    };
    render(
      <Results
        result={result}
        participants={[
          pt({ sessionId: "s-1", nickname: "Voted" }),
          pt({ sessionId: "s-2", nickname: "DidNotVote", hasVoted: false }),
        ]}
      />,
    );
    const list = screen.getByLabelText(/votes per participant/i);
    const items = within(list).getAllByRole("listitem");
    expect(items[1]).toHaveTextContent("DidNotVote: —");
  });

  it("renders the distribution ordered by frequency (highest first)", () => {
    const result: RoundResult = {
      votesBySession: { a: "5", b: "5", c: "5", d: "8" },
      average: 5.75,
      min: 5,
      max: 8,
      counts: { "5": 3, "8": 1 },
    };
    render(<Results result={result} participants={[]} />);
    const dist = screen.getByLabelText(/vote distribution/i);
    const items = within(dist).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("5: 3");
    expect(items[1]).toHaveTextContent("8: 1");
  });
});
