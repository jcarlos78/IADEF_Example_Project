// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomErrorView } from "./RoomErrorView";

describe("RoomErrorView — AC11", () => {
  it("renderiza título, descrição e CTA padrão para Criar nova sala", () => {
    render(<RoomErrorView title="Sala não encontrada" description="Pode ter expirado." />);
    expect(screen.getByRole("heading", { name: /sala não encontrada/i })).toBeInTheDocument();
    expect(screen.getByText(/pode ter expirado/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /criar nova sala/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("aceita CTA customizado", () => {
    render(
      <RoomErrorView
        title="Sala fechada"
        description="O TTL acabou."
        ctaLabel="Voltar ao início"
        ctaHref="/start"
      />,
    );
    const link = screen.getByRole("link", { name: /voltar ao início/i });
    expect(link).toHaveAttribute("href", "/start");
  });

  it("é anunciado como alert (acessibilidade)", () => {
    render(<RoomErrorView title="X" description="Y" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
