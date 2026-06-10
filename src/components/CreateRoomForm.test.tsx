// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreateRoomForm } from "./CreateRoomForm";

describe("CreateRoomForm — AC1", () => {
  it("renderiza as 3 escalas com labels em português", () => {
    render(<CreateRoomForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Fibonacci")).toBeInTheDocument();
    expect(screen.getByLabelText("Fibonacci modificada")).toBeInTheDocument();
    expect(screen.getByLabelText("T-shirt")).toBeInTheDocument();
  });

  it("Fibonacci é o default selecionado", () => {
    render(<CreateRoomForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText<HTMLInputElement>("Fibonacci").checked).toBe(true);
  });

  it("não chama onSubmit quando apelido está vazio (mostra alert)", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /criar sala/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/apelido/i);
  });

  it("envia { scaleId, hostNickname } ao submeter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/apelido/i), "Anfitriã");
    await user.click(screen.getByLabelText("T-shirt"));
    await user.click(screen.getByRole("button", { name: /criar sala/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      scaleId: "tshirt",
      hostNickname: "Anfitriã",
    });
  });

  it("trimma o apelido antes de chamar onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/apelido/i), "  Maria  ");
    await user.click(screen.getByRole("button", { name: /criar sala/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      scaleId: "fibonacci",
      hostNickname: "Maria",
    });
  });

  it("desabilita botão durante submit", () => {
    render(<CreateRoomForm onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole("button", { name: /criando/i })).toBeDisabled();
  });

  it("exibe errorMessage externa quando não há erro local", () => {
    render(<CreateRoomForm onSubmit={vi.fn()} errorMessage="Falha de rede" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falha de rede");
  });

  it("erro local tem prioridade sobre errorMessage externa", async () => {
    const user = userEvent.setup();
    render(<CreateRoomForm onSubmit={vi.fn()} errorMessage="Falha de rede" />);
    await user.click(screen.getByRole("button", { name: /criar sala/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/apelido/i);
  });
});
