// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Participant } from "@/lib/events";
import { ParticipantList } from "./ParticipantList";

function p(over: Partial<Participant>): Participant {
  return {
    sessionId: "s-1",
    nickname: "Alguém",
    isHost: false,
    hasVoted: false,
    connected: true,
    ...over,
  };
}

describe("ParticipantList — AC12", () => {
  it("mostra mensagem quando lista está vazia", () => {
    render(<ParticipantList participants={[]} />);
    expect(screen.getByText(/ninguém na sala/i)).toBeInTheDocument();
  });

  it("renderiza N participantes com seus apelidos", () => {
    render(
      <ParticipantList
        participants={[
          p({ sessionId: "s-host", nickname: "Anfitriã", isHost: true }),
          p({ sessionId: "s-alice", nickname: "Alice" }),
          p({ sessionId: "s-bob", nickname: "Bob" }),
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: /participantes/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Anfitriã");
    expect(items[1]).toHaveTextContent("Alice");
    expect(items[2]).toHaveTextContent("Bob");
  });

  it("marca o facilitador", () => {
    render(
      <ParticipantList participants={[p({ sessionId: "s-host", nickname: "H", isHost: true })]} />,
    );
    expect(screen.getByLabelText(/facilitador/i)).toBeInTheDocument();
  });

  it("marca participantes offline (desconectados)", () => {
    render(
      <ParticipantList participants={[p({ sessionId: "s-x", nickname: "X", connected: false })]} />,
    );
    expect(screen.getByLabelText(/offline/i)).toBeInTheDocument();
  });

  it("durante uma rodada: marca quem votou e quem ainda não votou (AC3 — sem revelar o voto)", () => {
    render(
      <ParticipantList
        hasActiveRound
        participants={[
          p({ sessionId: "s-1", nickname: "A", hasVoted: true }),
          p({ sessionId: "s-2", nickname: "B", hasVoted: false }),
        ]}
      />,
    );
    expect(screen.getByLabelText(/votou/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aguardando voto/i)).toBeInTheDocument();
  });

  it("sem rodada ativa: não mostra status de voto", () => {
    render(
      <ParticipantList participants={[p({ sessionId: "s-1", nickname: "A", hasVoted: true })]} />,
    );
    expect(screen.queryByLabelText(/votou/i)).toBeNull();
    expect(screen.queryByLabelText(/aguardando voto/i)).toBeNull();
  });
});
