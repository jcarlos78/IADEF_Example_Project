// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Participant } from "@/lib/events";
import { ParticipantList } from "./ParticipantList";

function p(over: Partial<Participant>): Participant {
  return {
    sessionId: "s-1",
    nickname: "Someone",
    isHost: false,
    hasVoted: false,
    connected: true,
    ...over,
  };
}

describe("ParticipantList — AC12", () => {
  it("shows a message when the list is empty", () => {
    render(<ParticipantList participants={[]} />);
    expect(screen.getByText(/nobody in the room/i)).toBeInTheDocument();
  });

  it("renders N participants with their nicknames", () => {
    render(
      <ParticipantList
        participants={[
          p({ sessionId: "s-host", nickname: "Host", isHost: true }),
          p({ sessionId: "s-alice", nickname: "Alice" }),
          p({ sessionId: "s-bob", nickname: "Bob" }),
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: /participants/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Host");
    expect(items[1]).toHaveTextContent("Alice");
    expect(items[2]).toHaveTextContent("Bob");
  });

  it("marks the facilitator", () => {
    render(
      <ParticipantList participants={[p({ sessionId: "s-host", nickname: "H", isHost: true })]} />,
    );
    expect(screen.getByLabelText(/facilitator/i)).toBeInTheDocument();
  });

  it("marks offline (disconnected) participants", () => {
    render(
      <ParticipantList participants={[p({ sessionId: "s-x", nickname: "X", connected: false })]} />,
    );
    expect(screen.getByLabelText(/offline/i)).toBeInTheDocument();
  });

  it("during a round: marks who voted and who has not (AC3 — without revealing the vote)", () => {
    render(
      <ParticipantList
        hasActiveRound
        participants={[
          p({ sessionId: "s-1", nickname: "A", hasVoted: true }),
          p({ sessionId: "s-2", nickname: "B", hasVoted: false }),
        ]}
      />,
    );
    expect(screen.getByLabelText(/^voted$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/waiting for vote/i)).toBeInTheDocument();
  });

  it("with no active round: does not show vote status", () => {
    render(
      <ParticipantList participants={[p({ sessionId: "s-1", nickname: "A", hasVoted: true })]} />,
    );
    expect(screen.queryByLabelText(/^voted$/i)).toBeNull();
    expect(screen.queryByLabelText(/waiting for vote/i)).toBeNull();
  });
});
